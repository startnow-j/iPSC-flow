import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// GET /api/products — 产品列表
// ============================================
export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productCode: true,
        productName: true,
        category: true,
        cellType: true,
        specification: true,
        storageCondition: true,
        shelfLife: true,
        unit: true,
        description: true,
      },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
