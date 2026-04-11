// ============================================
// iPSC 生产管理系统 — 审计日志服务
// 统一的审计追踪层，记录所有关键业务操作
// ============================================

import { db } from '@/lib/db'

// ============================================
// 类型定义
// ============================================

/** 创建审计日志的参数 */
export interface CreateAuditLogParams {
  /** 事件类型编码，如 BATCH_CREATED, TASK_COMPLETED, STATUS_CHANGED */
  eventType: string;
  /** 对应的操作意图编码（AI 模式下用于关联 Intent Layer） */
  intentCode?: string;
  /** 操作对象类型: BATCH / TASK / QC / COA / USER */
  targetType: string;
  /** 操作对象 ID */
  targetId: string;
  /** 操作对象关联的批次编号（方便按批次检索） */
  targetBatchNo?: string;
  /** 操作员 ID */
  operatorId?: string;
  /** 操作员姓名 */
  operatorName?: string;
  /** 操作输入模式 */
  inputMode?: 'FORM_SUBMIT' | 'AI_CONVERSATION';
  /** 操作前的数据快照（JSON 序列化后的字符串或对象，内部会 stringify） */

  dataBefore?: any;
  /** 操作后的数据（JSON 序列化后的字符串或对象，内部会 stringify） */

  dataAfter?: any;
  /** AI 模式特有的上下文信息 */

  aiContext?: any;
}

/** 审计日志查询筛选条件 */
export interface AuditLogFilters {
  /** 按批次编号筛选 */
  targetBatchNo?: string;
  /** 按操作对象类型筛选 */
  targetType?: string;
  /** 按操作员 ID 筛选 */
  operatorId?: string;
  /** 按事件类型筛选 */
  eventType?: string;
  /** 页码（从 1 开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

/** 审计日志查询返回 */
export interface AuditLogPageResult {
  /** 日志列表 */
  logs: Record<string, unknown>[];
  /** 总条数 */
  total: number;
}

/** 批次时间线条目 */
export interface TimelineEntry {
  /** 审计日志 ID */
  id: string;
  /** 事件类型 */
  eventType: string;
  /** 操作对象类型 */
  targetType: string;
  /** 操作对象 ID */
  targetId: string;
  /** 操作员姓名 */
  operatorName?: string;
  /** 输入模式 */
  inputMode: string;
  /** 操作前数据 */

  dataBefore?: any;
  /** 操作后数据 */

  dataAfter?: any;
  /** AI 上下文 */

  aiContext?: any;
  /** 创建时间 */
  createdAt: Date;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 安全地将值序列化为 JSON 字符串
 * 如果已经是字符串则直接返回，否则 JSON.stringify
 */
function safeStringify(value: any): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * 安全地将 JSON 字符串解析为对象
 * 如果不是字符串则直接返回，解析失败返回 null
 */
function safeParse(value: any): any {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

// ============================================
// 事件类型中文描述映射
// ============================================

const EVENT_TYPE_LABELS: Record<string, string> = {
  // 批次相关
  BATCH_CREATED: '创建批次',
  BATCH_UPDATED: '更新批次信息',
  BATCH_STATUS_CHANGED: '批次状态变更',
  BATCH_SCRAPPED: '批次报废',
  BATCH_RELEASED: '批次放行',

  // 生产任务相关
  TASK_CREATED: '创建生产任务',
  TASK_STARTED: '开始执行任务',
  TASK_COMPLETED: '完成任务',
  TASK_SKIPPED: '跳过任务',
  TASK_UPDATED: '更新任务数据',

  // 质检相关
  QC_RECORD_CREATED: '创建质检记录',
  QC_RECORD_UPDATED: '更新质检记录',
  QC_STARTED: '开始质检',
  QC_COMPLETED: '完成质检',

  // CoA 相关
  COA_GENERATED: '生成CoA',
  COA_SUBMITTED: '提交CoA审核',
  COA_APPROVED: 'CoA审核通过',
  COA_REJECTED: 'CoA审核退回',
  COA_RESUBMITTED: '重新提交CoA',
}

// ============================================
// 公开函数
// ============================================

/**
 * 创建审计日志
 *
 * 所有涉及数据变更的关键操作都应调用此函数记录审计日志。
 * 该函数为幂等设计，不会重复创建。
 *
 * @param params - 审计日志参数
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const {
    eventType,
    intentCode,
    targetType,
    targetId,
    targetBatchNo,
    operatorId,
    operatorName,
    inputMode = 'FORM_SUBMIT',
    dataBefore,
    dataAfter,
    aiContext,
  } = params

  await db.auditLog.create({
    data: {
      eventType,
      intentCode: intentCode ?? null,
      targetType,
      targetId,
      targetBatchNo: targetBatchNo ?? null,
      operatorId: operatorId ?? null,
      operatorName: operatorName ?? null,
      inputMode,
      dataBefore: safeStringify(dataBefore),
      dataAfter: safeStringify(dataAfter),
      aiContext: safeStringify(aiContext),
    },
  })
}

/**
 * 分页查询审计日志
 *
 * 支持按批次编号、操作对象类型、操作员 ID、事件类型进行筛选。
 *
 * @param filters - 筛选条件
 * @returns 分页结果，包含日志列表和总数
 */
export async function getAuditLogs(filters: AuditLogFilters): Promise<AuditLogPageResult> {
  const {
    targetBatchNo,
    targetType,
    operatorId,
    eventType,
    page = 1,
    pageSize = 20,
  } = filters

  // 构建查询条件
  const where: Record<string, unknown> = {}
  if (targetBatchNo) where.targetBatchNo = targetBatchNo
  if (targetType) where.targetType = targetType
  if (operatorId) where.operatorId = operatorId
  if (eventType) where.eventType = eventType

  // 查询总数
  const total = await db.auditLog.count({ where })

  // 分页查询
  const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize)
  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: Math.min(Math.max(1, pageSize), 100), // 上限 100
  })

  // 解析 JSON 字段并格式化返回
  const formattedLogs = logs.map((log) => ({
    ...log,
    dataBefore: safeParse(log.dataBefore),
    dataAfter: safeParse(log.dataAfter),
    aiContext: safeParse(log.aiContext),
    eventLabel: EVENT_TYPE_LABELS[log.eventType] ?? log.eventType,
  }))

  return { logs: formattedLogs, total }
}

/**
 * 获取批次时间线
 *
 * 返回指定批次的所有审计日志，按时间正序排列，用于时间线展示。
 *
 * @param batchNo - 批次编号
 * @returns 按时间排序的时间线条目列表
 */
export async function getBatchTimeline(batchNo: string): Promise<TimelineEntry[]> {
  const logs = await db.auditLog.findMany({
    where: { targetBatchNo: batchNo },
    orderBy: { createdAt: 'asc' },
  })

  return logs.map((log) => ({
    id: log.id,
    eventType: log.eventType,
    targetType: log.targetType,
    targetId: log.targetId,
    operatorName: log.operatorName ?? undefined,
    inputMode: log.inputMode,
    dataBefore: safeParse(log.dataBefore),
    dataAfter: safeParse(log.dataAfter),
    aiContext: safeParse(log.aiContext),
    createdAt: log.createdAt,
  }))
}
