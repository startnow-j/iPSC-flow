import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { isAdmin } from '@/lib/roles'
import type { ProductLine } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================
// GET /api/products/[id] — 产品详情
// ============================================
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
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

    if (!product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================
// PATCH /api/products/[id] — 更新产品（ADMIN only）
// ============================================
export async function PATCH(
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
    if (!payload || !isAdmin(getRolesFromPayload(payload))) {
      return NextResponse.json({ error: '无权限，仅管理员可修改产品' }, { status: 403 })
    }

    const { id } = await params

    // Check product exists
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 })
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

    // If updating productCode, check uniqueness
    if (productCode && productCode.trim() !== existing.productCode) {
      const duplicate = await db.product.findUnique({
        where: { productCode: productCode.trim() },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: `产品编码 ${productCode} 已存在` },
          { status: 409 },
        )
      }
    }

    // Validate productLine if provided
    if (productLine) {
      const validProductLines = ['SERVICE', 'CELL_PRODUCT', 'KIT']
      if (!validProductLines.includes(productLine)) {
        return NextResponse.json(
          { error: '无效的产品线' },
          { status: 400 },
        )
      }
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {}
    if (productCode !== undefined) updateData.productCode = productCode.trim()
    if (productName !== undefined) updateData.productName = productName.trim()
    if (productLine !== undefined) updateData.productLine = productLine as ProductLine
    if (category !== undefined) updateData.category = category.trim()
    if (cellType !== undefined) updateData.cellType = cellType?.trim() || null
    if (specification !== undefined) updateData.specification = specification?.trim() || ''
    if (storageCondition !== undefined) updateData.storageCondition = storageCondition?.trim() || null
    if (shelfLife !== undefined) updateData.shelfLife = shelfLife?.trim() || null
    if (unit !== undefined) updateData.unit = unit.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (active !== undefined) updateData.active = active

    const product = await db.product.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ product })
  } catch (error) {
    console.error('PATCH /api/products/[id] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
