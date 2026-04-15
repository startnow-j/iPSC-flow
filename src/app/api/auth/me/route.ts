import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { parseRoles } from '@/lib/roles'

// 禁止缓存
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Extract token — checks Authorization header first, then cookie
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '登录已过期，请重新登录' },
        { status: 401 }
      )
    }

    // Fetch latest user info from database
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roles: true,
        department: true,
        active: true,
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
        productLines: {
          select: {
            productLine: true,
          },
        },
      },
    })

    if (!user || !user.active) {
      return NextResponse.json(
        { error: '用户不存在或已被禁用' },
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

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: roles,
        department: user.department,
        productRoles: productRoles,
        productLines: user.productLines.map((pl) => pl.productLine),
      },
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
