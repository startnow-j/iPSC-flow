import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// ============================================
// GET /api/batches/[id]/coa — 获取批次的CoA
// ============================================
export async function GET(
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

    // 检查批次是否存在
    const batch = await db.batch.findUnique({
      where: { id },
    })
    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 查询CoA
    const coa = await db.coa.findUnique({
      where: { batchId: id },
    })

    if (!coa) {
      return NextResponse.json({ coa: null })
    }

    return NextResponse.json({
      coa: {
        ...coa,
        content: JSON.parse(coa.content),
      },
    })
  } catch (error) {
    console.error('GET /api/batches/[id]/coa error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
