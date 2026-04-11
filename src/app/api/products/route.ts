import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { isAdmin } from '@/lib/roles'
import type { ProductLine } from '@prisma/client'

// Product code auto-generation prefixes by product line
const PRODUCT_CODE_PREFIXES: Record<string, string> = {
  CELL_PRODUCT: 'CP',
  SERVICE: 'SRV',
  KIT: 'KIT',
}

// ============================================
// GET /api/products — 产品列表（含筛选 + 产品线分组）
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productLine = searchParams.get('productLine') as ProductLine | null
    const search = searchParams.get('search')

    // Build where clause
    const where: Record<string, unknown> = {}
    if (productLine) {
      where.productLine = productLine
    }
    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { productCode: { contains: search } },
      ]
    }

    const products = await db.product.findMany({
      where,
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
        active: true,
        createdAt: true,
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

// ============================================
// POST /api/products — 创建产品（ADMIN only）
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload || !isAdmin(getRolesFromPayload(payload))) {
      return NextResponse.json({ error: '无权限，仅管理员可创建产品' }, { status: 403 })
    }

    const body = await request.json()
    const {
      productCode,
      productName,
      productLine,
      category,
      cellType,
      specification,
      storageCondition,
      shelfLife,
      unit,
      description,
      active,
    } = body

    // Validate required fields
    if (!productName || !productName.trim()) {
      return NextResponse.json({ error: '产品名称为必填项' }, { status: 400 })
    }

    // Validate productLine
    const validProductLines = ['SERVICE', 'CELL_PRODUCT', 'KIT']
    const line = productLine || 'CELL_PRODUCT'
    if (!validProductLines.includes(line)) {
      return NextResponse.json(
        { error: '无效的产品线，可选值: SERVICE, CELL_PRODUCT, KIT' },
        { status: 400 },
      )
    }

    // Validate category
    if (!category || !category.trim()) {
      return NextResponse.json({ error: '产品分类为必填项' }, { status: 400 })
    }

    // Validate unit
    if (!unit || !unit.trim()) {
      return NextResponse.json({ error: '单位为必填项' }, { status: 400 })
    }

    // Generate product code if not provided
    let finalProductCode = productCode
    if (!finalProductCode || !finalProductCode.trim()) {
      const prefix = PRODUCT_CODE_PREFIXES[line] || 'PRD'
      // Find the max sequence number for this prefix
      const existingProducts = await db.product.findMany({
        where: { productCode: { startsWith: prefix } },
        select: { productCode: true },
        orderBy: { productCode: 'desc' },
      })

      let maxSeq = 0
      for (const p of existingProducts) {
        // Try to extract sequence number from product code
        // Format examples: CP-001, SRV-REPG-001, KIT-NDF-001
        const parts = p.productCode.split('-')
        const lastPart = parts[parts.length - 1]
        const seq = parseInt(lastPart, 10)
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq
        }
      }

      finalProductCode = `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`
    }

    // Check productCode uniqueness
    const existingProduct = await db.product.findUnique({
      where: { productCode: finalProductCode.trim() },
    })
    if (existingProduct) {
      return NextResponse.json(
        { error: `产品编码 ${finalProductCode} 已存在` },
        { status: 409 },
      )
    }

    // Create product
    const product = await db.product.create({
      data: {
        productCode: finalProductCode.trim(),
        productName: productName.trim(),
        productLine: line as ProductLine,
        category: category.trim(),
        cellType: cellType?.trim() || null,
        specification: specification?.trim() || '',
        storageCondition: storageCondition?.trim() || null,
        shelfLife: shelfLife?.trim() || null,
        unit: unit.trim(),
        description: description?.trim() || null,
        active: active !== undefined ? active : true,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
