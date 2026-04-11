// ============================================
// iPSC 生产管理系统 — 批次状态机服务（多产品线）
// 控制所有 BatchStatus 状态转换的核心业务逻辑
// 支持 3 种产品线：CELL_PRODUCT / SERVICE / KIT
// ============================================

import { db } from '@/lib/db'
import type { BatchStatus, ProductLine, Role } from '@prisma/client'

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
// 状态转换模板（按产品线组织）
// ============================================

/**
 * 多产品线状态机转换规则定义
 *
 * CELL_PRODUCT — 细胞产品（库存驱动，现有 iPSC 流程）:
 *   NEW → IN_PRODUCTION → QC_PENDING → QC_IN_PROGRESS → QC_PASS → COA_PENDING(自动) → COA_SUBMITTED → COA_APPROVED → RELEASED
 *                                                                             └→ QC_FAIL → (返工→QC_PENDING or 报废→SCRAPPED)
 *   NEW/IN_PRODUCTION → SCRAPPED
 *
 * SERVICE — 服务项目（订单驱动）:
 *   NEW → SAMPLE_RECEIVED → IN_PRODUCTION → HANDOVER(交接) / IDENTIFICATION(鉴定)
 *   IDENTIFICATION → REPORT_PENDING → COA_SUBMITTED → RELEASED
 *   HANDOVER → IN_PRODUCTION（交接回来）
 *
 * KIT — 试剂盒（产品驱动）:
 *   NEW → MATERIAL_PREP → IN_PRODUCTION → QC_PENDING → ... → RELEASED
 *   与 CELL_PRODUCT 类似，但增加了 MATERIAL_PREP 物料准备阶段
 */
const TRANSITION_TEMPLATES: Record<ProductLine, Record<string, TransitionRule[]>> = {
  // ------------------------------------------------
  // 细胞产品 — 完全保留原有 11 状态 16 规则
  // ------------------------------------------------
  CELL_PRODUCT: {
    NEW: [
      { to: 'IN_PRODUCTION', action: 'start_production', roles: ['SUPERVISOR', 'OPERATOR'], label: '开始生产' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    IN_PRODUCTION: [
      { to: 'QC_PENDING', action: 'complete_production', roles: ['OPERATOR', 'SUPERVISOR'], label: '提交质检' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    QC_PENDING: [
      { to: 'QC_IN_PROGRESS', action: 'start_qc', roles: ['QC', 'OPERATOR'], label: '开始质检' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    QC_IN_PROGRESS: [
      { to: 'QC_PASS', action: 'pass_qc', roles: ['QC', 'OPERATOR'], label: '质检合格' },
      { to: 'QC_FAIL', action: 'fail_qc', roles: ['QC', 'OPERATOR'], label: '质检不合格' },
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
      // NOTE: REJECTED batch status 已移除。CoA 退回现在在 CoA 表层面处理（status → DRAFT）
      // 重新提交：批次状态保持 COA_SUBMITTED（自环），CoA 状态从 REJECTED → SUBMITTED
      { to: 'COA_SUBMITTED', action: 'resubmit_coa', roles: ['OPERATOR', 'SUPERVISOR'], label: '重新提交' },
    ],
    COA_APPROVED: [
      { to: 'RELEASED', action: 'release', roles: ['SUPERVISOR', 'ADMIN'], label: '放行' },
    ],
    RELEASED: [],
    SCRAPPED: [],
  },

  // ------------------------------------------------
  // 服务项目 — 订单驱动，含样本接收、交接、鉴定阶段
  // ------------------------------------------------
  SERVICE: {
    NEW: [
      { to: 'SAMPLE_RECEIVED', action: 'receive_sample', roles: ['OPERATOR'], label: '接收样本' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    SAMPLE_RECEIVED: [
      { to: 'IN_PRODUCTION', action: 'start_production', roles: ['OPERATOR', 'SUPERVISOR'], label: '开始生产' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    IN_PRODUCTION: [
      { to: 'HANDOVER', action: 'request_handover', roles: ['OPERATOR'], label: '申请交接' },
      { to: 'IDENTIFICATION', action: 'start_identification', roles: ['OPERATOR', 'SUPERVISOR'], label: '进入鉴定' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    HANDOVER: [
      { to: 'IN_PRODUCTION', action: 'accept_handover', roles: ['OPERATOR'], label: '接收交接' },
    ],
    IDENTIFICATION: [
      { to: 'REPORT_PENDING', action: 'complete_identification', roles: ['OPERATOR', 'SUPERVISOR'], label: '鉴定完成' },
      { to: 'IN_PRODUCTION', action: 'rework', roles: ['SUPERVISOR', 'ADMIN'], label: '返工' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    REPORT_PENDING: [
      { to: 'COA_SUBMITTED', action: 'submit_report', roles: ['OPERATOR', 'SUPERVISOR'], label: '提交报告+CoA' },
    ],
    COA_SUBMITTED: [
      { to: 'RELEASED', action: 'approve', roles: ['SUPERVISOR', 'ADMIN'], label: '批准交付' },
      { to: 'REPORT_PENDING', action: 'reject', roles: ['SUPERVISOR', 'QA'], label: '退回修改' },
    ],
    RELEASED: [],
    SCRAPPED: [],
  },

  // ------------------------------------------------
  // 试剂盒 — 产品驱动，含物料准备阶段
  // ------------------------------------------------
  KIT: {
    NEW: [
      { to: 'MATERIAL_PREP', action: 'start_material_prep', roles: ['OPERATOR'], label: '开始备料' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    MATERIAL_PREP: [
      { to: 'IN_PRODUCTION', action: 'start_production', roles: ['OPERATOR'], label: '开始配制' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    IN_PRODUCTION: [
      { to: 'QC_PENDING', action: 'complete_production', roles: ['OPERATOR', 'SUPERVISOR'], label: '提交质检' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    QC_PENDING: [
      { to: 'QC_IN_PROGRESS', action: 'start_qc', roles: ['QC', 'OPERATOR'], label: '开始质检' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废' },
    ],
    QC_IN_PROGRESS: [
      { to: 'QC_PASS', action: 'pass_qc', roles: ['QC', 'OPERATOR'], label: '质检合格' },
      { to: 'QC_FAIL', action: 'fail_qc', roles: ['QC', 'OPERATOR'], label: '质检不合格' },
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
      // NOTE: CoA 退回在 CoA 表层面处理（status → DRAFT）
      // 重新提交：批次状态保持 COA_SUBMITTED（自环），CoA 状态从 REJECTED → SUBMITTED
      { to: 'COA_SUBMITTED', action: 'resubmit_coa', roles: ['OPERATOR', 'SUPERVISOR'], label: '重新提交' },
    ],
    COA_APPROVED: [
      { to: 'RELEASED', action: 'release', roles: ['SUPERVISOR', 'ADMIN'], label: '放行' },
    ],
    RELEASED: [],
    SCRAPPED: [],
  },
}

// ============================================
// 状态中文标签（15 种状态 + 1 个已废弃）
// ============================================

const STATUS_LABELS: Record<string, string> = {
  // 通用
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
  // 服务项目
  SAMPLE_RECEIVED: '样本已接收',
  HANDOVER: '交接中',
  IDENTIFICATION: '鉴定中',
  REPORT_PENDING: '待生成报告',
  // 试剂盒
  MATERIAL_PREP: '物料准备中',
  // 已废弃（保留映射以兼容历史数据）
  REJECTED: '已退回',
}

// ============================================
// 状态 Tailwind 徽标颜色（16 种状态）
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
  // 服务项目
  SAMPLE_RECEIVED: 'bg-blue-100 text-blue-800',
  HANDOVER: 'bg-amber-100 text-amber-800',
  IDENTIFICATION: 'bg-indigo-100 text-indigo-800',
  REPORT_PENDING: 'bg-purple-100 text-purple-800',
  // 试剂盒
  MATERIAL_PREP: 'bg-cyan-100 text-cyan-800',
  // 已废弃
  REJECTED: 'bg-stone-100 text-stone-600',
}

// ============================================
// 公开函数
// ============================================

/**
 * 获取指定产品线的状态转换规则
 * @param productLine - 产品线
 * @returns 状态转换规则表，未知产品线默认返回 CELL_PRODUCT
 */
export function getTransitions(productLine: ProductLine): Record<string, TransitionRule[]> {
  return TRANSITION_TEMPLATES[productLine] ?? TRANSITION_TEMPLATES.CELL_PRODUCT
}

/**
 * 检查从当前状态到目标状态的转换是否合法
 * @param productLine - 产品线
 * @param currentStatus - 当前批次状态
 * @param targetStatus - 目标状态
 * @returns 是否允许转换
 */
export function canTransition(productLine: ProductLine, currentStatus: string, targetStatus: string): boolean {
  const rules = getTransitions(productLine)[currentStatus]
  if (!rules) return false
  return rules.some((r) => r.to === targetStatus)
}

/**
 * 获取指定角色在当前状态下可执行的所有操作
 * @param productLine - 产品线
 * @param currentStatus - 当前批次状态
 * @param userRoles - 用户角色列表
 * @returns 可用操作列表（不含 SYSTEM 自动操作）
 */
export function getAvailableActions(productLine: ProductLine, currentStatus: string, userRoles: string[]): AvailableAction[] {
  const rules = getTransitions(productLine)[currentStatus]
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
 * 为批次创建 CoA 草稿（如果尚未存在）
 * 被多个转换场景复用：generate_coa, submit_report
 */
async function createCoaIfNeeded(
  batch: { batchNo: string; productCode: string; productName: string; specification: string | null; seedBatchNo: string | null; seedPassage: string | null; currentPassage: string | null; plannedQuantity: number | null; actualQuantity: number | null; storageLocation: string | null },
  batchId: string,
  operatorId: string,
  operatorName: string,
) {
  const existingCoa = await db.coa.findUnique({ where: { batchId } })
  if (existingCoa) return

  const coaNo = `COA-${batch.batchNo}`

  const latestQc = await db.qcRecord.findFirst({
    where: { batchId },
    orderBy: { createdAt: 'desc' },
  })

  const qcRecords = await db.qcRecord.findMany({
    where: { batchId },
    select: { sampleQuantity: true },
  })
  const totalConsumed = qcRecords.reduce((sum, r) => sum + (r.sampleQuantity || 0), 0)
  const releaseQuantity = (batch.actualQuantity || 0) - totalConsumed

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

/**
 * 执行批次状态转换（核心函数）
 *
 * 完整流程:
 *  1. 查找批次，校验存在性
 *  2. 从批次 productLine 获取对应的转换规则
 *  3. 从当前状态查找匹配 action 的转换规则
 *  4. 校验操作员角色权限
 *  5. 执行转换：
 *     - QC_PASS → COA_PENDING: 自动创建 CoA 草稿
 *     - start_production: 设置 actualStartDate
 *     - RELEASED: 设置 actualEndDate
 *  6. 同步更新 CoA 状态（如适用）
 *  7. 更新数据库
 *  8. 返回结果
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
  const productLine = batch.productLine as ProductLine

  // 2. 查找匹配的转换规则（根据产品线）
  const rules = getTransitions(productLine)[previousState]
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
      await createCoaIfNeeded(batch, batchId, operatorId, operatorName)
    }

    // 4a2. 处理 SERVICE submit_report → COA_SUBMITTED 自动创建 CoA
    if (action === 'submit_report' && newState === 'COA_SUBMITTED') {
      const existingCoa = await db.coa.findUnique({ where: { batchId } })
      if (!existingCoa) {
        await createCoaIfNeeded(batch, batchId, operatorId, operatorName)
      }
      // 创建后直接提交
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'SUBMITTED',
          submittedBy: operatorId,
          submittedAt: new Date(),
        },
      })
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
      // CoA rejection: status → DRAFT (not REJECTED), batch stays COA_SUBMITTED
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'DRAFT',
          reviewedBy: operatorId,
          reviewedByName: operatorName,
          reviewComment: reason ?? '',
          reviewedAt: new Date(),
        },
      })
    } else if (action === 'resubmit_coa') {
      // CoA resubmit: CoA status DRAFT/REJECTED → SUBMITTED, batch stays COA_SUBMITTED
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

// ============================================
// 向后兼容 — 旧代码仍可使用 BATCH_TRANSITIONS
// ============================================

/**
 * @deprecated 请使用 getTransitions(productLine) 替代
 * 保留此导出以便旧代码平滑迁移
 */
export const BATCH_TRANSITIONS = TRANSITION_TEMPLATES.CELL_PRODUCT
