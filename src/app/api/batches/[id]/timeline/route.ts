import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { getBatchTimeline } from '@/lib/services/audit-log'
import { db } from '@/lib/db'

// ============================================
// GET /api/batches/[id]/timeline — 批次时间线
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

    // 查找批次获取 batchNo
    const batch = await db.batch.findUnique({
      where: { id },
      select: { batchNo: true },
    })

    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 获取时间线
    const timeline = await getBatchTimeline(batch.batchNo)

    // 事件类型中文标签
    const EVENT_TYPE_LABELS: Record<string, string> = {
      BATCH_CREATED: '创建批次',
      BATCH_UPDATED: '更新批次信息',
      BATCH_STATUS_CHANGED: '批次状态变更',
      BATCH_SCRAPPED: '批次报废',
      BATCH_RELEASED: '批次放行',
      TASK_CREATED: '创建生产任务',
      TASK_STARTED: '开始执行任务',
      TASK_COMPLETED: '完成任务',
      TASK_SKIPPED: '跳过任务',
      TASK_UPDATED: '更新任务数据',
      QC_RECORD_CREATED: '创建质检记录',
      QC_RECORD_UPDATED: '更新质检记录',
      QC_STARTED: '开始质检',
      QC_COMPLETED: '完成质检',
      COA_GENERATED: '生成CoA',
      COA_SUBMITTED: '提交CoA审核',
      COA_APPROVED: 'CoA审核通过',
      COA_REJECTED: 'CoA审核退回',
      COA_RESUBMITTED: '重新提交CoA',
    }

    // 格式化时间线
    const formattedTimeline = timeline.map((entry) => ({
      ...entry,
      eventLabel: EVENT_TYPE_LABELS[entry.eventType] ?? entry.eventType,
    }))

    return NextResponse.json({ timeline: formattedTimeline })
  } catch (error) {
    console.error('GET /api/batches/[id]/timeline error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
