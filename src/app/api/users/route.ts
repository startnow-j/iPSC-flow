import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken, hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/users — List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request.cookies)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const users = await db.user.findMany({
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/users — Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request.cookies)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, department } = body

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
    const validRoles = ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'QA']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: (role || 'OPERATOR') as 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'QA',
        department: department || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
