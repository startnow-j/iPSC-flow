import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// GET /api/products — 产品列表（含产品线分组）
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
        productLine: true,
        category: true,
        cellType: true,
        specification: true,
        storageCondition: true,
        shelfLife: true,
        unit: true,
        description: true,
      },
    })

    // Group products by product line
    const groupedByLine: Record<string, typeof products> = {}
    for (const product of products) {
      const line = product.productLine
      if (!groupedByLine[line]) {
        groupedByLine[line] = []
      }
      groupedByLine[line].push(product)
    }

    return NextResponse.json({ products, groupedByLine })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
