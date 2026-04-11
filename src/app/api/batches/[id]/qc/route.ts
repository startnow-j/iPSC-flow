import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateQcRecord, type TestResultItem } from '@/lib/services/validation'
import { createAuditLog } from '@/lib/services/audit-log'

// ============================================
// GET /api/batches/[id]/qc — 获取批次的质检记录列表
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

    // 检查批次是否存在
    const batch = await db.batch.findUnique({
      where: { id },
    })
    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 查询所有质检记录，按创建时间倒序
    const qcRecords = await db.qcRecord.findMany({
      where: { batchId: id },
      orderBy: { createdAt: 'desc' },
    })

    // 解析 JSON 字段
    const parsedRecords = qcRecords.map((record) => ({
      ...record,
      testResults: JSON.parse(record.testResults),
    }))

    return NextResponse.json({ qcRecords: parsedRecords })
  } catch (error) {
    console.error('GET /api/batches/[id]/qc error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================
// POST /api/batches/[id]/qc — 创建质检记录
// ============================================
export async function POST(
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
    const body = await request.json()
    const { testResults, operatorId, operatorName } = body

    if (!Array.isArray(testResults) || testResults.length === 0) {
      return NextResponse.json({ error: '检测结果不能为空' }, { status: 400 })
    }

    // 检查批次是否存在
    const batch = await db.batch.findUnique({
      where: { id },
    })
    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    if (batch.status !== 'QC_IN_PROGRESS') {
      return NextResponse.json(
        { error: '只能在质检中进行状态下创建质检记录' },
        { status: 400 }
      )
    }

    // 校验检测结果
    const validation = validateQcRecord(testResults)
    if (!validation.valid) {
      return NextResponse.json(
        { error: '检测结果校验失败', validation },
        { status: 400 }
      )
    }

    // 自动计算综合判定
    const overallJudgment = testResults.every(
      (item: TestResultItem) => item.judgment === 'PASS'
    )
      ? 'PASS'
      : 'FAIL'

    // 收集不合格原因
    const failItems = testResults.filter(
      (item: TestResultItem) => item.judgment === 'FAIL'
    )
    const failReason = failItems.length > 0
      ? failItems.map((item: TestResultItem) => `${item.itemName || item.itemCode}: ${item.resultValue || item.judgment}`).join('; ')
      : null

    // 创建质检记录
    const qcRecord = await db.qcRecord.create({
      data: {
        batchId: id,
        batchNo: batch.batchNo,
        qcType: 'ROUTINE',
        testResults: JSON.stringify(testResults),
        overallJudgment,
        failReason,
        operatorId: operatorId || payload.userId,
        operatorName: operatorName || payload.name,
        operatedAt: new Date(),
      },
    })

    // 记录审计日志
    await createAuditLog({
      eventType: 'QC_RECORD_CREATED',
      targetType: 'QC',
      targetId: qcRecord.id,
      targetBatchNo: batch.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataAfter: {
        qcType: 'ROUTINE',
        overallJudgment,
        testResults,
        failReason,
      },
    })

    return NextResponse.json({
      qcRecord: {
        ...qcRecord,
        testResults: JSON.parse(qcRecord.testResults),
      },
    })
  } catch (error) {
    console.error('POST /api/batches/[id]/qc error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
