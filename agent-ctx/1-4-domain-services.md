---
Task ID: 1-4
Agent: Domain Services Developer

Work Log:
- 读取了 worklog.md，了解项目背景（iPSC 生产管理系统，Next.js 16 + Prisma + SQLite）
- 读取了 Prisma schema（11 个 BatchStatus 枚举、4 个 Role、4 个 TaskStatus、4 个 CoaStatus，以及完整的模型定义）
- 读取了 db.ts 确认 Prisma Client 的导入方式

### 1. 状态机服务 (state-machine.ts)
- 定义了完整的 11 个状态转换规则常量 BATCH_TRANSITIONS
- 实现了 5 个公开函数：
  - `canTransition()` — 纯函数，检查状态转换合法性
  - `getAvailableActions()` — 根据角色返回可用操作（排除 SYSTEM 自动操作）
  - `transition()` — 核心函数，执行状态转换：
    - 校验批次存在性
    - 查找匹配 action 的转换规则
    - QC_PASS → COA_PENDING 自动创建 CoA 草稿（含 qc 数据汇总）
    - 开始生产设置 actualStartDate
    - 放行设置 actualEndDate
    - 同步更新 Coa 状态（SUBMITTED/APPROVED/REJECTED）
  - `getStatusLabel()` — 11 个状态的中文标签
  - `getStatusColor()` — 11 个状态的 Tailwind 徽标颜色

### 2. 校验服务 (validation.ts)
- 定义了 ValidationResult 类型（valid / errors / warnings）
- 实现了 3 个公开函数：
  - `validateBatchCreation()` — 异步校验：productCode 必填+产品存在性、数量 >0、日期顺序
  - `validateProductionTask()` — 按 taskCode 分发校验：
    - SEED_PREP: recovery_time/method/status
    - EXPANSION: passage_from/to（+1 校验）、cell_density（10k~1M）、morphology
    - HARVEST: total_cells/viability/vial_per_spec/storage_location
  - `validateQcRecord()` — 逐项校验：
    - VIABILITY: resultValue 数值 0~100
    - MORPHOLOGY: judgment PASS/FAIL
    - MYCOPLASMA: judgment PASS/FAIL

### 3. 审计日志服务 (audit-log.ts)
- 定义了 CreateAuditLogParams、AuditLogFilters、TimelineEntry 等类型
- 实现了 3 个公开函数：
  - `createAuditLog()` — 创建审计日志，自动 JSON stringify
  - `getAuditLogs()` — 分页查询，支持批次/类型/操作员/事件筛选，自动 parse JSON
  - `getBatchTimeline()` — 按批次编号查询时间线（正序），用于前端时间线展示
- 内置事件类型中文映射（15 种事件类型）

### 4. 统一导出 (index.ts)
- 导出所有公开函数和类型

### 代码质量
- 修复了所有 ESLint 警告（移除未使用的 eslint-disable 指令）
- 剩余 3 个 error 均为预存问题（generate-plan.js 和 auth-guard.tsx），与本任务无关
- 所有公开函数均有 JSDoc 注释

Stage Summary:
- 产出文件：
  - `/src/lib/services/state-machine.ts` — 批次状态机（5 个公开函数 + 完整转换规则）
  - `/src/lib/services/validation.ts` — 统一校验服务（3 个公开函数）
  - `/src/lib/services/audit-log.ts` — 审计日志服务（3 个公开函数）
  - `/src/lib/services/index.ts` — 统一导出
- 状态机覆盖全部 11 个 BatchStatus 状态和 16 条转换规则
- 校验服务覆盖 3 种生产任务类型和 3 种质检检测项
- 审计日志服务支持分页查询、批次时间线，JSON 字段自动序列化/反序列化
