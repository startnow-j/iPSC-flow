// ============================================
// 任务模板系统 v3.0
// 按产品线和动作定义生产任务的自动创建规则
// 支持按产品 category 配置差异化模板（参考 v3.0 §3.1）
// ============================================

/** 任务模板接口 */
export interface TaskTemplate {
  taskCode: string
  taskName: string
  sequenceNo: number
  stepGroup?: string
  /** 任务类型：'single' 单任务 / 'phase' 阶段型（可多轮记录） / 'redoable' 可重做 */
  taskType?: 'single' | 'phase' | 'redoable'
}

/**
 * 任务模板映射：productLine → action → TaskTemplate[]
 *
 * CELL_PRODUCT v3.0: 开始生产 → 种子复苏 → 扩增培养(阶段型) → 分化诱导(阶段型) → 收获冻存
 *   注意：分化诱导仅对分化类产品（NPC/CM 等）创建，纯 iPSC 扩增产品不创建
 *   实际过滤在 3B 阶段根据 product.category 实现
 *
 * SERVICE v3.0: 按服务类型（category）有不同步骤
 *   REPROGRAM: 样本处理 → 重编程操作 → 克隆挑取 → 扩增培养 → 冻存
 *   EDIT: 解冻复苏 → 基因编辑 → 单克隆筛选 → 扩增培养 → 冻存
 *   DIFF_SERVICE: 解冻复苏 → 扩增培养 → 分化诱导 → 收获目标细胞 → 冻存
 *
 * KIT: 准备物料 → 物料准备; 开始生产 → 配制生产 → 分装贴标
 */
export const TASK_TEMPLATES: Record<string, Record<string, TaskTemplate[]>> = {
  CELL_PRODUCT: {
    start_production: [
      { taskCode: 'SEED_PREP', taskName: '种子复苏', sequenceNo: 1, taskType: 'single' },
      { taskCode: 'EXPANSION', taskName: '扩增培养', sequenceNo: 2, taskType: 'phase' },
      { taskCode: 'DIFFERENTIATION', taskName: '分化诱导', sequenceNo: 3, taskType: 'phase' },
      { taskCode: 'HARVEST', taskName: '收获冻存', sequenceNo: 4, taskType: 'single' },
    ],
  },
  SERVICE: {
    // 默认 SERVICE 模板（重编程建系，最常见的服务类型）
    start_production: [
      { taskCode: 'SAMPLE_PREP', taskName: '样本处理', sequenceNo: 1, taskType: 'single' },
      { taskCode: 'REPROGRAM', taskName: '重编程操作', sequenceNo: 2, taskType: 'redoable' },
      { taskCode: 'CLONE_PICKING', taskName: '克隆挑取', sequenceNo: 3, taskType: 'phase' },
      { taskCode: 'EXPANSION', taskName: '扩增培养', sequenceNo: 4, taskType: 'phase' },
      { taskCode: 'FREEZE', taskName: '冻存', sequenceNo: 5, taskType: 'single' },
    ],
    // start_identification 的模板在运行时根据 batch.identificationRequirements 动态生成
    // 见 IDENTIFICATION_TASK_DEFS
  },
  KIT: {
    start_material_prep: [
      { taskCode: 'MATERIAL_PREP', taskName: '物料准备', sequenceNo: 1, taskType: 'single' },
    ],
    start_production: [
      { taskCode: 'PREPARATION', taskName: '配制生产', sequenceNo: 2, taskType: 'single' },
      { taskCode: 'DISPENSING', taskName: '分装贴标', sequenceNo: 3, taskType: 'single' },
    ],
  },
}

/**
 * 按产品 category 配置的差异化任务模板（v3.0 新增）
 *
 * 用于覆盖 TASK_TEMPLATES 中的默认模板。
 * 调用方优先查找 CATEGORY_TASK_TEMPLATES[category][action]，
 * 找不到时回退到 TASK_TEMPLATES[productLine][action]。
 *
 * 目前已定义：
 *   - SERVICE: REPROGRAM / EDIT / DIFF_SERVICE 三种服务类型
 *   - CELL_PRODUCT 分化类产品过滤（DIFFERENTIATION 步骤）在 3B 实现
 */
export const CATEGORY_TASK_TEMPLATES: Record<string, Record<string, TaskTemplate[]>> = {
  // 基因编辑服务
  EDIT: {
    start_production: [
      { taskCode: 'CELL_REVIVAL', taskName: '解冻复苏', sequenceNo: 1, taskType: 'single' },
      { taskCode: 'GENE_EDITING', taskName: '基因编辑操作', sequenceNo: 2, taskType: 'redoable' },
      { taskCode: 'CLONE_SCREENING', taskName: '单克隆筛选', sequenceNo: 3, taskType: 'phase' },
      { taskCode: 'EXPANSION', taskName: '扩增培养', sequenceNo: 4, taskType: 'phase' },
      { taskCode: 'FREEZE', taskName: '冻存', sequenceNo: 5, taskType: 'single' },
    ],
  },
  // 分化服务
  DIFF_SERVICE: {
    start_production: [
      { taskCode: 'CELL_REVIVAL', taskName: '解冻复苏', sequenceNo: 1, taskType: 'single' },
      { taskCode: 'EXPANSION', taskName: '扩增培养（如需）', sequenceNo: 2, taskType: 'phase' },
      { taskCode: 'DIFFERENTIATION', taskName: '分化诱导', sequenceNo: 3, taskType: 'phase' },
      { taskCode: 'HARVEST', taskName: '收获目标细胞', sequenceNo: 4, taskType: 'single' },
      { taskCode: 'FREEZE', taskName: '冻存', sequenceNo: 5, taskType: 'single' },
    ],
  },
}

/**
 * 获取任务模板（支持 category 级别的差异化查找）
 *
 * 优先级：
 *   1. CATEGORY_TASK_TEMPLATES[category][action]
 *   2. TASK_TEMPLATES[productLine][action]
 *   3. 返回 null
 *
 * @param productLine - 产品线
 * @param action - 触发动作（start_production / start_material_prep 等）
 * @param category - 可选的产品分类（REPROGRAM / EDIT / DIFF_SERVICE / NPC 等）
 */
export function getTaskTemplates(
  productLine: string,
  action: string,
  category?: string,
): TaskTemplate[] | null {
  // 优先查找 category 级别
  if (category && CATEGORY_TASK_TEMPLATES[category]?.[action]) {
    return CATEGORY_TASK_TEMPLATES[category][action]
  }
  // 回退到 productLine 级别
  return TASK_TEMPLATES[productLine]?.[action] ?? null
}

/**
 * 判断 CELL_PRODUCT 批次是否需要 DIFFERENTIATION 步骤
 *
 * 判断依据（多信号源，容错设计）:
 *   1. 产品 category 匹配分化类标识（NPC/CM/DIFF_KIT/DIFF_SERVICE）
 *   2. 批次编号前缀匹配（兼容 category 未设置的旧数据）
 *
 * @param category - 产品分类（可选）
 * @param batchNo - 批次编号（可选，用于回退判断）
 * @returns true 表示需要 DIFFERENTIATION 步骤
 */
export function shouldIncludeDifferentiation(
  category?: string | null,
  batchNo?: string | null,
): boolean {
  const diffCategories = ['NPC', 'CM', 'DIFF_KIT', 'DIFF_SERVICE']

  // 1. 优先通过 category 判断
  if (category && diffCategories.some(c => category.startsWith(c) || category.includes('DIFF'))) {
    return true
  }

  // 2. 回退：通过批次编号前缀判断（兼容旧数据）
  if (batchNo) {
    const prefix = batchNo.split('-')[0]?.toUpperCase()
    if (prefix && diffCategories.includes(prefix)) {
      return true
    }
  }

  return false
}

/**
 * 鉴定任务定义映射
 * 用于 SERVICE 产品线的 start_identification 动作
 * 根据 batch.identificationRequirements (JSON 数组) 动态创建鉴定任务
 */
export const IDENTIFICATION_TASK_DEFS: Record<
  string,
  { taskCode: string; taskName: string }
> = {
  INTEGRATION: { taskCode: 'ID_INTEGRATION', taskName: '整合检测' },
  KARYOTYPE: { taskCode: 'ID_KARYOTYPE', taskName: '核型分析' },
  PLURI_CHECK: { taskCode: 'ID_PLURI_CHECK', taskName: '多能性鉴定' },
  STR: { taskCode: 'ID_STR', taskName: 'STR鉴定' },
  POTENCY: { taskCode: 'ID_POTENCY', taskName: '效力验证' },
  MYCOPLASMA: { taskCode: 'ID_MYCOPLASMA', taskName: '支原体检测' },
  MUTATION_SEQ: { taskCode: 'ID_MUTATION_SEQ', taskName: '突变测序' },
}

/**
 * 鉴定要求选项（用于前端复选框）
 */
export const IDENTIFICATION_OPTIONS = [
  { value: 'INTEGRATION', label: '整合检测' },
  { value: 'KARYOTYPE', label: '核型分析' },
  { value: 'PLURI_CHECK', label: '多能性鉴定' },
  { value: 'STR', label: 'STR鉴定' },
  { value: 'MYCOPLASMA', label: '支原体检测' },
  { value: 'MUTATION_SEQ', label: '突变测序' },
  { value: 'POTENCY', label: '效力验证' },
]

/**
 * 默认勾选的鉴定项目
 */
export const DEFAULT_IDENTIFICATION_REQUIREMENTS = ['PLURI_CHECK', 'MYCOPLASMA']
