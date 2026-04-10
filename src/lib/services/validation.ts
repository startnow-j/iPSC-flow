// ============================================
// iPSC 生产管理系统 — 统一校验服务
// 服务端表单校验，所有业务数据的入口校验层
// ============================================

import { db } from '@/lib/db'

// ============================================
// 类型定义
// ============================================

/** 校验结果 */
export type ValidationResult = {
  /** 整体是否通过 */
  valid: boolean;
  /** 错误列表（阻断性） */
  errors: Array<{ field: string; rule: string; message: string }>;
  /** 警告列表（非阻断性） */
  warnings: Array<{ field: string; rule: string; message: string }>;
}

/** 批次创建参数 */
export interface BatchCreationData {
  productCode: string;
  plannedQuantity?: number | null;
  plannedStartDate?: string | Date | null;
  plannedEndDate?: string | Date | null;
}

/** 生产任务表单数据（各步骤统一类型） */
export type ProductionTaskFormData = Record<string, any>

/** 质检检测项 */
export interface TestResultItem {
  itemCode: string;
  itemName?: string;
  resultValue?: string | number | null;
  resultUnit?: string;
  judgment?: string;
  [key: string]: any;
}

// ============================================
// 工具函数
// ============================================

/** 创建一个空白的校验结果 */
function emptyResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] }
}

/** 添加错误并标记无效 */
function addError(
  result: ValidationResult,
  field: string,
  rule: string,
  message: string,
): void {
  result.valid = false
  result.errors.push({ field, rule, message })
}

/** 添加警告 */
function addWarning(
  result: ValidationResult,
  field: string,
  rule: string,
  message: string,
): void {
  result.warnings.push({ field, rule, message })
}

// ============================================
// 批次创建校验
// ============================================

/**
 * 校验批次创建数据
 *
 * 校验规则:
 *  - productCode: 必填，且必须在产品表中存在
 *  - plannedQuantity: 如有值，必须 > 0
 *  - plannedStartDate / plannedEndDate: 如均有值，开始日期必须早于结束日期
 *
 * @param data - 批次创建数据
 * @returns 校验结果
 */
export async function validateBatchCreation(
  data: BatchCreationData,
): Promise<ValidationResult> {
  const result = emptyResult()
  const { productCode, plannedQuantity, plannedStartDate, plannedEndDate } = data

  // productCode 必填
  if (!productCode || typeof productCode !== 'string' || productCode.trim() === '') {
    addError(result, 'productCode', 'REQUIRED', '产品编码不能为空')
  } else {
    // 检查产品是否存在于数据库
    const product = await db.product.findUnique({
      where: { productCode: productCode.trim() },
    })
    if (!product) {
      addError(result, 'productCode', 'NOT_FOUND', `产品编码 ${productCode} 不存在`)
    } else if (!product.active) {
      addWarning(result, 'productCode', 'INACTIVE', `产品 ${productCode} 已停用`)
    }
  }

  // plannedQuantity 校验
  if (plannedQuantity !== undefined && plannedQuantity !== null) {
    const qty = Number(plannedQuantity)
    if (isNaN(qty) || !Number.isInteger(qty)) {
      addError(result, 'plannedQuantity', 'INVALID_TYPE', '计划数量必须为整数')
    } else if (qty <= 0) {
      addError(result, 'plannedQuantity', 'OUT_OF_RANGE', '计划数量必须大于 0')
    }
  }

  // 日期校验
  const startDate = plannedStartDate ? new Date(plannedStartDate) : null
  const endDate = plannedEndDate ? new Date(plannedEndDate) : null

  if (startDate && isNaN(startDate.getTime())) {
    addError(result, 'plannedStartDate', 'INVALID_DATE', '计划开始日期格式无效')
  }
  if (endDate && isNaN(endDate.getTime())) {
    addError(result, 'plannedEndDate', 'INVALID_DATE', '计划结束日期格式无效')
  }

  if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    if (startDate >= endDate) {
      addError(
        result,
        'plannedStartDate',
        'DATE_ORDER',
        '计划开始日期必须早于计划结束日期',
      )
    }
  }

  return result
}

// ============================================
// 生产任务表单校验
// ============================================

/**
 * 校验生产任务表单数据
 *
 * 根据不同的 taskCode 校验不同的表单字段:
 *
 * - **SEED_PREP**（种子复苏）:
 *   - recovery_time: 必填，复苏耗时（分钟）
 *   - recovery_method: 必填，必须为 "快速复苏" 或 "慢速复苏"
 *   - recovery_status: 必填，复苏状态
 *
 * - **EXPANSION**（扩增培养）:
 *   - passage_from: 必填，起始代次
 *   - passage_to: 必填，终止代次（必须为 passage_from + 1）
 *   - passage_date: 必填，传代日期
 *   - cell_density: 必填，细胞密度（范围 10000~1000000）
 *   - morphology: 必填，细胞形态
 *
 * - **HARVEST**（收获冻存）:
 *   - total_cells: 必填，总细胞数（> 0）
 *   - viability: 必填，存活率（0~100）
 *   - vial_per_spec: 必填，每支规格
 *   - storage_location: 必填，存储位置
 *
 * @param taskCode - 任务编码（SEED_PREP / EXPANSION / HARVEST）
 * @param formData - 表单数据对象
 * @returns 校验结果
 */
export function validateProductionTask(
  taskCode: string,
  formData: Record<string, any>,
): ValidationResult {
  const result = emptyResult()
  const data = formData ?? {}

  switch (taskCode) {
    case 'SEED_PREP':
      validateSeedPrep(data, result)
      break
    case 'EXPANSION':
      validateExpansion(data, result)
      break
    case 'HARVEST':
      validateHarvest(data, result)
      break
    default:
      addWarning(result, 'taskCode', 'UNKNOWN_TASK', `未知的任务类型: ${taskCode}，跳过校验`)
  }

  return result
}

function validateSeedPrep(data: Record<string, any>, result: ValidationResult): void {
  // recovery_time: 必填
  if (!data.recovery_time && data.recovery_time !== 0) {
    addError(result, 'recovery_time', 'REQUIRED', '复苏耗时不能为空')
  } else {
    const val = Number(data.recovery_time)
    if (isNaN(val) || val < 0) {
      addError(result, 'recovery_time', 'INVALID', '复苏耗时必须为非负数值')
    }
  }

  // recovery_method: 必填，限定值
  if (!data.recovery_method || typeof data.recovery_method !== 'string') {
    addError(result, 'recovery_method', 'REQUIRED', '复苏方式不能为空')
  } else if (!['快速复苏', '慢速复苏'].includes(data.recovery_method.trim())) {
    addError(
      result,
      'recovery_method',
      'INVALID_ENUM',
      '复苏方式必须为 "快速复苏" 或 "慢速复苏"',
    )
  }

  // recovery_status: 必填
  if (!data.recovery_status || typeof data.recovery_status !== 'string') {
    addError(result, 'recovery_status', 'REQUIRED', '复苏状态不能为空')
  }
}

function validateExpansion(data: Record<string, any>, result: ValidationResult): void {
  // passage_from: 必填
  if (data.passage_from === undefined || data.passage_from === null) {
    addError(result, 'passage_from', 'REQUIRED', '起始代次不能为空')
  }

  // passage_to: 必填，且必须为 passage_from + 1
  if (data.passage_to === undefined || data.passage_to === null) {
    addError(result, 'passage_to', 'REQUIRED', '终止代次不能为空')
  } else if (
    data.passage_from !== undefined &&
    data.passage_from !== null
  ) {
    const from = Number(data.passage_from)
    const to = Number(data.passage_to)
    if (!isNaN(from) && !isNaN(to) && to !== from + 1) {
      addError(
        result,
        'passage_to',
        'INVALID_RANGE',
        `终止代次必须为起始代次 +1（期望 ${from + 1}，实际 ${to}）`,
      )
    }
  }

  // passage_date: 必填
  if (!data.passage_date) {
    addError(result, 'passage_date', 'REQUIRED', '传代日期不能为空')
  } else {
    const d = new Date(data.passage_date)
    if (isNaN(d.getTime())) {
      addError(result, 'passage_date', 'INVALID_DATE', '传代日期格式无效')
    }
  }

  // cell_density: 必填，范围 10000~1000000
  if (data.cell_density === undefined || data.cell_density === null) {
    addError(result, 'cell_density', 'REQUIRED', '细胞密度不能为空')
  } else {
    const density = Number(data.cell_density)
    if (isNaN(density) || density < 10000 || density > 1000000) {
      addError(
        result,
        'cell_density',
        'OUT_OF_RANGE',
        '细胞密度必须在 10,000 ~ 1,000,000 之间',
      )
    }
  }

  // morphology: 必填
  if (!data.morphology || typeof data.morphology !== 'string') {
    addError(result, 'morphology', 'REQUIRED', '细胞形态不能为空')
  }
}

function validateHarvest(data: Record<string, any>, result: ValidationResult): void {
  // total_cells: 必填，> 0
  if (data.total_cells === undefined || data.total_cells === null) {
    addError(result, 'total_cells', 'REQUIRED', '总细胞数不能为空')
  } else {
    const cells = Number(data.total_cells)
    if (isNaN(cells) || cells <= 0) {
      addError(result, 'total_cells', 'OUT_OF_RANGE', '总细胞数必须大于 0')
    }
  }

  // viability: 必填，0~100
  if (data.viability === undefined || data.viability === null) {
    addError(result, 'viability', 'REQUIRED', '存活率不能为空')
  } else {
    const viability = Number(data.viability)
    if (isNaN(viability) || viability < 0 || viability > 100) {
      addError(result, 'viability', 'OUT_OF_RANGE', '存活率必须在 0~100 之间')
    }
  }

  // vial_per_spec: 必填
  if (
    data.vial_per_spec === undefined ||
    data.vial_per_spec === null ||
    String(data.vial_per_spec).trim() === ''
  ) {
    addError(result, 'vial_per_spec', 'REQUIRED', '每支规格不能为空')
  }

  // storage_location: 必填
  if (!data.storage_location || typeof data.storage_location !== 'string') {
    addError(result, 'storage_location', 'REQUIRED', '存储位置不能为空')
  }
}

// ============================================
// 质检记录校验
// ============================================

/**
 * 校验质检检测项结果
 *
 * 校验规则:
 *  - 至少需要 1 条检测结果
 *  - **VIABILITY**（细胞活力）: resultValue 必须为数值，范围 0~100
 *  - **MORPHOLOGY**（形态检查）: judgment 必须为 PASS 或 FAIL
 *  - **MYCOPLASMA**（支原体检测）: judgment 必须为 PASS 或 FAIL
 *
 * @param testResults - 检测结果数组
 * @returns 校验结果
 */
export function validateQcRecord(testResults: TestResultItem[]): ValidationResult {
  const result = emptyResult()

  // 至少 1 条检测结果
  if (!Array.isArray(testResults) || testResults.length === 0) {
    addError(result, 'testResults', 'REQUIRED', '至少需要 1 条检测结果')
    return result
  }

  // 逐项校验
  for (let i = 0; i < testResults.length; i++) {
    const item = testResults[i]
    const prefix = `testResults[${i}].`

    if (!item || typeof item !== 'object') {
      addError(result, prefix, 'INVALID', `第 ${i + 1} 条检测结果格式无效`)
      continue
    }

    // itemCode 必填
    if (!item.itemCode) {
      addError(result, `${prefix}itemCode`, 'REQUIRED', `第 ${i + 1} 条检测项编码不能为空`)
      continue
    }

    switch (item.itemCode) {
      case 'VIABILITY': {
        // resultValue 必须为数值，0~100
        if (item.resultValue === undefined || item.resultValue === null) {
          addError(
            result,
            `${prefix}resultValue`,
            'REQUIRED',
            `细胞活力检测结果值不能为空`,
          )
        } else {
          const val = Number(item.resultValue)
          if (isNaN(val)) {
            addError(
              result,
              `${prefix}resultValue`,
              'INVALID_TYPE',
              '细胞活力检测结果值必须为数值',
            )
          } else if (val < 0 || val > 100) {
            addError(
              result,
              `${prefix}resultValue`,
              'OUT_OF_RANGE',
              '细胞活力检测结果值必须在 0~100 之间',
            )
          }
        }
        break
      }

      case 'MORPHOLOGY': {
        // judgment 必须为 PASS 或 FAIL
        if (!item.judgment || typeof item.judgment !== 'string') {
          addError(
            result,
            `${prefix}judgment`,
            'REQUIRED',
            '形态检查判定不能为空',
          )
        } else if (!['PASS', 'FAIL'].includes(item.judgment.trim().toUpperCase())) {
          addError(
            result,
            `${prefix}judgment`,
            'INVALID_ENUM',
            '形态检查判定必须为 PASS 或 FAIL',
          )
        }
        break
      }

      case 'MYCOPLASMA': {
        // judgment 必须为 PASS 或 FAIL
        if (!item.judgment || typeof item.judgment !== 'string') {
          addError(
            result,
            `${prefix}judgment`,
            'REQUIRED',
            '支原体检测判定不能为空',
          )
        } else if (!['PASS', 'FAIL'].includes(item.judgment.trim().toUpperCase())) {
          addError(
            result,
            `${prefix}judgment`,
            'INVALID_ENUM',
            '支原体检测判定必须为 PASS 或 FAIL',
          )
        }
        break
      }

      default:
        // 其他检测项不强制校验，仅警告
        if (!item.judgment && item.resultValue === undefined) {
          addWarning(
            result,
            `${prefix}resultValue`,
            'NO_RESULT',
            `检测项 ${item.itemCode} 未填写结果值或判定`,
          )
        }
    }
  }

  return result
}
