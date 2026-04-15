import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken, getRolesFromPayload } from '@/lib/auth'
import { canManage, canOperate } from '@/lib/roles'
import { db } from '@/lib/db'
import { validateProductionTask } from '@/lib/services/validation'
import { createAuditLog } from '@/lib/services/audit-log'
import { transition, getStatusLabel } from '@/lib/services/state-machine'
import { TASK_TEMPLATES, CATEGORY_TASK_TEMPLATES } from '@/lib/services/task-templates'

// 禁止缓存
export const dynamic = 'force-dynamic'

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
    const { formData, status, notes, attachments, assigneeId, assigneeName, reviewerId, reviewerName, action } = body

    // ============================================
    // 重做任务 (action: 'redo')
    // 将当前任务标记为 FAILED，创建一个新的 PENDING 任务
    // ============================================
    if (action === 'redo') {
      const task = await db.productionTask.findFirst({
        where: { id: taskId, batchId: id },
      })
      if (!task) {
        return NextResponse.json({ error: '任务不存在' }, { status: 404 })
      }

      const batch = await db.batch.findUnique({
        where: { id },
        include: { product: { select: { category: true } } },
      })
      if (!batch) {
        return NextResponse.json({ error: '批次不存在' }, { status: 404 })
      }

      // 仅允许 COMPLETED 或 FAILED 的任务重做
      if (task.status !== 'COMPLETED' && task.status !== 'FAILED') {
        return NextResponse.json({
          error: `只有已完成或已失败的任务可以重做，当前状态: ${task.status}`,
        }, { status: 400 })
      }

      // 检查任务是否可重做（taskType 为 'redoable'）
      const productLine = batch.productLine as string
      const category = batch.product?.category || undefined
      const allTemplates = [
        ...(CATEGORY_TASK_TEMPLATES[category || '']?.['start_production'] || []),
        ...(TASK_TEMPLATES[productLine]?.['start_production'] || []),
      ]
      const templateDef = allTemplates.find(t => t.taskCode === task.taskCode)
      if (!templateDef || templateDef.taskType !== 'redoable') {
        return NextResponse.json({
          error: `任务 ${task.taskCode}(${task.taskName}) 不支持重做`,
        }, { status: 400 })
      }

      // 计算重做轮次（基于 stepGroup 后缀 -R{n}）
      const baseStepGroup = task.stepGroup || task.taskCode
      const roundMatch = baseStepGroup.match(/-R(\d+)$/)
      const currentRound = roundMatch ? parseInt(roundMatch[1], 10) : 0
      const nextRound = currentRound + 1
      const newStepGroup = `${task.stepGroup || task.taskCode}-R${nextRound}`

      // 将当前任务标记为 FAILED
      await db.productionTask.update({
        where: { id: taskId },
        data: { status: 'FAILED' },
      })

      // 创建新的 PENDING 任务
      const newTask = await db.productionTask.create({
        data: {
          batchId: id,
          batchNo: batch.batchNo,
          taskCode: task.taskCode,
          taskName: task.taskName,
          sequenceNo: task.sequenceNo + 0.1,
          stepGroup: newStepGroup,
          status: 'PENDING',
          assigneeId: batch.productionOperatorId || null,
          assigneeName: batch.productionOperatorName || null,
          notes: `重做任务（第${nextRound}轮）- 原任务 ${task.id.substring(0, 8)}`,
        },
      })

      // 记录审计日志
      await createAuditLog({
        eventType: 'TASK_CREATED',
        targetType: 'TASK',
        targetId: newTask.id,
        targetBatchNo: batch.batchNo,
        operatorId: payload.userId,
        operatorName: payload.name,
        dataAfter: {
          taskCode: task.taskCode,
          taskName: task.taskName,
          stepGroup: newStepGroup,
          redoRound: nextRound,
          originalTaskId: task.id,
        },
      })

      await createAuditLog({
        eventType: 'TASK_UPDATED',
        targetType: 'TASK',
        targetId: taskId,
        targetBatchNo: batch.batchNo,
        operatorId: payload.userId,
        operatorName: payload.name,
        dataBefore: { status: task.status },
        dataAfter: {
          status: 'FAILED',
          reason: `任务重做，已创建第${nextRound}轮任务`,
        },
      })

      return NextResponse.json({
        task: {
          ...newTask,
          formData: newTask.formData ? JSON.parse(newTask.formData) : null,
          attachments: newTask.attachments ? JSON.parse(newTask.attachments) : null,
        },
        redoInfo: {
          round: nextRound,
          originalTaskId: task.id,
          stepGroup: newStepGroup,
        },
      })
    }

    // 获取任务和批次信息（非 redo 操作）
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

    // 权限检查：
    // - assign/review 操作：ADMIN 或 SUPERVISOR（需要产品线归属）
    // - status/formData/notes 操作：OPERATOR（需要产品级授权）或 ADMIN
    const roles = getRolesFromPayload(payload)
    const isAdmin = roles.includes('ADMIN')

    const isAssignmentAction = assigneeId !== undefined || reviewerId !== undefined || status === 'REVIEWED'

    if (isAssignmentAction && !isAdmin) {
      // 非管理员指派/复核需要 SUPERVISOR 权限
      const userWithPerms = await db.user.findUnique({
        where: { id: payload.userId },
        select: {
          productLines: { select: { productLine: true } },
        },
      })
      const userProductLines = userWithPerms?.productLines.map(pl => pl.productLine) || []
      if (!roles.includes('SUPERVISOR') || !userProductLines.includes(batch.productLine as string)) {
        return NextResponse.json({ error: '无权限指派该产品线的任务' }, { status: 403 })
      }
    }

    if (!isAssignmentAction && !isAdmin) {
      // 操作类操作需要 OPERATOR 产品级授权
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
      if (!canOperate(roles, userProductRoles, batch.productId, ['OPERATOR'])) {
        return NextResponse.json({ error: '无权限操作该产品' }, { status: 403 })
      }
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

    // 指派操作：设置 assigneeId / reviewerId
    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId || null
      updateData.assigneeName = assigneeName || null
    }
    if (reviewerId !== undefined) {
      updateData.reviewerId = reviewerId || null
      updateData.reviewerName = reviewerName || null
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

      if (status === 'REVIEWED') {
        updateData.reviewedAt = new Date()
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

    // ============================================
    // 同步批次级操作员信息
    // 当通过任务级指派设置 assigneeId 时，
    // 如果批次尚未设置 productionOperatorId，则自动同步
    // ============================================
    if (assigneeId && assigneeId !== task.assigneeId) {
      const currentBatch = await db.batch.findUnique({
        where: { id },
        select: { productionOperatorId: true },
      })
      if (currentBatch && !currentBatch.productionOperatorId) {
        await db.batch.update({
          where: { id },
          data: {
            productionOperatorId: assigneeId,
            productionOperatorName: assigneeName || null,
          },
        })
      }
    }

    // 记录审计日志
    const eventType =
      status === 'REVIEWED'
        ? 'TASK_REVIEWED'
        : status === 'COMPLETED'
          ? 'TASK_COMPLETED'
          : status === 'IN_PROGRESS'
            ? 'TASK_STARTED'
            : assigneeId !== undefined || reviewerId !== undefined
              ? 'TASK_ASSIGNED'
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
      // 收获冻存完成 → 将实际数量和存储位置同步到 batch 表
      const finalFormData = formData ?? (task.formData ? JSON.parse(task.formData) : null)
      const batchUpdateData: Record<string, unknown> = {}

      if (finalFormData?.total_vials != null) {
        batchUpdateData.actualQuantity = Number(finalFormData.total_vials)
      }
      if (finalFormData?.storage_location) {
        batchUpdateData.storageLocation = String(finalFormData.storage_location)
      }

      if (Object.keys(batchUpdateData).length > 0) {
        const dataBefore = {}
        if (batchUpdateData.actualQuantity !== undefined) (dataBefore as any).actualQuantity = batch.actualQuantity
        if (batchUpdateData.storageLocation !== undefined) (dataBefore as any).storageLocation = batch.storageLocation

        await db.batch.update({
          where: { id },
          data: batchUpdateData,
        })

        await createAuditLog({
          eventType: 'BATCH_UPDATED',
          targetType: 'BATCH',
          targetId: id,
          targetBatchNo: batch.batchNo,
          operatorId: payload.userId,
          operatorName: payload.name,
          dataBefore,
          dataAfter: batchUpdateData,
        })
      }

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
