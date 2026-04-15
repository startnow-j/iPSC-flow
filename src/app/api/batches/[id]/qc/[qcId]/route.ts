import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateQcRecord, type TestResultItem } from '@/lib/services/validation'
import { createAuditLog } from '@/lib/services/audit-log'

// 禁止缓存
export const dynamic = 'force-dynamic'

// ============================================
// GET /api/batches/[id]/qc/[qcId] — 获取质检记录详情
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qcId: string }> }
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

    const { id, qcId } = await params

    const qcRecord = await db.qcRecord.findUnique({
      where: { id: qcId, batchId: id },
    })

    if (!qcRecord) {
      return NextResponse.json({ error: '质检记录不存在' }, { status: 404 })
    }

    return NextResponse.json({
      qcRecord: {
        ...qcRecord,
        testResults: JSON.parse(qcRecord.testResults),
      },
    })
  } catch (error) {
    console.error('GET /api/batches/[id]/qc/[qcId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================
// PATCH /api/batches/[id]/qc/[qcId] — 更新质检记录
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qcId: string }> }
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

    const { id, qcId } = await params
    const body = await request.json()
    const {
      testResults,
      overallJudgment,
      reviewComment,
      reviewerId,
      reviewerName,
    } = body

    // 检查质检记录是否存在
    const existing = await db.qcRecord.findUnique({
      where: { id: qcId, batchId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: '质检记录不存在' }, { status: 404 })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}

    if (testResults !== undefined) {
      // 校验新的检测结果
      const validation = validateQcRecord(testResults)
      if (!validation.valid) {
        return NextResponse.json(
          { error: '检测结果校验失败', validation },
          { status: 400 }
        )
      }

      // 重新计算综合判定（如果未显式传入）
      const newOverallJudgment = overallJudgment ?? (testResults.every(
        (item: TestResultItem) => item.judgment === 'PASS'
      ) ? 'PASS' : 'FAIL')

      updateData.testResults = JSON.stringify(testResults)
      updateData.overallJudgment = newOverallJudgment

      const failItems = testResults.filter(
        (item: TestResultItem) => item.judgment === 'FAIL'
      )
      updateData.failReason = failItems.length > 0
        ? failItems.map((item: TestResultItem) => `${item.itemName || item.itemCode}: ${item.resultValue || item.judgment}`).join('; ')
        : null
    }

    if (reviewComment !== undefined) updateData.reviewComment = reviewComment
    if (reviewerId !== undefined) updateData.reviewerId = reviewerId
    if (reviewerName !== undefined) updateData.reviewerName = reviewerName
    if (reviewerId !== undefined || reviewerName !== undefined) {
      updateData.reviewedAt = new Date()
    }

    // 记录更新前的数据
    const dataBefore = {
      testResults: JSON.parse(existing.testResults),
      overallJudgment: existing.overallJudgment,
      reviewComment: existing.reviewComment,
    }

    const qcRecord = await db.qcRecord.update({
      where: { id: qcId },
      data: updateData,
    })

    // 记录审计日志
    await createAuditLog({
      eventType: 'QC_RECORD_UPDATED',
      targetType: 'QC',
      targetId: qcId,
      targetBatchNo: existing.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataBefore,
      dataAfter: {
        testResults: JSON.parse(qcRecord.testResults),
        overallJudgment: qcRecord.overallJudgment,
        reviewComment: qcRecord.reviewComment,
      },
    })

    return NextResponse.json({
      qcRecord: {
        ...qcRecord,
        testResults: JSON.parse(qcRecord.testResults),
      },
    })
  } catch (error) {
    console.error('PATCH /api/batches/[id]/qc/[qcId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
