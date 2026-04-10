---
Task ID: 4-1 + 4-2 + 4-3 + 4-4
Agent: QC & CoA Full-Stack Developer
Task: 质检(QC)与分析证书(CoA)模块 — 后端API、前端表单、批次详情集成

Work Log:
- 读取了 worklog.md、Prisma schema、领域服务层（state-machine/validation/audit-log）、auth.ts、批次详情页
- 分析了现有状态机转换规则：QC_IN_PROGRESS→QC_PASS(pass_qc)→COA_PENDING(generate_coa，自动创建CoA草稿)
- 分析了现有 transition API 路由的认证模式和错误处理模式

**1. QC 后端 API 路由（Task 4-1）**

创建 2 个 API 路由文件：

- `src/app/api/batches/[id]/qc/route.ts`：GET 列出批次质检记录 + POST 创建质检记录
  - GET：查询所有 QC 记录按 createdAt 倒序，解析 JSON 字段
  - POST：仅允许 QC_IN_PROGRESS 状态创建，校验 testResults（validateQcRecord），自动计算 overallJudgment（ALL PASS→PASS/any FAIL→FAIL），收集 failReason，记录审计日志

- `src/app/api/batches/[id]/qc/[qcId]/route.ts`：GET 单条质检记录 + PATCH 更新
  - GET：查询单条质检记录详情
  - PATCH：支持更新 testResults/overallJudgment/reviewComment/reviewer 信息，自动重算综合判定，记录审计日志

**2. CoA 后端 API 路由（Task 4-3）**

创建 2 个 API 路由文件：

- `src/app/api/batches/[id]/coa/route.ts`：GET 获取批次的 CoA（含 content JSON 解析）
- `src/app/api/coa/[coaId]/route.ts`：GET 详情 + PATCH 更新（提交/审核）
  - PATCH 支持 3 种 action：submit（DRAFT→SUBMITTED）、approve（SUBMITTED→APPROVED）、reject（SUBMITTED→REJECTED）
  - 每个 action 同时触发对应的批次状态转换（通过 state-machine.transition()）
  - 状态机内部同步更新 CoA 表的 status/approvedBy/reviewedAt 等字段
  - 退回时额外保存 reviewComment

**3. QC 前端组件（Task 4-2）**

创建 2 个组件文件：

- `src/components/qc/qc-form.tsx`：质检表单
  - 3 个检测项卡片：复苏活率(number input, ≥85%自动判定)、细胞形态(select 正常/异常)、支原体检测(select 阴性/阳性)
  - 每项显示方法、标准、实时判定结果（Badge）
  - 照片上传占位按钮（disabled）
  - 底部综合判定预览（PASS/FAIL Badge，通过/不合格计数）
  - 提交流程：POST /qc → pass_qc transition → generate_coa transition（链式调用）
  - 使用 useAuthStore 获取当前操作员信息
  - Toast 通知反馈

- `src/components/qc/qc-results-summary.tsx`：质检结果展示
  - 最新记录详情：检测结果表格（项目/方法/标准/结果/判定）、不合格原因、操作员/审核人信息
  - 历史记录列表（折叠显示）

**4. CoA 前端组件（Task 4-4）**

创建 1 个组件文件：

- `src/components/coa/coa-detail.tsx`：CoA 分析证书文档视图
  - 专业的文档布局：渐变色头部（teal→emerald）、CoA编号/批号
  - 产品信息区、生产信息区（种子批号/代次/数量/存储位置）
  - 质检结果表格 + 综合判定徽标
  - 审核记录时间线（创建/提交/审核/批准各环节）
  - 状态驱动操作按钮：DRAFT→提交审核、SUBMITTED→批准/退回(SUPERVISOR/QA)、APPROVED→已批准徽标、REJECTED→重新提交
  - 确认对话框（AlertDialog）：提交/批准/退回各有独立对话框
  - 退回对话框含 Textarea 输入退回原因

**5. 批次详情页集成（Task 4-int）**

修改 1 个文件：

- `src/app/batches/[id]/page.tsx`：
  - 新增状态：qcRecords/coa/qcLoading/coaLoading
  - 新增函数：fetchQcRecords/fetchCoa/handleQcSubmitted/handleCoaUpdated/handleStartQc
  - handleTabChange 增加 qc/coa 标签的懒加载触发
  - "质检" 标签页：
    - NEW/IN_PRODUCTION → "请先完成生产记录"
    - QC_PENDING → "开始质检" 按钮（触发 start_qc transition）
    - QC_IN_PROGRESS → QcForm 组件
    - QC_PASS/COA_* /RELEASED/REJECTED → QcResultsSummary
    - QC_FAIL → 额外显示返工卡片
    - SCRAPPED → "批次已报废"
  - "CoA" 标签页：
    - 有 CoA → CoaDetail 组件
    - 无 CoA 但状态 >= QC_PASS → "CoA生成中"
    - 其他 → "暂无CoA"
  - 新增 toast 导入用于操作反馈

- Lint 检查：仅剩预存 generate-plan.js 2 个 error，本任务零新增
- Dev server 正常编译运行，无编译错误

Stage Summary:
- 新增文件：src/app/api/batches/[id]/qc/route.ts、[qcId]/route.ts（2 个）
- 新增文件：src/app/api/batches/[id]/coa/route.ts（1 个）
- 新增文件：src/app/api/coa/[coaId]/route.ts（1 个）
- 新增文件：src/components/qc/qc-form.tsx、qc-results-summary.tsx（2 个）
- 新增文件：src/components/coa/coa-detail.tsx（1 个）
- 修改文件：src/app/batches/[id]/page.tsx（集成 QC/CoA 标签页）
- API 完整度：QC CRUD + CoA 读取/审核（提交/批准/退回）
- QC 流程：开始质检 → 填写表单 → 自动判定 → 提交 → 自动创建CoA草稿
- CoA 流程：草稿 → 提交审核 → 批准/退回 → 批准后放行
- 完整端到端流程：NEW → IN_PRODUCTION → QC_PENDING → QC_IN_PROGRESS → QC_PASS → COA_PENDING(自动CoA) → COA_SUBMITTED → COA_APPROVED → RELEASED
- 代码零新增 ESLint error/warning
