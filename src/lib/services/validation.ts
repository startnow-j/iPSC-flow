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
 * - **REPROGRAM**（重编程）:
 *   - reprogram_method: 必填，重编程方式
 *   - transduction_date: 必填，转导日期
 *   - operation_result: 必填，操作结果
 *
 * - **FREEZE**（冻存）:
 *   - freeze_date: 必填，冻存日期
 *   - cell_count: 必填，冻存细胞数（> 0）
 *   - viability: 必填，存活率（0~100）
 *   - storage_location: 必填，存储位置
 *
 * - **CELL_REVIVAL**（细胞复苏）:
 *   - recovery_method: 必填，复苏方式
 *   - recovery_status: 必填，复苏状态
 *   - recovery_time: 如有值，必须为非负数值
 *
 * - **GENE_EDITING**（基因编辑）:
 *   - editing_tool: 必填，编辑工具
 *   - target_gene: 必填，靶基因
 *   - transfection_date: 必填，转染日期
 *   - operation_result: 必填，操作结果
 *
 * - **CLONE_PICKING**（克隆挑取）:
 *   - pick_date: 必填，挑取日期
 *   - clone_count: 必填，挑取克隆数（> 0）
 *   - culture_vessel: 必填，培养皿规格
 *   - morphology: 必填，细胞形态
 *
 * - **CLONE_SCREENING**（单克隆筛选）:
 *   - screen_date: 必填，筛选日期
 *   - screen_method: 必填，筛选方法
 *   - screen_result: 必填，筛选结果
 *   - clone_count: 如有值，必须 > 0
 *
 * - **MATERIAL_PREP**（物料准备）:
 *   - material_list: 必填，物料清单
 *   - batch_numbers: 必填，批号登记
 *   - environment_check: 必填，环境检查结果
 *
 * - **PREPARATION**（配制）:
 *   - prep_date: 必填，配制日期
 *   - prep_batch_no: 必填，配制批次号
 *   - kit_spec: 必填，试剂盒规格
 *   - prep_quantity: 必填，配制数量（> 0）
 *   - prep_result: 必填，配制结果
 *
 * - **DISPENSING**（分装）:
 *   - dispense_date: 必填，分装日期
 *   - dispense_quantity: 必填，分装数量（> 0）
 *   - dispense_spec: 必填，分装规格
 *   - appearance_check: 必填，外观检查结果
 *
 * @param taskCode - 任务编码
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
    case 'DIFFERENTIATION':
      validateDifferentiation(data, result)
      break
    case 'SAMPLE_PREP':
      validateSamplePrep(data, result)
      break
    case 'REPROGRAM':
      validateReprogram(data, result)
      break
    case 'FREEZE':
      validateFreeze(data, result)
      break
    case 'CELL_REVIVAL':
      validateCellRevival(data, result)
      break
    case 'GENE_EDITING':
      validateGeneEditing(data, result)
      break
    case 'MATERIAL_PREP':
      validateMaterialPrep(data, result)
      break
    case 'PREPARATION':
      validatePreparation(data, result)
      break
    case 'DISPENSING':
      validateDispensing(data, result)
      break
    case 'CLONE_PICKING':
      validateClonePicking(data, result)
      break
    case 'CLONE_SCREENING':
      validateCloneScreening(data, result)
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

function validateDifferentiation(data: Record<string, any>, result: ValidationResult): void {
  // diff_stage: 必填
  if (!data.diff_stage || typeof data.diff_stage !== 'string' || data.diff_stage.trim() === '') {
    addError(result, 'diff_stage', 'REQUIRED', '分化阶段不能为空')
  }

  // diff_date: 必填
  if (!data.diff_date) {
    addError(result, 'diff_date', 'REQUIRED', '操作日期不能为空')
  } else {
    const d = new Date(data.diff_date)
    if (isNaN(d.getTime())) {
      addError(result, 'diff_date', 'INVALID_DATE', '操作日期格式无效')
    }
  }

  // culture_days: 必填，> 0
  if (data.culture_days === undefined || data.culture_days === null) {
    addError(result, 'culture_days', 'REQUIRED', '培养天数不能为空')
  } else {
    const days = Number(data.culture_days)
    if (isNaN(days) || days <= 0) {
      addError(result, 'culture_days', 'OUT_OF_RANGE', '培养天数必须大于 0')
    }
  }

  // morphology: 必填，限定值
  if (!data.morphology || typeof data.morphology !== 'string') {
    addError(result, 'morphology', 'REQUIRED', '细胞形态不能为空')
  } else if (!['正常', '异常', '待观察'].includes(data.morphology.trim())) {
    addError(
      result,
      'morphology',
      'INVALID_ENUM',
      '细胞形态必须为 "正常"、"异常" 或 "待观察"',
    )
  }
}

// ============================================
// SERVICE 产品线 — 样本前处理
// ============================================

function validateSamplePrep(data: Record<string, any>, result: ValidationResult): void {
  if (!data.sample_id || typeof data.sample_id !== 'string') {
    addError(result, 'sample_id', 'REQUIRED', '样本编号不能为空')
  }
  if (!data.sample_type) {
    addError(result, 'sample_type', 'REQUIRED', '样本类型不能为空')
  }
  if (!data.receive_date) {
    addError(result, 'receive_date', 'REQUIRED', '样本接收日期不能为空')
  } else {
    const d = new Date(data.receive_date)
    if (isNaN(d.getTime())) {
      addError(result, 'receive_date', 'INVALID_DATE', '样本接收日期格式无效')
    }
  }
  if (!data.sample_status) {
    addError(result, 'sample_status', 'REQUIRED', '样本状态不能为空')
  }
}

// ============================================
// SERVICE 产品线 — 重编程
// ============================================

function validateReprogram(data: Record<string, any>, result: ValidationResult): void {
  if (!data.reprogram_method || typeof data.reprogram_method !== 'string') {
    addError(result, 'reprogram_method', 'REQUIRED', '重编程方式不能为空')
  }
  if (!data.transduction_date) {
    addError(result, 'transduction_date', 'REQUIRED', '转导日期不能为空')
  } else {
    const d = new Date(data.transduction_date)
    if (isNaN(d.getTime())) {
      addError(result, 'transduction_date', 'INVALID_DATE', '转导日期格式无效')
    }
  }
  if (!data.operation_result) {
    addError(result, 'operation_result', 'REQUIRED', '操作结果不能为空')
  }
  if (data.colony_count !== undefined && data.colony_count !== null) {
    const count = Number(data.colony_count)
    if (isNaN(count) || count < 0) {
      addError(result, 'colony_count', 'OUT_OF_RANGE', '克隆数量必须为非负数值')
    }
  }
}

// ============================================
// SERVICE 产品线 — 冻存
// ============================================

function validateFreeze(data: Record<string, any>, result: ValidationResult): void {
  if (!data.freeze_date) {
    addError(result, 'freeze_date', 'REQUIRED', '冻存日期不能为空')
  } else {
    const d = new Date(data.freeze_date)
    if (isNaN(d.getTime())) {
      addError(result, 'freeze_date', 'INVALID_DATE', '冻存日期格式无效')
    }
  }
  if (data.cell_count === undefined || data.cell_count === null) {
    addError(result, 'cell_count', 'REQUIRED', '冻存细胞数不能为空')
  } else {
    const cells = Number(data.cell_count)
    if (isNaN(cells) || cells <= 0) {
      addError(result, 'cell_count', 'OUT_OF_RANGE', '冻存细胞数必须大于 0')
    }
  }
  if (data.viability === undefined || data.viability === null) {
    addError(result, 'viability', 'REQUIRED', '存活率不能为空')
  } else {
    const viability = Number(data.viability)
    if (isNaN(viability) || viability < 0 || viability > 100) {
      addError(result, 'viability', 'OUT_OF_RANGE', '存活率必须在 0~100 之间')
    }
  }
  if (!data.storage_location || typeof data.storage_location !== 'string') {
    addError(result, 'storage_location', 'REQUIRED', '存储位置不能为空')
  }
}

// ============================================
// SERVICE 产品线 — 细胞复苏
// ============================================

function validateCellRevival(data: Record<string, any>, result: ValidationResult): void {
  if (!data.recovery_method || typeof data.recovery_method !== 'string') {
    addError(result, 'recovery_method', 'REQUIRED', '复苏方式不能为空')
  }
  if (!data.recovery_status) {
    addError(result, 'recovery_status', 'REQUIRED', '复苏状态不能为空')
  }
  if (data.recovery_time !== undefined && data.recovery_time !== null) {
    const time = Number(data.recovery_time)
    if (isNaN(time) || time < 0) {
      addError(result, 'recovery_time', 'INVALID', '复苏耗时必须为非负数值')
    }
  }
}

// ============================================
// SERVICE 产品线 — 基因编辑
// ============================================

function validateGeneEditing(data: Record<string, any>, result: ValidationResult): void {
  if (!data.editing_tool || typeof data.editing_tool !== 'string') {
    addError(result, 'editing_tool', 'REQUIRED', '编辑工具不能为空')
  }
  if (!data.target_gene || typeof data.target_gene !== 'string') {
    addError(result, 'target_gene', 'REQUIRED', '靶基因不能为空')
  }
  if (!data.transfection_date) {
    addError(result, 'transfection_date', 'REQUIRED', '转染日期不能为空')
  } else {
    const d = new Date(data.transfection_date)
    if (isNaN(d.getTime())) {
      addError(result, 'transfection_date', 'INVALID_DATE', '转染日期格式无效')
    }
  }
  if (!data.operation_result) {
    addError(result, 'operation_result', 'REQUIRED', '操作结果不能为空')
  }
}

// ============================================
// SERVICE 产品线 — 克隆挑取
// ============================================

function validateClonePicking(data: Record<string, any>, result: ValidationResult): void {
  if (!data.pick_date) {
    addError(result, 'pick_date', 'REQUIRED', '挑取日期不能为空')
  } else {
    const d = new Date(data.pick_date)
    if (isNaN(d.getTime())) {
      addError(result, 'pick_date', 'INVALID_DATE', '挑取日期格式无效')
    }
  }
  if (data.clone_count === undefined || data.clone_count === null) {
    addError(result, 'clone_count', 'REQUIRED', '挑取克隆数不能为空')
  } else {
    const count = Number(data.clone_count)
    if (isNaN(count) || count <= 0) {
      addError(result, 'clone_count', 'OUT_OF_RANGE', '挑取克隆数必须大于 0')
    }
  }
  if (!data.culture_vessel) {
    addError(result, 'culture_vessel', 'REQUIRED', '培养皿规格不能为空')
  }
  if (!data.morphology) {
    addError(result, 'morphology', 'REQUIRED', '细胞形态不能为空')
  }
}

// ============================================
// SERVICE 产品线 — 单克隆筛选
// ============================================

function validateCloneScreening(data: Record<string, any>, result: ValidationResult): void {
  if (!data.screen_date) {
    addError(result, 'screen_date', 'REQUIRED', '筛选日期不能为空')
  } else {
    const d = new Date(data.screen_date)
    if (isNaN(d.getTime())) {
      addError(result, 'screen_date', 'INVALID_DATE', '筛选日期格式无效')
    }
  }
  if (!data.screen_method || typeof data.screen_method !== 'string') {
    addError(result, 'screen_method', 'REQUIRED', '筛选方法不能为空')
  }
  if (!data.screen_result || typeof data.screen_result !== 'string') {
    addError(result, 'screen_result', 'REQUIRED', '筛选结果不能为空')
  }
  if (data.clone_count !== undefined && data.clone_count !== null) {
    const count = Number(data.clone_count)
    if (isNaN(count) || count <= 0) {
      addError(result, 'clone_count', 'OUT_OF_RANGE', '筛选克隆数必须大于 0')
    }
  }
}

// ============================================
// KIT 产品线 — 物料准备
// ============================================

function validateMaterialPrep(data: Record<string, any>, result: ValidationResult): void {
  if (!data.material_list || typeof data.material_list !== 'string' || data.material_list.trim() === '') {
    addError(result, 'material_list', 'REQUIRED', '物料清单不能为空')
  }
  if (!data.batch_numbers || typeof data.batch_numbers !== 'string' || data.batch_numbers.trim() === '') {
    addError(result, 'batch_numbers', 'REQUIRED', '批号登记不能为空')
  }
  if (!data.environment_check) {
    addError(result, 'environment_check', 'REQUIRED', '环境检查结果不能为空')
  }
}

// ============================================
// KIT 产品线 — 配制
// ============================================

function validatePreparation(data: Record<string, any>, result: ValidationResult): void {
  if (!data.prep_date) {
    addError(result, 'prep_date', 'REQUIRED', '配制日期不能为空')
  } else {
    const d = new Date(data.prep_date)
    if (isNaN(d.getTime())) {
      addError(result, 'prep_date', 'INVALID_DATE', '配制日期格式无效')
    }
  }
  if (!data.prep_batch_no || typeof data.prep_batch_no !== 'string' || data.prep_batch_no.trim() === '') {
    addError(result, 'prep_batch_no', 'REQUIRED', '配制批次号不能为空')
  }
  if (!data.kit_spec || typeof data.kit_spec !== 'string' || data.kit_spec.trim() === '') {
    addError(result, 'kit_spec', 'REQUIRED', '试剂盒规格不能为空')
  }
  if (data.prep_quantity === undefined || data.prep_quantity === null) {
    addError(result, 'prep_quantity', 'REQUIRED', '配制数量不能为空')
  } else {
    const qty = Number(data.prep_quantity)
    if (isNaN(qty) || qty <= 0) {
      addError(result, 'prep_quantity', 'OUT_OF_RANGE', '配制数量必须大于 0')
    }
  }
  if (!data.prep_result) {
    addError(result, 'prep_result', 'REQUIRED', '配制结果不能为空')
  }
}

// ============================================
// KIT 产品线 — 分装
// ============================================

function validateDispensing(data: Record<string, any>, result: ValidationResult): void {
  if (!data.dispense_date) {
    addError(result, 'dispense_date', 'REQUIRED', '分装日期不能为空')
  } else {
    const d = new Date(data.dispense_date)
    if (isNaN(d.getTime())) {
      addError(result, 'dispense_date', 'INVALID_DATE', '分装日期格式无效')
    }
  }
  if (data.dispense_quantity === undefined || data.dispense_quantity === null) {
    addError(result, 'dispense_quantity', 'REQUIRED', '分装数量不能为空')
  } else {
    const qty = Number(data.dispense_quantity)
    if (isNaN(qty) || qty <= 0) {
      addError(result, 'dispense_quantity', 'OUT_OF_RANGE', '分装数量必须大于 0')
    }
  }
  if (!data.dispense_spec || typeof data.dispense_spec !== 'string' || data.dispense_spec.trim() === '') {
    addError(result, 'dispense_spec', 'REQUIRED', '分装规格不能为空')
  }
  if (!data.appearance_check) {
    addError(result, 'appearance_check', 'REQUIRED', '外观检查结果不能为空')
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

      case 'APPEARANCE': {
        // judgment 必须为 PASS 或 FAIL
        if (!item.judgment || typeof item.judgment !== 'string') {
          addError(
            result,
            `${prefix}judgment`,
            'REQUIRED',
            '外观检查判定不能为空',
          )
        } else if (!['PASS', 'FAIL'].includes(item.judgment.trim().toUpperCase())) {
          addError(
            result,
            `${prefix}judgment`,
            'INVALID_ENUM',
            '外观检查判定必须为 PASS 或 FAIL',
          )
        }
        break
      }

      case 'STERILITY': {
        // judgment 必须为 PASS 或 FAIL
        if (!item.judgment || typeof item.judgment !== 'string') {
          addError(
            result,
            `${prefix}judgment`,
            'REQUIRED',
            '无菌检查判定不能为空',
          )
        } else if (!['PASS', 'FAIL'].includes(item.judgment.trim().toUpperCase())) {
          addError(
            result,
            `${prefix}judgment`,
            'INVALID_ENUM',
            '无菌检查判定必须为 PASS 或 FAIL',
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
