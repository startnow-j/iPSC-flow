---
Task ID: 3-1 + 3-2 + 3-3 + 3-4 + 3-5
Agent: eBPR Full-Stack Developer
Task: eBPR 生产记录 — 后端API、表单组件、步骤引导、批次详情集成

Work Log:
- 读取了 worklog.md、Prisma schema、领域服务层（state-machine/validation/audit-log）、auth.ts、db.ts
- 分析了现有批次详情页（5个标签页，生产记录为占位符）和状态转换 API
- 分析了 ProductionTask Prisma model 的完整字段定义

**1. 后端 API 路由（Task 3-1）**

创建 2 个 API 路由文件：

- `src/app/api/batches/[id]/tasks/route.ts`：GET 列出批次所有任务 + POST 创建传代记录（EXPANSION）
  - GET：查询所有任务按 sequenceNo/createdAt 排序，解析 JSON 字段
  - POST：仅允许 IN_PRODUCTION 状态创建传代记录，校验表单，自动设置 stepGroup（如"P4→P5"），更新批次 currentPassage

- `src/app/api/batches/[id]/tasks/[taskId]/route.ts`：GET 单个任务 + PATCH 更新任务
  - GET：查询单个任务详情
  - PATCH：支持更新 formData/status/notes/attachments
  - 状态变更副作用：SEED_PREP 完成后自动激活 EXPANSION 的 IN_PROGRESS
  - HARVEST 完成后返回 batchTransitioned 标志，由前端决定是否触发 QC
  - 创建审计日志（TASK_CREATED/TASK_STARTED/TASK_COMPLETED/TASK_UPDATED）

修改 1 个文件：

- `src/app/api/batches/[id]/transition/route.ts`：当 action 为 `start_production` 时
  - 检查批次是否已有任务（防重复创建）
  - 自动创建 3 个默认任务：SEED_PREP(IN_PROGRESS) + EXPANSION(PENDING) + HARVEST(PENDING)
  - 记录审计日志

**2. 种子复苏表单组件（Task 3-2）**

- 文件：`src/components/ebpr/seed-prep-form.tsx`
- 只读信息：批次编号、种子批号、种子代次、操作员（自动填充）
- 表单字段：复苏耗时(分钟)、复苏方式(快速/慢速)、复苏状态(正常/异常)、备注
- 照片上传占位按钮（📎 上传照片，disabled + "即将上线"提示）
- 提交 → PATCH task，status 设为 COMPLETED
- 前端校验 + 后端校验双重保障，错误以 toast 显示

**3. 扩增培养（传代）表单组件（Task 3-3）**

- 文件：`src/components/ebpr/expansion-form.tsx`
- 自动计算：passage_from 从 currentPassage/seedPassage 解析，passage_to = passage_from + 1
- 高亮显示：代次信息面板（P{n}→P{n+1}）
- 表单字段：传代日期、传代比例(1:3~1:10)、细胞密度(cells/cm²)、培养基批号、细胞形态、备注
- 每次提交创建新 ProductionTask（POST /api/batches/{id}/tasks），不更新现有
- 传代历史卡片：显示已完成的所有传代记录（代次/日期/比例/密度/操作员）
- 提交后自动清空表单，准备下次传代

**4. 收获冻存表单组件（Task 3-4）**

- 文件：`src/components/ebpr/harvest-form.tsx`
- 表单字段：总细胞数、存活率(%)、每支规格(如"1×10^6")、冻存液批号、存储位置、备注
- 自动计算：total_vials = total_cells / 解析(vial_per_spec)
- 解析函数支持多种格式：1×10^6、1x10^6、1e6 等
- 完成后表单变为只读状态，显示完成徽标
- 提交 → PATCH task，返回 shouldPromptQc=true

**5. eBPR 步骤引导 + 集成（Task 3-5）**

创建 3 个组件文件：

- `src/components/ebpr/task-summary.tsx`：已完成任务摘要卡片
  - 根据 taskCode 渲染不同的数据摘要（SEED_PREP/EXPANSION/HARVEST 各自的关键字段）
  - 显示操作员、完成时间、备注
  - 使用独立 TaskIcon 组件避免 lint 解析错误

- `src/components/ebpr/task-form-wrapper.tsx`：表单选择器
  - 根据 taskCode 路由到正确的表单组件
  - 已完成任务显示 TaskSummary
  - 加载状态使用 TaskFormSkeleton

- `src/components/ebpr/ebpr-step-guide.tsx`：主步骤引导
  - 水平步骤条：3 个步骤圆圈 + 连接线，状态颜色（绿色完成/primary进行中/灰色待办）
  - EXPANSION 步骤显示完成计数徽标
  - 自动选中当前步骤（未完成优先）
  - 点击切换查看不同步骤
  - 扩增步骤：显示已完成传代记录摘要 + 新增传代表单
  - 收获完成后显示"提交质检"提示卡片（触发 IN_PRODUCTION → QC_PENDING）
  - 已提交质检时显示绿色提示
  - 空状态：无任务时显示引导文案

修改 1 个文件：

- `src/app/batches/[id]/page.tsx`：
  - 引入 EbprStepGuide 组件
  - 在"生产记录"标签页中替换占位符为 EbprStepGuide
  - 新增 handleProductionUpdate 回调用于刷新批次和时间线数据
  - 移除未使用的 RotateCcw 导入

- Lint 检查：仅剩预存 generate-plan.js 错误（2个），本任务零新增
- Dev server 正常编译运行

Stage Summary:
- 新增文件：src/app/api/batches/[id]/tasks/route.ts、[taskId]/route.ts（2 个）
- 新增文件：src/components/ebpr/seed-prep-form.tsx、expansion-form.tsx、harvest-form.tsx（3 个）
- 新增文件：src/components/ebpr/ebpr-step-guide.tsx、task-form-wrapper.tsx、task-summary.tsx（3 个）
- 修改文件：src/app/api/batches/[id]/transition/route.ts（添加任务自动创建逻辑）
- 修改文件：src/app/batches/[id]/page.tsx（集成 eBPR 步骤引导到生产记录标签页）
- API 完整度：GET 任务列表 + GET 单个任务 + PATCH 更新任务 + POST 创建传代记录
- 前端功能：水平步骤条 + 种子复苏表单 + 传代表单（支持多次传代）+ 收获冻存表单 + 传代历史 + 提交质检流程
- 生产流程：开始生产自动创建3个任务 → 种子复苏 → 传代（可多次）→ 收获冻存 → 提交质检
- 代码零新增 ESLint error/warning
