import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import {
  isAdmin,
  hasAnyRole,
  canManage,
  parseRoles,
  OPERATIONAL_ROLES,
  MANAGEMENT_ROLES,
} from '@/lib/roles'
import { db } from '@/lib/db'
import { createAuditLog } from '@/lib/services/audit-log'

// GET /api/product-roles — List product role assignments
export async function GET(request: NextRequest) {
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
    const requestUrl = new URL(request.url)
    const filterProductLine = requestUrl.searchParams.get('productLine')
    const filterUserId = requestUrl.searchParams.get('userId')

    // SUPERVISOR: only sees users in their own product lines
    // ADMIN: sees everything
    if (!isAdmin(userRoles)) {
      // For non-admin, check if they have SUPERVISOR role
      if (!hasAnyRole(userRoles, ['SUPERVISOR'])) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }

      // Get the supervisor's product lines
      const supervisorLines = await db.userProductLine.findMany({
        where: { userId: payload.userId },
        select: { productLine: true },
      })
      const myProductLines = supervisorLines.map((pl) => pl.productLine)

      if (myProductLines.length === 0) {
        return NextResponse.json({ assignments: [] })
      }

      // If filterProductLine specified, ensure supervisor manages that line
      if (filterProductLine && !myProductLines.includes(filterProductLine)) {
        return NextResponse.json({ assignments: [] })
      }

      // Build where clause: only users in the supervisor's product lines
      // and only products in those product lines
      const whereClause: Record<string, unknown> = {
        product: {
          productLine: { in: myProductLines },
          active: true,
        },
      }

      if (filterUserId) {
        whereClause.userId = filterUserId
      }

      if (filterProductLine) {
        whereClause.product = {
          productLine: filterProductLine,
          active: true,
        }
      }

      const assignments = await db.userProductRole.findMany({
        where: whereClause,
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
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        assignments: assignments.map((a) => {
          let parsedRoles: string[] = []
          try {
            parsedRoles = JSON.parse(a.roles)
          } catch {
            parsedRoles = []
          }
          return {
            userId: a.userId,
            userName: a.user.name,
            productId: a.productId,
            productCode: a.product.productCode,
            productName: a.product.productName,
            productLine: a.product.productLine,
            roles: parsedRoles,
          }
        }),
      })
    }

    // ADMIN: sees everything
    const whereClause: Record<string, unknown> = {
      product: { active: true },
    }

    if (filterUserId) {
      whereClause.userId = filterUserId
    }

    if (filterProductLine) {
      whereClause.product = {
        productLine: filterProductLine,
        active: true,
      }
    }

    const assignments = await db.userProductRole.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      assignments: assignments.map((a) => {
        let parsedRoles: string[] = []
        try {
          parsedRoles = JSON.parse(a.roles)
        } catch {
          parsedRoles = []
        }
        return {
          userId: a.userId,
          userName: a.user.name,
          productId: a.productId,
          productCode: a.product.productCode,
          productName: a.product.productName,
          productLine: a.product.productLine,
          roles: parsedRoles,
        }
      }),
    })
  } catch (error) {
    console.error('GET /api/product-roles error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/product-roles — Create or update product role assignment
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { userId, productId, roles } = body

    // Validate required fields
    if (!userId || !productId) {
      return NextResponse.json(
        { error: '用户ID和产品ID为必填项' },
        { status: 400 },
      )
    }

    // Validate roles: must be array and only contain OPERATIONAL_ROLES
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
        { error: `用户不属于产品线 ${product.productLine}，无法分配该产品线下的产品角色` },
        { status: 400 },
      )
    }

    // Check roles don't exceed user's global roles
    // Can't assign QC if user doesn't have QC in User.roles
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

    // Permission check: ADMIN can do any, SUPERVISOR only within their product lines
    if (!isAdmin(userRoles)) {
      if (!hasAnyRole(userRoles, ['SUPERVISOR'])) {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
      }

      // Check that requester is SUPERVISOR of this product line
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

    // Upsert UserProductRole
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
      eventType: 'PRODUCT_ROLE_ASSIGNED',
      targetType: 'USER_PRODUCT_ROLE',
      targetId: assignment.id,
      operatorId: payload.userId,
      operatorName: payload.name,
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
    }, { status: assignment.createdAt.getTime() === assignment.updatedAt.getTime() ? 201 : 200 })
  } catch (error) {
    console.error('POST /api/product-roles error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
