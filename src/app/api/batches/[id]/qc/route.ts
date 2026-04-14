import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { canOperate } from '@/lib/roles'
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

    // 获取查询参数（支持 qcType 过滤）
    const { searchParams } = new URL(request.url)
    const qcTypeFilter = searchParams.get('qcType') || undefined

    // 检查批次是否存在
    const batch = await db.batch.findUnique({
      where: { id },
    })
    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 查询质检记录，按创建时间倒序
    const qcWhere: Record<string, unknown> = { batchId: id }
    if (qcTypeFilter) {
      qcWhere.qcType = qcTypeFilter
    }

    const qcRecords = await db.qcRecord.findMany({
      where: qcWhere,
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
    const { testResults, operatorId, operatorName, thawedVials, qcType, taskId, sampleInfo } = body

    if (!Array.isArray(testResults) || testResults.length === 0) {
      return NextResponse.json({ error: '检测结果不能为空' }, { status: 400 })
    }

    // 校验 qcType（仅允许 ROUTINE 和 IN_PROCESS）
    const finalQcType = qcType === 'IN_PROCESS' ? 'IN_PROCESS' : 'ROUTINE'

    // 校验关联 taskId（如提供）
    if (taskId) {
      const relatedTask = await db.productionTask.findFirst({
        where: { id: taskId, batchId: id },
      })
      if (!relatedTask) {
        return NextResponse.json({ error: '关联的生产任务不存在' }, { status: 404 })
      }
    }

    // 校验复苏支数
    const parsedThawedVials = thawedVials !== undefined ? Number(thawedVials) : null
    if (thawedVials !== undefined && (isNaN(parsedThawedVials!) || parsedThawedVials! < 1)) {
      return NextResponse.json({ error: '复苏支数必须为大于0的整数' }, { status: 400 })
    }

    // 检查批次是否存在
    const batch = await db.batch.findUnique({
      where: { id },
    })
    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 操作类权限检查：只有 QC（在该产品上有授权）或 ADMIN 可以创建质检记录
    // v3.1: 额外检查 — 必须是该批次指定的质检员（batch.qcOperatorId）
    const roles = getRolesFromPayload(payload)
    const userWithPermissions = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        productRoles: {
          where: { product: { active: true } },
          select: { productId: true, roles: true },
        },
      },
    })
    const userProductRoles = userWithPermissions?.productRoles.map(pr => ({
      productId: pr.productId,
      roles: JSON.parse(pr.roles || '[]'),
    })) || []
    if (!canOperate(roles, userProductRoles, batch.productId, ['QC'])) {
      return NextResponse.json({ error: '无权限操作该产品' }, { status: 403 })
    }
    // 指定质检员检查：非 ADMIN 必须是该批次指定的质检员
    if (!roles.includes('ADMIN') && batch.qcOperatorId && batch.qcOperatorId !== payload.userId) {
      return NextResponse.json({ error: '您不是该批次指定的质检员，无法执行质检操作' }, { status: 403 })
    }

    // IN_PROCESS 类型允许在生产中进行状态下创建（过程监控）
    // ROUTINE 类型保持原有逻辑：只能在质检中进行状态下创建
    if (finalQcType === 'ROUTINE' && batch.status !== 'QC_IN_PROGRESS') {
      return NextResponse.json(
        { error: '只能在质检中进行状态下创建常规质检记录' },
        { status: 400 }
      )
    }

    if (finalQcType === 'IN_PROCESS' && !['IN_PRODUCTION', 'QC_PENDING', 'QC_IN_PROGRESS'].includes(batch.status)) {
      return NextResponse.json(
        { error: '过程质检只能在生产中、待质检或质检中状态下创建' },
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

    // 自动计算综合判定（IN_PROCESS 记录默认为 PENDING，等待后续审核确认）
    const overallJudgment = finalQcType === 'IN_PROCESS'
      ? 'PENDING'
      : testResults.every(
          (item: TestResultItem) => item.judgment === 'PASS'
        )
          ? 'PASS'
          : 'FAIL'

    // 收集不合格原因（IN_PROCESS 不收集，因为判定为 PENDING）
    const failItems = finalQcType !== 'IN_PROCESS'
      ? testResults.filter((item: TestResultItem) => item.judgment === 'FAIL')
      : []
    const failReason = failItems.length > 0
      ? failItems.map((item: TestResultItem) => `${item.itemName || item.itemCode}: ${item.resultValue || item.judgment}`).join('; ')
      : null

    // 创建质检记录
    const qcRecord = await db.qcRecord.create({
      data: {
        batchId: id,
        batchNo: batch.batchNo,
        qcType: finalQcType,
        taskId: taskId || null,
        sampleQuantity: parsedThawedVials,
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
        qcType: finalQcType,
        taskId: taskId || null,
        sampleQuantity: parsedThawedVials,
        ...(sampleInfo ? { sampleInfo } : {}),
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
