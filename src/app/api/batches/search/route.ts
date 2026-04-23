import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// 禁止缓存
export const dynamic = 'force-dynamic'

// ============================================
// GET /api/batches/search — 搜索批次（用于功能性验证关联）
// ============================================
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const productLine = searchParams.get('productLine') || undefined
    const search = searchParams.get('search') || ''
    const excludeBatchId = searchParams.get('excludeBatchId') || undefined

    if (!search || search.length < 2) {
      return NextResponse.json({ batches: [] })
    }

    // 构建查询条件
    const where: Prisma.BatchWhereInput = {
      // 排除自身批次
      ...(excludeBatchId ? { id: { not: excludeBatchId } } : {}),
      // 按产品线过滤
      ...(productLine ? { productLine: productLine as any } : {}),
      // 搜索条件：批次号或产品编码
      OR: [
        { batchNo: { contains: search } },
        { productCode: { contains: search } },
      ],
      // 只返回已完成QC或已放行的批次
      status: { in: ['QC_PASS', 'COA_SUBMITTED', 'RELEASED'] },
    }

    const batches = await db.batch.findMany({
      where,
      select: {
        id: true,
        batchNo: true,
        productCode: true,
        productName: true,
        status: true,
        productLine: true,
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('GET /api/batches/search error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
