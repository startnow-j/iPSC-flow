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
    const tasks = await db.productionTask.findMany({
      where: {
        OR: [{ assigneeId: userId }, { reviewerId: userId }],
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] },
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
      }

      if (task.assigneeId === userId && (task.status === 'PENDING' || task.status === 'IN_PROGRESS')) {
        toExecute.push(item)
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
