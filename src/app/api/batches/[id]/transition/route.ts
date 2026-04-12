import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { canManage, canOperate } from '@/lib/roles'
import { transition, getStatusLabel } from '@/lib/services/state-machine'
import type { TransitionOptions } from '@/lib/services/state-machine'
import { createAuditLog } from '@/lib/services/audit-log'
import { TASK_TEMPLATES, IDENTIFICATION_TASK_DEFS } from '@/lib/services/task-templates'
import type { TaskTemplate } from '@/lib/services/task-templates'
import { db } from '@/lib/db'

// ============================================
// 操作权限映射（v3.0 更新）
// 管理类操作 → canManage（需要产品线归属）
// 操作类操作 → canOperate（需要产品级授权）
// ============================================
const MANAGEMENT_ACTIONS: Record<string, string[]> = {
  start_production: ['SUPERVISOR'],
  start_material_prep: ['SUPERVISOR'],
  start_identification: ['SUPERVISOR'],
  approve: ['SUPERVISOR', 'QA'],
  submit_report: ['SUPERVISOR', 'QA'],
  scrap: ['SUPERVISOR'],
  terminate: ['SUPERVISOR'],
  rework: ['SUPERVISOR'],
}

const OPERATIONAL_ACTIONS: Record<string, string[]> = {
  start_qc: ['QC'],
  pass_qc: ['QC'],
  submit_coa: ['QC'],
  resubmit_coa: ['QC'],
}

// ============================================
// POST /api/batches/[id]/transition — 状态转换
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
    const { action, reason, terminationReason } = body

    if (!action) {
      return NextResponse.json({ error: '缺少 action 参数' }, { status: 400 })
    }

    // ============================================
    // v3.0: 报废操作必须传入 reason
    // ============================================
    if (action === 'scrap' && !reason) {
      return NextResponse.json({ error: '报废操作必须提供原因（reason）' }, { status: 400 })
    }

    // ============================================
    // v3.0: 终止操作必须传入 reason + terminationReason
    // ============================================
    if (action === 'terminate') {
      if (!reason) {
        return NextResponse.json({ error: '终止操作必须提供原因说明（reason）' }, { status: 400 })
      }
      if (!terminationReason) {
        return NextResponse.json({ error: '终止操作必须提供终止原因分类（terminationReason）' }, { status: 400 })
      }
    }

    // ============================================
    // 产品级权限检查
    // 根据操作类型检查产品线/产品级权限
    // ============================================
    const managementRoles = MANAGEMENT_ACTIONS[action]
    const operationalRoles = OPERATIONAL_ACTIONS[action]

    if (managementRoles || operationalRoles) {
      // 获取用户的产品线归属和产品级角色
      const userWithPermissions = await db.user.findUnique({
        where: { id: payload.userId },
        select: {
          productLines: { select: { productLine: true } },
          productRoles: {
            where: { product: { active: true } },
            select: { productId: true, roles: true },
          },
        },
      })
      const userProductLines = userWithPermissions?.productLines.map(pl => pl.productLine) || []
      const userProductRoles = userWithPermissions?.productRoles.map(pr => ({
        productId: pr.productId,
        roles: JSON.parse(pr.roles || '[]'),
      })) || []

      const roles = getRolesFromPayload(payload)

      // 获取批次信息（productLine 和 productId）
      const batchForPerm = await db.batch.findUnique({
        where: { id },
        select: { productLine: true, productId: true },
      })
      if (!batchForPerm) {
        return NextResponse.json({ error: '批次不存在' }, { status: 404 })
      }

      if (managementRoles && !canManage(roles, userProductLines, batchForPerm.productLine as string, managementRoles)) {
        return NextResponse.json({ error: '无权限操作该产品线' }, { status: 403 })
      }

      if (operationalRoles && !canOperate(roles, userProductRoles, batchForPerm.productId, operationalRoles)) {
        return NextResponse.json({ error: '无权限操作该产品' }, { status: 403 })
      }
    }

    // ============================================
    // CoA 退回 — CoA 表层面处理（status → DRAFT），
    // 批次状态保持 COA_SUBMITTED 不变。
    // ============================================
    if (action === 'reject_coa') {
      const batch = await db.batch.findUnique({ where: { id } })
      if (!batch) {
        return NextResponse.json({ error: '批次不存在' }, { status: 404 })
      }

      const coa = await db.coa.findUnique({ where: { batchId: id } })
      if (!coa) {
        return NextResponse.json({ error: 'CoA不存在' }, { status: 404 })
      }

      // Update CoA status to DRAFT
      await db.coa.update({
        where: { batchId: id },
        data: {
          status: 'DRAFT',
          reviewedBy: payload.userId,
          reviewedByName: payload.name,
          reviewComment: reason ?? '',
          reviewedAt: new Date(),
        },
      })

      // Record audit log
      await createAuditLog({
        eventType: 'COA_REJECTED',
        targetType: 'COA',
        targetId: coa.id,
        targetBatchNo: batch.batchNo,
        operatorId: payload.userId,
        operatorName: payload.name,
        dataBefore: { coaStatus: 'SUBMITTED' },
        dataAfter: {
          coaStatus: 'DRAFT',
          reviewComment: reason ?? '',
          note: 'CoA退回为草稿，批次状态保持COA_SUBMITTED',
        },
      })

      return NextResponse.json({
        success: true,
        message: `CoA已退回为草稿，批次状态保持 ${getStatusLabel(batch.status)}`,
        previousState: batch.status,
        newState: batch.status,
      })
    }

    // ============================================
    // 基于任务模板的自动任务创建
    // 支持 start_production / start_material_prep / start_identification
    // ============================================
    if (action === 'start_production' || action === 'start_material_prep' || action === 'start_identification') {
      const batch = await db.batch.findUnique({
        where: { id },
        include: { tasks: true },
      })

      if (batch) {
        const productLine = batch.productLine as string
        const templates = TASK_TEMPLATES[productLine]?.[action]

        if (templates && templates.length > 0) {
          // 仅在没有任务时创建（防重复）
          if (batch.tasks.length === 0) {
            const tasksData = templates.map((t: TaskTemplate) => ({
              batchId: id,
              batchNo: batch.batchNo,
              taskCode: t.taskCode,
              taskName: t.taskName,
              sequenceNo: t.sequenceNo,
              stepGroup: t.stepGroup || null,
              status: 'PENDING' as const,
              assigneeId: null as null,
              assigneeName: null as null,
            }))

            await db.productionTask.createMany({ data: tasksData })

            // 记录审计日志：自动创建生产任务
            await createAuditLog({
              eventType: 'BATCH_STATUS_CHANGED',
              targetType: 'BATCH',
              targetId: id,
              targetBatchNo: batch.batchNo,
              operatorId: payload.userId,
              operatorName: payload.name,
              dataAfter: {
                action: `${action}_auto_tasks`,
                productLine,
                tasks: tasksData.map(t => ({
                  taskCode: t.taskCode,
                  taskName: t.taskName,
                  sequenceNo: t.sequenceNo,
                  status: t.status,
                })),
              },
            })
          }
        }

        // ============================================
        // SERVICE 产品线 start_identification：动态创建鉴定任务
        // ============================================
        if (action === 'start_identification' && productLine === 'SERVICE') {
          const hasIdTasks = batch.tasks.some((t) => t.taskCode.startsWith('ID_'))

          if (!hasIdTasks) {
            let requirements: string[] = []
            try {
              requirements = JSON.parse(batch.identificationRequirements || '[]')
            } catch {
              requirements = []
            }

            if (requirements.length > 0) {
              const maxSeq = batch.tasks.reduce((max: number, t) => Math.max(max, t.sequenceNo || 0), 0)

              const idTasksData = requirements
                .filter((req) => IDENTIFICATION_TASK_DEFS[req])
                .map((req, idx) => {
                  const def = IDENTIFICATION_TASK_DEFS[req]!
                  return {
                    batchId: id,
                    batchNo: batch.batchNo,
                    taskCode: def.taskCode,
                    taskName: def.taskName,
                    sequenceNo: maxSeq + idx + 1,
                    stepGroup: 'IDENTIFICATION' as const,
                    status: 'PENDING' as const,
                    assigneeId: null as null,
                    assigneeName: null as null,
                  }
                })

              if (idTasksData.length > 0) {
                await db.productionTask.createMany({ data: idTasksData })

                await createAuditLog({
                  eventType: 'BATCH_STATUS_CHANGED',
                  targetType: 'BATCH',
                  targetId: id,
                  targetBatchNo: batch.batchNo,
                  operatorId: payload.userId,
                  operatorName: payload.name,
                  dataAfter: {
                    action: 'start_identification_auto_tasks',
                    requirements,
                    tasks: idTasksData.map(t => ({
                      taskCode: t.taskCode,
                      taskName: t.taskName,
                      sequenceNo: t.sequenceNo,
                      status: t.status,
                    })),
                  },
                })
              }
            }
          }
        }
      }
    }

    // ============================================
    // 构建 transition options
    // ============================================
    const transitionOptions: TransitionOptions = {}
    if (reason) transitionOptions.reason = reason
    if (terminationReason) transitionOptions.terminationReason = terminationReason

    // ============================================
    // 执行状态转换
    // ============================================
    const result = await transition(
      id,
      action,
      payload.userId,
      payload.name,
      transitionOptions,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // 记录审计日志
    const batchForLog = await db.batch.findUnique({ where: { id }, select: { batchNo: true } })
    await createAuditLog({
      eventType: 'BATCH_STATUS_CHANGED',
      targetType: 'BATCH',
      targetId: id,
      targetBatchNo: batchForLog?.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataBefore: { status: result.previousState },
      dataAfter: {
        status: result.newState,
        action,
        statusLabel: getStatusLabel(result.newState),
        ...(reason ? { reason } : {}),
        ...(terminationReason ? { terminationReason } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      message: result.message,
      previousState: result.previousState,
      newState: result.newState,
    })
  } catch (error) {
    console.error('POST /api/batches/[id]/transition error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
