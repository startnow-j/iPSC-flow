import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ productCode: string }>
}

// ============================================
// GET /api/kit-components/[productCode] — 获取试剂盒组分配置
// ============================================
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    // Auth check
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const { productCode } = await params

    const components = await db.kitComponent.findMany({
      where: { productCode },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        productCode: true,
        name: true,
        description: true,
        sortOrder: true,
      },
    })

    return NextResponse.json({ components })
  } catch (error) {
    console.error('GET /api/kit-components/[productCode] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
