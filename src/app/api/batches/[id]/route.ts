import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 禁止缓存
export const dynamic = 'force-dynamic'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
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
    const token = getTokenFromRequest(request)
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
      include: {
        product: {
          select: { category: true },
        },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 获取当前用户可执行的操作
    let availableActions = getAvailableActions(
      batch.productLine as import('@prisma/client').ProductLine,
      batch.status as string,
      getRolesFromPayload(payload)
    )

    // v3.0: 生产中状态下，如果尚有未完成的生产任务，则隐藏"完成生产"按钮
    if (batch.status === 'IN_PRODUCTION' && availableActions.some(a => a.action === 'complete_production')) {
      const pendingTaskCount = await db.productionTask.count({
        where: {
          batchId: id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })
      if (pendingTaskCount > 0) {
        availableActions = availableActions.filter(a => a.action !== 'complete_production')
      }
    }

    // v3.0: 鉴定中状态下，如果尚有未完成的鉴定任务，则隐藏"鉴定完成"按钮
    if (batch.status === 'IDENTIFICATION' && availableActions.some(a => a.action === 'complete_identification')) {
      const pendingTaskCount = await db.productionTask.count({
        where: {
          batchId: id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })
      if (pendingTaskCount > 0) {
        availableActions = availableActions.filter(a => a.action !== 'complete_identification')
      }
    }

    // 计算剩余数量：生产数量 - 所有质检记录消耗的复苏支数
    const qcRecords = await db.qcRecord.findMany({
      where: { batchId: id },
      select: { sampleQuantity: true },
    })
    const totalConsumed = qcRecords.reduce(
      (sum, r) => sum + (r.sampleQuantity || 0),
      0
    )
    const remainingQuantity = batch.actualQuantity
      ? Math.max(0, batch.actualQuantity - totalConsumed)
      : null

    return NextResponse.json(
      {
        batch: {
          ...batch,
          productCategory: batch.product?.category || null,
        },
        availableActions,
        remainingQuantity,
        totalConsumedVials: totalConsumed,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
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
    const token = getTokenFromRequest(request)
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
