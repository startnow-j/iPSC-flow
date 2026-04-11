import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth'
import { parseRoles } from '@/lib/roles'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '请输入邮箱和密码' },
        { status: 400 }
      )
    }

    // Find user with product roles
    const user = await db.user.findUnique({
      where: { email },
      include: {
        productRoles: {
          where: { product: { active: true } },
          select: {
            productId: true,
            roles: true,
            product: {
              select: {
                productCode: true,
                productName: true,
                productLine: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.active) {
      return NextResponse.json(
        { error: '账号已被禁用，请联系管理员' },
        { status: 403 }
      )
    }

    // Verify password
    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // Parse user roles
    const roles = parseRoles(user.roles, user.role)

    // Parse product role assignments
    const productRoles = user.productRoles.map((pr) => {
      let parsedRoles: string[] = []
      try {
        parsedRoles = JSON.parse(pr.roles)
      } catch {
        parsedRoles = []
      }
      return {
        productId: pr.productId,
        productCode: pr.product.productCode,
        productName: pr.product.productName,
        productLine: pr.product.productLine,
        roles: parsedRoles,
      }
    })

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      roles: roles,
      name: user.name,
    })

    // Create response with cookie
    const response = NextResponse.json({
      token, // Return token in body for localStorage fallback
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: roles,
        department: user.department,
        productRoles: productRoles,
      },
    })

    // Set HttpOnly cookie (primary auth mechanism)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
