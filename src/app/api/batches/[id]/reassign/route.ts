import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { canManage } from '@/lib/roles'
import { createAuditLog } from '@/lib/services/audit-log'
import { getTaskTemplates } from '@/lib/services/task-templates'
import type { TaskTemplate } from '@/lib/services/task-templates'
import { db } from '@/lib/db'

// ============================================
// PATCH /api/batches/[id]/reassign — 批次级重新指派
// SUPERVISOR/ADMIN 可修改批次的预指派人员
// 四眼原则：生产员 ≠ 质检员
// 自动更新所有未完成任务的 assigneeId
// ============================================
export async function PATCH(
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
    const {
      productionOperatorId,
      productionOperatorName,
      qcOperatorId,
      qcOperatorName,
    } = body

    // 至少提供一个人员变更（用 undefined 区分"未发送"和"显式清除"）
    if (productionOperatorId === undefined && qcOperatorId === undefined) {
      return NextResponse.json(
        { error: '请至少提供一个要变更的指派人员' },
        { status: 400 }
      )
    }

    // 查询批次
    const batch = await db.batch.findUnique({
      where: { id },
      select: {
        id: true,
        batchNo: true,
        productLine: true,
        productId: true,
        productionOperatorId: true,
        productionOperatorName: true,
        qcOperatorId: true,
        qcOperatorName: true,
      },
    })

    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 权限检查：SUPERVISOR/ADMIN
    const roles = getRolesFromPayload(payload)
    const userWithPermissions = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        productLines: { select: { productLine: true } },
      },
    })
    const userProductLines = userWithPermissions?.productLines.map(pl => pl.productLine) || []
    if (!canManage(roles, userProductLines, batch.productLine as string, ['SUPERVISOR', 'ADMIN'])) {
      return NextResponse.json({ error: '无权限修改指派信息' }, { status: 403 })
    }

    // 四眼原则校验
    const newProdId = productionOperatorId ?? batch.productionOperatorId
    const newQcId = qcOperatorId ?? batch.qcOperatorId
    if (newProdId && newQcId && newProdId === newQcId) {
      return NextResponse.json(
        { error: '四眼原则：生产操作员和质检员不能是同一人' },
        { status: 400 }
      )
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    if (productionOperatorId !== undefined) {
      updateData.productionOperatorId = productionOperatorId || null
      updateData.productionOperatorName = productionOperatorName || null
    }
    if (qcOperatorId !== undefined) {
      updateData.qcOperatorId = qcOperatorId || null
      updateData.qcOperatorName = qcOperatorName || null
    }

    // 记录变更前快照
    const dataBefore = {
      productionOperatorId: batch.productionOperatorId,
      productionOperatorName: batch.productionOperatorName,
      qcOperatorId: batch.qcOperatorId,
      qcOperatorName: batch.qcOperatorName,
    }

    // 更新批次指派信息
    await db.batch.update({
      where: { id },
      data: updateData,
    })

    // ============================================
    // v3.0: 补建缺失的生产任务（兼容旧批次）
    // 某些旧批次可能因代码更新导致任务模板不全（如 NPC 批次缺少 DIFFERENTIATION）
    // 仅在生产中状态下补建
    // ============================================
    const batchForTaskRepair = await db.batch.findUnique({
      where: { id },
      include: {
        product: { select: { category: true } },
        tasks: { select: { taskCode: true } },
      },
    })

    if (batchForTaskRepair && batchForTaskRepair.status === 'IN_PRODUCTION') {
      const productLine = batchForTaskRepair.productLine as string
      const category = batchForTaskRepair.product?.category || undefined
      const templates = getTaskTemplates(productLine, 'start_production', category)

      if (templates && templates.length > 0) {
        const diffCategories = ['NPC', 'CM', 'DIFF_KIT', 'DIFF_SERVICE']
        let filteredTemplates = templates
        if (productLine === 'CELL_PRODUCT') {
          if (!category || !diffCategories.some(c => category.startsWith(c) || category.includes('DIFF'))) {
            filteredTemplates = filteredTemplates.filter(t => t.taskCode !== 'DIFFERENTIATION')
          }
        }

        const existingTaskCodes = new Set(batchForTaskRepair.tasks.map(t => t.taskCode))
        const missingTemplates = filteredTemplates.filter(t => !existingTaskCodes.has(t.taskCode))

        if (missingTemplates.length > 0) {
          const newOperatorId = productionOperatorId ?? batchForTaskRepair.productionOperatorId
          const newOperatorName = productionOperatorName ?? batchForTaskRepair.productionOperatorName

          const tasksData = missingTemplates.map((t: TaskTemplate) => ({
            batchId: id,
            batchNo: batchForTaskRepair.batchNo,
            taskCode: t.taskCode,
            taskName: t.taskName,
            sequenceNo: t.sequenceNo,
            stepGroup: t.stepGroup || null,
            status: 'PENDING' as const,
            assigneeId: newOperatorId || null,
            assigneeName: newOperatorName || null,
          }))

          await db.productionTask.createMany({ data: tasksData })

          await createAuditLog({
            eventType: 'BATCH_STATUS_CHANGED',
            targetType: 'BATCH',
            targetId: id,
            targetBatchNo: batchForTaskRepair.batchNo,
            operatorId: payload.userId,
            operatorName: payload.name,
            dataAfter: {
              action: 'reassign_repair_missing_tasks',
              tasks: tasksData.map(t => ({
                taskCode: t.taskCode,
                taskName: t.taskName,
                assigneeId: t.assigneeId,
              })),
            },
          })
        }
      }
    }

    // 更新所有未完成任务(PENDING/IN_PROGRESS)的 assigneeId
    // 仅当生产操作员发生变更时更新
    if (productionOperatorId !== undefined) {
      const updatedCount = await db.productionTask.updateMany({
        where: {
          batchId: id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: {
          assigneeId: productionOperatorId || null,
          assigneeName: productionOperatorName || null,
        },
      })

      if (updatedCount.count > 0) {
        // 记录任务级更新的审计日志
        const pendingTasks = await db.productionTask.findMany({
          where: {
            batchId: id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          select: { id: true, taskCode: true },
        })

        for (const task of pendingTasks) {
          await createAuditLog({
            eventType: 'TASK_UPDATED',
            targetType: 'TASK',
            targetId: task.id,
            targetBatchNo: batch.batchNo,
            operatorId: payload.userId,
            operatorName: payload.name,
            dataBefore: {
              taskCode: task.taskCode,
              assigneeId: batch.productionOperatorId,
              assigneeName: batch.productionOperatorName,
            },
            dataAfter: {
              taskCode: task.taskCode,
              assigneeId: productionOperatorId,
              assigneeName: productionOperatorName,
            },
          })
        }
      }
    }

    // 记录审计日志
    await createAuditLog({
      eventType: 'BATCH_UPDATED',
      targetType: 'BATCH',
      targetId: id,
      targetBatchNo: batch.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataBefore,
      dataAfter: updateData,
    })

    // 获取更新后的批次
    const updatedBatch = await db.batch.findUnique({
      where: { id },
    })

    return NextResponse.json({
      batch: updatedBatch,
      message: '指派信息已更新',
    })
  } catch (error) {
    console.error('PATCH /api/batches/[id]/reassign error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
