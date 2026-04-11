// ============================================
// iPSC 生产管理系统 — 服务层统一导出
// ============================================

// 状态机服务
export {
  BATCH_TRANSITIONS,
  canTransition,
  getAvailableActions,
  getTransitions,
  transition,
  getStatusLabel,
  getStatusColor,
} from './state-machine'

export type {
  TransitionRule,
  AvailableAction,
  TransitionResult,
} from './state-machine'

// 校验服务
export {
  validateBatchCreation,
  validateProductionTask,
  validateQcRecord,
} from './validation'

export type {
  ValidationResult,
  BatchCreationData,
  ProductionTaskFormData,
  TestResultItem,
} from './validation'

// 审计日志服务
export {
  createAuditLog,
  getAuditLogs,
  getBatchTimeline,
} from './audit-log'

export type {
  CreateAuditLogParams,
  AuditLogFilters,
  AuditLogPageResult,
  TimelineEntry,
} from './audit-log'
