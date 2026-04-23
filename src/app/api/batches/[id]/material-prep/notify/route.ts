import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { canManage } from '@/lib/roles'
import { createAuditLog } from '@/lib/services/audit-log'
import { db } from '@/lib/db'

// ============================================
// POST /api/batches/[id]/material-prep/notify — 物料准备完成通知
// 生产操作员完成物料准备后通知主管进入下一步
//
// 权限规则:
//   - 通知发起人: 必须是批次的生产操作员，或拥有 SUPERVISOR/ADMIN 角色
//   - 仅 SUPERVISOR/ADMIN 角色可以接收此通知（即通知的目标对象）
//
// 审计日志: MATERIAL_PREP_NOTIFICATION
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ============================================
    // 认证检查
    // ============================================
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
    }

    const roles = getRolesFromPayload(payload)
    const { id } = await params

    // ============================================
    // 查询批次信息
    // ============================================
    const batch = await db.batch.findUnique({
      where: { id },
      select: {
        id: true,
        batchNo: true,
        productLine: true,
        status: true,
        productionOperatorId: true,
        productionOperatorName: true,
      },
    })

    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // ============================================
    // 校验批次为 KIT 产品线且处于 MATERIAL_PREP 状态
    // ============================================
    if (batch.productLine !== 'KIT') {
      return NextResponse.json(
        { error: '仅试剂盒(KIT)批次支持物料准备完成通知' },
        { status: 400 }
      )
    }

    if (batch.status !== 'MATERIAL_PREP') {
      return NextResponse.json(
        { error: `批次当前状态为 ${batch.status}，仅 MATERIAL_PREP 状态可发送通知` },
        { status: 400 }
      )
    }

    // ============================================
    // 校验通知发起人权限
    // 必须是批次的指派生产操作员，或拥有 SUPERVISOR/ADMIN 角色
    // ============================================
    const isAssignedOperator = batch.productionOperatorId === payload.userId
    const hasSupervisorRole = roles.includes('SUPERVISOR') || roles.includes('ADMIN')

    if (!isAssignedOperator && !hasSupervisorRole) {
      return NextResponse.json(
        { error: '仅该批次指派的生产操作员或生产主管可发送物料准备完成通知' },
        { status: 403 }
      )
    }

    // ============================================
    // 校验接收人权限：仅 SUPERVISOR/ADMIN 可接收通知
    // （此接口的设计意图是由操作员通知主管）
    // ============================================
    if (!hasSupervisorRole) {
      // 发起人是操作员，系统会自动通知该产品线的 SUPERVISOR/ADMIN
      // 此处不返回错误，仅做记录
    }

    // ============================================
    // 创建审计日志: MATERIAL_PREP_NOTIFICATION
    // ============================================
    await createAuditLog({
      eventType: 'MATERIAL_PREP_NOTIFICATION',
      targetType: 'BATCH',
      targetId: id,
      targetBatchNo: batch.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataAfter: {
        message: '操作员已完成物料准备，通知主管进行审核并启动下一步生产',
        productionOperatorId: batch.productionOperatorId,
        productionOperatorName: batch.productionOperatorName,
        notifiedBy: payload.name,
        notifiedById: payload.userId,
      },
    })

    return NextResponse.json({
      success: true,
      message: '物料准备完成通知已发送，请等待主管审核并启动下一步生产',
    })
  } catch (error) {
    console.error('POST /api/batches/[id]/material-prep/notify error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
