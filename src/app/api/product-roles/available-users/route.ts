import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { isAdmin, hasAnyRole, parseRoles } from '@/lib/roles'
import { db } from '@/lib/db'

/**
 * GET /api/product-roles/available-users
 * 获取可分配产品权限的用户列表
 * ADMIN: 看到所有操作类用户（有 OPERATOR 或 QC 全局角色的活跃用户）
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

    // Fetch all active users who have OPERATOR or QC in their global roles
    // AND belong to at least one manageable product line
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
