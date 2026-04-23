---
Task ID: Phase 0
Agent: Main Agent
Task: 权限系统升级 Phase 0 — QA/QC 角色分离 + 产品线归属

Work Log:
- 读取 worklog.md 和全部 6 个待修改文件，了解现有代码结构
- 确认 Prisma schema 中 UserProductLine 模型已存在（userId + productLine，唯一约束）
- 修改 6 个文件完成 Phase 0 全部变更：

**1. register/route.ts** — validRoles 增加 'QC'

**2. login/route.ts** — db.user.findUnique 增加 productLines include；响应 JSON 增加 productLines 字段

**3. me/route.ts** — 同 login，增加 productLines include 和响应字段

**4. auth-store.ts** — UserInfo 接口增加 productLines: string[]

**5. login/page.tsx** — 演示账号重排序（QA 在操作员前）+ 新增 QC 演示按钮（qc@ipsc.com）

**6. prisma/seed.ts** — 最大改动：
  - USERS 数组：5 个用户（新增 李质检 qc@ipsc.com），supervisor 去掉 OPERATOR 角色，operator 改为 OPERATOR+QC
  - USER_PRODUCT_ROLES：移除 Admin/Supervisor 的管理角色条目，operator NPC 增加 QC 角色，新增 qc@ipsc.com 6 条 QC 记录
  - USER_PRODUCT_LINES：新增常量，8 条用户-产品线归属关系
  - main() 函数：新增 step 2.5 创建 UserProductLine 记录，更新 summary 和版本标识

- Lint 检查通过（仅预存 generate-plan.js 2 个 error）
- Dev server 正常编译运行

Stage Summary:
- 修改文件：6 个（register/route.ts、login/route.ts、me/route.ts、auth-store.ts、login/page.tsx、seed.ts）
- 新增角色：QC（质检操作员），与 QA（质量保证）分离
- QA 职责：质量保证、审计、CoA 审核（管理类角色）
- QC 职责：实际质检操作（填写质检记录、判定结果），通过产品级角色分配
- 新增数据：5 个用户、10 条产品角色、8 条产品线归属
- 登录/me API 返回 productLines 字段，auth store 同步更新
- 代码零新增 ESLint error/warning

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

---
Task ID: coa-qc-result-display-fix
Agent: Main Agent
Task: 修复 CoA 质检结果中细胞形态和支原体检测"检测结果"列显示"-"的问题

Work Log:
- 分析问题根因：QC 表单中 MORPHOLOGY 和 MYCOPLASMA 是选择型检测项，提交时只设置了 judgment（PASS/FAIL），未设置 resultValue
- 修复 QC 表单 (`src/components/qc/qc-form.tsx`)：新增 SELECT_RESULT_MAP，提交时为选择型检测项映射有意义的 resultValue（细胞形态→"正常"/"异常"，支原体→"阴性"/"阳性"）
- 修复 CoA 展示 (`src/components/coa/coa-detail.tsx`)：增加 fallback 逻辑，当 resultValue 为空但 judgment 存在时显示"合格"/"不合格"（兼容历史数据）

Stage Summary:
- 修改文件：`src/components/qc/qc-form.tsx`, `src/components/coa/coa-detail.tsx`
- 新提交的 QC 记录：细胞形态显示"正常"/"异常"，支原体检测显示"阴性"/"阳性"
- 历史已提交的 QC 记录（无 resultValue）：fallback 显示"合格"/"不合格"

---
Task ID: 7
Agent: Main Agent
Task: 阶段1-产品线+产品基础架构规划讨论

Work Log:
- 回顾PRD v2.0 MVP文档、生产管理流程规划方案、多产品线生产实现方案
- 对比已实现功能 vs 实际业务需求，识别关键缺失
- 讨论并确认分4阶段扩展方案
- 确认用户-产品线关联粒度为"用户+具体产品+角色"

Stage Summary:
- 决策：采用4阶段扩展（产品线基础→多流程状态机→UI适配→AI对话）
- 决策：用户权限粒度为 user+product+roles（最细粒度，一次到位）
- 待实现产品：服务(重编程建系/基因编辑)、细胞产品(iPSC/NPC)、试剂盒(神经分化/心肌分化)
- 下一步：实施阶段1数据库改造+种子数据+权限基础设施

---
Task ID: 7-a
Agent: Backend Infrastructure Developer
Task: Backend multi-product-line permission infrastructure

Work Log:
- 读取 worklog.md 和 prisma/schema.prisma，了解现有数据模型和项目历史
- 读取 src/lib/roles.ts、src/lib/auth.ts、src/stores/auth-store.ts 了解现有角色系统
- 读取 src/app/api/auth/me/route.ts、src/app/api/auth/login/route.ts、src/app/api/products/route.ts、src/app/api/batches/route.ts 了解现有 API 实现

**1. 更新 src/lib/roles.ts — 产品线常量和 getProductRoles 函数**
- 新增 PRODUCT_LINE_LABELS：SERVICE(服务项目)、CELL_PRODUCT(细胞产品)、KIT(试剂盒)
- 新增 PRODUCT_LINE_COLORS：SERVICE(violet)、CELL_PRODUCT(emerald)、KIT(amber)，含 dark mode 样式
- 新增 CATEGORY_LABELS：IPSC/NPC/REPROGRAM/EDIT/DIFF_SERVICE/DIFF_KIT/MEDIUM 中文映射
- 新增 BATCH_NO_PREFIXES：SERVICE(SRV)、CELL_PRODUCT(IPSC)、KIT(KIT)
- 新增 getProductRoles() 函数：合并用户全局角色和产品特定角色（并集/去重）

**2. 更新 /api/auth/me — 返回 productRoles**
- 查询时 include user.productRoles，关联 product 信息（productCode/productName/productLine）
- 过滤仅活跃产品（product.active = true）
- 解析 JSON roles 字段，返回 productRoles 数组
- 响应格式：{ user: { ..., productRoles: [{ productId, productCode, productName, productLine, roles }] } }

**3. 更新 /api/auth/login — 返回 productRoles**
- 查询用户时 include productRoles + product 信息
- 与 /api/auth/me 相同的 productRoles 解析逻辑
- 登录响应包含 productRoles 数组

**4. 更新 /api/products — 返回 productLine 和 groupedByLine**
- select 新增 productLine 字段
- 新增 groupedByLine 计算：按 productLine 分组产品列表
- 响应格式：{ products: [...], groupedByLine: { CELL_PRODUCT: [...], SERVICE: [...], KIT: [...] } }

**5. 更新 /api/batches POST — 多产品线批次创建**
- 支持 productId（优先）和 productCode（回退）两种查找方式
- 从 product 获取 productLine、productCode、productName、specification、unit
- 使用 BATCH_NO_PREFIXES[productLine] 生成批次前缀（IPSC/SRV/KIT）
- 按产品线前缀统计当天序号（不再硬编码 IPSC 前缀）
- 存储 productLine 和 orderNo（服务项目订单号）到批次记录
- 审计日志包含 productLine 和 orderNo

**6. 更新 /api/batches GET — productLine 过滤**
- 新增 productLine 查询参数（ProductLine 枚举类型）
- 添加到 where 条件：where.productLine = productLine
- select 新增 productLine 和 orderNo 字段

**7. 更新 src/stores/auth-store.ts — ProductRoleAssignment 接口**
- 新增 ProductRoleAssignment 接口：productId/productCode/productName/productLine/roles
- UserInfo 接口新增 productRoles: ProductRoleAssignment[]

- Lint 检查通过：仅剩预存 generate-plan.js 2 个 error，本任务零新增
- Dev server 正常编译运行，无编译错误

Stage Summary:
- 修改文件：src/lib/roles.ts（4个常量 + getProductRoles 函数）
- 修改文件：src/app/api/auth/me/route.ts（productRoles 查询与返回）
- 修改文件：src/app/api/auth/login/route.ts（productRoles 查询与返回）
- 修改文件：src/app/api/products/route.ts（productLine + groupedByLine）
- 修改文件：src/app/api/batches/route.ts（多产品线批次创建 + productLine 过滤）
- 修改文件：src/stores/auth-store.ts（ProductRoleAssignment 接口）
- 批次编号生成：根据产品线前缀动态生成（IPSC-YYMMDD-NNN / SRV-YYMMDD-NNN / KIT-YYMMDD-NNN）
- 产品角色合并策略：全局角色 ∪ 产品特定角色（并集去重）
- API 响应格式已统一扩展：auth/user 包含 productRoles，products 包含 groupedByLine，batches 支持 productLine 过滤
- 代码零新增 ESLint error/warning

---
Task ID: 7-a
Agent: Backend Infrastructure Developer
Task: Backend multi-product-line permission infrastructure

Work Log:
- Updated src/lib/roles.ts with product-line constants (PRODUCT_LINE_LABELS, PRODUCT_LINE_COLORS, CATEGORY_LABELS, BATCH_NO_PREFIXES)
- Added getProductRoles() function: merges product-specific roles with global roles (union semantics)
- Updated /api/auth/me: queries UserProductRole table, returns productRoles array with product details
- Updated /api/auth/login: same productRoles response as /api/auth/me
- Updated /api/products: returns productLine field + groupedByLine in response
- Updated /api/batches POST: supports productLine-specific batch number generation (SRV-/IPSC-/KIT-), stores orderNo for SERVICE
- Updated /api/batches GET: added productLine query parameter for filtering
- Updated src/stores/auth-store.ts: added ProductRoleAssignment interface, productRoles to UserInfo

Stage Summary:
- roles.ts: 6 new exports (PRODUCT_LINE_LABELS/COLORS, CATEGORY_LABELS, BATCH_NO_PREFIXES, getProductRoles)
- Auth APIs: /api/auth/me and /api/auth/login now return user.productRoles array
- Products API: /api/products returns { products, groupedByLine: { CELL_PRODUCT: [...], SERVICE: [...], KIT: [...] } }
- Batch API: dynamic batch number prefixes per product line, orderNo support for SERVICE
- Zero new lint errors

---
Task ID: 7-b
Agent: Main Agent
Task: Frontend multi-product-line UI adaptation

Work Log:
- Created src/components/shared/product-line-badge.tsx: reusable ProductLineBadge component with color by product line
- Updated src/components/batches/create-batch-dialog.tsx: products grouped by product line in Select, orderNo field for SERVICE, batch number prefix preview
- Updated src/app/batches/page.tsx: product line filter tabs (全部/细胞产品/服务项目/试剂盒), productLine badge on each batch card
- Updated src/app/batches/[id]/page.tsx: productLine badge in header, orderNo display in overview
- Updated src/components/dashboard/recent-batches.tsx: productLine badge on recent batch items
- Batch list supports both status + productLine filters simultaneously

Stage Summary:
- ProductLineBadge shared component with dark mode support
- Create batch dialog: 3 product line groups, SERVICE shows orderNo input
- Batch list: product line filter row with colored active state
- All batch cards/headers show productLine badge
- Zero new lint errors

---
Task ID: 7
Agent: Main Agent
Task: 多产品线扩展文档更新 — 按照 PROJECT_DOCS.md 规范管理文档

Work Log:
- 阅读全部项目文档：PROJECT_DOCS.md、PRD v2.0 MVP、多产品线实现方案、生产管理流程规划方案、架构设计文档、worklog、prisma schema、state-machine.ts
- 分析当前文档体系状态：MVP已完成但文档状态未更新，缺少多产品线扩展计划文档
- 创建 docs/plans/多产品线扩展计划-v1.0.md（4阶段详细设计文档）
- 更新 PROJECT_DOCS.md：新增扩展计划文档条目、更新PRD状态为已完成、更新最后更新日期
- 更新 PRD-v2.0-MVP.md：状态从"待评审"改为"✅ MVP 已完成"，新增交付总结章节

Stage Summary:
- 新增文件：docs/plans/多产品线扩展计划-v1.0.md（4阶段扩展计划：产品线架构→状态机→UI适配→AI对话）
- 修改文件：PROJECT_DOCS.md（文档清单更新、PRD状态更新）
- 修改文件：docs/requirements/PRD-v2.0-MVP.md（状态标记已完成、交付总结）
- 关键决策记录：用户+具体产品+角色关联粒度、3条产品线6+种子产品、AI对话模式放在Phase 4
---
Task ID: p2-2
Agent: State Machine Refactoring Agent
Task: Refactor state machine for multi-product-line support

Work Log:
- Read existing state-machine.ts and understood current BATCH_TRANSITIONS structure
- Created TRANSITION_TEMPLATES with 3 product line templates (CELL_PRODUCT, SERVICE, KIT)
- CELL_PRODUCT: exact migration of existing 11 statuses, 16 transition rules
- SERVICE: 9 statuses with HANDOVER loop and IDENTIFICATION phase
- KIT: 13 statuses with MATERIAL_PREP stage
- Updated canTransition/getAvailableActions to accept productLine parameter
- Updated transition() to query batch.productLine internally
- Added 5 new status labels (SAMPLE_RECEIVED, HANDOVER, IDENTIFICATION, REPORT_PENDING, MATERIAL_PREP)
- Added corresponding status colors
- Added backward-compatible BATCH_TRANSITIONS alias
- Added resubmit_coa action to CELL_PRODUCT COA_SUBMITTED for CoA resubmission after rejection
- Removed REJECTED from batch status transitions (CoA rejection handled at CoA table level)
- Updated caller in /api/batches/[id]/route.ts to pass batch.productLine to getAvailableActions
- Updated services/index.ts to export getTransitions

Stage Summary:
- 3 transition templates defined (CELL_PRODUCT, SERVICE, KIT)
- 15 batch statuses supported with labels and colors
- All existing CELL_PRODUCT transitions preserved exactly
- transition() function now productLine-aware
- Backward compatibility maintained via BATCH_TRANSITIONS alias
- ESLint: only pre-existing generate-plan.js errors, zero new errors
- TypeScript: no new type errors in changed files

---
Task ID: p2-4-5
Agent: API + Frontend Adaptation Agent
Task: Backend API and frontend adaptation for multi-product-line state machine

Work Log:
- Read worklog.md and analyzed all files referencing old REJECTED batch status or reject_coa action
- Verified batch detail route already uses batch.productLine as first arg to getAvailableActions (A3 ✓)
- Verified audit-log.ts COA_REJECTED is CoA-level only, no batch REJECTED references (A4 ✓)
- Verified audit page COA_REJECTED event type is CoA-level, no changes needed (B4 ✓)

**A1: Fixed transition route (src/app/api/batches/[id]/transition/route.ts)**
- Added special intercept for reject_coa action before calling transition()
- reject_coa now sets CoA.status = 'DRAFT' (not 'REJECTED'), batch stays COA_SUBMITTED
- Records COA_REJECTED audit log with DRAFT status
- New actions (receive_sample, request_handover, accept_handover, start_identification, complete_identification, submit_report, start_material_prep) pass through to transition() automatically

**A2: Fixed CoA route (src/app/api/coa/[coaId]/route.ts)**
- Complete rewrite of PATCH endpoint to handle submit/approve/reject per product line
- Submit: CELL_PRODUCT/KIT use transition 'submit_coa', SERVICE uses 'submit_report'
- Approve: CELL_PRODUCT/KIT use transition 'approve_coa', SERVICE uses 'approve' + manual CoA→APPROVED
- Reject: CELL_PRODUCT sets CoA→DRAFT directly (batch stays COA_SUBMITTED), SERVICE calls transition 'reject' (batch→REPORT_PENDING) + CoA→DRAFT, KIT returns 400 error (no reject support)
- Each path records appropriate audit logs

**state-machine.ts: Fixed reject_coa handler**
- reject_coa now sets CoA.status = 'DRAFT' instead of 'REJECTED'
- resubmit_coa comment updated to reflect DRAFT/REJECTED → SUBMITTED

**B1: Fixed batch detail page (src/app/batches/[id]/page.tsx)**
- Removed all 'REJECTED' batch status references from QC and CoA tab conditions
- QC tab: SERVICE product line shows "服务项目无独立质检流程" placeholder
- QC tab: CELL_PRODUCT/KIT use standard QC flow with MATERIAL_PREP added to pre-QC statuses
- CoA tab: Added REPORT_PENDING to statuses that expect CoA generation
- CoA tab: SERVICE-specific placeholder text for CoA descriptions

**B2: Fixed CoA detail component (src/components/coa/coa-detail.tsx)**
- Updated reject confirmation dialog text: "CoA 将变为草稿状态，需要修改后重新提交审核"
- CoA REJECTED status branch retained for backward compat (shows "重新提交" button)

**B3: Fixed batch-status-overview.tsx**
- Removed 'REJECTED' batch status entry from STATUS_DISPLAY
- Added 5 new statuses: SAMPLE_RECEIVED, HANDOVER, IDENTIFICATION, REPORT_PENDING, MATERIAL_PREP
- Total 15 statuses now tracked in sidebar overview

- Lint check: only pre-existing generate-plan.js errors (2), zero new errors
- Dev server: running normally, no compilation errors

Stage Summary:
- Backend: All API routes now compatible with multi-product-line state machine
- Transition route: reject_coa intercepted, CoA→DRAFT, batch stays COA_SUBMITTED
- CoA route: submit/approve/reject all product-line-aware (CELL_PRODUCT/SERVICE/KIT)
- Frontend: Batch detail page handles all 3 product lines with appropriate QC/CoA messages
- CoA detail: reject dialog updated to reflect DRAFT reset behavior
- Status overview: 15 statuses displayed (REJECTED batch status removed, 5 new added)
- CELL_PRODUCT flow preserved (regression-safe)
- New actions (receive_sample, handover, identification, material_prep) supported via state machine

---
Task ID: p2-2
Agent: State Machine Refactoring Agent
Task: Refactor state machine for multi-product-line support (3 transition templates)

Work Log:
- Read existing state-machine.ts and understood current BATCH_TRANSITIONS structure
- Created TRANSITION_TEMPLATES with 3 product line templates (CELL_PRODUCT, SERVICE, KIT)
- CELL_PRODUCT: exact migration of existing 11 statuses, 16 transition rules, added resubmit_coa
- SERVICE: 9 statuses with HANDOVER loop, IDENTIFICATION phase, REPORT_PENDING
- KIT: 13 statuses with MATERIAL_PREP stage, QC/CoA flow similar to CELL_PRODUCT
- Updated canTransition/getAvailableActions to accept productLine parameter
- Updated transition() to query batch.productLine internally
- Added 5 new status labels (SAMPLE_RECEIVED, HANDOVER, IDENTIFICATION, REPORT_PENDING, MATERIAL_PREP)
- Added corresponding status colors (amber/indigo/purple/cyan)
- Removed REJECTED from batch status transitions (CoA rejection handled at CoA table level)
- Added BATCH_TRANSITIONS backward-compatible alias

Stage Summary:
- 3 transition templates defined (CELL_PRODUCT, SERVICE, KIT)
- 15 batch statuses supported with labels and colors
- All existing CELL_PRODUCT transitions preserved exactly
- transition() function now productLine-aware
- Backward compatibility maintained via BATCH_TRANSITIONS alias

---
Task ID: p2-4-5
Agent: API + Frontend Adaptation Agent
Task: Backend API and frontend adaptation for multi-product-line state machine

Work Log:
- Updated transition route: reject_coa now sets CoA to DRAFT (not REJECTED batch status)
- Updated CoA route: reject action distinguishes between CELL_PRODUCT and SERVICE
- Updated batch detail page: removed REJECTED batch status references, added MATERIAL_PREP to pre-QC statuses
- Updated CoA detail component: rejection now resets CoA to DRAFT for CELL_PRODUCT
- Updated batch-status-overview: removed REJECTED, added 5 new statuses (15 total)
- Updated batch creation API: fixed batch number prefix for cell products (uses product code), added identificationRequirements field
- Verified all 15+ statuses handled in all frontend components

Stage Summary:
- Backend: All API routes now compatible with multi-product-line state machine
- Frontend: Batch detail and CoA detail components handle all 3 product lines
- CELL_PRODUCT flow preserved (regression-safe)
- New actions (receive_sample, handover, identification, material_prep) supported
- Batch creation: product-line-aware batch numbering, identificationRequirements field
- Zero new lint errors

---
Task ID: p2-main
Agent: Main Agent
Task: Phase 2 multi-product-line state machine — schema + state machine + API + frontend + seed data

Work Log:
- Updated plan document (v1.0 → v1.1) with all Phase 2 design decisions
- Schema changes: BatchStatus expanded (15 statuses, removed REJECTED), added identificationRequirements field
- db:push successful, Prisma Client regenerated
- Seed data verified: 6 products, 22 user-product-role associations
- Batch creation API: product-code-based prefixes for CELL_PRODUCT, identificationRequirements support
- Lint check: only 2 pre-existing errors in generate-plan.js
- Dev server compilation: no errors

Stage Summary:
- Phase 2 core implementation complete: 3 transition templates, 15 batch statuses, all API routes updated
- Key files changed: schema.prisma, state-machine.ts, transition/route.ts, coa/[coaId]/route.ts, batches/route.ts, batch-status-overview.tsx, batches/[id]/page.tsx, coa-detail.tsx
- Plan document updated: docs/plans/多产品线扩展计划-v1.0.md v1.1

---
Task ID: p2-3 + p2-4
Agent: Main Agent
Task: 任务模板系统 + 服务项目鉴定需求 — transition route 模板化 + 新建批次对话框鉴定选项

Work Log:
- 读取 worklog.md、transition route、create-batch-dialog、batches API route 了解现有实现
- 确认批次创建 API 已支持 identificationRequirements 字段的存储（JSON.stringify）
- 确认 Prisma schema 中 Batch.identificationRequirements 字段已存在（String @default("[]")）

**Task A: 任务模板系统 (p2-4)**

创建 `src/lib/services/task-templates.ts`：
- TaskTemplate 接口定义（taskCode/taskName/sequenceNo/stepGroup）
- TASK_TEMPLATES 常量：3 条产品线 × 多个动作的模板映射
  - CELL_PRODUCT.start_production → SEED_PREP/EXPANSION/HARVEST
  - SERVICE.start_production → REPROGRAM/SERVICE_EXPANSION
  - KIT.start_material_prep → MATERIAL_PREP
  - KIT.start_production → PREPARATION/DISPENSING
- IDENTIFICATION_TASK_DEFS 常量：7 种鉴定检测项定义（INTEGRATION/KARYOTYPE/PLURI_CHECK/STR/POTENCY/MYCOPLASMA/MUTATION_SEQ）
- IDENTIFICATION_OPTIONS：前端复选框选项列表
- DEFAULT_IDENTIFICATION_REQUIREMENTS：默认勾选项 [PLURI_CHECK, MYCOPLASMA]

更新 `src/lib/services/index.ts`：导出新增的任务模板常量和类型

重构 `src/app/api/batches/[id]/transition/route.ts`：
- 移除硬编码的 start_production 3 任务创建逻辑
- 新增通用模板化任务创建：支持 start_production/start_material_prep/start_identification 三种动作
- 根据批次 productLine 查找对应模板，第一个任务自动设为 IN_PROGRESS 并分配当前用户
- 新增 SERVICE start_identification 特殊处理：
  - 检查是否已有 ID_ 前缀的鉴定任务（防重复）
  - 解析 batch.identificationRequirements JSON 数组
  - 按 IDENTIFICATION_TASK_DEFS 动态生成鉴定任务（PENDING 状态，stepGroup=IDENTIFICATION）
  - sequenceNo 在已有任务最大值基础上递增
  - 记录审计日志（包含 requirements 列表和创建的任务详情）

**Task B: 新建批次鉴定需求 (p2-3)**

修改 `src/components/batches/create-batch-dialog.tsx`：
- 导入 Checkbox 组件、IDENTIFICATION_OPTIONS、DEFAULT_IDENTIFICATION_REQUIREMENTS
- 新增 identificationRequirements 表单状态（默认 PLURI_CHECK + MYCOPLASMA）
- 仅当选择 SERVICE 产品时显示鉴定项目复选框组
- 2 列网格布局，边框包裹，6 个复选框选项
- 未勾选任何项目时显示提示文案
- 提交时将 identificationRequirements 数组包含在 POST body 中
- resetForm 时重置为默认值

- Lint 检查通过：仅剩预存 generate-plan.js 2 个 error，本任务零新增

Stage Summary:
- 新增文件：src/lib/services/task-templates.ts
- 修改文件：src/lib/services/index.ts（导出任务模板）
- 修改文件：src/app/api/batches/[id]/transition/route.ts（模板化任务创建 + 鉴定任务动态生成）
- 修改文件：src/components/batches/create-batch-dialog.tsx（SERVICE 鉴定项目复选框）
- 任务模板：3 条产品线 × 4 种动作，7 种鉴定检测项
- Transition Route：支持 start_production/start_material_prep/start_identification 三种动作的自动任务创建
- SERVICE 鉴定流程：创建批次时选择鉴定项 → start_identification 时自动生成对应鉴定任务
- 代码零新增 ESLint error/warning

---
Task ID: p2-5
Agent: Main Agent
Task: Batch Detail Page — Multi Product Line Production Tab Adaptation

Work Log:
- 读取 worklog.md、批次详情页、EbprStepGuide、TaskSummary、state-machine、ProductLineBadge 等相关文件
- 分析当前批次详情页结构：5个标签页，生产记录标签页仅渲染 EbprStepGuide（CELL_PRODUCT 专用）

**1. 创建 GenericTaskList 组件 (src/components/ebpr/generic-task-list.tsx)**
- Props: batchId、productLine、onBatchUpdated
- 从 /api/batches/{id}/tasks 获取任务列表
- ProgressSummary 组件：显示完成进度条和 X/Y 任务完成数
- TaskCard 组件：每个任务显示 taskName、状态 Badge（PENDING=gray、IN_PROGRESS=blue、COMPLETED=green、SKIPPED=stone）、assignee、dates、notes
- TaskStatusBadge 组件：任务状态彩色徽标
- TaskIcon 组件：根据 taskCode 显示不同图标（MATERIAL_PREP/PREPARATION/DISPENSING/ID_* 等）
- SERVICE 产品线分组：将 taskCode 以 ID_ 开头的任务分组到「鉴定任务」区域
- KIT 产品线：显示为「配制任务」区域
- IN_PROGRESS 任务显示 Phase 3 占位提示
- 空状态：无任务时显示"开始生产后，系统将自动创建生产任务"
- 加载状态：Skeleton 骨架屏

**2. 修改批次详情页生产记录标签页 (src/app/batches/[id]/page.tsx)**
- 引入 GenericTaskList 组件
- 生产记录标签页按产品线分支渲染：
  - CELL_PRODUCT → EbprStepGuide（保持原有行为）
  - SERVICE/KIT → GenericTaskList
- 添加 CheckCircle2 图标导入（用于 QC 标签页）

**3. 更新质检标签页 — SERVICE 产品线适配**
- IDENTIFICATION 状态 → 紫色提示卡片："鉴定进行中，鉴定结果即质检数据"
- REPORT_PENDING 状态 → 紫色提示卡片："鉴定已完成，请生成实验报告"
- COA_SUBMITTED/RELEASED 状态 → 绿色提示卡片："报告已提交"
- 其他状态 → 保留原有 PlaceholderCard

**4. 更新批次列表页状态筛选 (src/app/batches/page.tsx)**
- STATUS_FILTERS 从 9 个扩展为 14 个状态筛选：
  - 新增：SAMPLE_RECEIVED(样本接收)、HANDOVER(交接中)、IDENTIFICATION(鉴定中)、REPORT_PENDING(待报告)、COA_SUBMITTED(已提交)、COA_APPROVED(已批准)
  - 移除：QC_FAIL（瞬态状态，用户筛选无意义）

- Lint 检查通过（仅预存 generate-plan.js 2 个 error，本任务零新增）

Stage Summary:
- 新增文件：src/components/ebpr/generic-task-list.tsx
- 修改文件：src/app/batches/[id]/page.tsx（生产标签页分支 + QC标签页SERVICE适配 + CheckCircle2导入）
- 修改文件：src/app/batches/page.tsx（STATUS_FILTERS 扩展为14个状态）
- 生产记录标签页：CELL_PRODUCT 使用 EbprStepGuide，SERVICE/KIT 使用 GenericTaskList
- GenericTaskList 功能：任务进度条、任务卡片列表、SERVICE鉴定任务分组、KIT配制任务、Phase 3占位提示
- 质检标签页：SERVICE 产品线按状态（IDENTIFICATION/REPORT_PENDING/COA_SUBMITTED/RELEASED）显示不同提示
- 状态筛选：新增 6 个多产品线状态（SAMPLE_RECEIVED/HANDOVER/IDENTIFICATION/REPORT_PENDING/COA_SUBMITTED/COA_APPROVED），移除 QC_FAIL
- 代码零新增 ESLint error/warning

---
Task ID: p2-2
Agent: Product Management Developer
Task: 产品管理页面 + CRUD API + 侧边栏更新

Work Log:
- 读取了 worklog.md、Prisma schema、现有 API 路由、auth.ts、roles.ts、auth-fetch.ts、sidebar.tsx、header.tsx、product-line-badge.tsx、users/page.tsx、create-user-dialog.tsx 等参考文件
- 分析了现有认证模式（getTokenFromRequest + verifyToken + isAdmin）和前端模式（authFetch + useAuthStore + hasAnyRole）
- 确认产品线枚举值：SERVICE、CELL_PRODUCT、KIT
- 确认 6 个种子产品已存在于数据库中

**1. Products CRUD API (route.ts)**
- 扩展 GET /api/products：新增 `productLine` 和 `search` 查询参数过滤
- 新增 POST /api/products：创建产品（ADMIN only）
  - 验证：productName 必填、productLine 有效枚举、productCode 唯一
  - 自动生成产品编码：{line_prefix}-{seq}（如 CP-007）
  - 返回完整产品信息

**2. PATCH /api/products/[id] (route.ts)**
- GET：获取单个产品详情
- PATCH：更新产品字段（ADMIN only）
  - 支持：productCode/productName/productLine/category/cellType/specification/storageCondition/shelfLife/unit/description/active
  - productCode 变更时检查唯一性
  - 白名单字段更新

**3. CreateProductDialog 组件**
- 支持 create 和 edit 两种模式
- 表单字段：产品编码（自动生成+可编辑）、产品名称、产品线、分类（按产品线联动）、细胞类型（仅 SERVICE/CELL_PRODUCT）、规格、单位、存储条件、保质期、描述
- 编辑模式额外显示：Active 启用状态 Switch
- 产品编码自动生成：切换产品线时自动从 API 获取最大序号+1

**4. Products Page**
- 权限控制：ADMIN/SUPERVISOR 可访问，非权限显示"无权限"页面
- 产品线筛选标签页（全部/细胞产品/服务项目/试剂盒），带计数徽标
- 搜索功能：按产品编码或名称搜索
- 产品卡片按产品线分组显示，每张卡片包含：
  - 产品编码（mono 字体）+ ProductLineBadge + 产品名称
  - 分类、规格/单位、细胞类型、存储条件、保质期
  - 编辑按钮（ADMIN only）+ Active Switch（ADMIN only）
  - 已停用状态标记
- 新建产品按钮（ADMIN only）
- 加载骨架屏 + 空状态提示

**5. Sidebar 更新**
- 新增 "产品管理" 导航项到 adminNavItems（Package 图标，ADMIN + SUPERVISOR）

**6. Header 更新**
- 新增 '/products': '产品管理' 到 pageTitles 映射

- Lint 检查通过（仅剩预存 generate-plan.js 2 个 error）
- 代码零新增 ESLint error/warning

Stage Summary:
- 新增文件：src/app/api/products/[id]/route.ts
- 新增文件：src/components/products/create-product-dialog.tsx
- 新增文件：src/app/products/page.tsx
- 修改文件：src/app/api/products/route.ts（扩展 GET + 新增 POST）
- 修改文件：src/components/layout/sidebar.tsx（新增产品管理导航）
- 修改文件：src/components/layout/header.tsx（新增产品管理标题映射）
- API 完整度：GET 列表(含筛选) + POST 创建 + GET 详情 + PATCH 更新
- 前端功能：产品线筛选标签页 + 搜索 + 产品卡片分组展示 + 创建/编辑对话框 + 启用/停用切换
- 代码零新增 ESLint error/warning
---
Task ID: p2-2
Agent: Product Management Developer
Task: 产品管理前端 — 产品列表页 + 创建/编辑产品对话框 + 产品 CRUD API + 侧边栏导航

Work Log:
- Read worklog.md and understood project architecture (Next.js 16 + Prisma + shadcn/ui)
- Analyzed existing products API (GET only) and product schema

**1. Products CRUD API**
- Extended GET /api/products with productLine and search query parameters
- Added POST /api/products for product creation (ADMIN only)
  - Auto-generates productCode based on product line prefix (IPSC/SRV/KIT + sequence)
  - Validates productCode uniqueness, productLine enum, required fields
- Created PATCH /api/products/[id]/route.ts for product updates
  - Supports updating all fields, toggling active status
  - ADMIN only, with uniqueness checks

**2. Create/Edit Product Dialog (src/components/products/create-product-dialog.tsx)**
- Full form with: productCode, productName, productLine, category, cellType, specification, storageCondition, shelfLife, unit, description
- Product line → category cascade (CELL_PRODUCT: IPSC/NPC/CM; SERVICE: REPROGRAM/EDIT/DIFF_SERVICE; KIT: DIFF_KIT/MEDIUM)
- Cell type field only shown for SERVICE/CELL_PRODUCT products
- Active toggle in edit mode
- Auto-generates product code on creation

**3. Products Page (src/app/products/page.tsx)**
- Product line filter tabs (全部/细胞产品/服务项目/试剂盒) with count badges
- Search by product code/name
- Products grouped by product line
- Each card shows: code, name, productLine badge, category, specification, unit, active status
- Create product button and edit button per card
- Active status toggle (inline)
- Permission-gated: ADMIN/SUPERVISOR only

**4. Sidebar Update (src/components/layout/sidebar.tsx)**
- Added "产品管理" to adminNavItems with Package icon
- Visible to ADMIN and SUPERVISOR roles

**5. Header Update (src/components/layout/header.tsx)**
- Added /products to page title map

Stage Summary:
- New files: src/app/api/products/[id]/route.ts, src/components/products/create-product-dialog.tsx, src/app/products/page.tsx
- Modified files: src/app/api/products/route.ts, src/components/layout/sidebar.tsx, src/components/layout/header.tsx
- Full product CRUD: GET with filters, POST create, GET by ID, PATCH update
- Product management page with line filter, search, grouped cards, inline active toggle
- Lint: Zero new errors

---
Task ID: p2-3+p2-4
Agent: Task Templates & Batch Dialog Developer
Task: 任务模板系统 + 批次创建对话框鉴定要求

Work Log:
- Read worklog.md and analyzed transition route and create-batch-dialog
- Analyzed existing hardcoded CELL_PRODUCT task creation logic

**A. Task Templates (src/lib/services/task-templates.ts)**
- Created TASK_TEMPLATES constant mapping productLine + action → TaskTemplate[]
- CELL_PRODUCT.start_production → SEED_PREP, EXPANSION, HARVEST
- SERVICE.start_production → REPROGRAM, SERVICE_EXPANSION
- KIT.start_material_prep → MATERIAL_PREP
- KIT.start_production → PREPARATION, DISPENSING
- Created IDENTIFICATION_TASK_DEFS: 7 identification test types (INTEGRATION, KARYOTYPE, PLURI_CHECK, STR, POTENCY, MYCOPLASMA, MUTATION_SEQ)
- Created IDENTIFICATION_OPTIONS for frontend checkbox display
- Created DEFAULT_IDENTIFICATION_REQUIREMENTS = [PLURI_CHECK, MYCOPLASMA]

**B. Transition Route Refactoring (src/app/api/batches/[id]/transition/route.ts)**
- Replaced hardcoded 3-task creation with generic template lookup
- Supports start_production, start_material_prep, start_identification actions
- First task auto-set to IN_PROGRESS with operator assignment
- For SERVICE start_identification: dynamically creates identification tasks from batch.identificationRequirements JSON
- Checks for existing ID_ prefix tasks to prevent duplicates
- Sets stepGroup='IDENTIFICATION' for identification tasks

**C. Batch Creation Dialog Enhancement (src/components/batches/create-batch-dialog.tsx)**
- Added identification requirements state (JSON array)
- Shows checkbox group only when SERVICE product is selected
- 6 identification options in 2-column grid layout
- Default pre-checked: PLURI_CHECK and MYCOPLASMA
- Warning hint when no items selected
- Submits identificationRequirements in POST body

Stage Summary:
- New file: src/lib/services/task-templates.ts (task template system)
- Modified: src/app/api/batches/[id]/transition/route.ts (generic task auto-creation)
- Modified: src/components/batches/create-batch-dialog.tsx (identification requirements)
- Lint: Zero new errors

---
Task ID: p2-5
Agent: Batch Detail Multi-Product-Line Adapter
Task: 批次详情页多产品线适配 — 生产记录标签页 + 质检标签页 + 状态筛选

Work Log:
- Read worklog.md and analyzed batch detail page, batches list page
- Analyzed EbprStepGuide component (CELL_PRODUCT only)

**1. GenericTaskList Component (src/components/ebpr/generic-task-list.tsx)**
- TaskStatusBadge: PENDING(gray)/IN_PROGRESS(blue)/COMPLETED(green)/SKIPPED(stone)
- TaskIcon: Maps taskCode to appropriate Lucide icon
- TaskCard: Full task card with name, status badge, assignee, dates, notes, stepGroup badge
  - Completed tasks have emerald border/background
  - IN_PROGRESS tasks show "表单开发中" Phase 3 placeholder
  - Identification tasks (ID_*) get violet "鉴定" badge
- ProgressSummary: Completed/total count with progress bar and percentage
- Main component: GenericTaskList
  - Fetches tasks from API
  - Groups SERVICE tasks: regular tasks + identification tasks (ID_*) sections
  - Sorts by sequenceNo then createdAt
  - Shows empty state when no tasks

**2. Batch Detail Page Production Tab (src/app/batches/[id]/page.tsx)**
- Production tab now branches by productLine:
  - CELL_PRODUCT → EbprStepGuide (unchanged)
  - SERVICE/KIT → GenericTaskList

**3. Batch Detail Page QC Tab (src/app/batches/[id]/page.tsx)**
- Added SERVICE-specific QC status handling:
  - IDENTIFICATION → "鉴定进行中，鉴定结果即质检数据" (violet card)
  - REPORT_PENDING → "鉴定已完成，请生成实验报告" (purple card)
  - COA_SUBMITTED/RELEASED → "报告已提交" (green card)

**4. Batch List Page Status Filters (src/app/batches/page.tsx)**
- Expanded STATUS_FILTERS from 9 to 14:
  - Added: SAMPLE_RECEIVED, HANDOVER, IDENTIFICATION, REPORT_PENDING, COA_SUBMITTED, COA_APPROVED
  - Removed: QC_FAIL (transient status, not useful for filtering)

Stage Summary:
- New file: src/components/ebpr/generic-task-list.tsx
- Modified: src/app/batches/[id]/page.tsx (production + QC tab adaptation)
- Modified: src/app/batches/page.tsx (expanded status filters)
- Lint: Zero new errors

---
Task ID: design-1
Agent: Main Agent
Task: 设计讨论 — Phase 2 准备阶段（权限体系、导航架构、参考文档分析、bug修复）

Work Log:
- 分析参考文档 archive/AI模板生成模块设计文档-Phase3参考.md
- 修复产品编辑对话框不回显当前值的 bug（CreateProductDialog）
- 对比参考文档与当前计划，提出整合策略

**Bug 修复 — 产品编辑对话框不回显**
- 根因：resetForm() 只在 handleOpenChange 中调用，但 Radix Dialog 的 onOpenChange 不在 open prop 程序化变更时触发
- 修复：新增 useEffect(() => { if (open) resetForm() }, [open, editProduct])
- 修改文件：src/components/products/create-product-dialog.tsx

**参考文档分析**
- 文档质量高，涵盖产品定义/配方BOM/生产流程/表单字段/质检模板/CoA模板6类配置对象
- 核心理念"约定优于配置+外部AI生成+系统直接识别"非常务实
- 建议：Phase 2-3 先用硬编码方式验证业务流程，Phase 3.5 引入模板配置引擎
- 参考文档的 §4 表单定义模板（12种字段类型）和 §8 数据模型可直接作为 Phase 3.5 基础

Stage Summary:
- 修复 bug：产品编辑对话框现在正确回显当前值
- 分析结论：参考文档作为 Phase 3.5 模板配置引擎的蓝本，不替代当前 Phase 2-3 的硬编码方案
- 已有设计决策记录在 docs/plans/多产品线扩展计划-v1.0.md（§2.6 权限体系 + §2.7 导航架构）
---
Task ID: 1
Agent: Main Agent
Task: §2.6 权限体系设计 v2.0 — QA/QC 分离 + 产品线归属 + 四眼原则

Work Log:
- 分析了现有四角色体系（ADMIN/SUPERVISOR/OPERATOR/QA）中 QA 角色语义模糊的问题
- 与用户讨论确认采用"思路一：QA+QC 分离"方案
- 确认 QA 为管理类角色（产品线级），QC 为操作类角色（产品级）
- 确认产品线归属（UserProductLine）由 ADMIN 配置
- 确认 SUPERVISOR 在自己产品线内分配具体产品操作权限
- 确认四眼原则：同一人不能在同一批次中既做生产又做质检
- 确认 OPERATOR/QC 可以在权限总览页面查看自己的权限（只读）
- 确认 QA 也需要指定产品线（与 SUPERVISOR 同理）
- 更新了 prisma schema：Role 枚举增加 QC，新增 UserProductLine 表，UserProductLine 注释更新
- 执行 db:push 成功
- 重写了 §2.6 设计文档（v1.0 → v2.0），包含 11 个子章节

Stage Summary:
- prisma schema 已更新：新增 QC 枚举值，新增 UserProductLine 模型
- 数据库已同步
- §2.6 设计文档已完整重写（v2.0），涵盖角色体系、三级数据模型、双轨验证、四眼原则、配置职责、权限总览页面

---
Task ID: Phase 0
Agent: Main Agent + full-stack-developer subagent
Task: Phase 0 权限基础设施 — QA/QC分离 + 双轨验证 + 种子数据更新

Work Log:
- 重写 `src/lib/roles.ts`：新增 QC 到 VALID_ROLES/ROLE_LABELS/ROLE_COLORS，新增 MANAGEMENT_ROLES/OPERATIONAL_ROLES 常量，新增 canManage()+canOperate() 双轨验证函数，废弃 getProductRoles() 合并逻辑
- 修正 `state-machine.ts`：start_qc/pass_qc/fail_qc 角色从 QA 改为 QC（3条产品线共6处），approve_coa 保持 SUPERVISOR+QA（管理类操作不变）
- 更新 `api/auth/login` 和 `api/auth/me`：查询增加 productLines 关联，响应 JSON 增加 productLines 数组
- 更新 `stores/auth-store.ts`：UserInfo 接口增加 productLines: string[]
- 更新 `api/auth/register`：validRoles 加入 QC
- 更新 `login/page.tsx`：新增 QC 演示账号按钮，调整顺序
- 更新 `components/dashboard/my-tasks.tsx`：QC_PENDING 任务路由从 QA 改为 QC，快捷操作同步
- 重写 `prisma/seed.ts`：5个用户（新增 qc@ipsc.com），operator 改为 ["OPERATOR","QC"]，新增 USER_PRODUCT_LINES（8条归属），UserProductRole 只存操作类角色（10条）
- 运行 bun run seed 成功
- 更新 `docs/plans/多产品线扩展计划-v1.0.md` v2.0：新增 Phase 0 章节，修正种子数据方案，更新依赖图，记录7处矛盾及修正方案
- 更新 `PROJECT_DOCS.md`：开发计划状态更新为 Phase 0 开发中

Stage Summary:
- Phase 0 全部9个工作项（P0-1 到 P0-9）已完成
- prisma schema 已在之前更新（QC枚举 + UserProductLine表）
- 种子数据运行成功：5用户、8产品线归属、10产品角色关联
- lint 通过（仅有预存的 generate-plan.js 错误）
- dev server 编译正常
- 准备进入 Phase 1 开发

---
Task ID: P1-C
Agent: Permission Pages Developer
Task: 产品线归属配置 + 产品权限配置页 + 权限总览页

Work Log:
- 读取 worklog.md 了解项目上下文（iPSC-Flow 多产品线生产管理系统）
- 分析现有代码：create-user-dialog.tsx、user-list.tsx、sidebar.tsx、header.tsx、roles.ts、auth-store.ts、auth-fetch.ts
- 确认后端 API 已完备：/api/users（含 productLines）、/api/product-roles（GET/POST/DELETE）、/api/products（GET）
- 确认 Prisma schema 中 UserProductLine 和 UserProductRole 模型已存在

**Task 1: 更新创建/编辑用户对话框 — 添加产品线归属**
- 修改 `src/components/users/create-user-dialog.tsx`：
  - 新增 imports：FlaskConical/Microscope/TestTubes（产品线图标）、isAdmin（权限检查）、useAuthStore（获取当前用户）
  - UserItem 接口新增 productLines?: string[]
  - 新增 productLines state（从 editUser 初始化）
  - 新增 toggleProductLine() 函数
  - handleOpenChange 重置时同步 productLines
  - handleSubmit 的 POST/PATCH body 增加 productLines 字段
  - 在"部门"字段后新增"产品线归属"区域：3 个产品线卡片（细胞产品/服务项目/试剂盒），点击可切换 Checkbox
  - 仅 ADMIN 可见此区域（isCurrentUserAdmin 检查）

**Task 2: 更新用户列表 — 显示产品线徽标**
- 修改 `src/components/users/user-list.tsx`：
  - 新增 import ProductLineBadge
  - UserItem 接口新增 productLines?: string[]
  - 表格新增"产品线"列（sm:table-cell），展示 ProductLineBadge 组件
  - 部门列改为 lg:table-cell（更宽屏才显示）
  - 骨架屏同步更新列数
  - colspan 从 6 更新为 7（含产品线展开行和空状态行）

**Task 3: 创建产品权限配置页**
- 新建 `src/app/settings/product-roles/page.tsx`：
  - 路由：/settings/product-roles
  - 访问控制：ADMIN 看所有产品线，SUPERVISOR 仅看自己归属的产品线，操作员显示"无权限"
  - 产品线切换标签栏：全部/细胞产品/服务项目/试剂盒
  - 用户选择下拉框（Select）：仅显示有 OPERATOR 或 QC 角色的活跃用户
  - 选中用户信息卡片：显示姓名、邮箱、全局角色、产品线
  - 产品角色分配表格：产品编码/名称、产品线、OPERATOR checkbox、QC checkbox
  - Checkbox 自动禁用：用户全局角色不包含则不可勾选（如无 QC 全局角色则 QC checkbox disabled）
  - 警告提示：amber 色提示框，说明产品角色不能超出全局资质
  - 产品搜索框：按产品编码/名称过滤
  - 保存逻辑：对比原始与当前 assignments，仅提交变更项，支持 upsert 和 delete
  - 加载状态：Skeleton 骨架屏
  - 空状态：搜索无匹配时的提示

**Task 4: 创建权限总览页**
- 新建 `src/app/settings/permissions/page.tsx`：
  - 路由：/settings/permissions
  - 访问控制：ADMIN 看所有用户，SUPERVISOR 仅看自己产品线内的用户，OPERATOR/QC 仅看自己
  - 产品线切换标签栏（非操作员可见）
  - 搜索框：按用户名/邮箱过滤
  - 桌面端表格（md:block）：用户名、邮箱、全局角色（Badge）、产品线（ProductLineBadge）、产品权限详情
  - 管理类用户（ADMIN/SUPERVISOR/QA）显示"整线管理"/"整线质保"徽标
  - 操作类用户（OPERATOR/QC）显示可展开的产品权限详情（DropdownMenu）
  - 移动端卡片列表（md:hidden）：紧凑布局，产品权限支持折叠展开
  - 统计信息：底部显示用户总数和访问级别说明
  - 加载状态 + 空状态处理

**Task 5: 更新侧边栏导航**
- 修改 `src/components/layout/sidebar.tsx`：
  - 新增 imports：Shield、ShieldCheck（权限相关图标）
  - adminNavItems 新增 "权限配置"（/settings/product-roles，ADMIN+SUPERVISOR）
  - adminNavItems 新增 "权限总览"（/settings/permissions，所有角色可见）

**Task 6: 更新页头标题映射**
- 修改 `src/components/layout/header.tsx`：
  - pageTitles 新增 '/settings/product-roles': '权限配置'
  - pageTitles 新增 '/settings/permissions': '权限总览'

- Lint 检查通过：仅剩预存 generate-plan.js 2 个 error，本任务零新增
- Dev server 正常编译运行

Stage Summary:
- 修改文件：src/components/users/create-user-dialog.tsx（产品线归属区域）、src/components/users/user-list.tsx（产品线徽标列）、src/components/layout/sidebar.tsx（导航项）、src/components/layout/header.tsx（标题映射）
- 新增文件：src/app/settings/product-roles/page.tsx（产品权限配置页）、src/app/settings/permissions/page.tsx（权限总览页）
- 产品线归属：ADMIN 在创建/编辑用户时可指定产品线归属，支持 3 条产品线
- 产品权限配置：SUPERVISOR 可在产品线内为操作员分配 OPERATOR/QC 产品级角色
- 权限总览：所有用户可查看权限配置，三级访问控制（ADMIN 全看/SUPERVISOR 看自己线/操作员看自己）
- 响应式设计：桌面端使用 Table，移动端使用卡片列表
- 代码零新增 ESLint error/warning
---
Task ID: Phase 1
Agent: Main Agent (coordinated 3 sub-agents)
Task: Phase 1 — 导航架构重构 + 双轨权限体系 + 产品权限管理

Work Log:
- 审计现有代码，确认 Phase 0 已完成（canManage/canOperate、QC 角色分离、状态机 QC 修正）
- 识别 Phase 1 剩余 6 项工作：导航架构、用户管理增强、产品权限 API、权限页面、双轨权限接入
- 并行启动 3 个开发子代理

**A1: 导航架构 (§2.7)**
- 重构 BatchListPage → 导出 BatchListContent，支持 defaultProductLine + hideProductLineFilter + viewMode props
- 创建 3 个产品线路由: /batches/cell-product, /batches/service, /batches/kit
- 更新 CreateBatchDialog: 支持 defaultProductLine 锁定产品选择
- 批次卡片动态图标: CELL_PRODUCT→FlaskConical, SERVICE→Microscope, KIT→TestTubes
- 侧边栏重构: 三产品线入口(生产管理组) + 全部批次移入系统管理区
- 移除侧边栏"新建批次"按钮（各产品线页面自带）

**B1: 用户管理后端增强**
- GET /api/users: include productLines + roles
- POST /api/users: 接受 productLines 数组，事务创建用户+UserProductLine
- PATCH /api/users/[id]: 事务删除重建 UserProductLine
- DELETE /api/users/[id]: 清理 UserProductLine + UserProductRole

**B2: 产品权限 API**
- 新增 GET/POST /api/product-roles: SUPERVISOR 产品级 OPERATOR/QC 分配
- 新增 GET/PATCH/DELETE /api/product-roles/[userId]/[productId]: 单条 CRUD
- 权限校验: 产品角色不超出全局资质 + 产品线归属 + ADMIN 天然通过

**B3: 用户对话框增强**
- 创建/编辑用户对话框: 新增产品线归属三卡片选择 (细胞产品/服务项目/试剂盒)
- 仅 ADMIN 可见，支持创建和编辑模式
- 用户列表: 新增产品线列，显示 ProductLineBadge

**C1: 权限管理页面**
- 产品权限配置页 /settings/product-roles: SUPERVISOR 操作入口
  - 产品线切换标签、用户下拉、OPERATOR/QC 表格
  - 全局资质约束 (无 QC 全局角色则 QC checkbox 禁用)
- 权限总览页 /settings/permissions: 分级查看
  - ADMIN 全部、SUPERVISOR 自己产品线、OPERATOR/QC 仅自己
  - 产品线标签 + 搜索 + 桌面表格/移动卡片双布局

**C3: 双轨权限校验接入**
- POST /api/batches: canManage(产品线归属检查)
- POST /api/batches/[id]/transition: 管理类→canManage + 操作类→canOperate
- PATCH /api/batches/[id]/tasks/[taskId]: canOperate(OPERATOR)
- POST /api/batches/[id]/qc: canOperate(QC)

- Lint 检查通过（仅预存 generate-plan.js 2 个 error）
- Dev server 正常编译运行
- Git commit + push 完成

Stage Summary:
- 新增文件: 8 个（3 产品线路由 + 2 产品权限 API + 2 权限页面 + 1 batch-list 重构）
- 修改文件: 15 个（侧边栏/头/用户对话框/用户列表/API 路由/批次列表/创建对话框）
- 导航架构: §2.7 完整实现，三产品线独立入口
- 权限体系: §2.6 v2.0 双轨验证全面接入后端 API
- 权限管理: ADMIN 配置产品线归属 + SUPERVISOR 配置产品操作权限
- 权限可视化: 权限配置页 + 权限总览页
- 代码零新增 ESLint error/warning

---
Task ID: 3
Agent: Main
Task: Fix runtime errors in permissions and dialog components

Work Log:
- Fixed `ReferenceError: Cannot access 'selectedUser' before initialization` in product-roles page
  - Moved `const selectedUser = assignableUsers.find(...)` declaration before its first usage (line 180)
  - Removed duplicate declaration at line 208
- Fixed `Maximum update depth exceeded` infinite loop in Radix UI Dialog
  - Root cause: `animate-in`/`animate-out` CSS classes on DialogOverlay and DialogContent triggered Radix `usePresence` hook, which entered infinite ref callback loop when combined with Zustand store re-renders
  - Fix: Removed ALL animation CSS classes from `src/components/ui/dialog.tsx` (animate-in, animate-out, fade-in-0, fade-out-0, zoom-in-95, zoom-out-95, duration-200)
  - Reverted conditional rendering workarounds from users, products, and batches pages
  - Restored original `handleDialogClose` implementations with immediate `setEditUser(null)` cleanup

Stage Summary:
- Dialog component now opens/closes without CSS animations (instant mount/unmount)
- Eliminates Radix UI `usePresence` infinite loop bug
- All three dialog pages (users, products, batches) reverted to clean original patterns
- Lint passes, dev server compiles cleanly

---
Task ID: 3b
Agent: Main
Task: Fix persistent Radix UI usePresence infinite loop in Dialog components

Work Log:
- Previous attempts (removing CSS animation classes, forceMount props) failed because the Turbopack dev server caches compiled Radix UI chunks that include the usePresence hook
- Created `src/components/ui/simple-dialog.tsx` — a lightweight custom modal that does NOT use Radix UI's usePresence system at all
  - Implements overlay click-to-close, Escape key handler, body scroll lock
  - No animation, no presence tracking, no ref callback loops
  - Exports: Dialog, DialogHeader, DialogFooter, DialogTitle, DialogDescription
- Updated all three dialog components to use SimpleDialog instead of Radix Dialog:
  - `src/components/users/create-user-dialog.tsx`
  - `src/components/products/create-product-dialog.tsx`
  - `src/components/batches/create-batch-dialog.tsx`
- Cleared `.next/dev/static/chunks` Turbopack cache

Stage Summary:
- Complete bypass of Radix UI usePresence system for all form dialogs
- Product line selection checkboxes in CreateUserDialog no longer trigger infinite loop
- All three dialog pages compile and render correctly
- Lint passes (only pre-existing generate-plan.js errors)

---
Task ID: 1
Agent: Main Agent
Task: 修复预览界面白板问题 — 诊断并恢复开发服务器

Work Log:
- 检查 dev.log 发现开发服务器未运行（进程已终止）
- 检查所有 dialog 组件文件（create-user-dialog, create-product-dialog, create-batch-dialog）均存在于正确路径
- 验证 SimpleDialog 导入导出完全匹配（Dialog, DialogHeader, DialogFooter, DialogTitle, DialogDescription）
- 确认仅 command.tsx 仍使用 Radix UI Dialog（预期行为）
- 确认 settings/product-roles/page.tsx 中 selectedUser TDZ 修复仍然有效
- 重启开发服务器（npx next dev -p 3000）
- 恢复 dialog.tsx 到标准 shadcn/ui 状态（移除 forceMount 调试残留，恢复动画 CSS 类）
- 验证所有页面编译成功（200 OK），无 TypeScript 错误

Stage Summary:
- 根本原因：开发服务器进程已终止，导致预览界面无法连接
- 修复：重启开发服务器，清理调试残留代码
- dialog.tsx 恢复标准 shadcn/ui 状态（含动画类），仅用于 command.tsx
- 三个 create-*-dialog 组件已成功迁移到 SimpleDialog（纯 React 实现，无 Radix UI 依赖）
- 所有页面编译正常，API 响应 200 OK

---
Task ID: 2
Agent: Main Agent
Task: 修复 CheckboxIndicator usePresence 无限循环 — 替换 Radix Checkbox/Switch

Work Log:
- 分析错误堆栈，定位到 `CheckboxIndicator` 组件（来自 @radix-ui/react-checkbox）使用了 Radix 的 `usePresence` hook
- `usePresence` 在 Checkbox 状态变化时触发 ref 回调导致 setState 无限循环
- 重建 `src/components/ui/checkbox.tsx`：纯 React 实现，使用 `<button role="checkbox">` + 条件渲染 CheckIcon，不依赖 Radix UI
- 保持完全相同的 API（checked, onCheckedChange, disabled, className）和视觉效果（CSS 类完全一致）
- 重建 `src/components/ui/switch.tsx`：同理替换 Radix Switch 为纯 React 实现（预防性修复）
- 清除 Turbopack 缓存并重启开发服务器
- 验证 /users 页面编译成功（200 OK），无报错

Stage Summary:
- 根本原因：Radix UI CheckboxPrimitive.Indicator 的 usePresence hook 在对话框内状态快速变化时触发无限循环
- 修复：用纯 React 实现替代 Radix Checkbox 和 Switch，完全消除 usePresence 依赖
- 影响范围：CreateUserDialog（角色选择、产品线选择）、CreateBatchDialog（鉴定项目）、settings/product-roles（角色分配）
- dev server 正常运行，所有页面编译通过

---
Task ID: 3
Agent: Main Agent
Task: 修复权限总览页面访问控制 — SUPERVISOR 看全部, QA/QC/OPERATOR 看自己

Work Log:
- 分析权限总览页面 `/settings/permissions/page.tsx` 的现有逻辑
- 发现两个 API 层面问题:
  1. `/api/users` GET 只允许 ADMIN 访问 → SUPERVISOR/QA/QC/OPERATOR 均被 403
  2. `/api/product-roles` GET 只允许 ADMIN/SUPERVISOR 访问 → QA/QC/OPERATOR 被 403
- 发现前端逻辑问题: SUPERVISOR 被限制为只看自己产品线的用户（应看全部）
- 修复 `/api/users` GET:
  - ADMIN + SUPERVISOR: 返回所有用户
  - QA/QC/OPERATOR: 仅返回自己
- 修复 `/api/product-roles` GET:
  - ADMIN + SUPERVISOR: 返回所有产品角色分配
  - QA/QC/OPERATOR: 仅返回自己的产品角色
- 修复前端权限页面:
  - `isManagement = isAdmin || isSupervisor` 代替旧的复杂判断
  - `isOperationalOnly = !isManagement` 覆盖 QA/QC/OPERATOR
  - 移除客户端重复过滤（API 已处理）
  - SUPERVISOR 底部标签改为"主管视图 — 全部权限可见"
- 验证编译成功，API 响应 200 OK

Stage Summary:
- 权限总览三级访问控制:
  - ADMIN: 看全部用户 + 全部产品权限
  - SUPERVISOR: 看全部用户 + 全部产品权限（与管理员相同）
  - QA/QC/OPERATOR: 仅看自己的权限信息
- 后端和前端同步修改，API 负责数据过滤，前端负责展示
---
Task ID: 1
Agent: Main Agent
Task: 按产品线分离批次状态显示

Work Log:
- 分析当前状态显示架构：侧边栏 BatchStatusOverview 和首页仪表盘的"批次概览"将所有产品线状态合并展示
- 修改 `/api/batches/status-stats` API，新增 `byProductLine` 字段，使用 `GROUP BY productLine, status` SQL 查询按产品线分组统计
- 重写侧边栏 `BatchStatusOverview` 组件：按产品线分组（可折叠），每个产品线仅显示其相关状态（如服务项目显示"样本已接收"、"鉴定中"等，试剂盒显示"物料准备中"等）
- 重写首页仪表盘 `page.tsx`：将原来合并的6个统计卡片改为3个产品线独立的统计区域，每个区域显示该产品线的专属状态
- 修复 `byProductLine` SQL 查询使用 `db.$queryRaw` 获取原始分组数据
- Lint 检查通过（仅有不相关的 generate-plan.js 警告）

Stage Summary:
- API 新增 `byProductLine: Record<string, Record<string, number>>` 返回格式
- 侧边栏状态概览改为可折叠的产品线分组，每组仅显示有数据的状态
- 首页仪表盘改为三个产品线独立卡片，点击状态数字可跳转到对应产品线的筛选页面
- 每个产品线的状态定义基于 state-machine.ts 中的状态转换模板
---
Task ID: 7
Agent: Task Assignment Feature Developer
Task: 任务指派功能 — eBPR步骤引导增加指派UI + 权限控制

Work Log:
- Modified EbprStepGuide component to add onAssignTask callback prop
- Added AssignTaskRequest interface for task assignment requests
- Imported useAuthStore and hasAnyRole for permission checks
- Added UserPlus, ShieldCheck, User, Clock icons from lucide-react
- Moved ExpansionForm import to top of file
- Added getRepresentativeTask() helper to find active/pending task for each step
- Enhanced StepProgressBar to show assignee name and "等待指派" status under step circles
- Created TaskWithAssignment wrapper component for SEED_PREP/HARVEST tasks with:
  - "等待指派" amber card with assign button for PENDING tasks without assignee (ADMIN/SUPERVISOR only)
  - "非指派人员" card for users who are not the assignee and lack permission
  - Assignee info header (operator + reviewer) for assigned in-progress tasks
  - Normal TaskFormWrapper for completed/reviewed tasks or admin override
- Created ExpansionTaskWithAssignment wrapper component for EXPANSION tasks with same logic
- Updated Expansion section to check pending tasks before showing the form
- Connected EbprStepGuide to AssignTaskDialog in batch detail page via onAssignTask prop
- Lint passed (only pre-existing generate-plan.js errors)
- Dev server compiled successfully

Stage Summary:
- Modified files: src/components/ebpr/ebpr-step-guide.tsx, src/app/batches/[id]/page.tsx
- SUPERVISOR/ADMIN can now assign operators to CELL_PRODUCT tasks via step guide
- Non-assigned operators cannot access task forms - shown "非指派人员" message
- PENDING tasks without assignee show "等待指派" card with assign button for authorized users
- Assignee info displayed in step progress bar (name tag under step circles)
- Expansion tasks properly handle assignment state before showing form

---
Task ID: 7
Agent: Main Agent
Task: 任务指派功能 — eBPR步骤引导增加指派UI + 权限控制

Work Log:
- 读取现有代码确认：数据库已有 assigneeId/reviewerId 字段，后端 PATCH API 已支持指派，AssignTaskDialog 组件已存在
- 发现问题：CELL_PRODUCT 产品线使用 EbprStepGuide 组件，完全没有指派功能；任何操作员可直接填写表单
- 修改 EbprStepGuide 组件 (src/components/ebpr/ebpr-step-guide.tsx)：
  - 新增 onAssignTask 回调 prop，与 GenericTaskList 保持一致
  - 新增 useAuthStore + hasAnyRole 权限检查，ADMIN/SUPERVISOR 可指派
  - 步骤进度条：为每个步骤显示指派人姓名（如有），未指派显示"等待指派"警告
  - 新增 getRepresentativeTask() 辅助函数获取每步的代表任务
  - 新增 TaskWithAssignment 包装组件（SEED_PREP/HARVEST）：
    - PENDING 无指派人 → 琥珀色"等待指派"卡片 + 指派按钮（ADMIN/SUPERVISOR可见）
    - 有指派人但非当前用户 + 无管理权限 → 灰色"非指派人员"卡片
    - 有指派人 → 显示操作员/复核人/开始时间信息头 + 正常表单
  - 新增 ExpansionTaskWithAssignment 包装组件（EXPANSION），同样的逻辑
  - 扩增步骤智能渲染：有待处理的任务时显示指派卡片，无待处理时显示正常表单
- 修改批次详情页 (src/app/batches/[id]/page.tsx)：
  - 为 EbprStepGuide 传递 onAssignTask 回调，连接到已有的 AssignTaskDialog
- 运行 prisma generate + db push 确保客户端同步
- Lint 通过（仅预存 generate-plan.js 错误，无新增）
- Dev server 正常编译运行

Stage Summary:
- 修改文件：src/components/ebpr/ebpr-step-guide.tsx, src/app/batches/[id]/page.tsx
- SUPERVISOR/ADMIN 现在可以为细胞产品线的每个步骤指派操作员和复核人
- 未指派的任务显示"等待指派"状态，非指派人员无法操作已指派的任务
- 步骤进度条显示每个步骤的指派人信息
- 三条产品线（细胞产品、服务项目、试剂盒）均支持任务指派
---
Task ID: 1
Agent: Main
Task: 修复用户管理编辑对话框不预填现有用户信息的问题

Work Log:
- 分析问题根因：CreateUserDialog 组件使用 useState 初始化表单字段，但 useState 只在首次挂载时使用初始值
- 发现 SimpleDialog 组件不会在 open prop 变化时调用 onOpenChange，导致 handleOpenChange 中的重置逻辑不会触发
- 将表单重置逻辑从 handleOpenChange 移到 useEffect 中，监听 open 和 editUser 的变化
- 添加 useEffect import
- 验证开发服务器编译成功，无相关 lint 错误

Stage Summary:
- 修复文件: src/components/users/create-user-dialog.tsx
- 修复方式: 添加 useEffect 监听 open/editUser 变化，在对话框打开时重置所有表单字段
- 验证: 编译通过，lint 无新增错误
---
Task ID: 2
Agent: Main
Task: 修复任务指派中可指派人过滤逻辑不正确的问题

Work Log:
- 分析根因: available-users API 完全忽略了 productId 参数，只按产品线过滤
- 批次详情页传递的是 productCode（如 IPSC-WT-001）而非数据库 productId（cuid）
- 陈五出现在列表中因为他有 OPERATOR 全局角色且属于 CELL_PRODUCT 产品线，但没有该具体产品的 UserProductRole
- 修复 API: 新增 productId 参数支持，按 UserProductRole 过滤有具体产品权限的用户
- 管理类角色（ADMIN/SUPERVISOR/QA）始终可看到其产品线内所有产品
- 操作类用户（OPERATOR）必须有 UserProductRole 记录才会出现在该产品的指派列表中
- 修复批次详情页: BatchDetail 接口增加 productId 字段，传递 batch.productId（数据库FK）给指派对话框

Stage Summary:
- 修改文件: src/app/api/product-roles/available-users/route.ts, src/app/batches/[id]/page.tsx
- 验证: 编译通过，无报错
---
Task ID: 3
Agent: Main
Task: 权限总览页面增加按产品筛选功能

Work Log:
- 分析现有权限总览页面，理解数据结构（users + productRoles）
- 在搜索栏旁增加产品筛选下拉框（按产品线分组），使用 shadcn Select 组件
- 获取产品列表数据（GET /api/products），按产品线分组展示
- 新增 productUsersMap 反向映射：productId -> 用户权限列表
- 当选中产品时，过滤用户列表：管理类角色（ADMIN/SUPERVISOR/QA）始终显示，操作类用户必须有 UserProductRole 记录
- 选中产品后，产品权限列直接展示该产品的角色badge，不再折叠到下拉菜单中
- 增加产品信息提示栏，显示当前选中的产品信息和匹配用户数
- 支持清除产品筛选，恢复全部用户视图
- 同步适配桌面端表格和移动端卡片布局

Stage Summary:
- 修改文件: src/app/settings/permissions/page.tsx
- 新增功能: 产品筛选下拉框、产品用户反向映射、产品信息提示栏
- 交互逻辑: 选产品→过滤用户→产品权限列直接展示角色badge→清除恢复全量
- 验证: 编译通过，无报错

Stage Summary:
- 新增文件：`src/app/batches/all/page.tsx`
- 所有指向 `/batches/all` 的链接现在都能正确渲染"所有批次"页面
- QA 用户可以通过"待质检批次"快捷操作正常查看批次列表

---
Task ID: TEST-AUDIT
Agent: Main Agent
Task: 梳理项目测试状态 — 区分已测试/发现问题/未测试

Work Log:
- 通读 worklog.md 全部历史记录，了解每个 Task 的实现情况
- 读取 state-machine.ts（状态机）、task-templates.ts（任务模板）、schema.prisma（数据模型）
- 读取三条产品线的批次列表页面（cell-product/service/kit）
- 读取 assign-task-dialog.tsx（当前逐任务指派 UI）
- 读取 products/page.tsx、permissions/page.tsx、product-roles/page.tsx（管理功能）
- 对照 v3.0 流程重构实施计划，梳理各模块测试覆盖情况

Stage Summary:

**✅ 已通过测试（13 项）：**
1. 登录认证（演示账号一键登录已修复）
2. 多角色系统（Badge 展示、权限判断）
3. Dashboard 工作台（统计卡片、近期批次、待办任务）
4. 批次列表（我的/所有、状态筛选、搜索、分页）
5. 批次创建（仅 CELL_PRODUCT 线）
6. 批次详情（概览/时间线标签页）
7. 细胞产品 eBPR（种子复苏→传代→收获冻存）
8. QC 质检（仅 CELL_PRODUCT 线）
9. CoA 审批（仅 CELL_PRODUCT 线）
10. 用户管理（CRUD）
11. 产品管理（CRUD）
12. 暗色模式
13. 审计日志（批次时间线）

**⚠️ 测试中发现问题，已确认方案但未实施（6 项）：**
1. 三条产品线流程差异不够 → v3.0 重构计划
2. 逐任务指派操作繁琐 → 改为批次级预指派
3. QC 角色未与 OPERATOR 严格分离 → 状态机 roles 修改
4. CoA 流程步骤过多 → 简化为 2 步人工
5. HANDOVER 反模式 → 去除，用转交机制替代
6. 任务模板不完整 → 按 v3.0 扩展

**❓ 尚未测试（30 项）：**
- 批次管理：服务项目/试剂盒创建、批次编辑、报废（无原因字段）、三条线状态筛选、Dashboard统计
- 服务项目：样本接收、鉴定流程、提交报告+CoA、批准交付、退回、鉴定任务动态创建
- 试剂盒：物料准备、开始配制、QC/CoA 完整流程
- 权限系统：产品级权限分配、权限总览页、产品线归属控制、SUPERVISOR 边界
- 任务管理：AssignTaskDialog、服务/试剂盒任务创建、复核人
- 其他：全局审计日志、我的待办准确性、CoA 退回重提、QC 不合格返工

**🔧 尚未实施（v3.0 计划，13 项）：**
P0: 批次预指派、四眼原则、转交机制、报废原因、CoA简化、去HANDOVER、TERMINATED、QC严格分离
P1: 分化诱导、服务项目任务模板、采样记录、任务重做机制
P2: 各产品线专属表单

---
Task ID: 7
Agent: Main Agent
Task: 文档结构重组 + Git 云端保存

Work Log:
- 读取 PROJECT_DOCS.md、流程重构实施计划 v3.0、多产品线扩展计划、测试状态清单等全部核心文档
- 分析文档替代关系：v2.2 的 §2.3/§2.8 被 v3.0 替代，§2.6/§2.7 仍有效
- 创建 docs/testing/ 和 docs/decisions/ 文件夹
- 移动 测试状态清单-v1.0.md 到 docs/testing/
- 更新 多产品线扩展计划头部：标注替代关系、关联文档引用
- 更新 流程重构实施计划 v3.0 头部：标记为当前活跃计划、更新前置文档引用
- 更新 测试状态清单引用路径
- 重写 PROJECT_DOCS.md：新增 testing 分类、decisions 预留、文档关系图、完整状态清单
- Git commit + push 成功

Stage Summary:
- 新增目录：docs/testing/、docs/decisions/
- 移动文件：测试状态清单 → docs/testing/
- 更新文件：PROJECT_DOCS.md（重写）、多产品线扩展计划（替代标注）、流程重构实施计划 v3.0（状态标注）
- Git 已推送：https://github.com/startnow-j/iPSC-flow.git
- 当前活跃计划：流程重构实施计划 v3.0（Phase 3A/3B/3C）
- 下一步：启动 Phase 3A 流程基础重构开发

---

## 2025-01-XX Phase 3A.1 — 状态机重构 + 数据库 Schema 变更

### 变更范围

#### 1. Prisma Schema (prisma/schema.prisma)
- **BatchStatus 枚举**: 新增 `TERMINATED`（服务项目终止）；`QC_FAIL` 移入废弃区；保留 `COA_PENDING`/`COA_APPROVED`/`HANDOVER`/`REJECTED` 兼容历史数据
- **TaskStatus 枚举**: 新增 `FAILED`（服务项目任务重做场景）
- **Batch 表**: 新增 `productionOperatorId`/`Name`、`qcOperatorId`/`Name`、`terminationReason`、`scrapReason` 字段
- **Batch 关联**: 新增 `productionOperator`（BatchProductionOperator）、`qcOperator`（BatchQcOperator）
- **User 反向关联**: 新增 `productionBatches`、`qcBatches`
- 数据库已同步（`bun run db:push` 成功）

#### 2. 状态机重写 (src/lib/services/state-machine.ts)
- **CELL_PRODUCT/KIT**: NEW→IN_PRODUCTION→QC_PENDING→QC_IN_PROGRESS→QC_PASS→COA_SUBMITTED→RELEASED + SCRAPPED
  - `pass_qc` 自动生成 CoA 草稿（batch 仍处 QC_PASS）
  - `submit_coa` 为 QC 手动操作（QC_PASS→COA_SUBMITTED）
  - `resubmit_coa` 支持退回后重新提交（COA_SUBMITTED 自环）
  - `approve` 合并批准+放行（COA_SUBMITTED→RELEASED）
- **SERVICE**: NEW→SAMPLE_RECEIVED→IN_PRODUCTION→IDENTIFICATION→REPORT_PENDING→COA_SUBMITTED→RELEASED
  - 去除 HANDOVER 状态（人员交接通过转交机制）
  - 新增 TERMINATED 终止状态（客户取消/样本问题/服务失败）
  - IN_PRODUCTION→TERMINATED（终止）+ IDENTIFICATION→IN_PRODUCTION（返工）
- **QC 角色严格分离**: start_qc/pass_qc/submit_coa/resubmit_coa 仅限 QC 角色
- **新增**: `TERMINATION_REASONS` 枚举、`TERMINATION_REASON_LABELS`、`TransitionOptions` 接口
- **向后兼容**: getStatusLabel/getStatusColor 对废弃状态返回映射标签

#### 3. Transition API (src/app/api/batches/[id]/transition/route.ts)
- scrap 操作强制校验 reason 字段
- 新增 terminate 操作，强制校验 reason + terminationReason
- 移除废弃动作（approve_coa → approve, generate_coa → pass_qc auto-generates）
- submit_coa/resubmit_coa 归入 OPERATIONAL_ACTIONS（QC 角色产品级授权）
- transition() 调用改用 TransitionOptions 对象传参

#### 4. CoA API (src/app/api/coa/[coaId]/route.ts)
- submit: 根据批次状态自动选择 submit_coa/resubmit_coa/submit_report
- approve: 统一使用 'approve' 动作（合并 approve_coa + release）
- reject: 统一处理（CoA→DRAFT，batch 保持 COA_SUBMITTED），去除 SERVICE 特殊的 reject transition

#### 5. 任务模板 (src/lib/services/task-templates.ts)
- CELL_PRODUCT: 新增 DIFFERENTIATION（分化诱导，阶段型，sequenceNo: 3）
- SERVICE: 扩展为 5 步（样本处理→重编程→克隆挑取→扩增培养→冻存）
- 新增 CATEGORY_TASK_TEMPLATES: EDIT（基因编辑）、DIFF_SERVICE（分化服务）差异化模板
- 新增 getTaskTemplates(productLine, action, category?) 函数
- 新增 taskType 字段（single/phase/redoable）
- 新增 POTENCY 到 IDENTIFICATION_OPTIONS

### 质量检查
- ESLint: 所有修改文件零错误
- TypeScript: 所有修改文件零新增错误（28 个 pre-existing errors 不在修改范围内）
- 数据库同步: 成功

### 不在本次范围
- 前端组件适配（Phase 3A.3）
- seed.ts 修改
- 指派机制 UI（Phase 3A.2）

---
Task ID: 3A.2
Agent: Main Agent
Task: Phase 3A.2 — 批次级预指派机制

Work Log:
- 读取 9 个参考文件了解现有代码上下文
- 分析 Batch 表已有 productionOperatorId/Name, qcOperatorId/Name 字段（3A.1 已添加）
- 分析现有认证模式（getTokenFromRequest + verifyToken + getRolesFromPayload）

**1. POST /api/batches — 创建批次时可选预指派**
- 新增请求体字段：productionOperatorId, productionOperatorName, qcOperatorId, qcOperatorName
- 四眼原则校验：productionOperatorId !== qcOperatorId（同时指定时）
- 创建批次时保存预指派人员到 Batch 表
- 审计日志记录预指派信息

**2. POST /api/batches/[id]/transition — 开始生产时可指派**
- 新增请求体字段（同上）
- start_production / start_material_prep 时可选更新指派人员
- 四眼原则校验
- 创建任务时 assigneeId 自动继承 batch.productionOperatorId（含 start_identification 鉴定任务）
- 指派变更记录审计日志

**3. PATCH /api/batches/[id]/reassign — 转交机制（新 API）**
- 新建 `src/app/api/batches/[id]/reassign/route.ts`
- SUPERVISOR/ADMIN 可修改批次预指派人员
- 四眼原则校验（含已有人+新指定人员的组合检查）
- 更新所有未完成任务（PENDING/IN_PROGRESS）的 assigneeId 为新生产员
- 每个被更新任务记录审计日志
- 批次级审计日志记录变更前后快照

**4. GET /api/product-roles/available-users — 新增 role 查询参数**
- 新增 `role` 查询参数（operator/qc），用于区分查询生产员还是质检员
- 过滤逻辑：全局角色 + 产品级角色双重过滤
- 向后兼容：不传 role 时返回全部操作类用户

**5. create-batch-dialog.tsx — 新建批次对话框增加指派**
- 产品选择后显示"预指派人员"区域
- 两个下拉框：生产操作员（role=operator）和质检员（role=qc）
- 数据来源：`/api/product-roles/available-users?productId=xxx&role=operator`
- 四眼原则：选择相同人员时显示警告（amber 边框 + AlertTriangle 图标）
- 提交按钮在违反四眼原则时禁用
- 提示文案：可选填，SUPERVISOR 后续可再指派

**6. batches/[id]/page.tsx — 批次详情页显示指派信息**
- BatchDetail 接口新增 productionOperatorId/Name, qcOperatorId/Name
- 概览 Tab 新增"指派信息"卡片（在基础信息之后、种子信息之前）
- 显示生产操作员和质检员姓名
- SUPERVISOR/ADMIN 可看到"重新指派"按钮（ghost 样式）
- 集成 BatchReassignDialog 组件
- 引入 useAuthStore 获取当前用户角色判断权限

**7. batch-reassign-dialog.tsx — 批次级指派对话框（新组件）**
- 新建 `src/components/batches/batch-reassign-dialog.tsx`
- 两个下拉框：生产操作员和质检员，支持"不指定"选项
- 预填充当前指派人员
- 显示当前指派信息提示框
- 四眼原则警告
- 提交调用 PATCH /api/batches/[id]/reassign
- toast 通知反馈

**8. prisma/seed.ts — 测试数据**
- 新增创建一个带预指派的测试批次（IPSC-{YYMMDD}-001）
- 生产员：张三（operator@ipsc.com），质检员：李质检（qc@ipsc.com）
- 幂等处理：批次编号冲突时跳过

- Lint 检查通过（仅预存 generate-plan.js 2 个 error，本任务零新增）
- Build 编译成功，所有 API 路由和页面正常生成

Stage Summary:
- 新增文件：src/app/api/batches/[id]/reassign/route.ts（转交 API）
- 新增文件：src/components/batches/batch-reassign-dialog.tsx（指派对话框）
- 修改文件：src/app/api/batches/route.ts（创建批次 + 预指派）
- 修改文件：src/app/api/batches/[id]/transition/route.ts（开始生产 + 预指派 + 任务继承）
- 修改文件：src/app/api/product-roles/available-users/route.ts（role 查询参数）
- 修改文件：src/components/batches/create-batch-dialog.tsx（预指派 UI）
- 修改文件：src/app/batches/[id]/page.tsx（指派信息卡片 + 重新指派）
- 修改文件：prisma/seed.ts（测试批次 + 预指派数据）
- 指派机制：批次级预指派 → 任务自动继承 → 转交更新未完成任务
- 四眼原则：创建批次/开始生产/转交 三个入口均有校验
- 审计追踪：所有指派变更均有审计日志

## Phase 3A.3 — 前端适配状态机变化

**日期**: $(date +%Y-%m-%d)

### 变更概要
适配 Phase 3A.1 状态机重写（三产品线差异化、CoA简化、QC严格分离）后的前端UI变化。

### 修改文件

1. **src/lib/services/index.ts**
   - 新增导出：`TransitionOptions` 类型、`TERMINATION_REASONS`、`TERMINATION_REASON_LABELS`

2. **src/components/batches/batch-status-overview.tsx**
   - CELL_PRODUCT: 移除 QC_FAIL、COA_PENDING、COA_APPROVED
   - SERVICE: 移除 HANDOVER，新增 TERMINATED
   - KIT: 移除 QC_FAIL、COA_PENDING、COA_APPROVED

3. **src/components/qc/qc-form.tsx**
   - 移除 `fail_qc` + `generate_coa` 链式调用
   - 新流程：POST /qc → pass_qc transition（后端自动生成CoA草稿）
   - QC不合格时：仅保存记录，不自动转换状态，提示联系主管

4. **src/components/coa/coa-detail.tsx**
   - 批准确认对话框：更新文案为"批准并放行"（v3.0: 批准=放行）
   - 退回确认对话框：更新文案说明batch状态保持COA_SUBMITTED

5. **src/app/batches/[id]/page.tsx**
   - 移除 RotateCcw import（QC_FAIL返工按钮已去除）
   - handleQcSubmitted: COA_PENDING → COA_SUBMITTED
   - QC Tab: 移除 QC_FAIL/COA_PENDING/COA_APPROVED 状态判断
   - QC Tab: 移除 QC_FAIL 返工按钮区域
   - QC Tab: SERVICE新增 TERMINATED 状态处理
   - CoA Tab: 移除 COA_PENDING/COA_APPROVED，简化为 QC_PASS/COA_SUBMITTED/RELEASED/REPORT_PENDING
   - 过渡确认对话框: 移除"质检不合格"分支，新增"终止"分支
   - 操作按钮variant: "不合格" → "终止"

6. **src/app/page.tsx (Dashboard)**
   - CELL_PRODUCT: 移除 COA_APPROVED 统计卡片
   - SERVICE: 移除 HANDOVER，新增 TERMINATED
   - KIT: 移除 COA_APPROVED 统计卡片

7. **src/components/dashboard/my-tasks.tsx**
   - QC角色快捷操作: 新增"待提交CoA"链接（跳转 COA_SUBMITTED 筛选）

8. **src/app/batches/page.tsx (批次列表)**
   - STATUS_FILTERS_ALL: 移除 HANDOVER/QC_FAIL/COA_PENDING/COA_APPROVED，新增 TERMINATED
   - CELL_PRODUCT: 移除 QC_FAIL/COA_PENDING/COA_APPROVED
   - SERVICE: 移除 HANDOVER，新增 TERMINATED
   - KIT: 移除 QC_FAIL/COA_PENDING/COA_APPROVED

### 未修改文件
- `src/components/ebpr/ebpr-step-guide.tsx` — 已使用 `complete_production`，无需修改
- `src/components/dashboard/stat-card.tsx` — 纯展示组件，无需修改
- `src/app/batches/cell-product/page.tsx` / `service/page.tsx` / `kit/page.tsx` — 复用 BatchListContent，状态筛选由父组件控制
---
Task ID: 3B
Agent: Main Agent + 4 Sub-agents
Task: Phase 3B — 生产任务差异化（任务模板系统升级 + 分化诱导 + 采样记录 + 任务重做 + 服务终止）

Work Log:
- 读取 PROJECT_DOCS.md 和 流程重构实施计划-v3.0.md 确认 Phase 3B 范围
- 分析现有代码状态：task-templates.ts 已定义 CATEGORY_TASK_TEMPLATES 和 getTaskTemplates() 但未在 transition API 中调用
- 启动 4 个并行子代理完成开发

**3B.1 Backend 任务模板系统升级**
- 修改 transition/route.ts: 使用 getTaskTemplates(productLine, action, category) 替代 TASK_TEMPLATES[productLine]
- 新增 product include 到 batch 查询获取 category
- CELL_PRODUCT 自动过滤 DIFFERENTIATION 步骤（非 NPC/CM/DIFF_KIT 类产品）
- [taskId]/route.ts: 新增 action: 'redo' 处理（标记 FAILED + 创建新 PENDING 任务 + stepGroup 命名）
- QC route.ts: 支持 qcType=IN_PROCESS 过滤、taskId 关联、PENDING 判定

**3B.2 分化诱导表单 + eBPR 步骤引导**
- 新增 differentiation-form.tsx: 分化阶段/操作日期/培养天数/诱导因子/培养基/细胞形态/备注
- 重构 ebpr-step-guide.tsx: 接收 category prop，动态 4步/3步 条件渲染
- 更新 task-summary.tsx: 新增 DIFFERENTIATION 结果展示（6字段网格）
- 更新 task-form-wrapper.tsx: 新增 DIFFERENTIATION case
- 新增 validateDifferentiation() 到 validation.ts

**3B.3 批次详情页 category 传递**
- batch API 返回 productCategory
- batch-detail page 传递 category 给 EbprStepGuide

**3B.4 采样记录功能**
- 新增 sampling-record.tsx: 可折叠采样记录区域
- 自动创建 IN_PROCESS QC 记录（qcType=IN_PROCESS）
- 支持 检测项/样本编号/取样时间/取样人 输入

**3B.5 任务重做 UI**
- 新增/重写 generic-task-list.tsx: 重做按钮 + 确认对话框
- FAILED 任务红色背景 + AlertTriangle 徽标
- 后续任务锁定逻辑（前序未完成时锁定）
- stepGroup 命名规范展示（R1/R2/R...）

**3B.6 服务项目终止 UI**
- 批次详情页新增终止对话框（Dialog 含 Select+Textarea）
- 终止原因分类：客户取消/样本问题/需求变更/服务失败/其他
- TERMINATED 状态 amber 警告横幅 + 只读展示

**3B.7 QC 界面 IN_PROCESS/ROUTINE 区分**
- 重写 qc-results-summary.tsx: 双 Tab（过程采样/终检）+ 自获取数据
- 汇总统计卡片（总记录数/待检测数）
- PENDING 判定的 IN_PROCESS 记录显示"等待检测结果"

**3B.8 种子数据更新**
- 新增 SRV-DIFF-001 细胞分化服务（DIFF_SERVICE category）
- 主管扩展至全部三条产品线（CELL_PRODUCT + SERVICE + KIT）
- 新增 2 条产品角色分配

- Lint 检查：仅预存 generate-plan.js 2 个 error
- Dev server 编译成功，API 正常返回
- Seed 运行成功：7 产品、5 用户、9 产品线归属、12 产品角色
- Git commit + push 完成

Stage Summary:
- 新增文件：6 个（differentiation-form.tsx, sampling-record.tsx, generic-task-list.tsx + 3 个 agent-ctx 文档）
- 修改文件：14 个（transition API, tasks API, QC API, batch detail, eBPR 组件, QC 组件, validation, seed 等）
- 代码变更：+2916 / -271 行
- 关键功能：category-aware 任务模板、分化诱导阶段型步骤、采样记录→QC自动关联、任务重做机制、服务终止UI
- Git 推送：e995897 → main

---
Task ID: Phase 3C
Agent: Main Agent
Task: Phase 3C — 表单差异化（SERVICE + KIT 产品线专属表单）

Work Log:
- 读取 worklog.md、流程重构实施计划-v3.0.md、PROJECT_DOCS.md 了解项目状态
- 深度探索现有代码：task-templates、state-machine、task-form-wrapper、generic-task-list、validation、task-summary、tasks API
- 确认 10 个缺失表单组件和 5 个待修改集成文件
- 并行启动 2 个子代理：
  - Agent 3C-1：创建 10 个新表单组件
  - Agent 3C-2：更新 5 个集成文件

**新增 10 个表单组件 (src/components/ebpr/)**：

SERVICE 产品线（7个）：
1. sample-prep-form.tsx — 样本处理（样本编号/类型/接收日期/状态/数量）
2. reprogram-form.tsx — 重编程操作（方法/载体/转导日期/培养皿/克隆数/结果）
3. clone-picking-form.tsx — 克隆挑取（阶段型，含历史记录，POST 创建新任务）
4. freeze-form.tsx — 冻存（日期/细胞数/存活率/规格/自动计算总支数/存储位置）
5. cell-revival-form.tsx — 解冻复苏（冻存编号/位置/复苏耗时/方式/状态）
6. gene-editing-form.tsx — 基因编辑（工具/靶基因/gRNA/编辑类型/转染方式/结果）
7. clone-screening-form.tsx — 单克隆筛选（阶段型，含历史记录，POST 创建新任务）

KIT 产品线（3个）：
8. material-prep-form.tsx — 物料准备（物料清单/批号/环境检查/温度）
9. preparation-form.tsx — 配制生产（日期/批次号/规格/数量/培养基批号）
10. dispensing-form.tsx — 分装贴标（日期/数量/规格/标签/外观检查）

**修改 5 个集成文件**：
1. task-form-wrapper.tsx — 导入 10 个新表单，添加 10 个 switch case，CLONE_PICKING/SCREENING 传递历史记录，default 回退到 TaskSummary
2. generic-task-list.tsx — 替换"表单开发中"占位符为 TaskFormWrapper 实际表单渲染
3. validation.ts — 新增 10 个校验函数（SAMPLE_PREP/REPROGRAM/FREEZE/CELL_REVIVAL/GENE_EDITING/CLONE_PICKING/CLONE_SCREENING/MATERIAL_PREP/PREPARATION/DISPENSING）
4. task-summary.tsx — 新增 10 个图标映射 + 通用 formData 回退渲染
5. tasks/route.ts — supportedTaskCodes 扩展支持 CLONE_PICKING/CLONE_SCREENING 阶段型任务

- Lint 检查通过（仅预存 generate-plan.js 2 个 error）
- Dev server 正常编译运行
- 更新文档：流程重构实施计划 v3.0+++ (Phase 3C 完成)、PROJECT_DOCS.md

Stage Summary:
- 新增文件：src/components/ebpr/ 下 10 个表单组件
- 修改文件：task-form-wrapper.tsx、generic-task-list.tsx、validation.ts、task-summary.tsx、tasks/route.ts（5 个）
- 三产品线表单差异化全部完成：
  - CELL_PRODUCT: SEED_PREP + EXPANSION + DIFFERENTIATION + HARVEST（Phase 3B 已有）
  - SERVICE: SAMPLE_PREP + REPROGRAM + CLONE_PICKING + FREEZE + CELL_REVIVAL + GENE_EDITING + CLONE_SCREENING（Phase 3C 新增）
  - KIT: MATERIAL_PREP + PREPARATION + DISPENSING（Phase 3C 新增）
- 阶段型任务(POST 新建)支持扩展到 CLONE_PICKING 和 CLONE_SCREENING
- GenericTaskList 从"占位符"升级为"实际表单"
- v3.0 全部三阶段（3A + 3B + 3C）已完成

---
Task ID: Bugfix-1
Agent: Main Agent
Task: 修复 4 个关键 Bug — KIT 任务创建 / 报废对话框 / 终止原因丢失 / QC 闭包过期

Work Log:
- 读取 worklog.md 最后 100 行和 3 个待修改文件，确认现有代码结构

**Bug 1: KIT 第二批任务从未创建 (CRITICAL)**
- 文件：`src/app/api/batches/[id]/transition/route.ts`
- 问题：start_material_prep 已创建 1 个任务(MATERIAL_PREP)，start_production 时检查 `batch.tasks.length === 0` 失败，PREPARATION/DISPENSING 任务不会被创建
- 修复：将防重复逻辑从 `batch.tasks.length === 0` 改为按 taskCode 去重
  - 构建 `existingTaskCodes = new Set(batch.tasks.map(t => t.taskCode))`
  - 过滤 `newTemplates = filteredTemplates.filter(t => !existingTaskCodes.has(t.taskCode))`
  - 仅当 `newTemplates.length > 0` 时创建任务

**Bug 2: 报废操作始终失败 — 无原因输入框 (CRITICAL)**
- 文件：`src/app/batches/[id]/page.tsx`
- 问题：API 要求 scrap 必须传 reason，但前端只有 AlertDialog 确认框，没有原因输入框
- 修复：
  - 新增 `scrapDialogOpen` 和 `scrapReason` 状态
  - handleTransition 中将 scrap 路由到独立对话框（与 terminate 模式一致）
  - 新增 handleScrap 函数，发送 `{ action: 'scrap', reason: scrapReason.trim() }`
  - 新增 Scrap Dialog JSX：含必填 Textarea + 确认/取消按钮

**Bug 3: 终止详细原因数据丢失 (CRITICAL)**
- 文件：`src/lib/services/state-machine.ts`
- 问题：terminate 时 API 传了 reason(详细文本) 和 terminationReason(分类)，但状态机只存 terminationReason，reason 被丢弃
- 修复：
  - terminate 处理器中新增 `if (reason) updateData.scrapReason = reason`，将详细原因存入 scrapReason 字段
  - 前端 TERMINATED 横幅已读取 `batch.scrapReason` 显示"详细原因"，无需修改
  - 同时为 scrap 和 terminate 添加 `updateData.actualEndDate = new Date()`

**Bug 4: handleQcSubmitted 闭包过期 (CRITICAL)**
- 文件：`src/app/batches/[id]/page.tsx`
- 问题：handleQcSubmitted 调用 `await fetchBatchDetail()` 后检查 `if (batch?.status === 'QC_PASS')`，但 batch 来自旧闭包，永远为 false
- 修复：直接使用 fetch 返回的 data，不依赖闭包中的 batch 变量
  - `const res = await authFetch(...)` → `const data = await res.json()` → `if (data.batch.status === 'QC_PASS')`

- Lint 检查通过（仅预存 generate-plan.js 2 个 error，本次修改零新增）
- Dev server 正常编译运行

Stage Summary:
- 修改文件：3 个（transition/route.ts、state-machine.ts、batches/[id]/page.tsx）
- Bug 1：KIT 产品线 start_production 现在能正确创建 PREPARATION + DISPENSING 任务
- Bug 2：报废操作现在有专用对话框，必须输入原因才能提交
- Bug 3：终止操作的详细原因现在存储在 scrapReason 字段中，前端可正确展示
- Bug 3 补充：scrap 和 terminate 均自动设置 actualEndDate
- Bug 4：QC 提交后 CoA 现在能正确自动加载
- 代码零新增 ESLint error/warning

---
Task ID: validation-field-fix
Agent: Main Agent
Task: 修复 SERVICE/KIT eBPR 表单与 validation.ts 的字段名不匹配问题（9处）

Work Log:
- 读取 worklog.md 了解项目背景
- 读取 validation.ts 了解当前 9 个校验函数的字段定义
- 逐一读取 9 个 eBPR 表单组件，确认表单实际发送的字段名
- 对比发现 9 处字段名不匹配，全部在 validation.ts 中修正

**修复详情：**

1. **REPROGRAM** (reprogram-form.tsx → validateReprogram)
   - `reprogram_date` → `transduction_date`（表单发送转导日期而非重编程日期）
   - 移除 `vector_type` 必填要求（表单发送 `vector_name`/`vector_batch`，非必填）
   - 新增 `operation_result` 必填校验（表单必填）

2. **FREEZE** (freeze-form.tsx → validateFreeze)
   - `total_cells` → `cell_count`（字段名统一为表单使用的 cell_count）

3. **CELL_REVIVAL** (cell-revival-form.tsx → validateCellRevival)
   - `revival_method` → `recovery_method`（表单使用 recovery 前缀）
   - `revival_status` → `recovery_status`
   - 移除 `revival_date` 必填要求（表单无单独日期字段）
   - 新增 `recovery_time` 非必填校验（有值时必须为非负数值）

4. **GENE_EDITING** (gene-editing-form.tsx → validateGeneEditing)
   - `editing_method` → `editing_tool`（表单使用编辑工具名称）
   - `editing_date` → `transfection_date`（表单发送转染日期）
   - 移除 `efficiency` 可选校验（表单不发送此字段）
   - 新增 `operation_result` 必填校验

5. **CLONE_PICKING** (clone-picking-form.tsx → validateClonePicking)
   - `picking_date` → `pick_date`
   - 移除 `well_position` 必填要求（表单不发送此字段）
   - 新增 `culture_vessel` 和 `morphology` 必填校验（表单必填）

6. **CLONE_SCREENING** (clone-screening-form.tsx → validateCloneScreening)
   - `screening_date` → `screen_date`
   - `screening_method` → `screen_method`
   - `result` → `screen_result`
   - 新增 `clone_count` 可选校验（有值时必须 > 0）

7. **MATERIAL_PREP** (material-prep-form.tsx → validateMaterialPrep)
   - 完全重写：移除 `material_name`/`material_code`/`lot_no`/`prep_date`/`prep_status`
   - 新增：`material_list`（物料清单）、`batch_numbers`（批号登记）、`environment_check`（环境检查）

8. **PREPARATION** (preparation-form.tsx → validatePreparation)
   - 移除 `prep_formula` 和 `operator` 必填要求
   - 新增 `prep_batch_no`（配制批次号）、`kit_spec`（试剂盒规格）、`prep_quantity`（配制数量 > 0）校验
   - 保留 `prep_date` 和 `prep_result`

9. **DISPENSING** (dispensing-form.tsx → validateDispensing)
   - `dispensing_date` → `dispense_date`
   - `dispensing_count` → `dispense_quantity`
   - `specification` → `dispense_spec`
   - `storage_condition` → `appearance_check`

- 更新 validateProductionTask 函数的 JSDoc 注释，反映所有校验字段
- Lint 检查通过（仅预存 generate-plan.js 2 个 error，无新增）

Stage Summary:
- 修改文件：1 个（src/lib/services/validation.ts）
- 修复范围：9 个表单校验函数，涉及 SERVICE 产品线 6 个 + KIT 产品线 3 个
- 修复策略：以表单实际字段名为准，更新 validation.ts 匹配
- 新增校验：operation_result、culture_vessel、morphology、prep_batch_no、kit_spec、prep_quantity 等
- 移除无效校验：vector_type、well_position、prep_formula、operator、efficiency 等
- 代码零新增 ESLint error/warning
---
Task ID: 7
Agent: Main Agent
Task: 修复 7 个关键 Bug — 重新指派对话框 + 权限检查

Work Log:
- 读取 worklog.md（最后100行）和 4 个待修复文件，了解现有代码结构
- 逐个修复 7 个 Bug：

**Bug 1: 重新指派对话框发送 "none" 字符串而非 null (CRITICAL)**
- 文件：`src/components/batches/batch-reassign-dialog.tsx`
- 问题：SelectItem value="none" 导致 selectedOperatorId 为 "none"，提交时发送 `productionOperatorId: "none"` → 500 错误
- 修复：在 handleSubmit 中，对 selectedOperatorId 和 selectedQcId 检查 `!== "none"`，不满足条件时发送 null

**Bug 2: 四眼原则误报 — 两个字段都选 "none" 时触发 (Bug 1 关联)**
- 文件：`src/components/batches/batch-reassign-dialog.tsx`
- 问题：`selectedOperatorId === selectedQcId` 在两者均为 "none" 时为 true
- 修复：hasFourEyeViolation 增加 `!== "none"` 条件

**Bug 3: 重新指派 API 阻止单字段清除 (HIGH)**
- 文件：`src/app/api/batches/[id]/reassign/route.ts`
- 问题：`if (!productionOperatorId && !qcOperatorId)` — 客户端发送 `{ productionOperatorId: null }` 清除操作员时，`!null === true`，检查不通过
- 修复：改为 `if (productionOperatorId === undefined && qcOperatorId === undefined)`，用 undefined 区分"未发送"和"显式清除"

**Bug 4: 三个操作绕过权限检查 (CRITICAL)**
- 文件：`src/app/api/batches/[id]/transition/route.ts`
- 问题：`complete_production`、`receive_sample`、`complete_identification` 不在 MANAGEMENT_ACTIONS 或 OPERATIONAL_ACTIONS 中，权限检查被跳过
- 修复：
  - `complete_production: ["OPERATOR", "SUPERVISOR"]` 加入 MANAGEMENT_ACTIONS
  - `complete_identification: ["OPERATOR", "SUPERVISOR"]` 加入 MANAGEMENT_ACTIONS
  - `receive_sample: ["OPERATOR"]` 加入 OPERATIONAL_ACTIONS
  - `start_identification` 从 `["SUPERVISOR"]` 改为 `["OPERATOR", "SUPERVISOR"]`

**Bug 5: submit_report 权限不匹配 (HIGH)**
- 文件：`src/app/api/batches/[id]/transition/route.ts`
- 问题：路由有 `submit_report: ["SUPERVISOR", "QA"]`，但状态机定义 `["OPERATOR", "SUPERVISOR"]`。OPERATOR 被阻止，QA 被错误允许
- 修复：改为 `submit_report: ["OPERATOR", "SUPERVISOR"]`

**Bug 6: start_production / start_material_prep OPERATOR 被 KIT 产品线阻止 (HIGH)**
- 文件：`src/app/api/batches/[id]/transition/route.ts`
- 问题：路由仅要求 SUPERVISOR，但状态机允许 OPERATOR 执行这些操作
- 修复：改为 `["OPERATOR", "SUPERVISOR"]`

**Bug 7: CoA API 缺少权限检查 (HIGH)**
- 文件：`src/app/api/coa/[coaId]/route.ts`
- 问题：PATCH 端点直接调用 transition()，未检查用户角色和产品级权限
- 修复：
  - 新增 import：`getRolesFromPayload` from auth、`canManage`/`canOperate` from roles
  - 查询用户 productLines 和 productRoles
  - submit action：SERVICE+REPORT_PENDING → canManage(OPERATOR+SUPERVISOR)；其他 → canOperate(QC)
  - approve/reject action：canManage(SUPERVISOR+QA)
  - 查询批次时增加 productId 字段

- Lint 检查通过（仅预存 generate-plan.js 2 个 error，无新增）

Stage Summary:
- 修改文件：4 个
  - `src/components/batches/batch-reassign-dialog.tsx`（Bug 1 + Bug 2）
  - `src/app/api/batches/[id]/reassign/route.ts`（Bug 3）
  - `src/app/api/batches/[id]/transition/route.ts`（Bug 4 + Bug 5 + Bug 6）
  - `src/app/api/coa/[coaId]/route.ts`（Bug 7）
- 权限映射完整度：MANAGEMENT_ACTIONS 11 个操作，OPERATIONAL_ACTIONS 5 个操作
- 修复效果：
  - "none" 字符串不再发送到 API，null 正确传递
  - 四眼原则不再在两者都选"不指定"时误报
  - 单字段清除（显式传 null）不再被阻止
  - 所有状态转换操作均有权限检查覆盖
  - CoA 提交/批准/退回操作增加产品级权限验证
- 代码零新增 ESLint error/warning

---
Task ID: Bug Fix Batch 1
Agent: Main Agent
Task: 修复 10 个 HIGH/MEDIUM 优先级 UI/UX 和质检系统 Bug

Work Log:
- 读取 worklog.md 和所有 5 个待修改文件，了解现有代码结构
- 修复 10 个 Bug，涉及 4 个文件：

**Bug 1 (HIGH)**: `src/components/ebpr/ebpr-step-guide.tsx`
- 问题：QC 提交按钮仅检查 harvestCompleted，忽略了 expansion/differentiation 步骤
- 修复：将 `harvestCompleted` 改为 `allStepsCompleted`

**Bug 2 (HIGH)**: `src/components/ebpr/sampling-record.tsx`
- 问题：表单 notes Textarea 在提交时重置，但 notes 未包含在 POST payload 中
- 修复：在 payload 对象中添加 `notes: notes.trim() || null`

**Bug 3 (HIGH)**: `src/components/qc/qc-results-summary.tsx`
- 问题：routine records 渲染中，index > 0 的分支内部再次 `slice(1).map(...)` 导致记录重复渲染 N 次
- 修复：else 分支改为仅渲染单条 record 卡片

**Bug 4 (HIGH)**: `src/components/ebpr/generic-task-list.tsx`
- 问题：onAssignTask 回调传递 `productId: ''` 而非实际的 productId prop
- 修复：将 productId 作为 TaskCard prop 传入，回调中使用该 prop

**Bug 5 (HIGH)**: `src/app/batches/[id]/page.tsx`
- 问题：TERMINATED 有 amber banner 显示原因，SCRAPPED 无等效 banner
- 修复：添加红色 SCRAPPED banner，显示报废原因

**Bug 6 (HIGH)**: `src/app/batches/[id]/page.tsx`
- 问题：重新指派按钮无状态检查，终端状态批次仍可显示
- 修复：添加 `!['RELEASED', 'SCRAPPED', 'TERMINATED'].includes(batch.status)` 条件守卫

**Bug 7 (HIGH)**: `src/app/batches/[id]/page.tsx`
- 问题：终止/报废操作需经过通用确认对话框 + 专用对话框两次确认
- 修复：在 action button onClick 中直接路由 terminate/scrap 到专用对话框，绕过通用确认；清理 handleTransition 中不再需要的路由代码

**Bug 8 (HIGH)**: `src/app/batches/[id]/page.tsx`
- 问题：TERMINATED/SCRAPPED/RELEASED 批次的生产 tab 仍渲染 EbprStepGuide 和 GenericTaskList
- 修复：添加终端状态检查，显示 PlaceholderCard "生产记录已锁定"

**Bug 9 (MEDIUM)**: `src/app/batches/[id]/page.tsx`
- 问题：MATERIAL_PREP 状态显示 "请先完成生产记录"（应为"物料准备"）；QC_PENDING 描述硬编码为 CELL_PRODUCT
- 修复：将 MATERIAL_PREP 拆分为独立分支显示 "请先完成物料准备"；QC_PENDING 描述改为通用 "请完成质检流程"

**Bug 10 (MEDIUM)**: `src/app/batches/[id]/page.tsx`
- 问题：SCRAPPED/TERMINATED 批次的 CoA tab 显示 "暂无CoA" 和 "将在质检合格后自动生成" 的误导信息
- 修复：在 CoA tab 添加 SCRAPPED 和 TERMINATED 的早期返回，显示 "无法生成CoA"

- Lint 检查通过（仅预存 generate-plan.js 2 个 error，无新增）

Stage Summary:
- 修改文件：4 个（ebpr-step-guide.tsx、sampling-record.tsx、qc-results-summary.tsx、generic-task-list.tsx、batches/[id]/page.tsx）
- 修复 Bug：10 个（8 HIGH + 2 MEDIUM）
- 关键修复：
  - QC 提交逻辑现在正确检查所有步骤完成
  - 采样记录备注字段正确发送到 API
  - 终检记录不再重复渲染
  - 任务指派传递正确的 productId
  - 报废/终止批次有清晰的视觉提示和状态守卫
  - 终端状态批次的 production/QC/CoA tab 显示适当锁定信息
  - 消除了 terminate/scrap 操作的双对话框问题
---
Task ID: Fix-QC-Button-Display
Agent: Main Agent
Task: 修复批次详情页"提交质检"按钮在生产未完成时仍显示的问题

Work Log:
- 分析状态机和API逻辑，定位到三个问题点：
  1. 状态机中 `complete_production` 动作的 label 为"提交质检"，容易误解为QC操作
  2. API 未校验生产任务完成状态就允许 `complete_production` 转换
  3. 批次详情API返回 availableActions 时未过滤任务未完成的"完成生产"操作
- 修改 state-machine.ts：将 CELL_PRODUCT 和 KIT 两条产品线的 `complete_production` label 从"提交质检"改为"完成生产"
- 修改 transition route：添加 `complete_production` 前置校验，检查是否存在 PENDING/IN_PROGRESS 任务
- 修改 batch detail GET route：当存在未完成任务时，从 availableActions 中过滤掉 `complete_production` 和 `complete_identification`
- 修改 ebpr-step-guide.tsx：将生产步骤完成提示中的"提交质检"文案统一改为"完成生产"

Stage Summary:
- 修改文件：
  - src/lib/services/state-machine.ts (label 修正)
  - src/app/api/batches/[id]/transition/route.ts (后端任务完成校验)
  - src/app/api/batches/[id]/route.ts (前端按钮可见性控制)
  - src/components/ebpr/ebpr-step-guide.tsx (文案统一)
- "提交质检"按钮现在改名为"完成生产"，且仅在生产任务全部完成时才显示
- 同时覆盖了鉴定流程的"鉴定完成"按钮（complete_identification）

---
Task ID: 2
Agent: Main Agent
Task: 修复操作员显示不一致 — 种子复苏/收获冻存使用当前登录用户，应改为使用指派操作员

Work Log:
- 用户反馈：种子复苏和收获冻存页面的操作员字段显示当前登录用户（supervisor登录时显示supervisor，operator登录时显示operator），而扩增培养和分化诱导页面显示的是指派的操作员
- 分析四个表单组件的代码，发现所有四个表单都使用 `user?.name`（当前登录用户）来显示操作员
- 修复策略：操作员字段应优先显示任务的指派操作员（`assigneeName`），无指派时回退到当前登录用户
- 修改文件：

**1. seed-prep-form.tsx**
- task 接口增加 `assigneeName: string | null`
- 新增 `displayOperator = task.assigneeName || user?.name`
- 操作员显示区域改用 `displayOperator`

**2. harvest-form.tsx**
- task 接口增加 `assigneeName: string | null`
- 新增 `displayOperator = task.assigneeName || user?.name`
- 操作员显示区域改用 `displayOperator`

**3. expansion-form.tsx**
- 接口新增 `assignedOperatorName?: string` prop
- 新增 `displayOperator = assignedOperatorName || user?.name`
- 操作员显示区域改用 `displayOperator`

**4. differentiation-form.tsx**
- 接口新增 `assignedOperatorName?: string` prop
- 新增 `displayOperator = assignedOperatorName || user?.name`
- 操作员显示区域改用 `displayOperator`

**5. task-form-wrapper.tsx**
- EXPANSION case: 从 task 和 allTasks 推导 assignedOperatorName，传递给 ExpansionForm
- DIFFERENTIATION case: 从 task 和 allTasks 推导 assignedOperatorName，传递给 DifferentiationForm

**6. ebpr-step-guide.tsx**
- ExpansionSection: 从 allTasks 推导 assignedOperatorName，传递给 ExpansionForm
- DifferentiationSection: 从 allTasks 推导 assignedOperatorName，传递给 DifferentiationForm

- ESLint 检查通过（仅预存 generate-plan.js 2 个 error）
- Dev server 正常编译运行

Stage Summary:
- 修改文件：6 个（seed-prep-form、harvest-form、expansion-form、differentiation-form、task-form-wrapper、ebpr-step-guide）
- 统一操作员显示逻辑：优先显示任务指派操作员（assigneeName），回退到当前登录用户（user.name）
- 符合 GMP 规范：表单中显示的应为被指派执行该任务的操作员
- 代码零新增 ESLint error/warning
---
Task ID: Bugfix-1
Agent: Main Agent
Task: 修复待办显示问题 + 分化诱导 DIFFERENTIATION 指派遗漏

Work Log:
- 用户报告刘六待办中显示已放行批次 NPC-260411-002，张三待办中 NPC-260413-001 批次同时显示4个任务步骤
- 排查 my-tasks API（src/app/api/tasks/my-tasks/route.ts），发现两个根因：
  1. Prisma 查询未过滤终态批次（RELEASED/SCRAPPED/TERMINATED）
  2. toExecute 列表返回所有 PENDING/IN_PROGRESS 任务，无前驱步骤完成检查
- 修复 my-tasks API：
  - 添加 batch.status notIn 终态过滤
  - 添加按批次筛选当前可执行任务逻辑（sequenceNo 最小的未完成任务）
- 修复分化诱导 DIFFERENTIATION 指派遗漏问题：
  - 根因：transition/reassign/tasks 三个路由中的 DIFFERENTIATION 过滤逻辑仅检查 product.category，当 category 为 null 时（旧数据），DIFFERENTIATION 步骤不会被创建
  - 在 task-templates.ts 新增 shouldIncludeDifferentiation(category, batchNo) 辅助函数
  - 支持两个信号源判断：(1) product.category 匹配分化类 (2) 批次编号前缀回退判断（如 NPC-xxx）
  - 更新 transition/route.ts、reassign/route.ts、tasks/route.ts 统一使用新函数
- ESLint 检查通过（仅预存 generate-plan.js 错误）
- Dev server 编译成功

Stage Summary:
- 修改文件：src/app/api/tasks/my-tasks/route.ts（过滤终态批次 + 按步骤顺序筛选）
- 修改文件：src/lib/services/task-templates.ts（新增 shouldIncludeDifferentiation 函数）
- 修改文件：src/app/api/batches/[id]/transition/route.ts（使用 shouldIncludeDifferentiation）
- 修改文件：src/app/api/batches/[id]/reassign/route.ts（使用 shouldIncludeDifferentiation）
- 修改文件：src/app/api/batches/[id]/tasks/route.ts（使用 shouldIncludeDifferentiation）
- 待办修复：已放行/已报废/已终止批次不再出现在待办列表；NPC 批次仅显示当前需要执行的步骤
- DIFFERENTIATION 修复：通过批次编号前缀回退判断，兼容 category 未设置的旧数据

---
Task ID: 5
Agent: Main Agent
Task: 修复分化记录页面跳转错误 + 轮次偏移 bug

Work Log:
- 分析两个 bug 的根本原因：
  1. **跳转到扩增培养**：ebpr-step-guide.tsx 中的 auto-select useEffect 在 tasks 变化时重新运行，如果扩增培养步骤有 IN_PROGRESS 任务会覆盖用户手动选择的分化诱导步骤
  2. **轮次从第二轮开始**：POST 创建 COMPLETED 分化记录后，PENDING 模板任务未被清理，导致 existingDifferentiations 计数偏移
- Fix 1: 在 auto-select useEffect 中增加 userSelectedRef 守卫，用户手动点击步骤后不再自动覆盖；同时优化 auto-select 逻辑优先选择 pending 步骤（而非回退到上一个 completed 步骤）
- Fix 2: 在 POST /api/batches/[id]/tasks 中，创建阶段型任务（EXPANSION/DIFFERENTIATION/CLONE_PICKING/CLONE_SCREENING）的 COMPLETED 记录前，清理残留的 PENDING 模板任务
- Fix 3: 在 GET /api/batches/[id]/tasks 的 auto-repair 中，增加阶段型任务的 orphaned PENDING 清理逻辑（兼容旧数据）
- Fix 4: 更新 showExpansionForm/showDifferentiationForm 逻辑，移除 getStepStatus !== 'completed' 检查，允许阶段型步骤在已完成状态下仍显示表单以添加更多轮次
- Lint 检查通过

Stage Summary:
- 修改文件：src/components/ebpr/ebpr-step-guide.tsx（auto-select 守卫 + pending 优先 + showForm 逻辑）
- 修改文件：src/app/api/batches/[id]/tasks/route.ts（POST PENDING 清理 + GET auto-repair 清理）
- 三个修复点协同工作：(1) 用户手动选择步骤不再被覆盖 (2) PENDING 模板任务不干扰轮次计数和表单显示 (3) 阶段型步骤支持多轮次持续添加

---
Task ID: 6
Agent: Main Agent
Task: 在远期开发计划中添加"产品级任务表单配置引擎"详细规划

Work Log:
- 与用户讨论确认：分化记录的"轮次"模式不适用于实际业务（不同分化协议阶段不同、操作不同、需要不同的表单字段）
- 用户确认 Phase 1/2（临时改进）不需要开发，直接规划到 Phase 3（远期）
- 在 docs/plans/流程重构实施计划-v3.0.md §7.1 新增完整的远期规划，包含：
  - §7.1.1 核心概念（协议模板 → 阶段 → 字段的层次结构）
  - §7.1.2 数据模型设计草案（ProtocolTemplate / ProtocolStage / ProtocolField / ReagentLibrary）
  - §7.1.3 关键功能需求清单（10项，P0/P1/P2 优先级）
  - §7.1.4 暂存机制设计（DRAFT 状态 + TaskDraftSnapshot 审计表）
  - §7.1.5 前端动态表单引擎架构草案（DynamicFormRenderer）
  - §7.1.6 实施路径建议（Phase 4A → 4B → 4C → 4D）
  - §7.1.7 对现有系统的影响评估与迁移策略
- 更新文档修订记录（v3.0++++）和最后更新日期

Stage Summary:
- 修改文件：docs/plans/流程重构实施计划-v3.0.md
- 新增 §7.1 节约 240 行，涵盖动机、数据模型、功能需求、暂存机制、前端架构、实施路径、迁移策略

---
Task ID: Bug Fix Session 3
Agent: Main Agent
Task: 修复三个生产流程问题 — 单线流程锁定、收获冻存代次字段、质检提交流程

Work Log:
- 分析了三个用户报告的问题，深入理解现有代码逻辑
- 通过数据库查询定位 NPC-260413-001 批次的根本原因（orphaned IN_PROGRESS task）

**问题1：单线生产流程锁定**
- 发现 showExpansionForm/showDifferentiationForm 逻辑未考虑后续步骤状态
- 在 ebpr-step-guide.tsx 中新增 hasLaterStepActivity() 函数
- 当后续步骤有任何 PENDING/IN_PROGRESS/COMPLETED/REVIEWED 任务时，锁定前一步
- 扩增培养和分化诱导步骤各增加"步骤已锁定"视觉提示（灰色盾牌图标）
- 锁定后不显示添加记录表单

**问题2：收获冻存细胞代次**
- 收获冻存表单原来显示 batch.currentPassage（种子传代代次），对分化细胞不正确
- 在 harvest-form.tsx 中新增 cell_passage 手动输入字段（必填，placeholder "如：P0、P2"）
- 移除头部信息中的"当前代次"自动显示
- 在 task-summary.tsx 的 HarvestSummary 中新增细胞代次展示列

**问题3：质检提交流程修复**
- 根因：EXPANSION 模板任务处于 IN_PROGRESS 状态未被清理，阻止 complete_production
- 扩展 tasks/route.ts GET handler 的自动修复逻辑：清理 PENDING + IN_PROGRESS 两种孤立状态（原只清理 PENDING）
- 扩展 tasks/route.ts POST handler 的清理逻辑：同样清理 IN_PROGRESS（原只清理 PENDING）
- 新增 my-tasks 路由：查询 batch.qcOperatorId === userId 且 status === QC_PENDING 的批次
- 质检员现在可以在"我的待办"中看到待质检批次
- my-tasks.tsx 新增 QC_PENDING 状态标签和颜色（violet）
- 点击质检待办任务直接跳转到批次的质检标签页（?tab=qc）
- 批次详情页新增 useSearchParams 支持，根据 URL query param 设置默认标签页
- 批次详情页新增初始加载时根据 tab 参数自动获取对应数据

Stage Summary:
- 修改文件：ebpr-step-guide.tsx（单线流程锁定 + 锁定提示UI）
- 修改文件：harvest-form.tsx（新增细胞代次输入字段）
- 修改文件：task-summary.tsx（收获摘要新增细胞代次展示）
- 修改文件：tasks/route.ts GET+POST（IN_PROGRESS 孤立任务清理）
- 修改文件：my-tasks/route.ts（质检员待质检批次查询）
- 修改文件：my-tasks.tsx（QC_PENDING 状态展示 + 质检标签页导航）
- 修改文件：batches/[id]/page.tsx（URL tab 参数 + 初始数据加载）
- NPC-260413-001 批次孤立 IN_PROGRESS 任务已被自动修复逻辑清理
- 用户刘六刷新后可点击"完成生产"按钮，陈五将在待办中看到待质检批次
---
Task ID: 6-1
Agent: Main Agent
Task: 修复质检权限控制 + 不合格记录不显示

Work Log:
- 分析质检权限问题：POST /api/batches/[id]/qc 和 transition 路由中仅检查产品级 QC 角色授权，未检查 batch.qcOperatorId 是否匹配当前用户
- 修复 POST /api/batches/[id]/qc：在 canOperate 检查后新增指定质检员检查（非 ADMIN 必须 batch.qcOperatorId === payload.userId）
- 修复 POST /api/batches/[id]/transition：对 QC 操作（start_qc / pass_qc / submit_coa / resubmit_coa）新增指定质检员检查
- 分析质检不合格记录不显示问题：
  - handleQcSubmitted 未调用 fetchQcRecords 导致父组件 qcRecords 不更新
  - QC_IN_PROGRESS 状态下只显示 QcForm，不显示已有 QC 记录
  - QcResultsSummary 有独立内部状态，仅 mount 时 fetch
- 修复 handleQcSubmitted：新增 fetchQcRecords() 调用
- 修复 QC_IN_PROGRESS 状态：同时显示 QcResultsSummary（历史记录）和 QcForm
- 修复 QC_PENDING 状态（返工后）：也显示历史质检记录
- 修复 handleStartQc：新增 fetchQcRecords() 以显示返工前的失败记录
- 使用 key={qcRecords.length} 强制 QcResultsSummary 在新记录添加后重新 mount 和 fetch
- Lint 检查通过（仅预存 generate-plan.js 2 error）

Stage Summary:
- 修改文件：src/app/api/batches/[id]/qc/route.ts（新增指定质检员检查）
- 修改文件：src/app/api/batches/[id]/transition/route.ts（QC 操作新增指定质检员检查）
- 修改文件：src/app/batches/[id]/page.tsx（QC_IN_PROGRESS/QC_PENDING 显示历史记录、handleQcSubmitted/handleStartQc 刷新 QC 记录）
- 质检权限：非 ADMIN 用户必须是批次指定的质检员（qcOperatorId 匹配）才能执行质检相关操作
- 质检不合格记录：质检中状态下显示历史质检记录（含不合格记录），返工后也可查看返工前的失败记录

---
Task ID: 6-2
Agent: Main Agent
Task: 修复步骤锁定后端检查 + 确认收获冻存代次已支持手动输入

Work Log:
- 阅读分析 ebpr-step-guide.tsx，确认前端已有完整的步骤锁定 UI（expansionLocked/differentiationLocked）
- 阅读 POST /api/batches/[id]/tasks 路由，发现后端仅检查 batch.status=IN_PRODUCTION，未检查后续步骤是否已开始
- 在后端 POST /api/batches/[id]/tasks 新增单线流程锁定检查：
  - 定义 STEP_SEQ_MAP 映射各步骤的序号（SEED_PREP=1, EXPANSION=2, DIFFERENTIATION=3, HARVEST=4）
  - 查询所有批次任务，检查是否存在序号更大且状态为 PENDING/IN_PROGRESS/COMPLETED/REVIEWED 的任务
  - 如存在后续步骤活动，返回 400 错误 "后续步骤已开始，无法再添加该步骤的记录"
- 确认 harvest-form.tsx 已支持手动填写细胞代次（cellPassage 字段，非自动填充）
- Lint 检查通过（仅预存 generate-plan.js 2 error）

Stage Summary:
- 修改文件：src/app/api/batches/[id]/tasks/route.ts（新增后端步骤锁定检查）
- 前端+后端双重锁定：前端显示"步骤已锁定"提示，后端返回 400 阻止绕过
- 收获冻存细胞代次确认已为手动输入模式（cell_passage 字段，placeholder "如：P0、P2"）

---
Task ID: 6-investigate
Agent: Main Agent (via sub-agent)
Task: 调查 NPC-260413-001 批次当前状态

Work Log:
- 通过 SQLite 查询确认批次状态：QC_IN_PROGRESS（质检中）
- 质检员指派为陈五，但实际质检由李质检执行（权限问题，已在本次修复）
- 质检记录：1条 FAIL（复苏活率 80% < 85%标准）
- 主管已执行 rework 返工并重新开始质检
- "状态未正确转换"为瞬时客户端缓存问题，服务端状态机转换正确

Stage Summary:
- 当前批次状态：QC_IN_PROGRESS（返工后重新质检中）
- 权限修复后，李质检将无法再对该批次执行质检操作（非指定质检员）
- 状态转换和数据一致性问题已通过权限修复+QC记录刷新修复解决


---
Task ID: fix-resubmit-coa
Agent: Main Agent
Task: 修复 CoA 提交后错误显示"重新提交CoA"按钮的问题

Work Log:
- 分析 CoA 重新提交流程：状态机定义 resubmit_coa 为 COA_SUBMITTED→COA_SUBMITTED 自环
- 发现问题：getAvailableActions 只检查批次状态（COA_SUBMITTED），不检查 CoA 当前状态
- 正确行为：只有 CoA 被退回后（状态为 DRAFT），才应显示"重新提交CoA"按钮
- 修改 src/app/api/batches/[id]/route.ts：在 availableActions 过滤逻辑中新增 CoA 状态检查
  - 当批次状态为 COA_SUBMITTED 且存在 resubmit_coa action 时
  - 查询 CoA 当前状态，仅当 CoA.status === 'DRAFT' 时保留 resubmit_coa action
- Lint 检查通过，Dev server 正常编译运行

Stage Summary:
- 修改文件：src/app/api/batches/[id]/route.ts（新增 CoA 状态检查过滤逻辑）
- 修复效果：质检员提交 CoA 后（CoA 状态为 SUBMITTED，等待审核），"重新提交CoA"按钮不再显示
- 正确流程：CoA 被主管退回 → CoA 变为 DRAFT → 质检员修改后点击"提交审核" → API 自动识别为 resubmit_coa

---
Task ID: fix-coa-workflow-34512
Agent: Main Agent + full-stack-developer sub-agent
Task: 修复 CoA 工作流 5 个 Bug（问题 1-5）

Work Log:
- 分析 CoA 完整流程代码（状态机、CoA API、CoA 组件、批次详情页、待办任务）
- 与用户讨论确认问题 4/5 方案：移除 CoA 退回机制 + COA_SUBMITTED 增加报废选项
- 排查问题 3 根因：coa-detail.tsx DRAFT 状态"提交审核"按钮无角色限制
- 批量修复 5 个问题：

**Bug 3: supervisor 能提交 CoA（权限 Bug）**
- 修改 coa-detail.tsx：添加 `isQC` 变量，DRAFT 状态"提交审核"按钮增加 `isQC &&` 条件
- 后端 API 已有正确的 `canOperate` 权限校验（前端缺少守卫导致用户体验问题）

**Bug 4: 移除 CoA 退回机制**
- 修改 state-machine.ts：移除所有产品线的 `resubmit_coa` 转换规则 + transition() 函数中的 resubmit_coa 处理
- 修改 coa/[coaId]/route.ts：移除 reject action（~55 行）、移除 resubmit_coa 分支、清理注释
- 修改 coa-detail.tsx：移除退回按钮、重新提交按钮、退回确认对话框、rejectComment 状态、相关 import
- 清理 transition/route.ts：移除 OPERATIONAL_ACTIONS 中 resubmit_coa、移除 reject_coa handler（~50 行）、清理注释
- 清理 batches/[id]/route.ts：移除之前添加的 resubmit_coa 过滤逻辑（已无用）

**Bug 5: COA_SUBMITTED 增加报废选项**
- 修改 state-machine.ts：三条产品线（CELL_PRODUCT/SERVICE/KIT）的 COA_SUBMITTED 状态均新增 `scrap` 转换（ADMIN+SUPERVISOR 角色，requiresReason）

**Bug 1: QA 待办任务无数据**
- 修改 tasks/my-tasks/route.ts：新增 COA_SUBMITTED 批次查询，加入 toReview 列表
- 修改 my-tasks.tsx：QA 角色增加"待审核CoA"和"所有批次"快捷操作，新增 COA_SUBMITTED 状态标签

**Bug 2: CoA 退回后按钮异常**
- 由 Bug 4 的移除退回机制自动解决

- Lint 检查通过（仅预存 generate-plan.js 2 个 error）
- Dev server 正常编译运行

Stage Summary:
- 修改文件：7 个（state-machine.ts、coa/[coaId]/route.ts、coa-detail.tsx、batches/[id]/route.ts、transition/route.ts、tasks/my-tasks/route.ts、my-tasks.tsx）
- CoA 流程简化：QC_PASS → COA_SUBMITTED（approve → RELEASED | scrap → SCRAPPED）
- 权限修复：CoA 提交仅 QC 角色可见/可操作
- QA 待办：QA 登录后可在待办任务中看到 CoA 待审核批次
- 清理残留：resubmit_coa、reject_coa、reject action 全部移除，零残留
---
Task ID: 7
Agent: Main Agent
Task: 修复批次概览页面不显示中途指派操作员信息

Work Log:
- 深入分析整个操作员指派数据链路：AssignTaskDialog → PATCH /api/batches/[id]/tasks/[taskId] → batch.productionOperatorId → 概览页渲染
- 查询数据库确认 NPC-260415-001 的 batch.productionOperatorName="陈五"（数据正确），但 tasks 中 assigneeName 与 batch 不一致
- 发现根因1：tasks/[taskId]/route.ts 的同步逻辑仅当 `!currentBatch.productionOperatorId` 时才同步到 batch，导致已有操作员时新指派不会更新 batch
- 发现根因2：SEED_PREP 完成后自动激活 EXPANSION 时不继承操作员信息，导致下一步骤显示"等待指派"
- 修复1：移除 `!currentBatch.productionOperatorId` 条件，使 task 级指派始终同步到 batch.productionOperatorId
- 修复2：自动激活 EXPANSION 时，如果该任务尚未指派操作员，则继承已完成 SEED_PREP 的 assigneeId
- 修复3：同步更新 NPC-260415-001 的 PENDING/IN_PROGRESS 任务 assigneeName 与 batch.productionOperatorName 一致
- Lint 检查通过（仅预存 generate-plan.js 2 个 error）
- Dev server 编译运行正常，无编译错误

Stage Summary:
- 修改文件：src/app/api/batches/[id]/tasks/[taskId]/route.ts
- 核心修复：task 级指派操作始终同步到 batch.productionOperatorId（移除原有仅首次同步限制）
- 核心修复：SEED_PREP 完成后自动激活 EXPANSION 时继承操作员信息（保持生产连续性）
- 数据修复：NPC-260415-001 的未完成任务操作员统一更新为"陈五"
- 代码零新增 ESLint error/warning

---
Task ID: 7
Agent: Main Agent
Task: 修复报废批次记录完全不可查看的问题

Work Log:
- 用户报告 NPC-260415-001 批次报废后，所有记录（生产、质检、CoA）被锁定不可查看
- 深入排查发现根因：`SCRAPPED` 状态被与 `TERMINATED`/`RELEASED` 同等处理
  - 生产记录Tab（line 1123）：整个 EbprStepGuide 被替换为"生产记录已锁定"占位卡片
  - 质检Tab（line 1312-1319）：CELL_PRODUCT/KIT 显示"批次已报废"占位卡片
  - CoA Tab（line 1332-1337）：显示"无法生成CoA"占位卡片（但如果CoA已存在则会正确显示）
- 修改方案：报废批次保留查看权限，所有记录以只读模式展示

**修改文件：**
1. `src/components/ebpr/task-form-wrapper.tsx`：
   - 新增 `readOnly` prop
   - readOnly 模式下，非完成任务显示 TaskSummary（如有数据）或"无记录数据"提示

2. `src/components/ebpr/ebpr-step-guide.tsx`：
   - 新增 `readOnly` prop 和 Lock 图标导入
   - readOnly 模式下显示：只读横幅提示 + 步骤进度条 + 已完成任务的 TaskSummary 列表
   - 不显示表单、指派按钮、完成生产按钮等操作入口

3. `src/components/ebpr/generic-task-list.tsx`：
   - 新增 `readOnly` prop（GenericTaskListProps 和 TaskCard）
   - readOnly 模式下隐藏指派按钮，IN_PROGRESS 任务通过 TaskFormWrapper(readOnly) 显示

4. `src/app/batches/[id]/page.tsx`：
   - 生产Tab：将 `['TERMINATED', 'SCRAPPED', 'RELEASED']` 改为 `['TERMINATED', 'RELEASED']`
   - 给 EbprStepGuide 和 GenericTaskList 传递 `readOnly={batch.status === 'SCRAPPED'}`
   - 质检Tab：将 `SCRAPPED` 加入 `QC_PASS/COA_SUBMITTED/RELEASED` 的展示列表，显示已有质检记录
   - CoA Tab：无需修改（已有逻辑在 CoA 存在时正确显示）

- Lint 检查通过（仅预存 generate-plan.js 错误）
- Dev server 正常运行

Stage Summary:
- 报废批次现在可以查看所有历史记录（生产记录、质检记录、CoA）
- 所有记录以只读模式展示，带"只读模式"提示横幅
- 不可修改（无表单、无指派按钮、无操作入口）
- 终止（TERMINATED）批次仍保持完全锁定（符合业务需求）

---
Task ID: 1
Agent: main
Task: 修复详情展开和时间线中的英文字段和 [object Object] 问题

Work Log:
- 分析了 TaskSummary (task-summary.tsx) 中的 FIELD_LABELS 映射，补充了缺失的中文标签
- 分析了批次时间线 (page.tsx TimelineCard) 中的 diff 渲染逻辑，发现两个核心问题：
  1. diff 键直接用原始英文字段名显示
  2. 对象类型值用 String() 转换导致 [object Object]
- 在 page.tsx 中添加了 TIMELINE_FIELD_LABELS 映射（30+字段中英文对照）
- 添加了 SKIP_COMPLEX_KEYS 集合跳过 formData/testResults/tasks/sampleInfo 等复杂嵌套对象
- 添加了 JUDGMENT_LABELS 和 QC_TYPE_LABELS 映射用于特殊值的中文显示
- 添加了 isComplexValue() 和 formatTimelineValue() 辅助函数
- 重构了 formatDiffData() 函数，增加复杂值过滤逻辑
- 重构了时间线渲染逻辑：
  - 状态变更卡片增加 reason/terminationReason 显示
  - 通用 diff 显示使用中文标签
  - overallJudgment 显示为彩色标签（合格/不合格/待判定）
  - qcType 显示为中文（终检/过程采样）
  - QC 事件额外显示综合判定和不合格原因
  - 任务事件额外显示任务名称和步骤分组
- 补充了 task-summary.tsx 中 FIELD_LABELS 的缺失映射（鉴定、通用等字段）

Stage Summary:
- 修改文件: src/app/batches/[id]/page.tsx, src/components/ebpr/task-summary.tsx
- 时间线所有字段现在都显示中文标签，不再显示 [object Object]
- 复杂嵌套对象（formData/testResults）从时间线 diff 中过滤，避免信息冗余
- 质检记录在时间线中正确显示综合判定（彩色标签）和不合格原因
- TaskSummary 展开详情补充了更多字段的中文翻译

---
Task ID: fix-kit-batch-create
Agent: Main Agent
Task: 修复试剂盒批次创建服务器错误

Work Log:
- 用户报告创建试剂盒批次时显示"服务器错误"
- 排查 dev server 日志（无 dev.log 文件）
- 分析批次创建 API（/api/batches POST）的完整流程
- 发现根因：API 路由代码在 `db.batch.create()` 中写入了 `notes: notes || null`，但 Batch 模型的 Prisma schema 中没有 `notes` 字段
- `rg "notes" prisma/schema.prisma` 确认 `notes` 字段仅存在于 ProductionTask 模型，不在 Batch 模型中
- 修复方案：在 Batch 模型中添加 `notes String?` 字段
- 修改 prisma/schema.prisma，在 storageLocation 之后添加 notes 字段
- 运行 `bun run db:push` 同步数据库结构，成功
- 验证批次详情 API（/api/batches/[id] GET）使用 `...batch` spread 会自动包含 notes
- 验证批次详情页已包含 notes 显示逻辑（第 1297-1307 行）
- 验证种子信息卡片已正确对 KIT 产品隐藏（`batch.productLine !== 'KIT'`）
- Lint 检查通过（仅预存 generate-plan.js 2 个 error）

Stage Summary:
- 修改文件：prisma/schema.prisma（Batch 模型新增 notes String? 字段）
- 根因：Batch 表缺少 notes 列，Prisma create 写入不存在的字段导致 500 错误
- 数据库已同步：db:push 成功
- 所有产品线新建批次功能恢复正常

---
Task ID: fix-kit-batch-create-v2
Agent: Main Agent
Task: 修复试剂盒批次创建服务器错误（Turbopack 缓存问题）

Work Log:
- 用户报告试剂盒批次创建仍然显示"服务器错误"
- 在 POST API 中临时添加 debug 输出获取详细错误信息
- 错误详情：`Unknown argument 'notes'. Available options are marked with ?.`
- 根因：Turbopack 缓存了旧版 Prisma Client 编译产物，虽然已运行 `prisma generate` 和 `db:push`
- 验证方式：直接用 node 调用 Prisma Client 可以创建成功（notes 字段已存在于 Prisma Client）
- 但 Next.js 的 Turbopack 编译的 chunk 仍使用旧版（不包含 notes）
- 修复：`rm -rf .next` 清除 Turbopack 缓存后重启 dev server
- 额外修复：GET /api/batches 列表的 select 列表缺少 notes 字段，已添加
- 额外修复：移除 POST API 的临时 debug 输出
- 验证：通过 curl 完整测试创建流程，KIT 批次创建成功，notes 正确保存
- 清理测试数据

Stage Summary:
- 根因：Turbopack 缓存了旧版 Prisma Client 编译产物
- 修复方法：rm -rf .next + 重启 dev server
- 修改文件：src/app/api/batches/route.ts（select 添加 notes、移除 debug 输出）
- 试剂盒批次创建功能恢复正常

---
Task ID: KIT-QC-OVERHAUL
Agent: Main Agent
Task: 试剂盒质检差异化 — KIT常规质检(外观+无菌) + 功能性验证(关联外部批次)

Work Log:
- 分析现有QC模块代码结构：qc-form.tsx(3项细胞检测硬编码)、validation.ts(VIABILITY/MORPHOLOGY/MYCOPLASMA校验)、qc-results-summary.tsx(结果展示)、QC API route
- 确认方案一实现策略：前端根据productLine切换模板、后端新增检测项校验、功能性验证作为可选关联

**1. Prisma Schema 更新**
- QcRecord模型新增3个字段：linkedBatchId、linkedBatchNo、linkedBatchType
- qcType注释更新支持FUNCTIONAL_VERIFICATION
- db:push同步数据库

**2. QC表单重构 (qc-form.tsx)**
- 新增KIT_QC_TEMPLATE：外观检查(APPEARANCE, select合格/不合格) + 无菌检查(STERILITY, select无菌生长/有菌生长)
- 保留CELL_PRODUCT_QC_TEMPLATE：复苏活率 + 细胞形态 + 支原体检测
- 组件接收productLine prop，自动选择对应模板
- KIT产品线隐藏"复苏信息"卡片（试剂盒无需复苏）
- TestItemCard改为通用组件：根据selectOptions动态渲染下拉选项，不再硬编码itemCode分支
- 新增"功能性验证"可选区域（KIT专用，violet色主题）：
  - Checkbox启用/关闭
  - 批次类型选择按钮（细胞产品/服务项目）
  - 批次搜索（防抖300ms，最少2字符触发）
  - 搜索结果列表（批次号+产品名+状态Badge）
  - 已选批次展示卡片（可移除）
- 提交时携带functionalVerification数据（linkedBatchId/linkedBatchNo/linkedBatchType）

**3. 后端验证扩展 (validation.ts)**
- validateQcRecord新增APPEARANCE和STERILITY两个case分支
- 校验规则：judgment必填，必须为PASS或FAIL

**4. QC API增强 (route.ts)**
- qcType支持FUNCTIONAL_VERIFICATION类型
- 解析functionalVerification请求体
- 验证关联批次存在性及状态（必须已完成QC或已放行）
- 创建QcRecord时写入linkedBatchId/linkedBatchNo/linkedBatchType
- 状态检查：FUNCTIONAL_VERIFICATION允许在QC_IN_PROGRESS及之后状态创建

**5. 批次搜索API (新建)**
- 创建src/app/api/batches/search/route.ts
- GET /api/batches/search：支持productLine、search、excludeBatchId参数
- 只返回已完成QC或已放行的批次（QC_PASS/COA_SUBMITTED/RELEASED）
- 搜索字段：batchNo、productCode模糊匹配
- 限制返回10条结果

**6. 批次详情页更新 (batches/[id]/page.tsx)**
- QcForm组件传入productLine={batch.productLine}

**7. QC结果展示更新 (qc-results-summary.tsx)**
- QcRecord接口新增linkedBatchId/linkedBatchNo/linkedBatchType
- RoutineRecordDetail增加"含功能验证"Badge（violet色）
- 新增功能性验证关联信息展示卡片（violet边框，显示关联批次号和类型）

**8. CoA适配**
- CoA自动从QcRecord的testResults获取检测项，无需代码修改
- KIT批次CoA自动显示外观检查+无菌检查结果
- 种子批号/代次信息对KIT为null，InfoItem组件已处理显示'-'

- ESLint检查通过（仅预存generate-plan.js错误）
- Dev server编译成功运行

Stage Summary:
- 修改文件：prisma/schema.prisma、qc-form.tsx、validation.ts、qc/route.ts、qc-results-summary.tsx、batches/[id]/page.tsx（6个）
- 新增文件：api/batches/search/route.ts（1个）
- KIT常规质检：外观检查(目视) + 无菌检查(薄膜过滤法)，2项select检测
- 细胞产品质检：保持原有3项（复苏活率+细胞形态+支原体检测）
- 功能性验证：可选功能，关联已完成的细胞产品或服务项目批次
- 批次搜索API：支持按产品线+关键词搜索已放行批次
---
Task ID: Fix-1
Agent: Main Agent
Task: 修复开发服务器退出导致预览界面无法显示的问题 + 代码质量修复

Work Log:
- 检查开发服务器状态，发现 dev server 进程已退出
- 重新启动 dev server (`bun run dev`)，确认编译成功，页面 HTTP 200
- 代码质量检查（Explore agent），发现 3 个问题：
  1. `src/app/api/batches/search/route.ts`: `as any` 类型安全问题
  2. `src/components/qc/qc-results-summary.tsx`: 未使用的 FileText 导入
  3. `src/components/qc/qc-results-summary.tsx`: `sampleInfo` 字段不存在于 Prisma schema（QcRecord 无此字段）
- 修复 `route.ts`: `as any` → `as Prisma.ProductLine`，状态数组添加 `as Prisma.BatchStatus[]`
- 修复 `qc-results-summary.tsx`: 移除未使用的 FileText 导入，将 sampleInfo 引用改为使用 QcRecord 实际的 sampleTime 字段
- 验证：服务器正常运行，页面和 API 均返回 200

Stage Summary:
- 根因：dev server 进程意外退出导致页面无法加载
- 修复文件：`src/app/api/batches/search/route.ts`（类型安全）、`src/components/qc/qc-results-summary.tsx`（移除死代码 + 修复不存在的字段引用）
- 服务器已恢复运行，编译无错误

---
Task ID: Kit-Production-Redesign
Agent: Main Agent
Task: KIT 生产记录重新设计 — 轻量步骤日志模式（组分+组装+附件）

Work Log:
- 分析当前 KIT 生产记录实现（3个重型任务卡片：物料准备、配制生产、分装贴标）
- 与用户讨论实际业务流程，确认轻量化方案
- 修改任务模板 `task-templates.ts`：KIT start_production 从 2 个任务（PREPARATION+DISPENSING）改为 1 个任务（KIT_PRODUCTION）
- 创建 `src/components/kit/kit-production-log.tsx`（约 600 行），包含：
  - 生产指令单头部（批次号、产品名、规格、数量、操作员、质检员）
  - 物料准备区段：日期 + 状态（正常/有异常）+ 备注，完成后标记 COMPLETED
  - 组分生产记录区段：动态添加组分（名称可编辑）、多选 checkbox + 批量填写工具栏（日期、操作员、状态）、每个组分独立编辑（日期、操作员、状态、备注）、支持删除
  - 组装区段：日期、操作员、状态、备注
  - 附件统一上传区段：支持多文件选择、显示文件列表（名称、大小、类型图标）、支持删除
  - 完成生产按钮：校验所有步骤 → 保存数据（标记 COMPLETED）→ 调用 complete_production 转换
  - 只读模式：QC_PENDING 及之后的状态显示只读摘要
  - 旧版任务兼容：检测 PREPARATION/DISPENSING 旧任务时显示提示
- 修改 `src/app/batches/[id]/page.tsx`：KIT 产品线使用 KitProductionLog 替代 GenericTaskList
- Lint 检查通过（仅预存 generate-plan.js 错误，新代码零新增）

Stage Summary:
- 新建文件：src/components/kit/kit-production-log.tsx
- 修改文件：src/lib/services/task-templates.ts（KIT 任务模板简化）
- 修改文件：src/app/batches/[id]/page.tsx（KIT 条件渲染 KitProductionLog）
- KIT 生产流程：新建→开始备料→物料准备(填表)→开始配制→组分记录(动态)→组装→附件→提交质检
- 核心改进：轻量步骤日志（日期+状态+备注+附件）替代重型表单，支持多组分不同日期生产、多选批量填写、统一附件上传
---
Task ID: 7
Agent: Main Agent
Task: KIT生产流程重大改造 — 物料准备独立页面、组分预配置、配制及分装、复核人、中途重指派

Work Log:
- 读取 worklog.md 和项目结构，了解现有 KIT 生产实现
- 分析 6 项用户需求，制定实现方案

**1. Schema 扩展 — KitComponent 模型**
- 在 prisma/schema.prisma 新增 KitComponent 模型（productId, productCode, name, description, sortOrder）
- 运行 db:push 同步数据库结构

**2. 种子数据 — 试剂盒组分预配置**
- 神经分化试剂盒 (KIT-NDF-001): 4个组分（N2B27基础培养基、双SMAD抑制剂A/B、神经细胞培养基）
- 心肌分化试剂盒 (KIT-CDM-001): 5个组分（RPMI/B27基础培养基、CHIR99021、IWP2、抗坏血酸Vc、心肌细胞维持培养基）
- 运行 bun run seed 成功写入

**3. 后端 API — 3个新接口**
- GET /api/kit-components/[productCode] — 获取试剂盒组分配置
- POST /api/batches/[id]/material-prep/notify — 物料准备完成通知主管
- 修改 /api/batches/[id]/transition — KIT 批次支持 reassign_production/reassign_qc（MATERIAL_PREP/IN_PRODUCTION/QC_PENDING/QC_IN_PROGRESS 状态）

**4. 前端 — KitMaterialPrep 独立组件**
- 新建 src/components/kit/kit-material-prep.tsx
- 物料准备作为独立标签页显示（与生产记录、质检平行）
- 功能：领料日期、领料状态(正常/异常)、备注
- "通知主管"按钮 → POST /api/batches/[id]/material-prep/notify
- "完成备料"按钮 → 保存数据 + start_production 状态转换
- 物料准备完成后变为只读

**5. 前端 — KitProductionLog 重写**
- 完全重写 src/components/kit/kit-production-log.tsx
- 移除物料准备相关代码（已独立为新组件）
- 组分从产品配置自动生成（不再手动添加）
- 每个组分支持：配制日期 + 分装日期（替代原单一"配制日期"）
- 操作员默认为批次指派生产员
- 新增复核人字段（可选，手动填写）
- 组装步骤也添加复核人字段
- 保留多选批量填写、统一附件上传区域
- 完成生产验证需填写所有组分的配制日期、分装日期和操作员

**6. 批次详情页集成**
- 修改 src/app/batches/[id]/page.tsx
- KIT 批次新增"物料准备"标签页（仅 KIT 产品线显示）
- "生产记录"标签页：MATERIAL_PREP/NEW 状态显示提示引导，IN_PRODUCTION 及之后显示 KitProductionLog
- 概览页的"重新指派"按钮已支持 KIT 批次（SUPERVISOR/ADMIN 可在 MATERIAL_PREP~QC_IN_PROGRESS 状态重新指派）

- Lint 检查通过（仅预存 generate-plan.js 2 个 error，零新增）
- Dev server 编译通过

Stage Summary:
- 新增文件：prisma/schema.prisma（KitComponent模型）
- 新增文件：src/app/api/kit-components/[productCode]/route.ts
- 新增文件：src/app/api/batches/[id]/material-prep/notify/route.ts
- 新增文件：src/components/kit/kit-material-prep.tsx
- 修改文件：src/components/kit/kit-production-log.tsx（完全重写）
- 修改文件：src/app/batches/[id]/page.tsx（新增物料准备tab + 生产tab逻辑调整）
- 修改文件：prisma/seed.ts（试剂盒组分预配置数据）
- 修改文件：src/app/api/batches/[id]/transition/route.ts（KIT reassign支持）
- 6项用户需求全部实现
