// ============================================
// 角色权限工具函数
// 支持多角色体系：一个用户可以拥有多个角色
// 多产品线架构：产品线标签/颜色/分类/批次前缀
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

/** 角色中文标签 */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  SUPERVISOR: '生产主管',
  OPERATOR: '操作员',
  QA: 'QA',
}

/** 角色徽标颜色 */
export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  SUPERVISOR: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  OPERATOR: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  QA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
}

/** 所有有效角色 */
export const VALID_ROLES: string[] = ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'QA']

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
 * 策略：ADMIN > SUPERVISOR > QA > OPERATOR（取最高权限）
 */
export function determinePrimaryRole(roles: string[]): Role {
  const priority: string[] = ['ADMIN', 'SUPERVISOR', 'QA', 'OPERATOR']
  for (const r of priority) {
    if (roles.includes(r)) return r as Role
  }
  return 'OPERATOR' as Role
}

/**
 * 获取用户在特定产品上的有效角色
 * 优先级：UserProductRole.roles > User.roles（全局回退）
 *
 * 设计规则：
 * - 如果用户有产品特定角色，这些是该产品上的权威角色
 * - 如果用户同时有全局角色（user.roles），这些也会被包含（并集/合并）
 * - 如果没有产品特定分配，则回退到全局角色
 *
 * @param userRoles - 用户的全局角色（user.roles 解析后的数组）
 * @param productRoles - 用户在该产品上的角色（UserProductRole.roles 解析后的数组，无分配时为 undefined）
 * @returns 合并后的角色数组（产品角色优先，全局角色作为补充）
 */
export function getProductRoles(userRoles: string[], productRoles?: string[]): string[] {
  // 如果没有产品特定角色，回退到全局角色
  if (!productRoles || productRoles.length === 0) {
    return [...userRoles]
  }

  // 有产品特定角色：取并集（产品角色 + 全局角色），去重
  const roleSet = new Set([...productRoles, ...userRoles])
  return [...roleSet].filter(r => VALID_ROLES.includes(r))
}
