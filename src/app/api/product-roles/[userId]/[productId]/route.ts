import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import {
  isAdmin,
  hasAnyRole,
  parseRoles,
  OPERATIONAL_ROLES,
} from '@/lib/roles'
import { db } from '@/lib/db'
import { createAuditLog } from '@/lib/services/audit-log'

// GET /api/product-roles/[userId]/[productId] — Get specific assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; productId: string }> },
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const userRoles = getRolesFromPayload(payload)
    const { userId, productId } = await params

    // User can see their own assignment
    // SUPERVISOR can see within their lines
    // ADMIN sees all
    if (
      !isAdmin(userRoles) &&
      payload.userId !== userId &&
      !hasAnyRole(userRoles, ['SUPERVISOR'])
    ) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    // For SUPERVISOR: check if the product belongs to their product line
    if (!isAdmin(userRoles) && payload.userId !== userId) {
      const requestorLines = await db.userProductLine.findMany({
        where: { userId: payload.userId },
        select: { productLine: true },
      })
      const requestorProductLines = requestorLines.map((pl) => pl.productLine)

      const product = await db.product.findUnique({
        where: { id: productId },
        select: { productLine: true },
      })
      if (!product || !requestorProductLines.includes(product.productLine)) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }
    }

    const assignment = await db.userProductRole.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            productCode: true,
            productName: true,
            productLine: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: '未找到该产品角色分配' }, { status: 404 })
    }

    let parsedRoles: string[] = []
    try {
      parsedRoles = JSON.parse(assignment.roles)
    } catch {
      parsedRoles = []
    }

    return NextResponse.json({
      assignment: {
        userId: assignment.userId,
        userName: assignment.user.name,
        productId: assignment.productId,
        productCode: assignment.product.productCode,
        productName: assignment.product.productName,
        productLine: assignment.product.productLine,
        roles: parsedRoles,
      },
    })
  } catch (error) {
    console.error('GET /api/product-roles/[userId]/[productId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// PATCH /api/product-roles/[userId]/[productId] — Update roles
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; productId: string }> },
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const userRoles = getRolesFromPayload(payload)
    const { userId, productId } = await params
    const body = await request.json()
    const { roles } = body

    // Validate roles
    if (!Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { error: '角色必须是非空数组' },
        { status: 400 },
      )
    }

    const validRoles = roles.filter((r: string) => OPERATIONAL_ROLES.includes(r))
    if (validRoles.length === 0) {
      return NextResponse.json(
        { error: `角色只能包含: ${OPERATIONAL_ROLES.join(', ')}` },
        { status: 400 },
      )
    }

    // Check product exists and is active
    const product = await db.product.findUnique({
      where: { id: productId },
    })
    if (!product || !product.active) {
      return NextResponse.json({ error: '产品不存在或未激活' }, { status: 404 })
    }

    // Check user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        productLines: { select: { productLine: true } },
      },
    })
    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // Check user belongs to this product's line
    const userProductLines = targetUser.productLines.map((pl) => pl.productLine)
    if (!userProductLines.includes(product.productLine)) {
      return NextResponse.json(
        { error: `用户不属于产品线 ${product.productLine}` },
        { status: 400 },
      )
    }

    // Check roles don't exceed user's global roles
    const targetUserGlobalRoles = parseRoles(targetUser.roles, targetUser.role)
    const invalidRoles = validRoles.filter(
      (r: string) => !targetUserGlobalRoles.includes(r),
    )
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `用户全局角色中不包含: ${invalidRoles.join(', ')}，无法分配` },
        { status: 400 },
      )
    }

    // Permission: ADMIN can do any, SUPERVISOR only within their lines
    if (!isAdmin(userRoles)) {
      if (!hasAnyRole(userRoles, ['SUPERVISOR'])) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }

      const requestorLines = await db.userProductLine.findMany({
        where: { userId: payload.userId },
        select: { productLine: true },
      })
      const requestorProductLines = requestorLines.map((pl) => pl.productLine)

      if (!requestorProductLines.includes(product.productLine)) {
        return NextResponse.json(
          { error: '您不是该产品线的主管，无权分配产品角色' },
          { status: 403 },
        )
      }
    }

    // Get old assignment for audit
    const oldAssignment = await db.userProductRole.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    })

    let oldRoles: string[] = []
    if (oldAssignment) {
      try {
        oldRoles = JSON.parse(oldAssignment.roles)
      } catch {
        oldRoles = []
      }
    }

    // Upsert
    const serializedRoles = JSON.stringify(validRoles)
    const assignment = await db.userProductRole.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      update: {
        roles: serializedRoles,
      },
      create: {
        userId,
        productId,
        roles: serializedRoles,
      },
    })

    // Get product info for audit log
    const productInfo = await db.product.findUnique({
      where: { id: productId },
      select: { productCode: true, productName: true },
    })

    // Create audit log
    await createAuditLog({
      eventType: 'PRODUCT_ROLE_UPDATED',
      targetType: 'USER_PRODUCT_ROLE',
      targetId: assignment.id,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataBefore: {
        userId,
        userName: targetUser.name,
        productId,
        productCode: productInfo?.productCode,
        roles: oldRoles,
      },
      dataAfter: {
        userId,
        userName: targetUser.name,
        productId,
        productCode: productInfo?.productCode,
        productName: productInfo?.productName,
        productLine: product.productLine,
        roles: validRoles,
      },
    })

    return NextResponse.json({
      assignment: {
        userId,
        userName: targetUser.name,
        productId,
        productCode: productInfo?.productCode,
        productName: productInfo?.productName,
        productLine: product.productLine,
        roles: validRoles,
      },
    })
  } catch (error) {
    console.error('PATCH /api/product-roles/[userId]/[productId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/product-roles/[userId]/[productId] — Remove assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; productId: string }> },
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const userRoles = getRolesFromPayload(payload)
    const { userId, productId } = await params

    // Permission: ADMIN can do any, SUPERVISOR only within their lines
    if (!isAdmin(userRoles)) {
      if (!hasAnyRole(userRoles, ['SUPERVISOR'])) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }

      // Check product's product line
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { productLine: true },
      })
      if (!product) {
        return NextResponse.json({ error: '产品不存在' }, { status: 404 })
      }

      const requestorLines = await db.userProductLine.findMany({
        where: { userId: payload.userId },
        select: { productLine: true },
      })
      const requestorProductLines = requestorLines.map((pl) => pl.productLine)

      if (!requestorProductLines.includes(product.productLine)) {
        return NextResponse.json(
          { error: '您不是该产品线的主管，无权删除产品角色' },
          { status: 403 },
        )
      }
    }

    // Check assignment exists
    const assignment = await db.userProductRole.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
      include: {
        user: {
          select: { name: true },
        },
        product: {
          select: { productCode: true, productName: true, productLine: true },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: '未找到该产品角色分配' }, { status: 404 })
    }

    let oldRoles: string[] = []
    try {
      oldRoles = JSON.parse(assignment.roles)
    } catch {
      oldRoles = []
    }

    // Delete the assignment
    await db.userProductRole.delete({
      where: {
        userId_productId: { userId, productId },
      },
    })

    // Create audit log
    await createAuditLog({
      eventType: 'PRODUCT_ROLE_REMOVED',
      targetType: 'USER_PRODUCT_ROLE',
      targetId: assignment.id,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataBefore: {
        userId,
        userName: assignment.user.name,
        productId,
        productCode: assignment.product.productCode,
        productName: assignment.product.productName,
        productLine: assignment.product.productLine,
        roles: oldRoles,
      },
    })

    return NextResponse.json({ message: '产品角色已删除' })
  } catch (error) {
    console.error('DELETE /api/product-roles/[userId]/[productId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
