// ============================================
// iPSC 生产管理系统 — 批次状态机服务 v3.0
// 控制所有 BatchStatus 状态转换的核心业务逻辑
// 支持 3 种产品线：CELL_PRODUCT / SERVICE / KIT
//
// v3.0 核心变更：
//   - CoA 流程简化：QC_PASS 自动生成 CoA 并设为 COA_SUBMITTED
//   - 批准 = 自动放行：approve COA_SUBMITTED → RELEASED（合并 approve_coa + release）
//   - QC 角色严格分离：质检操作仅限 QC 角色
//   - 服务项目去除 HANDOVER，新增 TERMINATED
//   - 报废/终止必须传入 reason
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
  /** 是否为系统自动触发（如 QC_PASS → COA_SUBMITTED） */
  auto?: boolean;
  /** 是否需要强制填写原因 */
  requiresReason?: boolean;
  /** 是否需要填写终止原因分类 */
  requiresTerminationReason?: boolean;
}

/** 对外暴露的可用操作描述 */
export interface AvailableAction {
  targetStatus: BatchStatus;
  action: string;
  label: string;
  auto?: boolean;
  requiresReason?: boolean;
  requiresTerminationReason?: boolean;
}

/** transition() 函数返回值 */
export interface TransitionResult {
  success: boolean;
  previousState: string;
  newState: string;
  message: string;
}

/** 终止原因枚举 */
export const TERMINATION_REASONS = [
  'CUSTOMER_CANCEL',     // 客户取消
  'SAMPLE_ISSUE',        // 样本问题
  'REQUIREMENT_CHANGE',  // 需求变更
  'SERVICE_FAILURE',     // 服务失败（如重编程两轮均失败）
  'OTHER',               // 其他
] as const

/** 终止原因中文标签 */
export const TERMINATION_REASON_LABELS: Record<string, string> = {
  CUSTOMER_CANCEL: '客户取消',
  SAMPLE_ISSUE: '样本问题',
  REQUIREMENT_CHANGE: '需求变更',
  SERVICE_FAILURE: '服务失败',
  OTHER: '其他',
}

// ============================================
// 状态转换模板（按产品线组织）
// ============================================

/**
 * 多产品线状态机转换规则定义
 *
 * CELL_PRODUCT — 细胞产品（库存驱动）:
 *   NEW → IN_PRODUCTION → QC_PENDING → QC_IN_PROGRESS → QC_PASS → COA_SUBMITTED → RELEASED
 *   中间状态 → SCRAPPED（强制原因）
 *   QC_PASS 时系统自动生成 CoA 草稿（batch 仍处于 QC_PASS）
 *   QC 角色手动提交 CoA（QC_PASS → COA_SUBMITTED）
 *   COA_SUBMITTED 可被报废（需原因）
 *
 * SERVICE — 服务项目（订单驱动）:
 *   NEW → SAMPLE_RECEIVED → IN_PRODUCTION → IDENTIFICATION → REPORT_PENDING → COA_SUBMITTED → RELEASED
 *   IN_PRODUCTION → TERMINATED（终止，强制原因+分类）
 *   IDENTIFICATION → IN_PRODUCTION（返工）
 *   中间状态 → SCRAPPED（强制原因）
 *
 * KIT — 试剂盒（产品驱动）:
 *   NEW → MATERIAL_PREP → IN_PRODUCTION → QC_PENDING → QC_IN_PROGRESS → QC_PASS → COA_SUBMITTED → RELEASED
 *   中间状态 → SCRAPPED（强制原因）
 */
const TRANSITION_TEMPLATES: Record<ProductLine, Record<string, TransitionRule[]>> = {
  // ------------------------------------------------
  // 细胞产品 — v3.0 简化 CoA 流程，QC 角色严格分离
  // ------------------------------------------------
  CELL_PRODUCT: {
    NEW: [
      { to: 'IN_PRODUCTION', action: 'start_production', roles: ['SUPERVISOR', 'OPERATOR'], label: '开始生产' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    IN_PRODUCTION: [
      { to: 'QC_PENDING', action: 'complete_production', roles: ['OPERATOR', 'SUPERVISOR'], label: '完成生产' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    QC_PENDING: [
      { to: 'QC_IN_PROGRESS', action: 'start_qc', roles: ['QC'], label: '开始质检' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    QC_IN_PROGRESS: [
      { to: 'QC_PASS', action: 'pass_qc', roles: ['QC'], label: '质检合格' },
      { to: 'QC_PENDING', action: 'rework', roles: ['SUPERVISOR', 'ADMIN'], label: '返工' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    QC_PASS: [
      // v3.0: QC 角色预览后手动提交 CoA（QC_PASS → COA_SUBMITTED）
      // CoA 草稿在 pass_qc 时自动生成
      { to: 'COA_SUBMITTED', action: 'submit_coa', roles: ['QC'], label: '提交CoA' },
    ],
    COA_SUBMITTED: [
      // v3.0: 批准 CoA = 自动放行（合并 approve_coa + release）
      { to: 'RELEASED', action: 'approve', roles: ['SUPERVISOR', 'QA'], label: '批准并放行' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    RELEASED: [],
    SCRAPPED: [],
  },

  // ------------------------------------------------
  // 服务项目 — v3.0 去除 HANDOVER，新增 TERMINATED
  // ------------------------------------------------
  SERVICE: {
    NEW: [
      { to: 'SAMPLE_RECEIVED', action: 'receive_sample', roles: ['OPERATOR'], label: '接收样本' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    SAMPLE_RECEIVED: [
      { to: 'IN_PRODUCTION', action: 'start_production', roles: ['OPERATOR', 'SUPERVISOR'], label: '开始生产' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    IN_PRODUCTION: [
      { to: 'IDENTIFICATION', action: 'start_identification', roles: ['OPERATOR', 'SUPERVISOR'], label: '进入鉴定' },
      // v3.0 新增: 服务项目可终止（非报废性终止）
      { to: 'TERMINATED', action: 'terminate', roles: ['ADMIN', 'SUPERVISOR'], label: '终止', requiresReason: true, requiresTerminationReason: true },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    IDENTIFICATION: [
      { to: 'REPORT_PENDING', action: 'complete_identification', roles: ['OPERATOR', 'SUPERVISOR'], label: '鉴定完成' },
      { to: 'IN_PRODUCTION', action: 'rework', roles: ['SUPERVISOR', 'ADMIN'], label: '返工' },
      { to: 'TERMINATED', action: 'terminate', roles: ['ADMIN', 'SUPERVISOR'], label: '终止', requiresReason: true, requiresTerminationReason: true },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    REPORT_PENDING: [
      // v3.0: 提交报告+CoA，自动生成 CoA 草稿并设为 SUBMITTED
      { to: 'COA_SUBMITTED', action: 'submit_report', roles: ['OPERATOR', 'SUPERVISOR'], label: '提交报告+CoA' },
      { to: 'TERMINATED', action: 'terminate', roles: ['ADMIN', 'SUPERVISOR'], label: '终止', requiresReason: true, requiresTerminationReason: true },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    COA_SUBMITTED: [
      // v3.0: 批准 CoA = 自动放行
      { to: 'RELEASED', action: 'approve', roles: ['SUPERVISOR', 'QA'], label: '批准并放行' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    RELEASED: [],
    TERMINATED: [],
    SCRAPPED: [],
  },

  // ------------------------------------------------
  // 试剂盒 — v3.0 简化 CoA 流程，QC 角色严格分离
  // ------------------------------------------------
  KIT: {
    NEW: [
      { to: 'MATERIAL_PREP', action: 'start_material_prep', roles: ['OPERATOR', 'SUPERVISOR'], label: '开始备料' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    MATERIAL_PREP: [
      { to: 'IN_PRODUCTION', action: 'start_production', roles: ['OPERATOR', 'SUPERVISOR'], label: '开始配制' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    IN_PRODUCTION: [
      { to: 'QC_PENDING', action: 'complete_production', roles: ['OPERATOR', 'SUPERVISOR'], label: '完成生产' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    QC_PENDING: [
      { to: 'QC_IN_PROGRESS', action: 'start_qc', roles: ['QC'], label: '开始质检' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    QC_IN_PROGRESS: [
      { to: 'QC_PASS', action: 'pass_qc', roles: ['QC'], label: '质检合格' },
      { to: 'QC_PENDING', action: 'rework', roles: ['SUPERVISOR', 'ADMIN'], label: '返工' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    QC_PASS: [
      // v3.0: QC 角色预览后手动提交 CoA（QC_PASS → COA_SUBMITTED）
      { to: 'COA_SUBMITTED', action: 'submit_coa', roles: ['QC'], label: '提交CoA' },
    ],
    COA_SUBMITTED: [
      // v3.0: 批准 CoA = 自动放行
      { to: 'RELEASED', action: 'approve', roles: ['SUPERVISOR', 'QA'], label: '批准并放行' },
      { to: 'SCRAPPED', action: 'scrap', roles: ['ADMIN', 'SUPERVISOR'], label: '报废', requiresReason: true },
    ],
    RELEASED: [],
    SCRAPPED: [],
  },
}

// ============================================
// 状态中文标签（含废弃状态向后兼容映射）
// ============================================

const STATUS_LABELS: Record<string, string> = {
  // === 通用（v3.0 活跃状态） ===
  NEW: '新建',
  IN_PRODUCTION: '生产中',
  QC_PENDING: '待质检',
  QC_IN_PROGRESS: '质检中',
  QC_PASS: '质检合格',
  COA_SUBMITTED: 'CoA已提交',
  RELEASED: '已放行',
  SCRAPPED: '已报废',
  // === 服务项目特有 ===
  SAMPLE_RECEIVED: '样本已接收',
  IDENTIFICATION: '鉴定中',
  REPORT_PENDING: '待生成报告',
  TERMINATED: '已终止',
  // === 试剂盒特有 ===
  MATERIAL_PREP: '物料准备中',
  // === 已废弃（向后兼容，映射为当前等价状态标签） ===
  QC_FAIL: '质检不合格（返工中）',
  COA_PENDING: 'CoA已提交',       // → 映射为 COA_SUBMITTED 的标签
  COA_APPROVED: '已放行',          // → 映射为 RELEASED 的标签
  HANDOVER: '交接中（已废弃）',
  REJECTED: '已退回',
}

// ============================================
// 状态 Tailwind 徽标颜色（含废弃状态）
// ============================================

const STATUS_COLORS: Record<string, string> = {
  // === 通用（v3.0 活跃状态） ===
  NEW: 'bg-gray-100 text-gray-800',
  IN_PRODUCTION: 'bg-blue-100 text-blue-800',
  QC_PENDING: 'bg-yellow-100 text-yellow-800',
  QC_IN_PROGRESS: 'bg-orange-100 text-orange-800',
  QC_PASS: 'bg-emerald-100 text-emerald-800',
  COA_SUBMITTED: 'bg-sky-100 text-sky-800',
  RELEASED: 'bg-green-100 text-green-800',
  SCRAPPED: 'bg-stone-100 text-stone-600',
  // === 服务项目特有 ===
  SAMPLE_RECEIVED: 'bg-blue-100 text-blue-800',
  IDENTIFICATION: 'bg-indigo-100 text-indigo-800',
  REPORT_PENDING: 'bg-purple-100 text-purple-800',
  TERMINATED: 'bg-amber-100 text-amber-800',
  // === 试剂盒特有 ===
  MATERIAL_PREP: 'bg-cyan-100 text-cyan-800',
  // === 已废弃 ===
  QC_FAIL: 'bg-red-100 text-red-800',
  COA_PENDING: 'bg-sky-100 text-sky-800',
  COA_APPROVED: 'bg-teal-100 text-teal-800',
  HANDOVER: 'bg-amber-100 text-amber-800',
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
    .filter((r) => {
      // 过滤掉系统自动操作
      if (r.roles[0] === 'SYSTEM') return false
      // 检查用户是否拥有所需角色
      return r.roles.some(role => userRoles.includes(role as string))
    })
    .map((r) => ({
      targetStatus: r.to,
      action: r.action,
      label: r.label,
      auto: r.auto,
      requiresReason: r.requiresReason,
      requiresTerminationReason: r.requiresTerminationReason,
    }))
}

/**
 * 为批次创建 CoA 草稿（如果尚未存在）
 * 被多个转换场景复用
 */
async function createCoaIfNeeded(
  batch: { batchNo: string; productCode: string; productName: string; specification: string | null; seedBatchNo: string | null; seedPassage: string | null; currentPassage: string | null; plannedQuantity: number | null; actualQuantity: number | null; storageLocation: string | null; productLine: string | null; unit: string | null },
  batchId: string,
  operatorId: string,
  operatorName: string,
) {
  const existingCoa = await db.coa.findUnique({ where: { batchId } })
  if (existingCoa) return

  const coaNo = `COA-${batch.batchNo}`
  const productLine = batch.productLine as string
  const unit = batch.unit || '盒'

  const latestQc = await db.qcRecord.findFirst({
    where: { batchId },
    orderBy: { createdAt: 'desc' },
  })

  // Base CoA content (common fields)
  const baseContent: Record<string, unknown> = {
    productCode: batch.productCode,
    productName: batch.productName,
    batchNo: batch.batchNo,
    specification: batch.specification,
    productLine,
    plannedQuantity: batch.plannedQuantity,
    actualQuantity: batch.actualQuantity,
    testResults: latestQc ? JSON.parse(latestQc.testResults) : [],
    overallJudgment: latestQc?.overallJudgment ?? '',
  }

  if (productLine === 'KIT') {
    // KIT: fetch production task formData for component/assembly info
    const kitTask = await db.productionTask.findFirst({
      where: { batchId, taskCode: 'KIT_PRODUCTION' },
      select: { formData: true },
    })

    const formData = kitTask?.formData
      ? (typeof kitTask.formData === 'string' ? JSON.parse(kitTask.formData) : kitTask.formData) as Record<string, unknown>
      : null

    baseContent.productionInfo = {
      components: formData?.components || [],
      assembly: formData?.assembly || null,
    }
  } else {
    // CELL_PRODUCT / SERVICE: standard production fields
    const qcRecords = await db.qcRecord.findMany({
      where: { batchId },
      select: { sampleQuantity: true },
    })
    const totalConsumed = qcRecords.reduce((sum, r) => sum + (r.sampleQuantity || 0), 0)
    const releaseQuantity = (batch.actualQuantity || 0) - totalConsumed

    baseContent.seedBatchNo = batch.seedBatchNo
    baseContent.seedPassage = batch.seedPassage
    baseContent.currentPassage = batch.currentPassage
    baseContent.storageLocation = batch.storageLocation
    baseContent.releaseQuantity = releaseQuantity
    baseContent.totalConsumedVials = totalConsumed
    baseContent.unit = '支'
  }

  const coaContent = JSON.stringify(baseContent)

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
 * transition() 函数的可选选项
 */
export interface TransitionOptions {
  /** 报废原因（scrap 操作必填） */
  reason?: string;
  /** 终止原因分类（terminate 操作必填） */
  terminationReason?: string;
}

/**
 * 执行批次状态转换（核心函数）
 *
 * v3.0 完整流程:
 *  1. 查找批次，校验存在性
 *  2. 从批次 productLine 获取对应的转换规则
 *  3. 从当前状态查找匹配 action 的转换规则
 *  4. 校验操作员角色权限（由上层 API 完成，此处仅检查 SYSTEM）
 *  5. 校验必填字段（reason, terminationReason）
 *  6. 执行转换：
 *     - pass_qc: QC_IN_PROGRESS → QC_PASS（自动生成 CoA 草稿）
 *     - submit_coa: QC_PASS → COA_SUBMITTED（QC 提交 CoA）
 *     - submit_report: 服务项目报告提交 → COA_SUBMITTED（自动生成 CoA + 提交）
 *     - approve: COA_SUBMITTED → 自动放行 RELEASED
 *     - scrap: 记录报废原因
 *     - terminate: 记录终止原因
 *     - start_production: 设置 actualStartDate
 *  7. 更新数据库
 *  8. 返回结果
 *
 * @param batchId - 批次 ID (cuid)
 * @param action - 动作编码，如 'start_production'
 * @param operatorId - 操作员 ID
 * @param operatorName - 操作员姓名
 * @param options - 可选参数（reason, terminationReason）
 * @returns 转换结果
 */
export async function transition(
  batchId: string,
  action: string,
  operatorId: string,
  operatorName: string,
  options?: TransitionOptions,
): Promise<TransitionResult> {
  const reason = options?.reason
  const terminationReason = options?.terminationReason

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
    if (!operatorId || !operatorName) {
      return {
        success: false,
        previousState,
        newState: '',
        message: '非系统自动操作需要提供操作员信息',
      }
    }
  }

  // 4. 校验必填字段
  if (matchedRule.requiresReason && !reason) {
    return {
      success: false,
      previousState,
      newState: '',
      message: '此操作必须提供原因（reason）',
    }
  }
  if (matchedRule.requiresTerminationReason && !terminationReason) {
    return {
      success: false,
      previousState,
      newState: '',
      message: '终止操作必须提供终止原因分类（terminationReason）',
    }
  }

  // 5. 执行转换
  try {
    const updateData: Record<string, unknown> = {
      status: newState as BatchStatus,
    }

    // 5a. pass_qc: 质检合格时自动生成 CoA 草稿（batch 仍处于 QC_PASS）
    if (action === 'pass_qc') {
      // 仅对 CELL_PRODUCT/KIT 自动生成 CoA（SERVICE 无 QC 流程）
      if (productLine === 'CELL_PRODUCT' || productLine === 'KIT') {
        await createCoaIfNeeded(batch, batchId, operatorId, operatorName)
      }
    }

    // 5a2. submit_coa: QC 提交 CoA（QC_PASS → COA_SUBMITTED）
    if (action === 'submit_coa') {
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'SUBMITTED',
          submittedBy: operatorId,
          submittedAt: new Date(),
        },
      })
    }

    // 5b. SERVICE submit_report → COA_SUBMITTED: 自动生成 CoA 并提交
    if (action === 'submit_report' && newState === 'COA_SUBMITTED') {
      const existingCoa = await db.coa.findUnique({ where: { batchId } })
      if (!existingCoa) {
        await createCoaIfNeeded(batch, batchId, operatorId, operatorName)
      }
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'SUBMITTED',
          submittedBy: operatorId,
          submittedAt: new Date(),
        },
      })
    }

    // 5c. approve: COA_SUBMITTED → RELEASED（批准 CoA = 自动放行）
    if (action === 'approve' && newState === 'RELEASED') {
      updateData.actualEndDate = new Date()
      // 同步更新 CoA 状态为 APPROVED
      await db.coa.update({
        where: { batchId },
        data: {
          status: 'APPROVED',
          approvedBy: operatorId,
          approvedByName: operatorName,
          approvedAt: new Date(),
        },
      })
    }

    // 5d. start_production: 设置 actualStartDate
    if (action === 'start_production') {
      updateData.actualStartDate = new Date()
    }

    // 5e. scrap: 记录报废原因 + 设置实际结束日期
    if (action === 'scrap') {
      updateData.scrapReason = reason
      updateData.actualEndDate = new Date()
    }

    // 5f. terminate: 记录终止原因 + 详细原因 + 设置实际结束日期
    if (action === 'terminate') {
      updateData.terminationReason = terminationReason
      if (reason) {
        updateData.scrapReason = reason // Store detailed reason text in scrapReason
      }
      updateData.actualEndDate = new Date()
    }

    // 6. 更新批次状态
    await db.batch.update({
      where: { id: batchId },
      data: updateData,
    })

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
