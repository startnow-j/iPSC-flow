import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { transition, getStatusLabel } from '@/lib/services/state-machine'
import { createAuditLog } from '@/lib/services/audit-log'
import type { ProductLine } from '@prisma/client'

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
// Actions (v3.0 简化):
//   submit:
//     CELL_PRODUCT/KIT (batch QC_PASS) → transition 'submit_coa' (batch → COA_SUBMITTED)
//     CELL_PRODUCT/KIT (batch COA_SUBMITTED, resubmit) → transition 'resubmit_coa' (batch stays COA_SUBMITTED)
//     SERVICE (batch REPORT_PENDING) → transition 'submit_report' (batch → COA_SUBMITTED)
//   approve:
//     ALL → transition 'approve' (COA_SUBMITTED → RELEASED, CoA SUBMITTED → APPROVED)
//   reject:
//     CELL_PRODUCT/SERVICE → CoA → DRAFT, batch stays COA_SUBMITTED (no transition)
//     KIT → 400 error (no reject support)
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

    // 查询批次获取 productLine
    const batch = await db.batch.findUnique({
      where: { id: existingCoa.batchId },
      select: { productLine: true, status: true, batchNo: true },
    })

    if (!batch) {
      return NextResponse.json({ error: '关联批次不存在' }, { status: 404 })
    }

    const productLine = batch.productLine as ProductLine

    // ============================================
    // Submit (DRAFT → SUBMITTED)
    // ============================================
    if (action === 'submit') {
      if (existingCoa.status !== 'DRAFT') {
        return NextResponse.json(
          { error: '只有草稿状态的CoA可以提交审核' },
          { status: 400 }
        )
      }

      // v3.0: 根据批次状态选择正确的 transition action
      let transitionAction: string
      if (productLine === 'SERVICE' && batch.status === 'REPORT_PENDING') {
        transitionAction = 'submit_report'
      } else if (batch.status === 'QC_PASS') {
        // CELL_PRODUCT/KIT: 首次提交 CoA（QC_PASS → COA_SUBMITTED）
        transitionAction = 'submit_coa'
      } else if (batch.status === 'COA_SUBMITTED') {
        // CoA 被退回后重新提交（COA_SUBMITTED 自环）
        transitionAction = 'resubmit_coa'
      } else {
        return NextResponse.json(
          { error: `当前批次状态 ${getStatusLabel(batch.status)} 不允许提交 CoA` },
          { status: 400 }
        )
      }
      const result = await transition(
        existingCoa.batchId,
        transitionAction,
        payload.userId,
        payload.name,
      )

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      // 记录审计日志
      await createAuditLog({
        eventType: 'COA_SUBMITTED',
        targetType: 'COA',
        targetId: coaId,
        targetBatchNo: existingCoa.batchNo,
        operatorId: payload.userId,
        operatorName: payload.name,
        dataBefore: { coaStatus: existingCoa.status },
        dataAfter: { coaStatus: 'SUBMITTED' },
      })

      // 查询更新后的CoA
      const updatedCoa = await db.coa.findUnique({ where: { id: coaId } })
      return NextResponse.json({
        success: true,
        message: result.message,
        newState: result.newState,
        coa: updatedCoa ? { ...updatedCoa, content: JSON.parse(updatedCoa.content) } : null,
      })
    }

    // ============================================
    // Approve (SUBMITTED → APPROVED)
    // ============================================
    if (action === 'approve') {
      if (existingCoa.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: '只有已提交状态的CoA可以批准' },
          { status: 400 }
        )
      }

      // v3.0: 所有产品线统一使用 'approve' (COA_SUBMITTED → RELEASED)
      const transitionAction = 'approve'
      const result = await transition(
        existingCoa.batchId,
        transitionAction,
        payload.userId,
        payload.name,
      )

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      // transition('approve') 已自动更新 CoA 状态为 APPROVED 并设置 approvedBy/approvedAt

      // 记录审计日志
      await createAuditLog({
        eventType: 'COA_APPROVED',
        targetType: 'COA',
        targetId: coaId,
        targetBatchNo: existingCoa.batchNo,
        operatorId: payload.userId,
        operatorName: payload.name,
        dataBefore: { coaStatus: existingCoa.status },
        dataAfter: { coaStatus: 'APPROVED' },
      })

      // 查询更新后的CoA
      const updatedCoa = await db.coa.findUnique({ where: { id: coaId } })
      return NextResponse.json({
        success: true,
        message: result.message,
        newState: result.newState,
        coa: updatedCoa ? { ...updatedCoa, content: JSON.parse(updatedCoa.content) } : null,
      })
    }

    // ============================================
    // Reject (SUBMITTED → DRAFT)
    // v3.0: 统一处理，CoA → DRAFT，批次状态保持 COA_SUBMITTED
    // ============================================
    if (action === 'reject') {
      if (existingCoa.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: '只有已提交状态的CoA可以退回' },
          { status: 400 }
        )
      }

      // KIT 产品线不支持 CoA 退回
      if (productLine === 'KIT') {
        return NextResponse.json(
          { error: '试剂盒产品线不支持CoA退回操作' },
          { status: 400 }
        )
      }

      // v3.0: CELL_PRODUCT 和 SERVICE 统一处理
      // CoA → DRAFT，批次状态保持 COA_SUBMITTED（不触发状态转换）
      await db.coa.update({
        where: { id: coaId },
        data: {
          status: 'DRAFT',
          reviewedBy: payload.userId,
          reviewedByName: payload.name,
          reviewComment: reviewComment ?? '',
          reviewedAt: new Date(),
        },
      })

      // 记录审计日志
      await createAuditLog({
        eventType: 'COA_REJECTED',
        targetType: 'COA',
        targetId: coaId,
        targetBatchNo: existingCoa.batchNo,
        operatorId: payload.userId,
        operatorName: payload.name,
        dataBefore: { coaStatus: existingCoa.status, batchStatus: batch.status },
        dataAfter: {
          coaStatus: 'DRAFT',
          batchStatus: batch.status,
          note: 'CoA退回为草稿，批次状态保持COA_SUBMITTED',
          reviewComment,
        },
      })

      const updatedCoa = await db.coa.findUnique({ where: { id: coaId } })
      return NextResponse.json({
        success: true,
        message: `CoA已退回为草稿，批次状态保持 ${getStatusLabel(batch.status)}`,
        newState: batch.status,
        coa: updatedCoa ? { ...updatedCoa, content: JSON.parse(updatedCoa.content) } : null,
      })
    }

    // Should never reach here
    return NextResponse.json({ error: '无效操作' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/coa/[coaId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
