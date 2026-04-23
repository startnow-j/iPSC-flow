import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { canManage, canOperate } from '@/lib/roles'
import { transition, getStatusLabel } from '@/lib/services/state-machine'
import type { TransitionOptions } from '@/lib/services/state-machine'
import { createAuditLog } from '@/lib/services/audit-log'
import { TASK_TEMPLATES, IDENTIFICATION_TASK_DEFS, getTaskTemplates, shouldIncludeDifferentiation } from '@/lib/services/task-templates'
import type { TaskTemplate } from '@/lib/services/task-templates'
import { db } from '@/lib/db'

// ============================================
// 操作权限映射（v3.0 更新）
// 管理类操作 → canManage（需要产品线归属）
// 操作类操作 → canOperate（需要产品级授权）
// ============================================
const MANAGEMENT_ACTIONS: Record<string, string[]> = {
  start_production: ['OPERATOR', 'SUPERVISOR'],
  start_material_prep: ['OPERATOR', 'SUPERVISOR'],
  start_identification: ['OPERATOR', 'SUPERVISOR'],
  complete_production: ['OPERATOR', 'SUPERVISOR'],
  complete_identification: ['OPERATOR', 'SUPERVISOR'],
  approve: ['SUPERVISOR', 'QA'],
  submit_report: ['OPERATOR', 'SUPERVISOR'],
  scrap: ['SUPERVISOR'],
  terminate: ['SUPERVISOR'],
  rework: ['SUPERVISOR'],
}

const OPERATIONAL_ACTIONS: Record<string, string[]> = {
  start_qc: ['QC'],
  pass_qc: ['QC'],
  submit_coa: ['QC'],
  receive_sample: ['OPERATOR'],
}

// ============================================
// 重新指派允许的批次状态（按产品线）
// CELL_PRODUCT: 生产中、待质检、质检中
// KIT: 物料准备中、生产中、待质检、质检中
// ============================================
const REASSIGN_ALLOWED_STATES: Record<string, string[]> = {
  CELL_PRODUCT: ['IN_PRODUCTION', 'QC_PENDING', 'QC_IN_PROGRESS'],
  KIT: ['MATERIAL_PREP', 'IN_PRODUCTION', 'QC_PENDING', 'QC_IN_PROGRESS'],
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
    const {
      action,
      reason,
      terminationReason,
      productionOperatorId,
      productionOperatorName,
      qcOperatorId,
      qcOperatorName,
    } = body

    if (!action) {
      return NextResponse.json({ error: '缺少 action 参数' }, { status: 400 })
    }

    // ============================================
    // KIT / CELL_PRODUCT 重新指派操作
    // reassign_production: 变更生产操作员
    // reassign_qc: 变更质检员
    // 仅 SUPERVISOR/ADMIN 可操作，在指定状态下允许
    // ============================================
    if (action === 'reassign_production' || action === 'reassign_qc') {
      // 查询批次完整信息
      const batchForReassign = await db.batch.findUnique({
        where: { id },
        select: {
          id: true,
          batchNo: true,
          productLine: true,
          status: true,
          productId: true,
          productionOperatorId: true,
          productionOperatorName: true,
          qcOperatorId: true,
          qcOperatorName: true,
        },
      })

      if (!batchForReassign) {
        return NextResponse.json({ error: '批次不存在' }, { status: 404 })
      }

      // 校验产品线是否支持重新指派
      const productLine = batchForReassign.productLine as string
      const allowedStates = REASSIGN_ALLOWED_STATES[productLine]
      if (!allowedStates) {
        return NextResponse.json(
          { error: `${productLine} 产品线不支持重新指派操作` },
          { status: 400 }
        )
      }

      // 校验批次状态是否允许重新指派
      if (!allowedStates.includes(batchForReassign.status as string)) {
        return NextResponse.json(
          { error: `当前状态 ${batchForReassign.status} 不允许重新指派，允许的状态: ${allowedStates.join(', ')}` },
          { status: 400 }
        )
      }

      // 校验必填字段
      if (action === 'reassign_production' && !productionOperatorId) {
        return NextResponse.json({ error: 'reassign_production 必须提供 productionOperatorId' }, { status: 400 })
      }
      if (action === 'reassign_qc' && !qcOperatorId) {
        return NextResponse.json({ error: 'reassign_qc 必须提供 qcOperatorId' }, { status: 400 })
      }

      // 权限检查：SUPERVISOR/ADMIN
      const reassignRoles = getRolesFromPayload(payload)
      const reassignUserPerms = await db.user.findUnique({
        where: { id: payload.userId },
        select: { productLines: { select: { productLine: true } } },
      })
      const reassignUserProductLines = reassignUserPerms?.productLines.map(pl => pl.productLine) || []
      if (!canManage(reassignRoles, reassignUserProductLines, productLine, ['SUPERVISOR', 'ADMIN'])) {
        return NextResponse.json({ error: '仅生产主管或管理员可重新指派人员' }, { status: 403 })
      }

      // 四眼原则校验
      const newProdId = action === 'reassign_production' ? productionOperatorId : batchForReassign.productionOperatorId
      const newQcId = action === 'reassign_qc' ? qcOperatorId : batchForReassign.qcOperatorId
      if (newProdId && newQcId && newProdId === newQcId) {
        return NextResponse.json(
          { error: '四眼原则：生产操作员和质检员不能是同一人' },
          { status: 400 }
        )
      }

      // 构建更新数据
      const reassignUpdateData: Record<string, unknown> = {}
      if (action === 'reassign_production') {
        reassignUpdateData.productionOperatorId = productionOperatorId
        reassignUpdateData.productionOperatorName = productionOperatorName || null
      }
      if (action === 'reassign_qc') {
        reassignUpdateData.qcOperatorId = qcOperatorId
        reassignUpdateData.qcOperatorName = qcOperatorName || null
      }

      // 记录变更前快照
      const reassignDataBefore = {
        productionOperatorId: batchForReassign.productionOperatorId,
        productionOperatorName: batchForReassign.productionOperatorName,
        qcOperatorId: batchForReassign.qcOperatorId,
        qcOperatorName: batchForReassign.qcOperatorName,
      }

      // 更新批次
      await db.batch.update({ where: { id }, data: reassignUpdateData })

      // 更新未完成任务的 assignee（仅当生产操作员变更时）
      if (action === 'reassign_production') {
        await db.productionTask.updateMany({
          where: {
            batchId: id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          data: {
            assigneeId: productionOperatorId,
            assigneeName: productionOperatorName || null,
          },
        })
      }

      // 审计日志
      await createAuditLog({
        eventType: 'BATCH_UPDATED',
        targetType: 'BATCH',
        targetId: id,
        targetBatchNo: batchForReassign.batchNo,
        operatorId: payload.userId,
        operatorName: payload.name,
        dataBefore: reassignDataBefore,
        dataAfter: {
          action,
          ...reassignUpdateData,
        },
      })

      const reassignLabel = action === 'reassign_production' ? '生产操作员' : '质检员'
      return NextResponse.json({
        success: true,
        message: `${reassignLabel}已重新指派`,
        action,
        dataBefore: reassignDataBefore,
        dataAfter: reassignUpdateData,
      })
    }

    // ============================================
    // v3.0: 报废操作必须传入 reason
    // ============================================
    if (action === 'scrap' && !reason) {
      return NextResponse.json({ error: '报废操作必须提供原因（reason）' }, { status: 400 })
    }

    // ============================================
    // v3.0: 四眼原则校验 — 仅在提供指派人员时校验
    // ============================================
    if (productionOperatorId && qcOperatorId && productionOperatorId === qcOperatorId) {
      return NextResponse.json(
        { error: '四眼原则：生产操作员和质检员不能是同一人' },
        { status: 400 }
      )
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

      // v3.1: QC 操作（start_qc / pass_qc / submit_coa）额外检查指定质检员
      if (operationalRoles && operationalRoles.includes('QC') && !roles.includes('ADMIN')) {
        const batchForQcCheck = await db.batch.findUnique({
          where: { id },
          select: { qcOperatorId: true },
        })
        if (batchForQcCheck?.qcOperatorId && batchForQcCheck.qcOperatorId !== payload.userId) {
          return NextResponse.json({ error: '您不是该批次指定的质检员，无法执行质检操作' }, { status: 403 })
        }
      }
    }

    // ============================================
    // v3.0: 预指派人员更新（start_production / start_material_prep 时可选）
    // ============================================
    if ((action === 'start_production' || action === 'start_material_prep') &&
        (productionOperatorId || qcOperatorId)) {
      const batchForAssign = await db.batch.findUnique({
        where: { id },
        select: {
          batchNo: true,
          productionOperatorId: true,
          productionOperatorName: true,
          qcOperatorId: true,
          qcOperatorName: true,
        },
      })

      if (batchForAssign) {
        const assignUpdateData: Record<string, unknown> = {}
        if (productionOperatorId) {
          assignUpdateData.productionOperatorId = productionOperatorId
          assignUpdateData.productionOperatorName = productionOperatorName || null
        }
        if (qcOperatorId) {
          assignUpdateData.qcOperatorId = qcOperatorId
          assignUpdateData.qcOperatorName = qcOperatorName || null
        }

        if (Object.keys(assignUpdateData).length > 0) {
          await db.batch.update({ where: { id }, data: assignUpdateData })

          // 记录审计日志
          await createAuditLog({
            eventType: 'BATCH_UPDATED',
            targetType: 'BATCH',
            targetId: id,
            targetBatchNo: batchForAssign.batchNo,
            operatorId: payload.userId,
            operatorName: payload.name,
            dataBefore: {
              productionOperatorId: batchForAssign.productionOperatorId,
              productionOperatorName: batchForAssign.productionOperatorName,
              qcOperatorId: batchForAssign.qcOperatorId,
              qcOperatorName: batchForAssign.qcOperatorName,
            },
            dataAfter: assignUpdateData,
          })
        }
      }
    }

    // ============================================
    // 基于任务模板的自动任务创建
    // 支持 start_production / start_material_prep / start_identification
    // v3.0: 创建任务时自动继承 batch.productionOperatorId
    // ============================================
    if (action === 'start_production' || action === 'start_material_prep' || action === 'start_identification') {
      const batch = await db.batch.findUnique({
        where: { id },
        include: { tasks: true, product: { select: { category: true } } },
      })

      if (batch) {
        const productLine = batch.productLine as string
        const category = batch.product?.category || undefined
        const templates = getTaskTemplates(productLine, action, category)

        // CELL_PRODUCT: 纯 iPSC 扩增产品跳过 DIFFERENTIATION 步骤
        // v3.0 fix: 使用 shouldIncludeDifferentiation 统一判断（支持批次编号回退）
        let filteredTemplates = templates
        if (filteredTemplates && productLine === 'CELL_PRODUCT') {
          if (!shouldIncludeDifferentiation(category, batch.batchNo)) {
            filteredTemplates = filteredTemplates.filter(t => t.taskCode !== 'DIFFERENTIATION')
          }
        }

        if (filteredTemplates && filteredTemplates.length > 0) {
          // 防重复：仅创建尚不存在的任务（按 taskCode 去重）
          const existingTaskCodes = new Set(batch.tasks.map((t: any) => t.taskCode))
          const newTemplates = filteredTemplates.filter((t: any) => !existingTaskCodes.has(t.taskCode))

          if (newTemplates.length > 0) {
            const tasksData = newTemplates.map((t: TaskTemplate) => ({
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
                category: category || null,
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
                    assigneeId: batch.productionOperatorId || null,
                    assigneeName: batch.productionOperatorName || null,
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
    // v3.0: 完成生产前校验所有生产任务已完成
    // 仅对 complete_production 操作生效
    // ============================================
    if (action === 'complete_production') {
      const batchForTaskCheck = await db.batch.findUnique({
        where: { id },
        select: { productLine: true, status: true },
      })

      if (batchForTaskCheck) {
        const pendingTasks = await db.productionTask.count({
          where: {
            batchId: id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        })

        if (pendingTasks > 0) {
          return NextResponse.json(
            { error: `尚有 ${pendingTasks} 个生产任务未完成，请先完成所有生产任务后再提交` },
            { status: 400 }
          )
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
