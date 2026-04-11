import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { transition, getStatusLabel } from '@/lib/services/state-machine'
import { createAuditLog } from '@/lib/services/audit-log'
import { db } from '@/lib/db'

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
    const { action, reason } = body

    if (!action) {
      return NextResponse.json({ error: '缺少 action 参数' }, { status: 400 })
    }

    // ============================================
    // Special: reject_coa — CoA 退回
    // REJECTED batch status 已移除。CoA 退回现在在 CoA 表层面处理（status → DRAFT），
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

      // Update CoA status to DRAFT (not REJECTED)
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
    // 开始生产时自动创建 3 个生产任务
    // ============================================
    if (action === 'start_production') {
      const batch = await db.batch.findUnique({
        where: { id },
        include: { tasks: true },
      })

      if (batch && batch.tasks.length === 0) {
        // 创建默认的 3 个生产任务
        const now = new Date()
        const tasksData = [
          {
            batchId: id,
            batchNo: batch.batchNo,
            taskCode: 'SEED_PREP',
            taskName: '种子复苏',
            sequenceNo: 1,
            stepGroup: null,
            status: 'IN_PROGRESS' as const,
            assigneeId: payload.userId,
            assigneeName: payload.name,
            actualStart: now,
          },
          {
            batchId: id,
            batchNo: batch.batchNo,
            taskCode: 'EXPANSION',
            taskName: '扩增培养',
            sequenceNo: 2,
            stepGroup: null,
            status: 'PENDING' as const,
            assigneeId: null,
            assigneeName: null,
          },
          {
            batchId: id,
            batchNo: batch.batchNo,
            taskCode: 'HARVEST',
            taskName: '收获冻存',
            sequenceNo: 3,
            stepGroup: null,
            status: 'PENDING' as const,
            assigneeId: null,
            assigneeName: null,
          },
        ]

        await db.productionTask.createMany({
          data: tasksData,
        })

        // 记录审计日志：自动创建生产任务
        await createAuditLog({
          eventType: 'BATCH_STATUS_CHANGED',
          targetType: 'BATCH',
          targetId: id,
          targetBatchNo: batch.batchNo,
          operatorId: payload.userId,
          operatorName: payload.name,
          dataAfter: {
            action: 'start_production_auto_tasks',
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

    // 执行状态转换（包括新动作: receive_sample, request_handover, accept_handover,
    // start_identification, complete_identification, submit_report, start_material_prep）
    const result = await transition(
      id,
      action,
      payload.userId,
      payload.name,
      reason
    )

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // 记录审计日志
    // 查询批次编号用于 targetBatchNo
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
