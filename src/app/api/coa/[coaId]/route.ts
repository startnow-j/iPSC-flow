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
// Actions (按产品线区分):
//   submit:
//     CELL_PRODUCT/KIT → transition 'submit_coa' (DRAFT→SUBMITTED, batch COA_PENDING→COA_SUBMITTED)
//     SERVICE          → transition 'submit_report' (DRAFT→SUBMITTED, batch REPORT_PENDING→COA_SUBMITTED)
//   approve:
//     CELL_PRODUCT/KIT → transition 'approve_coa' (SUBMITTED→APPROVED, batch COA_SUBMITTED→COA_APPROVED)
//     SERVICE          → transition 'approve' (SUBMITTED→APPROVED, batch COA_SUBMITTED→RELEASED)
//   reject:
//     CELL_PRODUCT     → CoA→DRAFT, batch stays COA_SUBMITTED (no transition)
//     SERVICE          → transition 'reject' (batch COA_SUBMITTED→REPORT_PENDING), CoA→DRAFT
//     KIT              → 400 error (no reject support)
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

      // 根据产品线选择不同的 transition action
      const transitionAction = productLine === 'SERVICE' ? 'submit_report' : 'submit_coa'
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

      // 根据产品线选择不同的 transition action
      const transitionAction = productLine === 'SERVICE' ? 'approve' : 'approve_coa'
      const result = await transition(
        existingCoa.batchId,
        transitionAction,
        payload.userId,
        payload.name,
      )

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      // SERVICE: transition('approve') doesn't update CoA status, do it manually
      if (productLine === 'SERVICE') {
        await db.coa.update({
          where: { id: coaId },
          data: {
            status: 'APPROVED',
            approvedBy: payload.userId,
            approvedByName: payload.name,
            approvedAt: new Date(),
          },
        })
      }

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
    // Reject (SUBMITTED → DRAFT/REJECTED)
    // 按产品线区分处理
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

      if (productLine === 'CELL_PRODUCT') {
        // CELL_PRODUCT: CoA → DRAFT, batch stays COA_SUBMITTED
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
      } else {
        // SERVICE: transition 'reject' (batch COA_SUBMITTED → REPORT_PENDING), CoA → DRAFT
        const result = await transition(
          existingCoa.batchId,
          'reject',
          payload.userId,
          payload.name,
          reviewComment,
        )

        if (!result.success) {
          return NextResponse.json({ error: result.message }, { status: 400 })
        }

        // Update CoA to DRAFT
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
          dataBefore: { coaStatus: existingCoa.status, batchStatus: 'COA_SUBMITTED' },
          dataAfter: {
            coaStatus: 'DRAFT',
            batchStatus: result.newState,
            reviewComment,
          },
        })

        const updatedCoa = await db.coa.findUnique({ where: { id: coaId } })
        return NextResponse.json({
          success: true,
          message: result.message,
          newState: result.newState,
          coa: updatedCoa ? { ...updatedCoa, content: JSON.parse(updatedCoa.content) } : null,
        })
      }
    }

    // Should never reach here
    return NextResponse.json({ error: '无效操作' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/coa/[coaId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
