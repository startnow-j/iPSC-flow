// ============================================
// 任务模板系统
// 按产品线和动作定义生产任务的自动创建规则
// ============================================

/** 任务模板接口 */
export interface TaskTemplate {
  taskCode: string
  taskName: string
  sequenceNo: number
  stepGroup?: string
}

/**
 * 任务模板映射：productLine → action → TaskTemplate[]
 *
 * CELL_PRODUCT: 开始生产 → 种子复苏 → 扩增培养 → 收获冻存
 * SERVICE: 开始生产 → 重编程操作 → 扩增培养
 *          开始鉴定 → 根据 identificationRequirements 动态创建
 * KIT: 准备物料 → 物料准备
 *       开始生产 → 配制生产 → 分装贴标
 */
export const TASK_TEMPLATES: Record<string, Record<string, TaskTemplate[]>> = {
  CELL_PRODUCT: {
    start_production: [
      { taskCode: 'SEED_PREP', taskName: '种子复苏', sequenceNo: 1 },
      { taskCode: 'EXPANSION', taskName: '扩增培养', sequenceNo: 2 },
      { taskCode: 'HARVEST', taskName: '收获冻存', sequenceNo: 3 },
    ],
  },
  SERVICE: {
    start_production: [
      { taskCode: 'REPROGRAM', taskName: '重编程操作', sequenceNo: 1 },
      { taskCode: 'SERVICE_EXPANSION', taskName: '扩增培养', sequenceNo: 2 },
    ],
    // start_identification 的模板在运行时根据 batch.identificationRequirements 动态生成
    // 见 IDENTIFICATION_TASK_DEFS
  },
  KIT: {
    start_material_prep: [
      { taskCode: 'MATERIAL_PREP', taskName: '物料准备', sequenceNo: 1 },
    ],
    start_production: [
      { taskCode: 'PREPARATION', taskName: '配制生产', sequenceNo: 2 },
      { taskCode: 'DISPENSING', taskName: '分装贴标', sequenceNo: 3 },
    ],
  },
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
]

/**
 * 默认勾选的鉴定项目
 */
export const DEFAULT_IDENTIFICATION_REQUIREMENTS = ['PLURI_CHECK', 'MYCOPLASMA']
