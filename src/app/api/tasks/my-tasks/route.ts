import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { TaskStatus } from '@prisma/client'

// 禁止缓存
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const userId = payload.userId

    // 2. Query tasks assigned to or reviewed by the current user
    //    排除终态批次（已放行/已报废/已终止）的任务
    const tasks = await db.productionTask.findMany({
      where: {
        OR: [{ assigneeId: userId }, { reviewerId: userId }],
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] },
        batch: {
          status: { notIn: ['RELEASED', 'SCRAPPED', 'TERMINATED'] },
        },
      },
      include: {
        batch: {
          select: {
            batchNo: true,
            productName: true,
            productLine: true,
          },
        },
        assignee: {
          select: { name: true },
        },
        reviewer: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 3. Group into toExecute and toReview
    const toExecute: {
      taskId: string
      batchId: string
      batchNo: string
      taskCode: string
      taskName: string
      productName: string
      productLine: string
      assigneeName: string | null
      reviewerName: string | null
      status: string
      sequenceNo: number
    }[] = []

    const toReview: {
      taskId: string
      batchId: string
      batchNo: string
      taskCode: string
      taskName: string
      productName: string
      productLine: string
      assigneeName: string | null
      reviewerName: string | null
      status: string
    }[] = []

    // 用于按批次筛选当前可执行任务（每个批次只显示当前需要执行的步骤）
    const batchFirstActionableTask: Record<string, number> = {}
    for (const task of tasks) {
      if (task.assigneeId !== userId) continue
      if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') continue
      const existing = batchFirstActionableTask[task.batchId]
      if (existing === undefined || (task.sequenceNo || 999) < existing) {
        batchFirstActionableTask[task.batchId] = task.sequenceNo || 999
      }
    }

    // ============================================
    // 3.5: 查询用户作为质检员待质检的批次
    // 当批次处于 QC_PENDING 状态且用户是预指派质检员时，
    // 将该批次作为待执行任务展示
    // ============================================
    const qcPendingBatches = await db.batch.findMany({
      where: {
        qcOperatorId: userId,
        status: 'QC_PENDING',
      },
      select: {
        id: true,
        batchNo: true,
        productName: true,
        productLine: true,
        qcOperatorName: true,
      },
    })

    const qcBatchIds = new Set(qcPendingBatches.map(b => b.id))
    // Avoid showing QC batches that already have production tasks in the task list
    // (they would be duplicated otherwise)

    for (const task of tasks) {
      const item = {
        taskId: task.id,
        batchId: task.batchId,
        batchNo: task.batchNo,
        taskCode: task.taskCode,
        taskName: task.taskName,
        productName: task.batch.productName,
        productLine: task.batch.productLine,
        assigneeName: task.assignee?.name || task.assigneeName || null,
        reviewerName: task.reviewer?.name || task.reviewerName || null,
        status: task.status,
        sequenceNo: task.sequenceNo || 0,
      }

      if (task.assigneeId === userId && (task.status === 'PENDING' || task.status === 'IN_PROGRESS')) {
        // 每个批次只显示当前需要执行的任务（sequenceNo 最小的未完成任务）
        const firstSeqNo = batchFirstActionableTask[task.batchId]
        if (firstSeqNo !== undefined && (task.sequenceNo || 999) <= firstSeqNo) {
          toExecute.push(item)
        }
      }

      if (task.reviewerId === userId && task.status === 'COMPLETED') {
        toReview.push(item)
      }
    }

    // Add QC pending batches as to-execute items
    for (const batch of qcPendingBatches) {
      toExecute.push({
        taskId: 'qc_' + batch.id, // Virtual task ID for QC batches
        batchId: batch.id,
        batchNo: batch.batchNo,
        taskCode: 'QC_PENDING',
        taskName: '质检待处理',
        productName: batch.productName,
        productLine: batch.productLine,
        assigneeName: batch.qcOperatorName,
        reviewerName: null,
        status: 'QC_PENDING',
        sequenceNo: 999,
      })
    }

    // ============================================
    // 3.6: 查询 QC_IN_PROGRESS 批次（待 SUPERVISOR/ADMIN 处理返工/报废）
    // 质检不合格时，批次仍在 QC_IN_PROGRESS 状态，需要主管决策
    // ============================================
    const isSupervisorOrAdmin = payload.roles?.some((r: string) => ['SUPERVISOR', 'ADMIN'].includes(r))

    if (isSupervisorOrAdmin) {
      // 检查是否有不合格的质检记录（ROUTINE 类型且 overallJudgment = 'FAIL'）
      const failedQcBatchIds = await db.qcRecord.groupBy({
        by: ['batchId'],
        where: {
          qcType: 'ROUTINE',
          overallJudgment: 'FAIL',
        },
        having: {
          batchId: { _count: { gt: 0 } },
        },
      })
      const failedBatchIdSet = new Set(failedQcBatchIds.map(r => r.batchId))

      const qcInProgressBatches = await db.batch.findMany({
        where: {
          status: 'QC_IN_PROGRESS',
          id: { in: Array.from(failedBatchIdSet) },
        },
        select: {
          id: true,
          batchNo: true,
          productName: true,
          productLine: true,
          qcOperatorName: true,
        },
      })

      for (const batch of qcInProgressBatches) {
        toExecute.push({
          taskId: 'qc_disposition_' + batch.id,
          batchId: batch.id,
          batchNo: batch.batchNo,
          taskCode: 'QC_DISPOSITION',
          taskName: '质检不合格待处理',
          productName: batch.productName,
          productLine: batch.productLine,
          assigneeName: batch.qcOperatorName,
          reviewerName: null,
          status: 'QC_DISPOSITION',
          sequenceNo: 998,
        })
      }
    }

    // ============================================
    // 3.7: 查询 COA_SUBMITTED 批次（待 SUPERVISOR/QA 审核）
    // ============================================
    const coaPendingBatches = await db.batch.findMany({
      where: {
        status: 'COA_SUBMITTED',
      },
      select: {
        id: true,
        batchNo: true,
        productName: true,
        productLine: true,
        qcOperatorName: true,
      },
    })

    // Add CoA review batches as to-review items
    for (const batch of coaPendingBatches) {
      toReview.push({
        taskId: 'coa_review_' + batch.id,
        batchId: batch.id,
        batchNo: batch.batchNo,
        taskCode: 'COA_REVIEW',
        taskName: 'CoA待审核',
        productName: batch.productName,
        productLine: batch.productLine,
        assigneeName: batch.qcOperatorName,
        reviewerName: null,
        status: 'COA_SUBMITTED',
      })
    }

    // 4. Limit to 20 per category
    return NextResponse.json({
      toExecute: toExecute.slice(0, 20),
      toReview: toReview.slice(0, 20),
      toExecuteCount: toExecute.length,
      toReviewCount: toReview.length,
    })
  } catch (error) {
    console.error('Failed to fetch my tasks:', error)
    return NextResponse.json({ error: '获取待办任务失败' }, { status: 500 })
  }
}
