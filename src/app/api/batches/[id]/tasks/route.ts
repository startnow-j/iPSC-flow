import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateProductionTask } from '@/lib/services/validation'
import { createAuditLog } from '@/lib/services/audit-log'
import { getTaskTemplates, shouldIncludeDifferentiation } from '@/lib/services/task-templates'
import type { TaskTemplate } from '@/lib/services/task-templates'

// ============================================
// GET /api/batches/[id]/tasks — 列出批次的所有生产任务
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 认证检查
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
    }

    const { id } = await params

    // 检查批次是否存在
    const batch = await db.batch.findUnique({
      where: { id },
      include: { product: { select: { category: true } } },
    })
    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // ============================================
    // v3.0: 自动补建缺失的生产任务（兼容旧批次）
    // 旧批次可能因代码迭代缺少某些任务模板（如 NPC 缺少 DIFFERENTIATION）
    // 在 IN_PRODUCTION / IDENTIFICATION 状态下自动补建
    // ============================================
    if (batch.status === 'IN_PRODUCTION' || batch.status === 'IDENTIFICATION') {
      const productLine = batch.productLine as string
      const category = batch.product?.category || undefined
      const action = productLine === 'SERVICE' ? 'start_production' : 'start_production'
      const templates = getTaskTemplates(productLine, action, category)

      if (templates && templates.length > 0) {
        // v3.0 fix: 使用 shouldIncludeDifferentiation 统一判断（支持批次编号回退）
        let filteredTemplates = templates
        if (productLine === 'CELL_PRODUCT') {
          if (!shouldIncludeDifferentiation(category, batch.batchNo)) {
            filteredTemplates = filteredTemplates.filter(t => t.taskCode !== 'DIFFERENTIATION')
          }
        }

        // Phase-type taskCodes: these support multiple rounds via POST-created COMPLETED records.
        // A PENDING template task is no longer needed once a COMPLETED record exists.
        const PHASE_TASK_CODES = ['EXPANSION', 'DIFFERENTIATION', 'CLONE_PICKING', 'CLONE_SCREENING']

        const existingTasks = await db.productionTask.findMany({
          where: { batchId: id },
          select: { taskCode: true, status: true },
        })
        const existingTaskCodes = new Set(existingTasks.map(t => t.taskCode))

        // Clean up orphaned PENDING/IN_PROGRESS template tasks for phase-type steps that already have COMPLETED records.
        // This handles legacy data where template tasks were left behind after POST-created records.
        for (const phaseCode of PHASE_TASK_CODES) {
          if (!existingTaskCodes.has(phaseCode)) continue
          const hasCompleted = existingTasks.some(t => t.taskCode === phaseCode && (t.status === 'COMPLETED' || t.status === 'REVIEWED'))
          if (hasCompleted) {
            await db.productionTask.deleteMany({
              where: { batchId: id, taskCode: phaseCode, status: { in: ['PENDING', 'IN_PROGRESS'] } },
            })
          }
        }

        // Re-query after cleanup to get accurate taskCodes
        const currentTasks = await db.productionTask.findMany({
          where: { batchId: id },
          select: { taskCode: true },
        })
        const currentTaskCodes = new Set(currentTasks.map(t => t.taskCode))
        const missingTemplates = filteredTemplates.filter(t => !currentTaskCodes.has(t.taskCode))

        if (missingTemplates.length > 0) {
          const tasksData = missingTemplates.map((t: TaskTemplate) => ({
            batchId: id,
            batchNo: batch.batchNo,
            taskCode: t.taskCode,
            taskName: t.taskName,
            sequenceNo: t.sequenceNo,
            stepGroup: t.stepGroup || null,
            status: 'PENDING' as const,
            assigneeId: batch.productionOperatorId || null,
            assigneeName: batch.productionOperatorName || null,
          }))

          await db.productionTask.createMany({ data: tasksData })

          await createAuditLog({
            eventType: 'BATCH_STATUS_CHANGED',
            targetType: 'BATCH',
            targetId: id,
            targetBatchNo: batch.batchNo,
            operatorId: 'SYSTEM',
            operatorName: '系统',
            dataAfter: {
              action: 'auto_repair_missing_tasks',
              tasks: tasksData.map(t => ({
                taskCode: t.taskCode,
                taskName: t.taskName,
              })),
            },
          })
        }
      }
    }

    // 查询所有任务，按 sequenceNo 排序
    const tasks = await db.productionTask.findMany({
      where: { batchId: id },
      orderBy: [{ sequenceNo: 'asc' }, { createdAt: 'asc' }],
    })

    // 解析 JSON 字段
    const parsedTasks = tasks.map((task) => ({
      ...task,
      formData: task.formData ? JSON.parse(task.formData) : null,
      attachments: task.attachments ? JSON.parse(task.attachments) : null,
    }))

    return NextResponse.json({ tasks: parsedTasks })
  } catch (error) {
    console.error('GET /api/batches/[id]/tasks error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================
// POST /api/batches/[id]/tasks — 创建新的生产记录 (EXPANSION / DIFFERENTIATION)
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 认证检查
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { formData, notes, attachments, taskCode } = body

    // 校验 taskCode
    const supportedTaskCodes = ['EXPANSION', 'DIFFERENTIATION', 'CLONE_PICKING', 'CLONE_SCREENING']
    const resolvedTaskCode = taskCode || 'EXPANSION'
    if (!supportedTaskCodes.includes(resolvedTaskCode)) {
      return NextResponse.json(
        { error: `不支持的任务类型: ${resolvedTaskCode}` },
        { status: 400 }
      )
    }

    // 检查批次是否存在且在生产中
    const batch = await db.batch.findUnique({
      where: { id },
    })
    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    if (batch.status !== 'IN_PRODUCTION') {
      return NextResponse.json(
        { error: '只能在生产中状态下创建生产记录' },
        { status: 400 }
      )
    }

    // v3.1: 单线生产流程锁定 — 后续步骤已真正开始时，禁止向更早步骤添加记录
    // PENDING tasks are placeholders created at start_production — they do NOT count as "started".
    const STEP_SEQ_MAP: Record<string, number> = {
      SEED_PREP: 1,
      EXPANSION: 2,
      DIFFERENTIATION: 3,
      CLONE_PICKING: 3,
      CLONE_SCREENING: 3,
      HARVEST: 4,
    }
    const currentStepSeq = STEP_SEQ_MAP[resolvedTaskCode]
    if (currentStepSeq !== undefined) {
      const allBatchTasks = await db.productionTask.findMany({
        where: { batchId: id },
        select: { taskCode: true, status: true },
      })
      const hasLaterActivity = allBatchTasks.some((t) => {
        const tSeq = STEP_SEQ_MAP[t.taskCode]
        return (
          tSeq !== undefined &&
          tSeq > currentStepSeq &&
          ['IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(t.status)
        )
      })
      if (hasLaterActivity) {
        return NextResponse.json(
          { error: '后续步骤已开始，无法再添加该步骤的记录。如需修改请先联系生产主管。' },
          { status: 400 }
        )
      }
    }

    // 校验表单数据
    const validation = validateProductionTask(resolvedTaskCode, formData ?? {})
    if (!validation.valid) {
      return NextResponse.json(
        { error: '表单校验失败', validation },
        { status: 400 }
      )
    }

    // 任务配置映射
    const taskConfig: Record<string, { taskName: string; sequenceNo: number; buildStepGroup: (data: Record<string, any>, count: number) => string }> = {
      EXPANSION: {
        taskName: '扩增培养',
        sequenceNo: 2,
        buildStepGroup: (data) => `${data.passage_from}→${data.passage_to}`,
      },
      DIFFERENTIATION: {
        taskName: '分化诱导',
        sequenceNo: 3,
        buildStepGroup: (_data, count) => `第${count + 1}轮`,
      },
      CLONE_PICKING: {
        taskName: '克隆挑取',
        sequenceNo: 3,
        buildStepGroup: (_data, count) => `第${count + 1}轮`,
      },
      CLONE_SCREENING: {
        taskName: '单克隆筛选',
        sequenceNo: 3,
        buildStepGroup: (_data, count) => `第${count + 1}轮`,
      },
    }

    const config = taskConfig[resolvedTaskCode]

    // 查询当前已有的同类已完成任务数量（排除 PENDING/IN_PROGRESS 模板任务）
    const existingTasks = await db.productionTask.findMany({
      where: {
        batchId: id,
        taskCode: resolvedTaskCode,
        status: { in: ['COMPLETED', 'FAILED', 'REVIEWED'] },
      },
      orderBy: { createdAt: 'asc' },
    })

    // 构建 stepGroup
    const stepGroup = config.buildStepGroup(formData ?? {}, existingTasks.length)

    // 阶段型任务（EXPANSION / DIFFERENTIATION / CLONE_PICKING / CLONE_SCREENING）：
    // 创建新记录前，清理残留的 PENDING/IN_PROGRESS 模板任务，避免：
    //   1. PENDING 任务阻止 complete_production
    //   2. PENDING 任务干扰 showDifferentiationForm / showExpansionForm 逻辑
    //   3. 轮次编号偏移（existingDifferentiations 误计）
    const PHASE_TASK_CODES = ['EXPANSION', 'DIFFERENTIATION', 'CLONE_PICKING', 'CLONE_SCREENING']
    if (PHASE_TASK_CODES.includes(resolvedTaskCode)) {
      await db.productionTask.deleteMany({
        where: {
          batchId: id,
          taskCode: resolvedTaskCode,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })
    }

    // 创建新的生产任务
    const task = await db.productionTask.create({
      data: {
        batchId: id,
        batchNo: batch.batchNo,
        taskCode: resolvedTaskCode,
        taskName: config.taskName,
        sequenceNo: config.sequenceNo,
        stepGroup,
        status: 'COMPLETED',
        assigneeId: payload.userId,
        assigneeName: payload.name,
        formData: JSON.stringify(formData),
        attachments: attachments ? JSON.stringify(attachments) : null,
        notes: notes || null,
        actualStart: new Date(),
        actualEnd: new Date(),
      },
    })

    // 记录审计日志
    await createAuditLog({
      eventType: 'TASK_COMPLETED',
      targetType: 'TASK',
      targetId: task.id,
      targetBatchNo: batch.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataAfter: {
        taskCode: resolvedTaskCode,
        stepGroup,
        formData,
      },
    })

    // EXPANSION: 更新批次的 currentPassage
    if (resolvedTaskCode === 'EXPANSION' && formData?.passage_to) {
      await db.batch.update({
        where: { id },
        data: {
          currentPassage: `P${formData.passage_to}`,
        },
      })

      await createAuditLog({
        eventType: 'BATCH_UPDATED',
        targetType: 'BATCH',
        targetId: id,
        targetBatchNo: batch.batchNo,
        operatorId: payload.userId,
        operatorName: payload.name,
        dataBefore: { currentPassage: batch.currentPassage },
        dataAfter: { currentPassage: `P${formData.passage_to}` },
      })
    }

    return NextResponse.json({
      task: {
        ...task,
        formData: JSON.parse(task.formData),
        attachments: task.attachments ? JSON.parse(task.attachments) : null,
      },
    })
  } catch (error) {
    console.error('POST /api/batches/[id]/tasks error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
