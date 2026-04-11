// ============================================
// iPSC 生产管理系统 — 批次状态机服务
// 控制所有 BatchStatus 状态转换的核心业务逻辑
// ============================================

import { db } from '@/lib/db'
import type { BatchStatus, Role } from '@prisma/client'

// ============================================
// 类型定义
// ============================================

/** 单条状态转换规则 */
export interface TransitionRule {
  /** 目标状态 */
  to: BatchStatus;
  /** 动作编码，用于 transition() 函数的 action 参数 */
  action: string;
  /** 允许执行此转换的角色 */
  roles: (Role | 'SYSTEM')[];
  /** 中文操作标签，用于前端按钮展示 */
  label: string;
  /** 是否为系统自动触发（如 QC_PASS → COA_PENDING） */
  auto?: boolean;
}

/** 对外暴露的可用操作描述 */
export interface AvailableAction {
  targetStatus: BatchStatus;
  action: string;
  label: string;
  auto?: boolean;
}

/** transition() 函数返回值 */
export interface TransitionResult {
  success: boolean;
  previousState: string;
  newState: string;
  message: string;
}

// ============================================
// 状态转换规则表（单例常量）
// ============================================

/**
 * 批次状态机转换规则定义
 *
 * 状态流:
 *   NEW → IN_PRODUCTION → QC_PENDING → QC_IN_PROGRESS → QC_PASS → COA_PENDING(自动) → COA_SUBMITTED → COA_APPROVED → RELEASED
 *                                                                             └→ QC_FAIL → (返工→QC_PENDING or 报废→SCRAPPED)
 *                                       COA_SUBMITTED → REJECTED → COA_SUBMITTED(重新提交)
 *   NEW → SCRAPPED (删除/取消)
 *   IN_PRODUCTION → SCRAPPED (取消)
 */
export const BATCH_TRANSITIONS: Record<string, TransitionRule[]> = {
  NEW: [
    { to: 'IN_PRODUCTION', action: 'start_production', roles: ['SUPERVISOR', 'OPERATOR'], label: '开始生产' },
    { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
  ],
  IN_PRODUCTION: [
    { to: 'QC_PENDING', action: 'complete_production', roles: ['OPERATOR', 'SUPERVISOR'], label: '提交质检' },
    { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
  ],
  QC_PENDING: [
    { to: 'QC_IN_PROGRESS', action: 'start_qc', roles: ['OPERATOR', 'QA'], label: '开始质检' },
    { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
  ],
  QC_IN_PROGRESS: [
    { to: 'QC_PASS', action: 'pass_qc', roles: ['QA', 'OPERATOR'], label: '质检合格' },
    { to: 'QC_FAIL', action: 'fail_qc', roles: ['QA', 'OPERATOR'], label: '质检不合格' },
  ],
  QC_PASS: [
    { to: 'COA_PENDING', action: 'generate_coa', roles: ['SYSTEM'], label: '生成CoA', auto: true },
  ],
  QC_FAIL: [
    { to: 'QC_PENDING', action: 'rework', roles: ['SUPERVISOR', 'ADMIN'], label: '返工' },
    { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
  ],
  COA_PENDING: [
    { to: 'COA_SUBMITTED', action: 'submit_coa', roles: ['OPERATOR', 'SUPERVISOR'], label: '提交审核' },
  ],
  COA_SUBMITTED: [
    { to: 'COA_APPROVED', action: 'approve_coa', roles: ['SUPERVISOR', 'QA'], label: '批准' },
    { to: 'REJECTED', action: 'reject_coa', roles: ['SUPERVISOR', 'QA'], label: '退回' },
  ],
  COA_APPROVED: [
    { to: 'RELEASED', action: 'release', roles: ['SUPERVISOR'], label: '放行' },
  ],
  REJECTED: [
    { to: 'COA_SUBMITTED', action: 'resubmit_coa', roles: ['OPERATOR', 'SUPERVISOR'], label: '重新提交' },
  ],
  RELEASED: [],
  SCRAPPED: [],
}

// ============================================
// 状态中文标签
// ============================================

const STATUS_LABELS: Record<string, string> = {
  NEW: '新建',
  IN_PRODUCTION: '生产中',
  QC_PENDING: '待质检',
  QC_IN_PROGRESS: '质检中',
  QC_PASS: '质检合格',
  QC_FAIL: '质检不合格',
  COA_PENDING: '待生成CoA',
  COA_SUBMITTED: 'CoA已提交',
  COA_APPROVED: 'CoA已批准',
  RELEASED: '已放行',
  SCRAPPED: '已报废',
}

// ============================================
// 状态 Tailwind 徽标颜色
// ============================================

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  IN_PRODUCTION: 'bg-blue-100 text-blue-800',
  QC_PENDING: 'bg-yellow-100 text-yellow-800',
  QC_IN_PROGRESS: 'bg-orange-100 text-orange-800',
  QC_PASS: 'bg-emerald-100 text-emerald-800',
  QC_FAIL: 'bg-red-100 text-red-800',
  COA_PENDING: 'bg-violet-100 text-violet-800',
  COA_SUBMITTED: 'bg-sky-100 text-sky-800',
  COA_APPROVED: 'bg-teal-100 text-teal-800',
  RELEASED: 'bg-green-100 text-green-800',
  SCRAPPED: 'bg-stone-100 text-stone-600',
}

// ============================================
// 公开函数
// ============================================

/**
 * 检查从当前状态到目标状态的转换是否合法
 * @param currentStatus - 当前批次状态
 * @param targetStatus - 目标状态
 * @returns 是否允许转换
 */
export function canTransition(currentStatus: string, targetStatus: string): boolean {
  const rules = BATCH_TRANSITIONS[currentStatus]
  if (!rules) return false
  return rules.some((r) => r.to === targetStatus)
}

/**
 * 获取指定角色在当前状态下可执行的所有操作
 * @param currentStatus - 当前批次状态
 * @param userRoles - 用户角色列表
 * @returns 可用操作列表（不含 SYSTEM 自动操作）
 */
export function getAvailableActions(currentStatus: string, userRoles: string[]): AvailableAction[] {
  const rules = BATCH_TRANSITIONS[currentStatus]
  if (!rules) return []

  return rules
    .filter((r) => r.roles.some(r => userRoles.includes(r as Role)) && r.roles[0] !== 'SYSTEM')
    .map((r) => ({
      targetStatus: r.to,
      action: r.action,
      label: r.label,
      auto: r.auto,
    }))
}

/**
 * 执行批次状态转换（核心函数）
 *
 * 完整流程:
 *  1. 查找批次，校验存在性
 *  2. 从当前状态查找匹配 action 的转换规则
 *  3. 校验操作员角色权限
 *  4. 执行转换：
 *     - QC_PASS → COA_PENDING: 自动创建 CoA 草稿
 *     - RELEASED: 设置 actualEndDate
 *  5. 更新数据库
 *  6. 返回结果
 *
 * @param batchId - 批次 ID (cuid)
 * @param action - 动作编码，如 'start_production'
 * @param operatorId - 操作员 ID
 * @param operatorName - 操作员姓名
 * @param reason - 可选的操作原因（报废等场景）
 * @returns 转换结果，包含 success / previousState / newState / message
 */
export async function transition(
  batchId: string,
  action: string,
  operatorId: string,
  operatorName: string,
  reason?: string,
): Promise<TransitionResult> {
  // 1. 查找批次
  const batch = await db.batch.findUnique({
    where: { id: batchId },
  })

  if (!batch) {
    return {
      success: false,
      previousState: '',
      newState: '',
      message: `批次不存在: ${batchId}`,
    }
  }

  const previousState = batch.status as string

  // 2. 查找匹配的转换规则
  const rules = BATCH_TRANSITIONS[previousState]
  if (!rules) {
    return {
      success: false,
      previousState,
      newState: '',
      message: `当前状态 ${previousState} 没有可用的状态转换`,
    }
  }

  const matchedRule = rules.find((r) => r.action === action)
  if (!matchedRule) {
    return {
      success: false,
      previousState,
      newState: '',
      message: `动作 ${action} 在当前状态 ${previousState} 下不合法`,
    }
  }

  const newState = matchedRule.to as string

  // 3. 角色权限校验
  if (matchedRule.roles[0] !== 'SYSTEM') {
    // 对于非 SYSTEM 操作，需要校验操作员角色
    // 注意：此函数不直接校验角色，由调用方传入 operatorId，角色校验在上层 API 中完成
    // 这里只做最小校验：确保不是 SYSTEM 角色但提供了操作员信息
    if (!operatorId || !operatorName) {
      return {
        success: false,
        previousState,
        newState: '',
        message: '非系统自动操作需要提供操作员信息',
      }
    }
  }

  // 4. 执行转换
  try {
    // 4a. 处理 QC_PASS → COA_PENDING 自动创建 CoA 草稿
    if (action === 'generate_coa' && newState === 'COA_PENDING') {
      // 检查是否已存在 CoA
      const existingCoa = await db.coa.findUnique({
        where: { batchId },
      })

      if (!existingCoa) {
        // 生成 CoA 编号
        const coaNo = `COA-${batch.batchNo}`

        // 获取最新的质检记录
        const latestQc = await db.qcRecord.findFirst({
          where: { batchId },
          orderBy: { createdAt: 'desc' },
        })

        // 计算质检消耗总量（用于客户版本发放数量）
        const qcRecords = await db.qcRecord.findMany({
          where: { batchId },
          select: { sampleQuantity: true },
        })
        const totalConsumed = qcRecords.reduce((sum, r) => sum + (r.sampleQuantity || 0), 0)
        const releaseQuantity = (batch.actualQuantity || 0) - totalConsumed

        // 构建 CoA 内容
        const coaContent = JSON.stringify({
          productCode: batch.productCode,
          productName: batch.productName,
          batchNo: batch.batchNo,
          specification: batch.specification,
          seedBatchNo: batch.seedBatchNo,
          seedPassage: batch.seedPassage,
          currentPassage: batch.currentPassage,
          plannedQuantity: batch.plannedQuantity,
          actualQuantity: batch.actualQuantity,
          storageLocation: batch.storageLocation,
          testResults: latestQc ? JSON.parse(latestQc.testResults) : [],
          overallJudgment: latestQc?.overallJudgment ?? '',
          releaseQuantity,
          totalConsumedVials: totalConsumed,
        })

        await db.coa.create({
          data: {
            batchId,
            batchNo: batch.batchNo,
            coaNo,
            content: coaContent,
            status: 'DRAFT',
            createdBy: operatorId,
            createdByName: operatorName,
          },
        })
      }
    }

    // 4b. 处理开始生产时设置 actualStartDate
    const updateData: Record<string, unknown> = {
      status: newState as BatchStatus,
    }

    if (action === 'start_production') {
      updateData.actualStartDate = new Date()
    }

    // 4c. 处理放行时设置 actualEndDate
    if (action === 'release') {
      updateData.actualEndDate = new Date()
    }

    // 4d. 报废原因记录在审计日志中（不直接存储在批次表）

    // 5. 更新批次状态
    await db.batch.update({
      where: { id: batchId },
      data: updateData,
    })

    // 6. 如果涉及 CoA 状态转换，同步更新 CoA
    if (action === 'submit_coa') {
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'SUBMITTED',
          submittedBy: operatorId,
          submittedAt: new Date(),
        },
      })
    } else if (action === 'approve_coa') {
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'APPROVED',
          approvedBy: operatorId,
          approvedByName: operatorName,
          approvedAt: new Date(),
        },
      })
    } else if (action === 'reject_coa') {
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'REJECTED',
          reviewedBy: operatorId,
          reviewedByName: operatorName,
          reviewComment: reason ?? '',
          reviewedAt: new Date(),
        },
      })
    } else if (action === 'resubmit_coa') {
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'SUBMITTED',
          submittedBy: operatorId,
          submittedAt: new Date(),
        },
      })
    }

    const label = STATUS_LABELS[newState] ?? newState

    return {
      success: true,
      previousState,
      newState,
      message: `批次状态已更新: ${STATUS_LABELS[previousState]} → ${label}`,
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      previousState,
      newState: '',
      message: `状态转换失败: ${errMsg}`,
    }
  }
}

/**
 * 获取批次状态的中文标签
 * @param status - 批次状态枚举值
 * @returns 中文标签，未知状态返回原始值
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

/**
 * 获取批次状态对应的 Tailwind 徽标颜色类
 * @param status - 批次状态枚举值
 * @returns Tailwind CSS 类字符串
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'
}
