import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, hashPassword, getRolesFromPayload } from '@/lib/auth'
import { isAdmin, VALID_ROLES, serializeRoles, determinePrimaryRole } from '@/lib/roles'
import { db } from '@/lib/db'

// GET /api/users/[id] — Get single user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !isAdmin(getRolesFromPayload(payload))) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('GET /api/users/[id] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// PATCH /api/users/[id] — Update user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !isAdmin(getRolesFromPayload(payload))) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, password, role, roles, department, active } = body

    // Check user exists
    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (department !== undefined) updateData.department = department || null
    if (active !== undefined) updateData.active = active

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
      }
      // Check for duplicate email (excluding self)
      const duplicate = await db.user.findFirst({
        where: { email, id: { not: id } },
      })
      if (duplicate) {
        return NextResponse.json({ error: '邮箱已被使用' }, { status: 409 })
      }
      updateData.email = email
    }

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: '无效的角色' }, { status: 400 })
      }
      updateData.role = role
    }

    // Handle multi-role update
    if (roles !== undefined) {
      let parsedRoles: string[] = []
      if (Array.isArray(roles)) {
        parsedRoles = roles.filter((r: string) => VALID_ROLES.includes(r))
      } else if (typeof roles === 'string') {
        try {
          const parsed = JSON.parse(roles)
          if (Array.isArray(parsed)) {
            parsedRoles = parsed.filter((r: string) => VALID_ROLES.includes(r))
          }
        } catch {
          // not valid JSON string, ignore
        }
      }
      if (parsedRoles.length > 0) {
        updateData.roles = serializeRoles(parsedRoles)
        updateData.role = determinePrimaryRole(parsedRoles)
      }
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: '密码长度不能少于6位' },
          { status: 400 },
        )
      }
      updateData.password = await hashPassword(password)
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — Soft delete (set active=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !isAdmin(getRolesFromPayload(payload))) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { id } = await params

    // Prevent admin from deleting themselves
    if (payload.userId === id) {
      return NextResponse.json(
        { error: '不能禁用自己的账号' },
        { status: 400 },
      )
    }

    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    await db.user.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ message: '用户已禁用' })
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
