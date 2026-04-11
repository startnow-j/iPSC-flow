---
Task ID: 1
Agent: Main Agent
Task: 对比分析两份iPSC生产管理系统开发计划，并创建融合版开发计划文档

Work Log:
- 读取了用户上传的开发计划文档（传统LIMS方案，Spring Boot + React，20周，7人团队）
- 读取了之前对话中产出的双模式交互架构设计文档（Intent Layer抽象，7项架构准备）
- 进行了系统性的对比分析，从架构理念、功能范围、技术栈、项目管理、AI战略5个维度评估
- 以对话历史中的双模式架构设计为核心骨架，融合用户方案中的项目管理优点
- 特别考虑了AI辅助编程的实际可实施性（小团队、接口先行、业务逻辑人工编写等策略）
- 生成了完整的融合版开发计划文档（.docx格式）

Stage Summary:
- 输出文件：/home/z/my-project/upload/iPSC生产管理系统_开发计划_融合版.docx
- 文档结构：封面 + 目录 + 11章正文（执行摘要、现状分析、架构设计、七项架构准备、MVP范围、分阶段计划、AI辅助开发策略、风险管理、质量保证、预期效果、附录）
- 核心决策：Next.js 16全栈 + SQLite + Prisma，4阶段18周，1-2人AI辅助开发团队
- 里程碑：M1基础架构(第2周) → M2批次管理(第4周) → M3质检CoA(第6周) → M4 MVP交付(第8周) → M5 AI对话可用(第12周) → M6全功能(第16周) → M7正式上线(第18周)

---
Task ID: 2
Agent: Main Agent
Task: 配置 Git 云端自动保存规则

Work Log:
- 添加 GitHub remote: https://github.com/startnow-j/iPSC-flow.git
- 更新 .gitignore：排除 db/*.db、generate-*.js、/download/
- 创建 GIT_WORKFLOW.md 规范文档，定义自动保存触发条件和 commit 规范
- 提交了 2 个 commit（gitignore 更新 + workflow 文档）
- 当前环境缺少 SSH 客户端，无法直接 push，已记录完整操作步骤

Stage Summary:
- 云端仓库已配置：origin → https://github.com/startnow-j/iPSC-flow.git
- 自动保存规则已写入 GIT_WORKFLOW.md
- 待用户在本地配置 GitHub 认证后执行首次 push（见 GIT_WORKFLOW.md）
- 之后的每次对话/功能开发/每日结束时，AI 会自动执行 git commit + push

---
Task ID: 3
Agent: Main Agent
Task: 建立文档管理规范，统一管理项目 MD 文件

Work Log:
- 扫描项目中全部 10 个 MD 文件，逐一审查版本和状态
- 创建 docs/ 三级目录结构：requirements/、architecture/、plans/
- 迁移 3 个当前有效文档到 docs/（PRD v2.0、架构设计、开发计划融合版）
- 归档 6 个过期/被替代文档到 archive/（PRD v1.0、旧版开发计划、早期素材等）
- 创建 PROJECT_DOCS.md 文档管理规范（目录结构、分类规则、清理规则、worklog规则）
- 更新 .gitignore：排除 archive/ 和 upload/
- Git commit + push 完成

Stage Summary:
- 项目文档从混乱的 upload/ 扁平目录整理为结构化的 docs/ 体系
- archive/ 本地保留但不进 Git，避免仓库膨胀
- PROJECT_DOCS.md 成为 AI 每次对话开始时必须读取的规范文件
- 有效文档：PRD v2.0 + 双模式架构设计 + 融合版开发计划
- 已推送：https://github.com/startnow-j/iPSC-flow.git

---
Task ID: 1-3
Agent: Layout Framework Developer
Task: Application Layout Framework — sidebar navigation, header, content area, footer

Work Log:
- 读取了 worklog.md 和项目结构，了解现有技术栈（Next.js 16 + shadcn/ui + Tailwind CSS 4）
- 发现项目已有 shadcn/ui sidebar 组件（含 SidebarProvider, Sheet 移动端适配），决定复用而非自建
- 更新 globals.css 主题配色：将默认灰黑色 primary 替换为 teal/emerald 绿色系（oklch 色彩空间），light/dark 双模式均适配
- 创建 src/components/layout/ 目录，依次构建 5 个布局组件
- sidebar.tsx: 基于 shadcn/ui Sidebar 组件构建，含 Logo、导航菜单（工作台/我的批次/所有批次/待办事项）、批次状态概览面板、新建批次按钮、用户信息下拉菜单
- header.tsx: 含 SidebarTrigger 移动端汉堡按钮、面包屑导航、搜索框（桌面端）、通知下拉菜单（3条未读）、用户头像下拉菜单
- footer.tsx: 简洁粘性底部栏，mt-auto 保证短内容时粘底
- app-shell.tsx: 组合 Sidebar + SidebarInset + Header + Footer，使用 SidebarProvider 管理状态
- layout-wrapper.tsx: 客户端组件，根据 pathname 判断是否显示 AppShell（login/register 路由跳过）
- 修改 src/app/layout.tsx: 集成 LayoutWrapper，更新 metadata 为 iPSC生产管理系统
- 重写 src/app/page.tsx: Dashboard 占位页，含欢迎信息、4 张统计卡片、最近批次列表（5条占位数据）、最近动态时间线
- 运行 lint 检查：新增代码零错误，已有的 3 个 error 和 14 个 warning 均为其他 agent 的文件
- 验证 dev server 正常编译运行（200 OK）

Stage Summary:
- 新增文件：src/components/layout/{app-shell, sidebar, header, footer, layout-wrapper}.tsx（5个）
- 修改文件：src/app/globals.css（teal/emerald 主题）、src/app/layout.tsx（集成 LayoutWrapper）、src/app/page.tsx（Dashboard 占位页）
- 配色方案：teal/emerald 绿色系（biotech 风格），状态色 amber(生产中)/sky(待质检)/emerald(已放行)
- 侧边栏：桌面端可折叠（icon 模式），移动端 Sheet 覆盖层，宽度 16rem/18rem
- 响应式：全组件适配移动端，搜索框仅桌面显示，用户头像仅桌面端 header 显示（移动端在 sidebar footer）
- 导航项：工作台(/)、我的批次(/batches)、所有批次(/batches/all)、待办事项(/todos, disabled)
- 路由隔离：/login 和 /register 不显示 AppShell

---
Task ID: 1-4
Agent: Domain Services Developer
Task: 领域服务层 — 状态机、校验服务、审计日志

Work Log:
- 读取了 worklog.md 和 Prisma schema，了解项目背景和数据模型
- 读取了 db.ts 确认 Prisma Client 导入方式
- 创建 src/lib/services/ 目录及 4 个服务文件

**1. 状态机服务 (state-machine.ts)**
- 定义完整的 11 个 BatchStatus 状态转换规则常量 BATCH_TRANSITIONS（16 条转换规则）
- 实现 5 个公开函数：canTransition、getAvailableActions、transition、getStatusLabel、getStatusColor
- transition() 核心逻辑：校验批次存在性 → 匹配转换规则 → QC_PASS→COA_PENDING 自动创建 CoA 草稿 → 开始生产设置 actualStartDate → 放行设置 actualEndDate → 同步更新 Coa 状态

**2. 校验服务 (validation.ts)**
- 定义 ValidationResult 类型（valid/errors/warnings）
- validateBatchCreation()：异步校验 productCode 存在性、数量、日期顺序
- validateProductionTask()：按 taskCode 分发校验 SEED_PREP/EXPANSION/HARVEST 三个步骤的字段
- validateQcRecord()：逐项校验 VIABILITY(0~100)、MORPHOLOGY(PASS/FAIL)、MYCOPLASMA(PASS/FAIL)

**3. 审计日志服务 (audit-log.ts)**
- createAuditLog()：创建审计日志，自动 JSON 序列化
- getAuditLogs()：分页查询，支持批次/类型/操作员/事件筛选，自动反序列化 JSON 字段
- getBatchTimeline()：按批次编号查询正序时间线，用于前端展示
- 内置 15 种事件类型中文映射

**4. 统一导出 (index.ts)**
- 导出所有公开函数和类型定义

- 修复了所有 ESLint 警告（移除未使用的 eslint-disable 指令）
- 剩余 3 个 error 均为预存问题，与本任务无关

Stage Summary:
- 产出文件：src/lib/services/{state-machine, validation, audit-log, index}.ts（4 个）
- 状态机覆盖全部 11 个 BatchStatus 和 16 条转换规则
- 校验服务覆盖 3 种生产任务类型和 3 种质检检测项
- 审计日志支持分页查询、批次时间线、JSON 自动序列化/反序列化
- 代码零新增 ESLint error/warning

---
Task ID: 1-2 + 1-5
Agent: Auth System & Seed Data Developer
Task: 认证系统（登录/注册/会话管理）+ 种子数据

Work Log:
- 读取 worklog.md、Prisma schema、package.json、layout 组件了解现有项目状态
- 发现 layout 组件已由 Agent 1-3 构建，包含 AppShell/Sidebar/Header/Footer，已集成 AuthGuard import 但未使用
- 安装依赖：bcryptjs + @types/bcryptjs + jose

**1. 认证工具库 (src/lib/auth.ts)**
- 实现 hashPassword() / verifyPassword() 使用 bcryptjs
- 实现 createToken() / verifyToken() 使用 jose（Edge Runtime 兼容的 JWT）
- getTokenFromCookies() 从请求 cookie 提取 token
- Cookie 名称：ipsc_session，JWT 有效期 7 天

**2. Zustand 认证状态 (src/stores/auth-store.ts)**
- UserInfo 类型：id/name/email/role/department
- store 状态：user/isLoading/isAuthenticated
- 操作：setUser/setLoading/logout

**3. 登录页面 (src/app/login/page.tsx)**
- 居中登录卡片，teal/emerald 渐变背景
- Microscope 图标 Logo，中文 UI（登录/邮箱/密码）
- 表单验证、加载状态、错误提示
- 演示账号快捷填充（4个角色，默认密码 123456）
- 登录成功后 Zustand 存储用户信息，跳转 /

**4. AuthGuard 组件 (src/components/auth-guard.tsx)**
- 客户端组件，检查 /api/auth/me 获取用户信息
- PUBLIC_ROUTES 跳过认证检查
- 加载状态显示骨架屏
- 未认证重定向到 /login
- 修复 react-hooks/rules-of-hooks：useEffect 不再条件调用

**5. API 路由**
- POST /api/auth/login：验证邮箱密码 → 创建 JWT → 设置 HttpOnly Cookie → 返回用户信息
- POST /api/auth/logout：清除 Cookie
- GET /api/auth/me：验证 JWT → 从数据库获取最新用户信息
- POST /api/auth/register：仅 ADMIN 角色可创建用户，bcryptjs 加密密码

**6. 布局集成**
- 更新 layout.tsx：AuthGuard 包裹 LayoutWrapper
- 更新 sidebar.tsx：接入 useAuthStore，动态显示用户名/邮箱/角色，退出登录功能
- 更新 header.tsx：接入 useAuthStore，头像和下拉菜单动态显示用户信息，退出登录功能

**7. 首页 (src/app/page.tsx)**
- Dashboard 工作台：欢迎横幅（teal/emerald 渐变，显示问候语+用户信息）
- 4 张统计卡片（生产中/待质检/已放行/异常提醒）
- 近期批次动态列表（3条占位数据）
- 快捷操作 + 系统信息面板

**8. 种子数据 (prisma/seed.ts)**
- 4 个默认用户（admin/supervisor/operator/qa），密码 123456 bcryptjs 加密
- 1 个默认产品（IPSC-WT-001，iPSC细胞株(野生型)）
- 使用 upsert 避免重复创建
- package.json 添加 "seed" 脚本
- 成功运行 seed

- Lint 检查通过（剩余 error 均为预存的 generate-plan.js）
- Dev server 正常编译运行

Stage Summary:
- 新增文件：src/lib/auth.ts、src/stores/auth-store.ts、src/components/auth-guard.tsx
- 新增文件：src/app/login/page.tsx、src/app/api/auth/{login,logout,me,register}/route.ts
- 新增文件：prisma/seed.ts
- 修改文件：package.json（添加 seed 脚本）、src/app/layout.tsx（AuthGuard 包裹）
- 修改文件：src/components/layout/sidebar.tsx + header.tsx（接入 auth store）
- 修改文件：src/app/page.tsx（Dashboard 工作台）
- 认证方案：JWT (jose) + HttpOnly Cookie + bcryptjs + Zustand
- 默认账号：admin@ipsc.com / supervisor@ipsc.com / operator@ipsc.com / qa@ipsc.com（密码 123456）
- 种子产品：IPSC-WT-001 iPSC细胞株(野生型)

---
Task ID: 2-2 + 2-3 + 2-4
Agent: Batch Management Frontend Developer
Task: 批次管理前端 — 列表页、新建对话框、详情页、状态概览组件、侧边栏更新

Work Log:
- 读取 worklog.md 和项目结构，了解已有技术栈（Next.js 16 + shadcn/ui + Tailwind CSS 4 + Zustand）
- 分析已有 API：GET/POST /api/batches 已由另一 agent 实现，但缺少 [id] 路由和 products 路由
- 分析领域服务：state-machine.ts 提供 getStatusLabel/getStatusColor/getAvailableActions，audit-log.ts 提供 getBatchTimeline

**1. 后端 API 路由（补充缺失）**

创建 4 个 API 路由文件：

- `src/app/api/products/route.ts`：GET /api/products — 返回所有活跃产品列表（用于新建批次对话框产品选择）
- `src/app/api/batches/[id]/route.ts`：GET 批次详情（含 availableActions）+ PATCH 更新批次信息
- `src/app/api/batches/[id]/transition/route.ts`：POST 状态转换 — 调用 state-machine.transition()，记录审计日志
- `src/app/api/batches/[id]/timeline/route.ts`：GET 批次时间线 — 调用 audit-log.getBatchTimeline()，附加中文事件标签

**2. BatchStatusOverview 组件**

- 文件：`src/components/batches/batch-status-overview.tsx`
- 从 GET /api/batches?pageSize=1 获取 statusCounts
- 仅显示有计数的状态项（非零不显示）
- 加载时显示 Skeleton 骨架屏
- 支持 maxItems prop 限制显示数量（侧边栏用 6）
- 11 种状态各有独立颜色圆点

**3. CreateBatchDialog 组件**

- 文件：`src/components/batches/create-batch-dialog.tsx`
- shadcn Dialog 组件，支持 open/onOpenChange 受控模式
- 表单字段：产品选择(Select)、计划数量(Input)、种子批号(Input)、种子代次(Input)、计划交付日期(Input date)
- 产品数据从 /api/products 获取，失败时降级为硬编码 IPSC-WT-001
- 批次编号预览：`IPSC-{YYMMDD}-XXX-{passage}`（灰色提示文本）
- 校验：产品必选、种子代次格式 P{n}
- 提交后自动刷新列表（通过 onSuccess 回调）
- 创建人信息自动从 auth store 获取并显示

**4. Batch List Page**

- 文件：`src/app/batches/page.tsx`
- 支持两个视图：`/batches`（我的批次，按 assignee=当前用户过滤）和 `/batches/all`（所有批次）
- 状态筛选芯片（9种状态 + 全部），圆角全宽按钮，active 状态使用 primary 色
- 搜索框：按批次号模糊搜索，支持 Enter 键触发
- 批次卡片列表：图标 + 批次号（加粗）+ 状态徽标（彩色）+ 产品名 + 代次 + 创建人 + 日期
- 点击卡片 → /batches/[id] 详情页
- 分页控件（上一页/下一页）
- 空状态：区分无数据和筛选无结果两种情况
- 加载状态：5 个 Skeleton 占位卡片
- 浮动新建按钮 + CreateBatchDialog

**5. Batch Detail Page**

- 文件：`src/app/batches/[id]/page.tsx`
- 顶部：返回按钮 + 批次号（大号 mono）+ 状态徽标 + 产品名 + 操作按钮组
- 操作按钮：根据 availableActions 动态渲染，报废/不合格使用 destructive 样式
- 确认对话框：AlertDialog，报废/不合格显示红色警告文案
- Tab 导航（5 个标签页）：
  - 概览：4 张信息卡片（基础信息/种子信息/时间信息/创建信息），每行图标+标签+值
  - 生产记录：PlaceholderCard 占位（Phase 3）
  - 质检：PlaceholderCard 占位（Phase 4）
  - CoA：PlaceholderCard 占位
  - 时间线：垂直时间线，圆点+连线，显示事件标签/操作人/时间/数据变更（状态变更用彩色徽标）
- 加载/空/未找到三种状态处理

**6. Sidebar 更新**

- 修改 `src/components/layout/sidebar.tsx`：
  - 移除硬编码的 batchStatusItems 占位数据
  - 引入 BatchStatusOverview 组件替代静态状态列表
  - 新建批次按钮链接改为 /batches（触发对话框方式）
  - 清理未使用的 cn、Badge 导入

**7. 质量检查**
- Lint 通过：仅剩余预存的 generate-plan.js 2 个 error
- Dev server 正常编译运行

Stage Summary:
- 新增文件：src/app/api/products/route.ts
- 新增文件：src/app/api/batches/[id]/route.ts、transition/route.ts、timeline/route.ts
- 新增文件：src/components/batches/batch-status-overview.tsx、create-batch-dialog.tsx
- 新增文件：src/app/batches/page.tsx、src/app/batches/[id]/page.tsx
- 修改文件：src/components/layout/sidebar.tsx（集成 BatchStatusOverview 实时数据）
- API 完整度：GET 列表 + POST 创建 + GET 详情 + PATCH 更新 + POST 状态转换 + GET 时间线 + GET 产品列表
- 前端功能：批次列表（我的/所有）、状态筛选、搜索、分页、新建批次对话框、批次详情（5个标签页）、状态转换确认、时间线展示
- 代码零新增 ESLint error/warning

---
Task ID: 2-1
Agent: Batch Management API Developer
Task: 批次管理 API 路由 — 列表/创建/详情/更新/状态转换/时间线

Work Log:
- 读取了 worklog.md、Prisma schema、领域服务层（state-machine/validation/audit-log）、auth.ts
- 确认认证模式：getTokenFromCookies + verifyToken（与现有 /api/auth 路由一致）
- 确认 Next.js 16 App Router 动态路由 params 类型为 Promise<{ id: string }>

**1. GET /api/batches — 批次列表 (route.ts)**
- JWT 认证检查（401）
- 查询参数：status（BatchStatus 过滤）、search（batchNo 模糊匹配）、assignee（createdBy 过滤）、page、pageSize
- 并行查询批次列表 + 总数 + 各状态计数（groupBy status）
- 返回 batches/total/page/pageSize/statusCounts

**2. POST /api/batches — 创建批次 (route.ts)**
- JWT 认证检查
- validateBatchCreation() 校验产品编码、数量、日期
- 查询产品信息获取 productName/specification/unit
- 生成批次编号：IPSC-YYMMDD-XXX-Pn（查询当天最大序号+1，3位补零）
- 创建批次记录 + createAuditLog(BATCH_CREATED)

**3. GET /api/batches/[id] — 批次详情 (route.ts)**
- JWT 认证检查
- 查询批次 + include tasks/qcRecords/coa（按 sequenceNo/createdAt 排序）
- getAvailableActions() 返回当前用户角色可执行操作列表

**4. PATCH /api/batches/[id] — 更新批次 (route.ts)**
- JWT 认证检查
- 仅允许 NEW/IN_PRODUCTION 状态修改（403）
- 白名单字段：plannedQuantity/plannedStartDate/plannedEndDate/seedBatchNo/seedPassage/storageLocation/notes
- 更新 seedPassage 时同步更新 currentPassage
- createAuditLog(BATCH_UPDATED) 记录变更前后快照

**5. POST /api/batches/[id]/transition — 状态转换 (route.ts)**
- JWT 认证检查
- getAvailableActions() 权限校验（403）
- transition() 执行状态转换（含 CoA 自动创建、日期设置等副作用）
- createAuditLog(BATCH_STATUS_CHANGED/BATCH_SCRAPPED/BATCH_RELEASED)

**6. GET /api/batches/[id]/timeline — 批次时间线 (route.ts)**
- JWT 认证检查
- 查询 batchNo → getBatchTimeline() 返回正序审计日志列表

- Lint 检查通过（仅预存 generate-plan.js 错误，本任务零新增）
- Dev server 正常编译，无新增错误

Stage Summary:
- 新增文件：src/app/api/batches/route.ts（GET 列表 + POST 创建）
- 新增文件：src/app/api/batches/[id]/route.ts（GET 详情 + PATCH 更新）
- 新增文件：src/app/api/batches/[id]/transition/route.ts（POST 状态转换）
- 新增文件：src/app/api/batches/[id]/timeline/route.ts（GET 时间线）
- 认证模式：getTokenFromCookies + verifyToken，统一 401/403/400/404/500 状态码
- 审计日志：所有数据变更操作均通过 createAuditLog() 记录
- 状态转换：集成 transition() 状态机服务，含权限校验和副作用处理
- 代码零新增 ESLint error/warning

---
Task ID: 3-1 + 3-2 + 3-3 + 3-4 + 3-5
Agent: eBPR Full-Stack Developer
Task: eBPR 生产记录 - 后端API、表单组件、步骤引导、批次详情集成

Work Log:
- 读取了 worklog.md、Prisma schema、领域服务层（state-machine/validation/audit-log）、auth.ts、db.ts
- 分析了现有批次详情页（5个标签页，生产记录为占位符）和状态转换 API
- 分析了 ProductionTask Prisma model 的完整字段定义

**1. 后端 API 路由（Task 3-1）**

创建 2 个 API 路由文件：

- `src/app/api/batches/[id]/tasks/route.ts`：GET 列出批次所有任务 + POST 创建传代记录（EXPANSION）
  - GET：查询所有任务按 sequenceNo/createdAt 排序，解析 JSON 字段
  - POST：仅允许 IN_PRODUCTION 状态创建传代记录，校验表单，自动设置 stepGroup（如"P4-P5"），更新批次 currentPassage

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
- 照片上传占位按钮（disabled + "即将上线"提示）
- 提交 -> PATCH task，status 设为 COMPLETED
- 前端校验 + 后端校验双重保障，错误以 toast 显示

**3. 扩增培养（传代）表单组件（Task 3-3）**

- 文件：`src/components/ebpr/expansion-form.tsx`
- 自动计算：passage_from 从 currentPassage/seedPassage 解析，passage_to = passage_from + 1
- 高亮显示：代次信息面板（P{n}->P{n+1}）
- 表单字段：传代日期、传代比例(1:3~1:10)、细胞密度(cells/cm2)、培养基批号、细胞形态、备注
- 每次提交创建新 ProductionTask（POST /api/batches/{id}/tasks），不更新现有
- 传代历史卡片：显示已完成的所有传代记录（代次/日期/比例/密度/操作员）
- 提交后自动清空表单，准备下次传代

**4. 收获冻存表单组件（Task 3-4）**

- 文件：`src/components/ebpr/harvest-form.tsx`
- 表单字段：总细胞数、存活率(%)、每支规格(如"1x10^6")、冻存液批号、存储位置、备注
- 自动计算：total_vials = total_cells / 解析(vial_per_spec)
- 解析函数支持多种格式：1x10^6、1e6 等
- 完成后表单变为只读状态，显示完成徽标
- 提交 -> PATCH task，返回 shouldPromptQc=true

**5. eBPR 步骤引导 + 集成（Task 3-5）**

创建 3 个组件文件：

- `src/components/ebpr/task-summary.tsx`：已完成任务摘要卡片
  - 根据 taskCode 渲染不同的数据摘要（SEED_PREP/EXPANSION/HARVEST 各自的关键字段）
  - 显示操作员、完成时间、备注

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
  - 收获完成后显示"提交质检"提示卡片（触发 IN_PRODUCTION -> QC_PENDING）
  - 已提交质检时显示绿色提示
  - 空状态：无任务时显示引导文案

修改 1 个文件：

- `src/app/batches/[id]/page.tsx`：
  - 引入 EbprStepGuide 组件
  - 在"生产记录"标签页中替换占位符为 EbprStepGuide
  - 新增 handleProductionUpdate 回调用于刷新批次和时间线数据

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
- 生产流程：开始生产自动创建3个任务 -> 种子复苏 -> 传代（可多次）-> 收获冻存 -> 提交质检
- 代码零新增 ESLint error/warning

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
    - QC_PASS/COA_*/RELEASED/REJECTED → QcResultsSummary
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

---
Task ID: 5-1 + 5-2 + 5-3 + 5-4
Agent: Dashboard, User Management & UI Polish Developer
Task: Dashboard Enhancement, User Management, Audit Log Viewer, UI Polish

Work Log:
- 读取了 worklog.md 和项目结构，了解现有技术栈（Next.js 16 + shadcn/ui + Tailwind CSS 4 + Zustand + next-themes）
- 分析了现有认证体系（JWT + HttpOnly Cookie）、侧边栏导航、Auth Store 等已有组件
- 确认 sonner 已安装但未在 layout 中使用，next-themes 已安装但未配置 ThemeProvider

**Task 5-4a: 主题与暗色模式基础设施**
- 创建 src/components/theme-provider.tsx：基于 next-themes 的 ThemeProvider 封装
- 修改 src/app/layout.tsx：集成 ThemeProvider（attribute="class", defaultTheme="system"），替换 Toaster 为 sonner 版本（richColors + closeButton）
- 修改 src/components/layout/header.tsx：添加暗色模式切换按钮（Sun/Moon 图标动画切换），更新页面标题映射增加 users/audit

**Task 5-1: Dashboard 增强**
- 创建 src/components/dashboard/stat-card.tsx：统计卡片组件，支持左侧彩色边框、图标、大号数字、点击导航
- 创建 src/components/dashboard/recent-batches.tsx：近期批次动态组件，实时获取最新5条批次数据，空状态提示
- 创建 src/components/dashboard/my-tasks.tsx：我的待办组件，根据角色（OPERATOR/SUPERVISOR/QA/ADMIN）动态显示不同待办任务和快捷操作
- 重写 src/app/page.tsx：真实数据驱动的 Dashboard，包含欢迎横幅、4张统计卡片（生产中/待质检/待审核CoA/已放行，从 API 获取实时计数）、近期批次动态、我的待办+快捷操作
- 统计卡片响应式布局：2列手机、4列桌面

**Task 5-2: 用户管理**
- 创建 src/app/api/users/route.ts：GET 列出所有用户（ADMIN only）+ POST 创建用户（邮箱格式验证、密码>=6位、bcryptjs加密、角色校验、邮箱唯一性检查）
- 创建 src/app/api/users/[id]/route.ts：GET 获取单个用户 + PATCH 更新用户（支持修改所有字段）+ DELETE 软删除（active=false，防止自禁用）
- 创建 src/components/users/user-list.tsx：用户列表表格组件，含角色彩色徽标、启用/禁用状态、操作下拉菜单（编辑/禁用/启用）、确认对话框
- 创建 src/components/users/create-user-dialog.tsx：创建/编辑用户对话框，表单验证（姓名必填、邮箱格式、密码>=6位），支持编辑模式（密码留空不修改）
- 创建 src/app/users/page.tsx：用户管理页面，ADMIN 角色权限控制（非 ADMIN 显示"无权限"），集成用户列表和创建/编辑对话框

**Task 5-3: 审计日志**
- 创建 src/app/api/audit/route.ts：GET 审计日志列表（ADMIN/SUPERVISOR only），支持事件类型/批次号/操作员/对象类型筛选和分页
- 创建 src/app/audit/page.tsx：全局审计日志页面，含筛选器（事件类型下拉+批次号搜索）、数据表格（时间/事件/操作员/类型/批次号/输入模式）、交替行色、分页控件、角色权限控制
- 增强 src/app/batches/[id]/page.tsx 中的 TimelineCard：
  - 添加 18 种事件类型的彩色圆点（BATCH_CREATED=teal, BATCH_STATUS_CHANGED=amber, TASK_COMPLETED=emerald 等）
  - 添加输入模式徽标（FORM_SUBMIT/AI_CONVERSATION）颜色区分
  - 添加通用数据差异比较函数 formatDiffData()，自动对比 dataBefore/dataAfter 显示变更字段（删除线旧值→加粗新值）
  - 改进空状态文案："暂无操作记录" + "批次操作将自动记录在此"

**Task 5-nav: 侧边栏更新**
- 修改 src/components/layout/sidebar.tsx：
  - 新增 "系统管理" 导航组，含 "用户管理"（ADMIN only）和 "审计日志"（ADMIN + SUPERVISOR）
  - 根据用户角色动态过滤导航项

**Task 5-4b: 登录页面美化**
- 重写 src/app/login/page.tsx：
  - 添加 "iPSC-Flow" 品牌标识（Logo + Dna 图标）
  - 多层渐变背景装饰元素（3个脉冲动画模糊圆形 + 点阵网格纹理）
  - 暗色模式适配（dark: 前缀渐变背景和卡片样式）
  - 页脚更新为 "© 2026 iPSC-Flow · GMP Compliant"

**Task 5-4c: 其他 UI 改进**
- 修改 src/components/layout/footer.tsx：添加 mt-auto 确保粘性底部，更新文案
- 所有新组件支持响应式设计（hidden sm:table-cell / hidden md:table-cell 等）
- 所有数据获取页面添加了 Skeleton 加载骨架屏
- 空状态使用 Lucide 图标 + 描述文案
- API 错误通过 sonner toast 通知展示

- Lint 检查通过：仅剩预存 generate-plan.js 2 个 error，本任务零新增
- Dev server 正常编译运行，无编译错误

Stage Summary:
- 新增文件：src/components/theme-provider.tsx、src/components/dashboard/{stat-card,recent-batches,my-tasks}.tsx（4个）
- 新增文件：src/app/api/users/route.ts、[id]/route.ts（2个）
- 新增文件：src/app/api/audit/route.ts（1个）
- 新增文件：src/components/users/{user-list,create-user-dialog}.tsx（2个）
- 新增文件：src/app/users/page.tsx、src/app/audit/page.tsx（2个）
- 修改文件：src/app/layout.tsx（ThemeProvider + sonner Toaster）
- 修改文件：src/components/layout/{header,sidebar,footer}.tsx（暗色模式切换 + 系统管理导航 + 粘性底部）
- 修改文件：src/app/page.tsx（真实数据驱动 Dashboard）
- 修改文件：src/app/login/page.tsx（品牌化 + 暗色模式 + 动画背景）
- 修改文件：src/app/batches/[id]/page.tsx（时间线增强：彩色圆点 + 输入模式徽标 + 数据差异对比）
- Dashboard：4张实时统计卡片 + 近期批次动态 + 角色感知的待办任务 + 快捷操作
- 用户管理：完整 CRUD API + 用户列表表格 + 创建/编辑对话框 + 启用/禁用 + 权限控制
- 审计日志：全局审计日志查看器（筛选 + 分页）+ 批次时间线增强（18种事件颜色 + 输入模式 + 数据差异）
- UI Polish：暗色模式（ThemeProvider + 切换按钮）、登录页品牌化、响应式布局、加载骨架屏、空状态
- 代码零新增 ESLint error/warning

---
Task ID: 5
Agent: backend-api-updater
Task: Update all backend API permission checks for multi-role support

Work Log:
- Updated /api/users GET/POST for multi-role
- Updated /api/users/[id] GET/PATCH/DELETE for multi-role
- Updated /api/auth/register for multi-role
- Updated /api/audit for multi-role
- Updated /api/batches/[id] for multi-role
- Updated state-machine getAvailableActions for multi-role

Stage Summary:
- All backend permission checks now use roles array instead of single role
- User CRUD APIs handle roles JSON array parameter
- State machine accepts roles array and checks any match

---
Task ID: 6
Agent: Main Agent
Task: 多角色系统改造 — 一个用户可分配多个角色

Work Log:
- 分析现有角色系统：所有权限检查使用 user.role 单一字符串比较
- 设计多角色方案：保留 role（主角色）+ 新增 roles（JSON 数组字段）
- 修改 Prisma Schema：User 表新增 roles String @default("[]")
- 运行 db:push 同步数据库结构
- 创建 src/lib/roles.ts 工具函数库：parseRoles/serializeRoles/hasRole/hasAnyRole/isAdmin/getRoleDisplay/determinePrimaryRole/VALID_ROLES/ROLE_LABELS/ROLE_COLORS
- 修改 src/lib/auth.ts：JWTPayload 新增 roles: string[] 字段，新增 getRolesFromPayload() 辅助函数
- 修改 /api/auth/login：返回多角色数据（roles 数组），JWT payload 包含 roles
- 修改 /api/auth/me：查询并返回 roles 字段，使用 parseRoles 解析
- 修改 src/stores/auth-store.ts：UserInfo 接口新增 roles: string[]
- 修改所有后端 API 权限检查（由子代理完成）：
  - /api/users GET/POST/PATCH/DELETE：使用 isAdmin(getRolesFromPayload(payload))
  - /api/auth/register：使用 isAdmin()
  - /api/audit：使用 hasAnyRole()
  - /api/batches/[id]：传递 roles 数组给 getAvailableActions
  - state-machine.ts：getAvailableActions 接受 roles 数组，any-match 语义
- 修改所有前端权限检查：
  - sidebar.tsx：使用 getRoleDisplay() 显示多角色，roles.some() 过滤导航
  - header.tsx：使用 getRoleDisplay() 显示多角色
  - page.tsx（Dashboard）：使用 getRoleDisplay()
  - my-tasks.tsx：使用 hasRole() 进行多角色任务过滤和快捷操作聚合
  - coa-detail.tsx：使用 hasRole() 判断审核权限
  - audit/page.tsx：使用 hasAnyRole() 权限检查
  - users/page.tsx：使用 isAdmin() 权限检查
- 改造用户管理界面：
  - user-list.tsx：多角色 Badge 展示，roles.map() 渲染
  - create-user-dialog.tsx：Checkbox 多角色选择（替换 Select 单选），至少选1个角色
- 更新种子数据：
  - supervisor@ipsc.com → ["SUPERVISOR","OPERATOR"]（主管兼操作员）
  - operator@ipsc.com → ["OPERATOR","QA"]（操作员兼QA）
- ESLint 检查通过（仅预存 generate-plan.js 错误）
- Dev server 正常运行，/api/auth/me 返回 200，正确查询 roles 字段

Stage Summary:
- 数据库：User.roles 字段（JSON 数组），User.role 保留为主角色
- 新增文件：src/lib/roles.ts（角色工具函数库）
- 修改文件：18 个文件（auth.ts、4个 API route、7个前端组件、auth store、seed 等）
- 权限模型：any-match 语义（拥有任一所需角色即有权限）
- UI 变化：用户列表多角色 Badge、创建/编辑用户 Checkbox 多选
- 种子数据示例：2 个用户拥有多角色（主管+操作员、操作员+QA）
---
Task ID: 1
Agent: Main Agent
Task: 修复登录界面演示账号不能点击登录的问题

Work Log:
- 检查开发服务器日志，无编译错误
- 分析登录页面代码 `src/app/login/page.tsx`
- 发现问题：演示账号按钮的 onClick 仅调用 `setEmail()` + `setPassword()` 填充表单字段，不会自动提交登录
- 用户需要手动再点击"登录"按钮才能完成登录，体验不佳
- 重构登录逻辑：抽取 `doLogin(email, password)` 核心函数
- `handleSubmit` 调用 `doLogin(email, password)` 处理表单提交
- `handleDemoLogin` 直接调用 `doLogin(demoEmail, '123456')` 实现一键登录
- 为演示按钮添加 `disabled` 和 loading 状态，防止重复点击
- 登录 API 和 auth-me API 验证均正常返回 200

Stage Summary:
- 修复文件：`src/app/login/page.tsx`
- 演示账号按钮现在支持一键登录（点击即自动调用登录 API）
- 添加了 loading 状态防止重复提交
---
Task ID: 2
Agent: Main Agent
Task: 修复 QA 用户无法看到正确质检批次的问题

Work Log:
- 用户报告 QA 登录后点击"待质检批次"等链接显示"该批次可能已被删除"
- 通过 Grep 搜索错误信息定位到 `src/app/batches/[id]/page.tsx:612`
- 检查后端 API：QA 用户 token 正常、`/api/batches?status=QC_PENDING` 正确返回数据、`/api/batches/{id}` 正确返回批次详情
- 检查前端路由结构：`src/app/batches/` 下只有 `page.tsx` 和 `[id]/page.tsx`，**没有 `all/page.tsx`**
- **根因**：多处链接指向 `/batches/all`（如仪表板快捷操作、侧边栏、首页统计卡片），但 Next.js 没有 `/batches/all` 路由
- Next.js 的 `[id]` 动态路由将 "all" 当作批次 ID → 调用 `/api/batches/all` → 404 → 前端显示"该批次可能已被删除"
- 创建 `src/app/batches/all/page.tsx`，复用 `BatchListPage` 组件
- 该组件通过 `usePathname()` 判断 `pathname === '/batches/all'`，自动切换为 `viewMode='all'`（不按用户过滤）

Stage Summary:
- 新增文件：`src/app/batches/all/page.tsx`
- 所有指向 `/batches/all` 的链接现在都能正确渲染"所有批次"页面
- QA 用户可以通过"待质检批次"快捷操作正常查看和操作质检批次
---
Task ID: 3
Agent: Main Agent
Task: 修复生产中填写的数量和存储位置不显示的问题

Work Log:
- 用户报告生产过程中填写的数量和存储位置在批次概览中不显示
- 分析数据流：HarvestForm 提交 → PATCH /api/batches/[id]/tasks/[taskId] → 更新 production_task.formData
- 发现 formData 中的 `total_vials` 和 `storage_location` 只保存在任务的 JSON 字段中
- 批次概览页读取的是 `batch.actualQuantity` 和 `batch.storageLocation` 两个独立字段
- **根因**：HARVEST 任务完成时没有将 formData 中的实际数量和存储位置同步回 batch 表
- 修改 `src/app/api/batches/[id]/tasks/[taskId]/route.ts`：在 HARVEST 任务完成时
  - 提取 `formData.total_vials` → 写入 `batch.actualQuantity`
  - 提取 `formData.storage_location` → 写入 `batch.storageLocation`
  - 同时记录 BATCH_UPDATED 审计日志
- 手动修复历史数据：将已有批次的 actualQuantity=24、storageLocation='液氮罐4#C架 盒子1' 更新到 batch 表

Stage Summary:
- 修复文件：`src/app/api/batches/[id]/tasks/[taskId]/route.ts`
- 新增逻辑：HARVEST 任务完成时自动同步实际数量和存储位置到 batch 表
- 历史数据已通过 SQL 修复
- 后续所有收获冻存操作都会自动回写批次信息
- 代码零新增 ESLint error/warning

---
Task ID: 4-b
Agent: Main Agent
Task: CoA 双视图模式 — 内部草稿 vs 客户交付版本

Work Log:
- 读取 worklog.md、coa-detail.tsx、state-machine.ts 了解现有 CoA 模块实现
- 分析现有 CoaContent 接口和 CoA 文档渲染结构
- 确认 Prisma schema 中 QcRecord.sampleQuantity 字段可用于计算质检消耗量

**1. CoA 双视图模式 (coa-detail.tsx)**
- 新增 ViewMode 类型：'internal' | 'customer'，默认为 'internal'
- 在 CoA 文档头部（渐变色横幅下方）添加视图切换按钮组：
  - 两个按钮使用白色半透明背景容器，选中态为白色文字+阴影
  - "内部视图" 按钮（Eye 图标）：显示完整信息
  - "客户版本" 按钮（EyeOff 图标）：隐藏生产敏感信息
- 客户版本视图隐藏以下区域：
  - 生产信息区（种子批号、种子代次、计划/实际数量、存储位置）
  - 审核记录区（创建人、提交人、审核人、批准人信息）
- 客户版本视图新增区域：
  - "发放数量" 信息区：显示 releaseQuantity（实际数量减去质检消耗）
  - 质检消耗行：当 totalConsumedVials > 0 时显示
  - 底部水印："客户版本 · 生产信息已隐藏"（EyeOff 图标 + 灰色小字）
- 客户版本卡片外框：添加 amber 色描边提示（ring-2 ring-amber-400/50）
- CoaContent 接口新增字段：releaseQuantity、totalConsumedVials
- 新增 import：cn (Tailwind 合并工具)、Eye/EyeOff/PackageMinus (Lucide 图标)

**2. CoA 内容生成更新 (state-machine.ts)**
- 在 generate_coa 动作中新增 QC 记录查询：
  - `db.qcRecord.findMany({ where: { batchId }, select: { sampleQuantity: true } })`
  - 累加所有 QC 记录的 sampleQuantity 得到 totalConsumed
  - 计算 releaseQuantity = batch.actualQuantity - totalConsumed
- CoA content JSON 新增 releaseQuantity 和 totalConsumedVials 字段

- Lint 检查通过（仅预存 generate-plan.js 2 个 error，本任务零新增）
- Dev server 正常编译运行，✓ Compiled 无报错

Stage Summary:
- 修改文件：src/components/coa/coa-detail.tsx（双视图模式）
- 修改文件：src/lib/services/state-machine.ts（CoA 生成含发放数量计算）
- 视图切换：内部视图（完整信息）/ 客户版本（隐藏生产+审核，显示发放数量）
- 客户版本水印："客户版本 · 生产信息已隐藏"
- 新增 CoA 字段：releaseQuantity、totalConsumedVials
- 代码零新增 ESLint error/warning

---
Task ID: 4-a
Agent: Main Agent
Task: 添加"复苏支数"字段到质检流程，更新批次剩余数量

Work Log:
- 读取 worklog.md 了解现有 QC 模块、批次管理、eBPR 的实现
- 确认 Prisma schema 中 QcRecord.sampleQuantity (Int?) 字段可复用
- 修改 4 个文件实现完整的复苏支数追踪

**1. 批次详情 API (src/app/api/batches/[id]/route.ts)**
- GET handler 增加 remainingQuantity 和 totalConsumedVials 计算
- 查询所有 QC 记录的 sampleQuantity 求和
- remainingQuantity = max(0, actualQuantity - totalConsumed)

**2. 质检 API (src/app/api/batches/[id]/qc/route.ts)**
- POST handler 接受 thawedVials 参数
- 校验：必须为 >=1 的数字
- 保存到 qcRecord.sampleQuantity 字段
- 审计日志记录 sampleQuantity

**3. 质检表单 (src/components/qc/qc-form.tsx)**
- 新增 batchActualQuantity/batchUnit props
- 新增 thawedVials state（默认1）
- 在检测项前添加"复苏信息"卡片（amber 主题）
  - 显示当前实际数量
  - 复苏支数输入框（必填，min 1）
  - 实时验证：超过实际数量时显示警告
- 提交时包含 thawedVials

**4. 批次详情页 (src/app/batches/[id]/page.tsx)**
- 概览 Tab："实际数量"→"生产数量"，新增"剩余数量"和"质检消耗"信息行
- QcForm 传入 remainingQuantity（而非原始 actualQuantity）作为可用数量

Stage Summary:
- 修改文件：4 个（batch API、QC API、QC 表单、批次详情页）
- 数据模型：actualQuantity 保持原始生产数量不变，剩余数量动态计算
- QC 消耗的复苏支数存储在 qcRecord.sampleQuantity 中
- 代码零新增 ESLint error/warning
- 添加内部视图/客户视图切换按钮（ViewMode toggle）
- 内部视图：显示完整生产信息 + 审核记录
- 客户视图：隐藏生产信息，仅显示发放数量 + 水印提示
- 更新 lucide-react 图标导入（FlaskConical, GitBranch, PenLine）

**2. CoA 双视图字段调整（本次修改）**
- 内部视图修改：
  - "实际数量" → 重命名为 "生产数量"
  - 新增 "质检消耗" 字段（totalConsumedVials，显示各轮质检复苏总支数）
  - 新增 "可发放数量" 字段（releaseQuantity，生产数量 - 质检消耗）
- 客户视图修改：
  - 移除整个 "发放数量" 区块（原显示 releaseQuantity 和 totalConsumedVials）
  - 新增 "代次信息" 区块（种子代次 + 最终代次，GitBranch 图标）
  - 新增 "审核签字" 区块（审核批准人 + 批准日期，PenLine 图标）
  - 保留客户版本水印提示

Stage Summary:
- 修改文件：`src/components/coa/coa-detail.tsx`
- 内部视图完整字段：种子批号/种子代次/当前代次/计划数量/生产数量/存储位置/质检消耗/可发放数量
- 客户视图完整字段：产品信息 + 代次信息（种子代次/最终代次）+ 质检结果 + 审核签字（批准人/日期）
- 后端无需修改，CoA content 中的 releaseQuantity/totalConsumedVials 已在 CoA 生成时计算好
- 代码零新增 ESLint error/warning

---
Task ID: 4-c
Agent: Main Agent
Task: CoA 双视图字段精细化调整

Work Log:
- 分析用户反馈：内部视图需要展示质检消耗和可发放数量，客户版本不需要发放数量但需要代次信息和审核签字
- 读取 coa-detail.tsx 完整代码（571行）
- 确认状态机中 CoA 生成逻辑已包含 releaseQuantity 和 totalConsumedVials 字段
- 修改内部视图：重命名"实际数量"为"生产数量"，新增"质检消耗"和"可发放数量"
- 修改客户视图：移除发放数量区块，新增代次信息区块和审核签字区块
- 添加新图标导入：GitBranch、PenLine
- Dev server 编译成功，lint 通过

Stage Summary:
- 修改文件：`src/components/coa/coa-detail.tsx`
- 内部视图（8个字段）：种子批号、种子代次、当前代次、计划数量、生产数量、存储位置、质检消耗、可发放数量
- 客户视图（4个区块）：产品信息、代次信息（种子代次+最终代次）、质检结果+综合判定、审核签字（批准人+日期）
- 数据来源：CoaContent JSON（状态机生成）+ CoaRecord 审核字段（审批API写入）
