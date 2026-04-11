import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, hashPassword, getRolesFromPayload } from '@/lib/auth'
import { isAdmin, hasAnyRole, VALID_ROLES, serializeRoles, determinePrimaryRole, parseRoles, MANAGEMENT_ROLES } from '@/lib/roles'
import { db } from '@/lib/db'

// GET /api/users — List users
// - ADMIN: all users
// - SUPERVISOR: all users (full visibility for permission overview)
// - QA/QC/OPERATOR: self only (own permission overview)
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
    const isManagement = isAdmin(userRoles) || hasAnyRole(userRoles, ['SUPERVISOR'])

    let users
    if (isManagement) {
      // ADMIN + SUPERVISOR: see all users
      users = await db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roles: true,
          department: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          productLines: {
            select: {
              productLine: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      // QA/QC/OPERATOR: see self only
      users = await db.user.findMany({
        where: { id: payload.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roles: true,
          department: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          productLines: {
            select: {
              productLine: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    const formattedUsers = users.map((u) => ({
      ...u,
      roles: parseRoles(u.roles, u.role),
      productLines: u.productLines.map((pl) => pl.productLine),
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/users — Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !isAdmin(getRolesFromPayload(payload))) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, roles, department, productLines } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '姓名、邮箱和密码为必填项' },
        { status: 400 },
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    // Password min 6 chars
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度不能少于6位' },
        { status: 400 },
      )
    }

    // Check for duplicate email
    const existingUser = await db.user.findUnique({
      where: { email },
    })
    if (existingUser) {
      return NextResponse.json({ error: '邮箱已被使用' }, { status: 409 })
    }

    // Valid role
    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 })
    }

    // Handle multi-role support
    let finalRoles: string[] = []
    if (roles) {
      if (Array.isArray(roles)) {
        finalRoles = roles.filter((r: string) => VALID_ROLES.includes(r))
      } else if (typeof roles === 'string') {
        try {
          const parsed = JSON.parse(roles)
          if (Array.isArray(parsed)) {
            finalRoles = parsed.filter((r: string) => VALID_ROLES.includes(r))
          }
        } catch {
          // not valid JSON string, ignore
        }
      }
    }
    if (finalRoles.length === 0) {
      finalRoles = [role || 'OPERATOR']
    } else if (role && !finalRoles.includes(role)) {
      finalRoles.unshift(role)
    }
    const primaryRole = determinePrimaryRole(finalRoles)

    // Validate productLines
    const validProductLines = ['SERVICE', 'CELL_PRODUCT', 'KIT']
    let finalProductLines: string[] = []
    if (productLines && Array.isArray(productLines)) {
      finalProductLines = productLines.filter((pl: string) =>
        validProductLines.includes(pl),
      )
    }

    const hashedPassword = await hashPassword(password)

    // Create user + product lines in a transaction
    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: primaryRole,
          roles: serializeRoles(finalRoles),
          department: department || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roles: true,
          department: true,
          active: true,
          createdAt: true,
        },
      })

      // Create UserProductLine records
      if (finalProductLines.length > 0) {
        await tx.userProductLine.createMany({
          data: finalProductLines.map((productLine) => ({
            userId: createdUser.id,
            productLine,
          })),
        })
      }

      return createdUser
    })

    // Fetch the created user with productLines
    const userWithLines = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roles: true,
        department: true,
        active: true,
        createdAt: true,
        productLines: {
          select: {
            productLine: true,
          },
        },
      },
    })

    const formattedUser = {
      ...userWithLines!,
      roles: parseRoles(userWithLines!.roles, userWithLines!.role),
      productLines: userWithLines!.productLines.map((pl) => pl.productLine),
    }

    return NextResponse.json({ user: formattedUser }, { status: 201 })
  } catch (error) {
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
