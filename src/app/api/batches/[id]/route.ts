import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import { getAvailableActions } from '@/lib/services/state-machine'

// ============================================
// GET /api/batches/[id] — 批次详情（含可用操作）
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 认证检查
    const cookies = Object.fromEntries(request.cookies)
    const token = getTokenFromCookies(cookies)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
    }

    const { id } = await params

    const batch = await db.batch.findUnique({
      where: { id },
    })

    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 获取当前用户可执行的操作
    const availableActions = getAvailableActions(
      batch.status as string,
      payload.role || 'OPERATOR'
    )

    return NextResponse.json({ batch, availableActions })
  } catch (error) {
    console.error('GET /api/batches/[id] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================
// PATCH /api/batches/[id] — 更新批次信息
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 认证检查
    const cookies = Object.fromEntries(request.cookies)
    const token = getTokenFromCookies(cookies)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
    }

    const { id } = await params

    // 检查批次是否存在
    const existing = await db.batch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    const body = await request.json()
    const {
      plannedQuantity,
      actualQuantity,
      seedBatchNo,
      seedPassage,
      currentPassage,
      storageLocation,
      plannedStartDate,
      plannedEndDate,
    } = body

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    if (plannedQuantity !== undefined) updateData.plannedQuantity = Number(plannedQuantity)
    if (actualQuantity !== undefined) updateData.actualQuantity = Number(actualQuantity)
    if (seedBatchNo !== undefined) updateData.seedBatchNo = seedBatchNo
    if (seedPassage !== undefined) updateData.seedPassage = seedPassage
    if (currentPassage !== undefined) updateData.currentPassage = currentPassage
    if (storageLocation !== undefined) updateData.storageLocation = storageLocation
    if (plannedStartDate !== undefined) updateData.plannedStartDate = plannedStartDate ? new Date(plannedStartDate) : null
    if (plannedEndDate !== undefined) updateData.plannedEndDate = plannedEndDate ? new Date(plannedEndDate) : null

    const batch = await db.batch.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ batch })
  } catch (error) {
    console.error('PATCH /api/batches/[id] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
