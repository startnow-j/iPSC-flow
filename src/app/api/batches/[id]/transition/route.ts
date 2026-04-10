import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import { transition, getStatusLabel } from '@/lib/services/state-machine'
import { createAuditLog } from '@/lib/services/audit-log'

// ============================================
// POST /api/batches/[id]/transition — 状态转换
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 认证检查
    const cookies = Object.fromEntries(request.cookies)
    const token = getTokenFromCookies(cookies)
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

    // 执行状态转换
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
    await createAuditLog({
      eventType: 'BATCH_STATUS_CHANGED',
      targetType: 'BATCH',
      targetId: id,
      targetBatchNo: undefined, // will be filled by the batch relation
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
