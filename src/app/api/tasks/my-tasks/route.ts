import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { TaskStatus } from '@prisma/client'

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
