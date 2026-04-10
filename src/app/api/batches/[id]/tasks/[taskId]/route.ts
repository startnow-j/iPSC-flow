import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateProductionTask } from '@/lib/services/validation'
import { createAuditLog } from '@/lib/services/audit-log'
import { transition, getStatusLabel } from '@/lib/services/state-machine'

// ============================================
// GET /api/batches/[id]/tasks/[taskId] — 获取单个任务详情
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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

    const { id, taskId } = await params

    const task = await db.productionTask.findFirst({
      where: { id: taskId, batchId: id },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    return NextResponse.json({
      task: {
        ...task,
        formData: task.formData ? JSON.parse(task.formData) : null,
        attachments: task.attachments ? JSON.parse(task.attachments) : null,
      },
    })
  } catch (error) {
    console.error('GET /api/batches/[id]/tasks/[taskId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// ============================================
// PATCH /api/batches/[id]/tasks/[taskId] — 更新任务
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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

    const { id, taskId } = await params
    const body = await request.json()
    const { formData, status, notes, attachments } = body

    // 获取任务和批次信息
    const task = await db.productionTask.findFirst({
      where: { id: taskId, batchId: id },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    const batch = await db.batch.findUnique({
      where: { id },
    })

    if (!batch) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    }

    // 如果提交了 formData，进行校验
    if (formData !== undefined && formData !== null) {
      const validation = validateProductionTask(task.taskCode, formData)
      if (!validation.valid) {
        return NextResponse.json(
          { error: '表单校验失败', validation },
          { status: 400 }
        )
      }
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    const dataBefore: Record<string, unknown> = {
      formData: task.formData ? JSON.parse(task.formData) : null,
      status: task.status,
      notes: task.notes,
    }

    if (formData !== undefined) {
      updateData.formData = JSON.stringify(formData)
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (attachments !== undefined) {
      updateData.attachments = JSON.stringify(attachments)
    }

    // 状态变更处理
    if (status !== undefined && status !== task.status) {
      updateData.status = status

      if (status === 'IN_PROGRESS') {
        updateData.actualStart = new Date()
        updateData.assigneeId = payload.userId
        updateData.assigneeName = payload.name
      }

      if (status === 'COMPLETED') {
        updateData.actualEnd = new Date()
        if (!task.assigneeId) {
          updateData.assigneeId = payload.userId
          updateData.assigneeName = payload.name
        }
      }
    }

    // 如果状态变为 COMPLETED 但没有 formData，用之前的
    if (status === 'COMPLETED' && !updateData.formData && !task.formData && formData) {
      updateData.formData = JSON.stringify(formData)
    }

    // 更新任务
    const updatedTask = await db.productionTask.update({
      where: { id: taskId },
      data: updateData,
    })

    // 记录审计日志
    const eventType =
      status === 'COMPLETED'
        ? 'TASK_COMPLETED'
        : status === 'IN_PROGRESS'
          ? 'TASK_STARTED'
          : 'TASK_UPDATED'

    await createAuditLog({
      eventType,
      targetType: 'TASK',
      targetId: taskId,
      targetBatchNo: batch.batchNo,
      operatorId: payload.userId,
      operatorName: payload.name,
      dataBefore,
      dataAfter: {
        taskCode: task.taskCode,
        taskName: task.taskName,
        stepGroup: task.stepGroup,
        status,
        formData: formData ?? (task.formData ? JSON.parse(task.formData) : null),
      },
    })

    // ============================================
    // 副作用处理：根据任务完成情况触发下一步
    // ============================================
    let batchTransitioned = false

    if (status === 'COMPLETED' && task.taskCode === 'SEED_PREP') {
      // 种子复苏完成 → 自动激活扩增培养任务（第一条 EXPANSION 改为 IN_PROGRESS）
      const expansionTask = await db.productionTask.findFirst({
        where: { batchId: id, taskCode: 'EXPANSION', status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      })

      if (expansionTask) {
        await db.productionTask.update({
          where: { id: expansionTask.id },
          data: {
            status: 'IN_PROGRESS',
            actualStart: new Date(),
          },
        })

        await createAuditLog({
          eventType: 'TASK_STARTED',
          targetType: 'TASK',
          targetId: expansionTask.id,
          targetBatchNo: batch.batchNo,
          operatorId: payload.userId,
          operatorName: payload.name,
          dataAfter: {
            taskCode: 'EXPANSION',
            taskName: '扩增培养',
          },
        })
      }
    }

    if (status === 'COMPLETED' && task.taskCode === 'HARVEST') {
      // 收获冻存完成 → 不自动触发 QC_PENDING，由前端用户确认后触发
      batchTransitioned = true
    }

    return NextResponse.json({
      task: {
        ...updatedTask,
        formData: updatedTask.formData ? JSON.parse(updatedTask.formData) : null,
        attachments: updatedTask.attachments
          ? JSON.parse(updatedTask.attachments)
          : null,
      },
      batchTransitioned,
    })
  } catch (error) {
    console.error('PATCH /api/batches/[id]/tasks/[taskId] error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
