import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { isAdmin, hasAnyRole, parseRoles, MANAGEMENT_ROLES } from '@/lib/roles'
import { db } from '@/lib/db'

/**
 * GET /api/product-roles/available-users
 * 获取可分配产品权限的用户列表
 *
 * 支持 query 参数:
 *   - productId: 按具体产品过滤（只返回有该产品操作权限的用户）
 *   - 无 productId: 返回所有产品线内的操作类用户（用于产品权限配置页面）
 *
 * ADMIN: 看到所有操作类用户
 * SUPERVISOR: 只看到自己产品线内的操作类用户
 */
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

    // Only ADMIN and SUPERVISOR can access
    if (!isAdmin(userRoles) && !hasAnyRole(userRoles, ['SUPERVISOR'])) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const productId = request.nextUrl.searchParams.get('productId')

    // Determine which product lines the requestor can manage
    let manageableProductLines: string[] = []

    if (isAdmin(userRoles)) {
      manageableProductLines = ['SERVICE', 'CELL_PRODUCT', 'KIT']
    } else {
      // SUPERVISOR: get their assigned product lines
      const supervisorLines = await db.userProductLine.findMany({
        where: { userId: payload.userId },
        select: { productLine: true },
      })
      manageableProductLines = supervisorLines.map((pl) => pl.productLine)

      if (manageableProductLines.length === 0) {
        return NextResponse.json({ users: [] })
      }
    }

    // ============================================
    // When productId is provided, filter by UserProductRole
    // Only return users who have operational permission on THIS specific product
    // Management roles (ADMIN/SUPERVISOR/QA) always have full product access
    // ============================================
    if (productId) {
      // Verify the product exists and get its productLine for filtering
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, productLine: true },
      })

      if (!product) {
        return NextResponse.json({ users: [] })
      }

      // If the requestor (SUPERVISOR) doesn't manage this product's line, return empty
      if (!isAdmin(userRoles) && !manageableProductLines.includes(product.productLine)) {
        return NextResponse.json({ users: [] })
      }

      // Find all UserProductRole records for this product
      const productUserRoles = await db.userProductRole.findMany({
        where: { productId },
        select: {
          userId: true,
          roles: true,
        },
      })

      // Build a map: userId -> product-level roles
      const userProductRolesMap = new Map<string, string[]>()
      for (const pur of productUserRoles) {
        userProductRolesMap.set(pur.userId, parseRoles(pur.roles))
      }

      // Find all active users in this product line
      const usersInLine = await db.user.findMany({
        where: {
          active: true,
          productLines: {
            some: { productLine: product.productLine },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roles: true,
          department: true,
          active: true,
          productLines: {
            select: { productLine: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      // Filter users:
      // 1. Has at least one OPERATIONAL global role (OPERATOR or QC)
      // 2. AND has a UserProductRole record for this specific product with OPERATOR/QC role
      //    OR has a management global role (ADMIN/SUPERVISOR/QA) — they manage all products in their line
      const filteredUsers = usersInLine.filter((u) => {
        const parsedGlobalRoles = parseRoles(u.roles, u.role)

        // Must have at least one operational role in global roles
        if (!parsedGlobalRoles.some((r) => ['OPERATOR', 'QC'].includes(r))) {
          return false
        }

        // Management global roles (ADMIN/SUPERVISOR/QA) have implicit access to all products in their line
        const isManagementUser = parsedGlobalRoles.some((r) => MANAGEMENT_ROLES.includes(r) || r === 'QA')
        if (isManagementUser) {
          return true
        }

        // Operational users: must have explicit UserProductRole for this product
        const productRoles = userProductRolesMap.get(u.id) || []
        return productRoles.some((r) => ['OPERATOR', 'QC'].includes(r))
      })

      const formattedUsers = filteredUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        roles: parseRoles(u.roles, u.role),
        department: u.department,
        active: u.active,
        productLines: u.productLines.map((pl) => pl.productLine),
      }))

      return NextResponse.json({ users: formattedUsers })
    }

    // ============================================
    // No productId: return all operational users in manageable product lines
    // (Used by product-roles configuration page)
    // ============================================
    const users = await db.user.findMany({
      where: {
        active: true,
        productLines: {
          some: {
            productLine: { in: manageableProductLines },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roles: true,
        department: true,
        active: true,
        productLines: {
          select: {
            productLine: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Filter: only keep users who have at least one OPERATIONAL role (OPERATOR or QC)
    const filteredUsers = users.filter((u) => {
      const parsedRoles = parseRoles(u.roles, u.role)
      return parsedRoles.some((r) => ['OPERATOR', 'QC'].includes(r))
    })

    const formattedUsers = filteredUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: parseRoles(u.roles, u.role),
      department: u.department,
      active: u.active,
      productLines: u.productLines.map((pl) => pl.productLine),
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('GET /api/product-roles/available-users error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
