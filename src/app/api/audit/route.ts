import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import { getAuditLogs } from '@/lib/services/audit-log'

// GET /api/audit — List audit logs with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request.cookies)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // Only ADMIN and SUPERVISOR can access
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    const filters = {
      targetBatchNo: searchParams.get('batchNo') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      operatorId: searchParams.get('operatorId') || undefined,
      targetType: searchParams.get('targetType') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
    }

    const result = await getAuditLogs(filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/audit error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
