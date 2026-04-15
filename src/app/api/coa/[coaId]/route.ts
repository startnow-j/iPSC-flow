import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { canManage, canOperate } from '@/lib/roles'
import { db } from '@/lib/db'
import { transition, getStatusLabel } from '@/lib/services/state-machine'
import { createAuditLog } from '@/lib/services/audit-log'
import type { ProductLine } from '@prisma/client'

// 禁止缓存
export const dynamic = 'force-dynamic'

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
//     SERVICE (batch REPORT_PENDING) → transition 'submit_report' (batch → COA_SUBMITTED)
//   approve:
//     ALL → transition 'approve' (COA_SUBMITTED → RELEASED, CoA SUBMITTED → APPROVED)
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
    const { action } = body

    if (!action || !['submit', 'approve'].includes(action)) {
      return NextResponse.json(
        { error: '无效的 action，支持: submit / approve' },
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
      select: { productLine: true, productId: true, status: true, batchNo: true },
    })

    if (!batch) {
      return NextResponse.json({ error: '关联批次不存在' }, { status: 404 })
    }

    const productLine = batch.productLine as ProductLine

    // ============================================
    // 产品级权限检查（与 transition route 一致）
    // ============================================
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

    if (action === 'submit') {
      // submit_coa → QC (operational, product-level)
      // submit_report → OPERATOR + SUPERVISOR (management, productLine-level)
      if (productLine === 'SERVICE' && batch.status === 'REPORT_PENDING') {
        if (!canManage(roles, userProductLines, productLine, ['OPERATOR', 'SUPERVISOR'])) {
          return NextResponse.json({ error: '无权限提交报告' }, { status: 403 })
        }
      } else {
        // CELL_PRODUCT/KIT: submit_coa
        if (!canOperate(roles, userProductRoles, batch.productId, ['QC'])) {
          return NextResponse.json({ error: '无权限提交CoA' }, { status: 403 })
        }
      }
    } else if (action === 'approve') {
      // approve → SUPERVISOR + QA (management, productLine-level)
      if (!canManage(roles, userProductLines, productLine, ['SUPERVISOR', 'QA'])) {
        return NextResponse.json({ error: '无权限审核CoA' }, { status: 403 })
      }
    }

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

    // Should never reach here
    return NextResponse.json({ error: '无效操作' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/coa/[coaId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
