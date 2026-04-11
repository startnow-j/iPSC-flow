import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { validateBatchCreation } from '@/lib/services/validation'
import { createAuditLog } from '@/lib/services/audit-log'
import type { BatchStatus } from '@prisma/client'

// ============================================
// GET /api/batches — 批次列表（分页 + 筛选）
// ============================================
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)

    // 解析查询参数
    const status = searchParams.get('status') as BatchStatus | null
    const search = searchParams.get('search')
    const assignee = searchParams.get('assignee')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))

    // 构建 where 条件
    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (search) {
      where.batchNo = { contains: search }
    }
    if (assignee) {
      where.createdBy = assignee
    }

    // 并行查询：列表 + 总数 + 各状态计数
    const [batches, total, statusCounts] = await Promise.all([
      db.batch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          batchNo: true,
          productCode: true,
          productName: true,
          specification: true,
          unit: true,
          status: true,
          plannedQuantity: true,
          actualQuantity: true,
          seedBatchNo: true,
          seedPassage: true,
          currentPassage: true,
          plannedStartDate: true,
          plannedEndDate: true,
          actualStartDate: true,
          actualEndDate: true,
          storageLocation: true,
          createdBy: true,
          createdByName: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.batch.count({ where }),
      // 统计所有批次的状态分布（不加筛选条件，用于全局概览）
      db.batch.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ])

    // 格式化 statusCounts
    const statusCountsMap: Record<string, number> = {}
    for (const item of statusCounts) {
      statusCountsMap[item.status] = item._count.status
    }

    return NextResponse.json({
      batches,
      total,
      page,
      pageSize,
      statusCounts: statusCountsMap,
    })
  } catch (error) {
    console.error('GET /api/batches error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================
// POST /api/batches — 创建批次
// ============================================
export async function POST(request: NextRequest) {
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

    // 解析请求体
    const body = await request.json()
    const {
      productCode,
      plannedQuantity,
      plannedEndDate,
      seedBatchNo,
      seedPassage,
    } = body

    // 校验
    const validation = await validateBatchCreation({
      productCode,
      plannedQuantity,
      plannedEndDate,
    })
    if (!validation.valid) {
      return NextResponse.json(
        { error: '数据校验失败', details: validation.errors },
        { status: 400 }
      )
    }

    // 查询产品信息
    const product = await db.product.findUnique({
      where: { productCode: productCode.trim() },
    })
    if (!product) {
      return NextResponse.json(
        { error: `产品 ${productCode} 不存在` },
        { status: 400 }
      )
    }

    // 生成批次编号：IPSC-YYMMDD-序号-P{passage}
    const now = new Date()
    const dateStr =
      String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0')

    // 查询今天已有批次的最大序号
    const batchNoPrefix = `IPSC-${dateStr}-`
    const todayBatches = await db.batch.findMany({
      where: { batchNo: { startsWith: batchNoPrefix } },
      select: { batchNo: true },
      orderBy: { batchNo: 'desc' },
    })

    let nextSeq = 1
    if (todayBatches.length > 0) {
      // 从 batchNo 中提取序号部分（格式：IPSC-YYMMDD-XXX-Pn）
      for (const b of todayBatches) {
        const parts = b.batchNo.split('-')
        if (parts.length >= 3) {
          const seqNum = parseInt(parts[2], 10)
          if (!isNaN(seqNum) && seqNum >= nextSeq) {
            nextSeq = seqNum + 1
          }
        }
      }
    }

    const batchNo = `${batchNoPrefix}${String(nextSeq).padStart(3, '0')}`

    // 创建批次
    const batch = await db.batch.create({
      data: {
        batchNo,
        productCode: product.productCode,
        productName: product.productName,
        productId: product.id,
        specification: product.specification,
        unit: product.unit,
        status: 'NEW',
        plannedQuantity: plannedQuantity ? Number(plannedQuantity) : null,
        seedBatchNo: seedBatchNo || null,
        seedPassage: seedPassage || null,
        currentPassage: seedPassage || null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        createdBy: payload.userId,
        createdByName: payload.name,
      },
    })

    // 创建审计日志
    await createAuditLog({
      eventType: 'BATCH_CREATED',
      targetType: 'BATCH',
      targetId: batch.id,
      targetBatchNo: batch.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataAfter: {
        batchNo: batch.batchNo,
        productCode: batch.productCode,
        plannedQuantity: batch.plannedQuantity,
        seedBatchNo: batch.seedBatchNo,
        seedPassage: batch.seedPassage,
      },
    })

    return NextResponse.json({ batch }, { status: 201 })
  } catch (error) {
    console.error('POST /api/batches error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
