import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { transition, getStatusLabel } from '@/lib/services/state-machine'
import { createAuditLog } from '@/lib/services/audit-log'

// ============================================
// GET /api/coa/[coaId] — 获取CoA详情
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coaId: string }> }
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

    const { coaId } = await params

    const coa = await db.coa.findUnique({
      where: { id: coaId },
    })

    if (!coa) {
      return NextResponse.json({ error: 'CoA不存在' }, { status: 404 })
    }

    return NextResponse.json({
      coa: {
        ...coa,
        content: JSON.parse(coa.content),
      },
    })
  } catch (error) {
    console.error('GET /api/coa/[coaId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================
// PATCH /api/coa/[coaId] — 更新CoA（提交/审核）
//
// Actions:
//   submit   → 提交审核（DRAFT → SUBMITTED），触发批次 COA_PENDING → COA_SUBMITTED
//   approve  → 批准（SUBMITTED → APPROVED），触发批次 COA_SUBMITTED → COA_APPROVED
//   reject   → 退回（SUBMITTED → REJECTED），触发批次 COA_SUBMITTED → REJECTED
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ coaId: string }> }
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

    const { coaId } = await params
    const body = await request.json()
    const { action, reviewComment } = body

    if (!action || !['submit', 'approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: '无效的 action，支持: submit / approve / reject' },
        { status: 400 }
      )
    }

    // 查询CoA
    const existingCoa = await db.coa.findUnique({
      where: { id: coaId },
    })

    if (!existingCoa) {
      return NextResponse.json({ error: 'CoA不存在' }, { status: 404 })
    }

    // 映射 action → transition action + audit event type
    let transitionAction: string
    let auditEventType: string

    switch (action) {
      case 'submit':
        if (existingCoa.status !== 'DRAFT') {
          return NextResponse.json(
            { error: '只有草稿状态的CoA可以提交审核' },
            { status: 400 }
          )
        }
        transitionAction = 'submit_coa'
        auditEventType = 'COA_SUBMITTED'
        break

      case 'approve':
        if (existingCoa.status !== 'SUBMITTED') {
          return NextResponse.json(
            { error: '只有已提交状态的CoA可以批准' },
            { status: 400 }
          )
        }
        transitionAction = 'approve_coa'
        auditEventType = 'COA_APPROVED'
        break

      case 'reject':
        if (existingCoa.status !== 'SUBMITTED') {
          return NextResponse.json(
            { error: '只有已提交状态的CoA可以退回' },
            { status: 400 }
          )
        }
        transitionAction = 'reject_coa'
        auditEventType = 'COA_REJECTED'
        break
    }

    // 执行批次状态转换（状态机内部会同步更新CoA状态）
    const result = await transition(
      existingCoa.batchId,
      transitionAction,
      payload.userId,
      payload.name,
      reviewComment
    )

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // 如果是退回，额外更新 reviewComment
    if (action === 'reject' && reviewComment) {
      await db.coa.update({
        where: { id: coaId },
        data: { reviewComment },
      })
    }

    // 记录审计日志
    await createAuditLog({
      eventType: auditEventType,
      targetType: 'COA',
      targetId: coaId,
      targetBatchNo: existingCoa.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataBefore: { coaStatus: existingCoa.status },
      dataAfter: {
        coaStatus: action === 'submit' ? 'SUBMITTED' : action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewComment,
      },
    })

    // 查询更新后的CoA
    const updatedCoa = await db.coa.findUnique({
      where: { id: coaId },
    })

    return NextResponse.json({
      success: true,
      message: result.message,
      newState: result.newState,
      coa: updatedCoa ? {
        ...updatedCoa,
        content: JSON.parse(updatedCoa.content),
      } : null,
    })
  } catch (error) {
    console.error('PATCH /api/coa/[coaId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
