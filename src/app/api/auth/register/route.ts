import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { isAdmin } from '@/lib/roles'

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !isAdmin(getRolesFromPayload(payload))) {
      return NextResponse.json(
        { error: '权限不足，仅管理员可创建用户' },
        { status: 403 }
      )
    }

    const { name, email, password, role, department } = await request.json()

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: '请填写所有必填字段（姓名、邮箱、密码、角色）' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'QA']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: '无效的角色类型' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        department: department || null,
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
