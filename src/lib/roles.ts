// ============================================
// 角色权限工具函数
// 支持多角色体系：一个用户可以拥有多个角色
// 多产品线架构：产品线标签/颜色/分类/批次前缀
//
// v2.0 — QA/QC 分离 + 双轨验证
// 管理类: ADMIN(全局), SUPERVISOR(产品线级), QA(产品线级)
// 操作类: QC(产品级), OPERATOR(产品级)
// ============================================

import type { Role } from '@prisma/client'

// ============================================
// 产品线常量
// ============================================

/** 产品线中文标签 */
export const PRODUCT_LINE_LABELS: Record<string, string> = {
  SERVICE: '服务项目',
  CELL_PRODUCT: '细胞产品',
  KIT: '试剂盒',
}

/** 产品线徽标颜色 */
export const PRODUCT_LINE_COLORS: Record<string, string> = {
  SERVICE: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  CELL_PRODUCT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  KIT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
}

/** 产品分类中文标签 */
export const CATEGORY_LABELS: Record<string, string> = {
  IPSC: 'iPSC细胞',
  NPC: 'NPC神经前体',
  REPROGRAM: '重编程建系',
  EDIT: '基因编辑',
  DIFF_SERVICE: '分化服务',
  DIFF_KIT: '分化试剂盒',
  MEDIUM: '培养基',
}

/** 批次编号前缀（按产品线） */
export const BATCH_NO_PREFIXES: Record<string, string> = {
  SERVICE: 'SRV',
  CELL_PRODUCT: 'IPSC',
  KIT: 'KIT',
}

// ============================================
// 角色常量
// ============================================

/** 角色中文标签 */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  SUPERVISOR: '生产主管',
  QA: '质量保证',
  QC: '质量控制',
  OPERATOR: '操作员',
}

/** 角色徽标颜色 */
export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  SUPERVISOR: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  QA: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  QC: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  OPERATOR: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
}

/** 所有有效角色（v2.0: 含 QC） */
export const VALID_ROLES: string[] = ['ADMIN', 'SUPERVISOR', 'QA', 'QC', 'OPERATOR']

/** 管理类角色 — 权限由全局角色 + 产品线归属控制 */
export const MANAGEMENT_ROLES: string[] = ['ADMIN', 'SUPERVISOR', 'QA']

/** 操作类角色 — 权限由全局资质 + 产品级授权控制 */
export const OPERATIONAL_ROLES: string[] = ['QC', 'OPERATOR']

/** 角色优先级（高→低） */
const ROLE_PRIORITY: string[] = ['ADMIN', 'SUPERVISOR', 'QA', 'QC', 'OPERATOR']

// ============================================
// 角色解析与序列化
// ============================================

/**
 * 解析 roles 字段（JSON 字符串 → string[]）
 * 兼容处理：如果 roles 为空或无效 JSON，回退到 [role]
 */
export function parseRoles(rolesJson: string | null | undefined, fallbackRole: string): string[] {
  if (!rolesJson) return [fallbackRole]
  try {
    const parsed = JSON.parse(rolesJson)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((r: string) => VALID_ROLES.includes(r))
    }
  } catch {
    // JSON 解析失败，回退
  }
  return [fallbackRole]
}

/**
 * 序列化 roles 字段（string[] → JSON 字符串）
 */
export function serializeRoles(roles: string[]): string {
  return JSON.stringify(roles.filter(r => VALID_ROLES.includes(r)))
}

// ============================================
// 角色检查（基础工具，所有代码可安全使用）
// ============================================

/**
 * 检查用户是否拥有某个角色
 */
export function hasRole(userRoles: string[], role: string): boolean {
  return userRoles.includes(role)
}

/**
 * 检查用户是否拥有任意一个指定角色
 */
export function hasAnyRole(userRoles: string[], roles: string[]): boolean {
  return roles.some(r => userRoles.includes(r))
}

/**
 * 检查用户是否为管理员
 */
export function isAdmin(userRoles: string[]): boolean {
  return userRoles.includes('ADMIN')
}

// ============================================
// 角色显示
// ============================================

/**
 * 获取角色的显示名称（支持多角色拼接）
 */
export function getRoleDisplay(roles: string[]): string {
  if (roles.length === 0) return '用户'
  if (roles.length === 1) return ROLE_LABELS[roles[0]] || roles[0]
  return roles.map(r => ROLE_LABELS[r] || r).join(' / ')
}

/**
 * 获取主角色名称（用于向后兼容场景）
 */
export function getPrimaryRoleName(roles: string[]): string {
  return ROLE_LABELS[roles[0]] || '用户'
}

/**
 * 根据 roles 数组确定 role 枚举主角色
 * 策略：ADMIN > SUPERVISOR > QA > QC > OPERATOR（取最高权限）
 */
export function determinePrimaryRole(roles: string[]): Role {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r as Role
  }
  return 'OPERATOR' as Role
}

// ============================================
// 双轨权限验证（§2.6 v2.0）
// ============================================

/**
 * 管理类操作权限检查
 * 条件：ADMIN 天然通过，或 拥有指定管理角色 且 属于目标产品线
 *
 * @param userRoles - 用户的全局角色列表
 * @param userProductLines - 用户归属的产品线列表（从 UserProductLine 获取）
 * @param targetProductLine - 目标产品线
 * @param requiredRoles - 要求的管理类角色
 */
export function canManage(
  userRoles: string[],
  userProductLines: string[],
  targetProductLine: string,
  requiredRoles: string[],
): boolean {
  // ADMIN 天然拥有所有权限
  if (isAdmin(userRoles)) return true

  // 检查是否拥有指定的管理角色
  if (!hasAnyRole(userRoles, requiredRoles)) return false

  // 检查是否属于目标产品线
  return userProductLines.includes(targetProductLine)
}

/**
 * 操作类操作权限检查
 * 条件：ADMIN 天然通过，或 拥有指定操作资质 且 被授权操作该产品
 *
 * @param userRoles - 用户的全局角色列表
 * @param userProductRoles - 用户的产品权限列表（每条含 productId + roles）
 * @param targetProductId - 目标产品 ID
 * @param requiredRoles - 要求的操作类角色（OPERATOR / QC）
 */
export function canOperate(
  userRoles: string[],
  userProductRoles: Array<{ productId: string; roles: string[] }>,
  targetProductId: string,
  requiredRoles: string[],
): boolean {
  // ADMIN 天然拥有所有权限
  if (isAdmin(userRoles)) return true

  // 检查全局资质（必须有该操作类角色）
  if (!hasAnyRole(userRoles, requiredRoles)) return false

  // 检查产品级授权
  const productPermission = userProductRoles.find(pr => pr.productId === targetProductId)
  if (!productPermission) return false

  // 检查该产品上的操作类角色是否满足要求
  return hasAnyRole(productPermission.roles, requiredRoles)
}

// ============================================
// 废弃函数（保留以向后兼容）
// ============================================

/**
 * @deprecated v2.0 — 请使用 canManage() 或 canOperate() 替代
 * 获取用户在特定产品上的有效角色（旧合并逻辑）
 *
 * v2.0 说明：此函数使用取并集逻辑，已被双轨验证替代。
 * 保留导出以避免编译错误，但新代码不应使用。
 */
export function getProductRoles(userRoles: string[], productRoles?: string[]): string[] {
  if (!productRoles || productRoles.length === 0) {
    return [...userRoles]
  }
  const roleSet = new Set([...productRoles, ...userRoles])
  return [...roleSet].filter(r => VALID_ROLES.includes(r))
}
