# iPSC 生产管理系统 — 产品需求文档 v2.0（MVP版）

> **文档版本**：v2.0  
> **编制日期**：2026-04-12  
> **状态**：待评审  
> **关联文档**：  
> - 《iPSC生产管理流程规划方案》v1.0  
> - 《iPSC系统-双模式交互架构设计文档》v1.0  
> - 《iPSC系统-多产品线生产实现方案》v1.0  
> - 《iPSC系统-产品配置机制详解》v1.0  
> - 《iPSC系统-AI模板生成模块设计文档》v1.0  

---

## 📋 文档说明

### 与v1.0 PRD的关系

v1.0 PRD定义了系统的完整愿景（三条产品线、全模块）。本文档在v1.0基础上：

1. **融入双模式交互架构**：新增AI对话驱动模式，与表单模式共存
2. **聚焦MVP范围**：明确第一版只做iPSC细胞产品线，其他产品线后续迭代
3. **重写架构要求**：基于《双模式交互架构设计文档》的七项准备，明确后端分层设计
4. **细化开发计划**：按周拆分MVP的8周开发计划

### 术语表

| 术语 | 定义 |
|------|------|
| iPSC | 诱导多能干细胞 (Induced Pluripotent Stem Cell) |
| CoA | 分析证书 (Certificate of Analysis) |
| eBPR | 电子批生产记录 (electronic Batch Production Record) |
| MSB / WSB | 主种子库 / 工作种子库 |
| **意图层** | 统一的操作抽象，表单和AI对话都通过意图层调用业务服务 |
| **确认卡片** | AI提取结构化数据后，以可视化卡片形式供用户确认的交互组件 |
| **双模式** | 表单模式 + AI对话模式并行存在，操作同一份数据 |

---

## 1. 产品概述

### 1.1 产品定位

**iPSC生产管理系统**是一个以AI对话为主要交互方式的生产管理平台。用户通过自然语言录入生产数据，AI理解意图、提取结构化信息、生成确认卡片，确认后写入数据库。同时保留传统表单模式作为后备。

### 1.2 核心设计理念

```
对话是入口，结构化数据是根基。
AI增强效率，但不改变责任归属。
确认环节不可省略，审计追溯不可打折。
两种模式共存，数据完全一致。
```

### 1.3 MVP范围定义

```
┌─────────────────────────────────────────────────────────────────┐
│                      MVP v1.0 范围                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ 做什么                                                      │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ 产品线：iPSC细胞产品（扩增冻存）                        │     │
│  │ 完整闭环：创建批次 → 生产记录 → 质检 → CoA → 放行     │     │
│  │ 双模式：表单模式 + AI对话模式 + 模式切换               │     │
│  │ 架构基础：状态机、校验服务、审计日志、意图层            │     │
│  │ 用户体系：4个角色（简化版）                            │     │
│  │ 种子管理：基础种子信息关联（非完整种子库）             │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ❌ 不做什么                                                     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ 其他产品线：服务项目、试剂盒（Phase 2）                 │     │
│  │ AI模板生成：MD模板解析入库（Phase 2）                  │     │
│  │ 可视化表单设计器（Phase 3）                            │     │
│  │ 语音输入（Phase 3）                                   │     │
│  │ 图片AI分析 / VLM（Phase 3）                           │     │
│  │ 完整种子库管理（MSB/WSB独立模块，Phase 2）             │     │
│  │ 库存系统集成（Phase 3）                               │     │
│  │ ELN / 金蝶系统集成（Phase 3）                         │     │
│  │ 报表统计仪表盘（Phase 2）                             │     │
│  │ 追溯查询（简化版做，完整版Phase 2）                   │     │
│  │ 偏差管理 / CAPA（Phase 2）                            │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 系统架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                      表现层                                     │
│  ┌──────────────────────┐    ┌──────────────────────────┐       │
│  │    表单模式 UI        │    │    AI对话模式 UI          │       │
│  │  · 分步表单           │    │  · 对话窗口               │       │
│  │  · 列表/详情页        │    │  · 确认卡片               │       │
│  │  · 看板视图           │    │  · 图片/附件              │       │
│  └──────────┬───────────┘    └──────────┬───────────────┘       │
│             │                           │                       │
│             └───────────┬───────────────┘                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              意图层 (Intent Layer)                      │      │
│  │  record_passage / record_qc / submit_batch / ...       │      │
│  └──────────────────────┬───────────────────────────────┘      │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              应用服务层 (Application Service)          │      │
│  │  BatchService / QcService / CoaService / ...          │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │              领域层 (Domain)                           │      │
│  │  StateMachine / ValidationEngine / AuditLogger        │      │
│  └──────────────────────┬───────────────────────────────┘      │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              数据层 (Prisma + SQLite)                  │      │
│  │  batch / production_task / qc_record / coa / ...      │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. MVP用户角色

### 2.1 角色定义（MVP简化版）

| 角色 | 职责 | 核心操作 |
|------|------|---------|
| **管理员** | 用户管理、产品模板配置、系统设置 | 用户CRUD、产品定义、流程配置 |
| **生产主管** | 任务分配、进度跟踪、CoA审核、批次放行 | 查看看板、审核CoA、批准放行 |
| **生产操作员** | 执行生产操作、录入记录、质检 | 对话/表单录入、上传照片、提交质检 |
| **QA** | 质检审核、CoA审核、偏差处理 | 审核质检记录、审核CoA |

> MVP阶段不区分"服务生产组"和"细胞产品组"，统一为"生产操作员"。

### 2.2 权限矩阵（MVP）

| 功能 | 管理员 | 生产主管 | 生产操作员 | QA |
|------|:------:|:-------:|:---------:|:--:|
| 用户管理 | 全部 | — | — | — |
| 产品/流程配置 | 全部 | 查看 | — | — |
| 创建批次 | — | 全部 | 仅自己负责的 | — |
| 生产记录录入 | — | 查看/审核 | 录入/修改自己 | — |
| 质检录入 | — | 查看/审核 | 录入/修改 | 录入/修改 |
| CoA生成 | — | 审核/批准 | — | 审核 |
| 批次放行 | — | 批准 | — | — |
| 追溯查询 | 全部 | 全部 | 自己相关的 | 全部 |
| 对话模式 | — | — | ✅ 主要使用者 | ✅ 可用 |

### 2.3 用户旅程（MVP核心场景）

#### 场景1：生产操作员 — 对话模式录入传代记录

```
打开系统 → 点击批次列表中的"IPSC-260410-003-P5"
    ↓
进入对话工作台（默认对话模式）
    ↓
AI主动提示："该批次上次操作是4/11 P3→P4传代，今天预计需要P4→P5"
    ↓
操作员输入或语音："P4到P5传代，1:8比例，密度3.2乘10的5次方，形态正常"
    ↓
（可选）附上显微镜照片
    ↓
AI生成确认卡片 → 操作员核对 → 确认提交
    ↓
数据写入数据库，审计日志记录
```

#### 场景2：生产操作员 — 表单模式录入质检结果

```
生产完成后 → AI提示"可以提交质检了"
    ↓
或手动点击"开始质检"
    ↓
质检结果录入（对话或表单均可）
    ↓
AI/表单自动判定合格/不合格
    ↓
合格 → 系统自动生成CoA草稿
不合格 → 标记批次，通知主管
```

#### 场景3：QA — 审核CoA

```
登录系统 → 工作台看到"待审核CoA: 2个"
    ↓
点击进入CoA详情 → 查看质检数据、附件
    ↓
核对数据一致性 → 审核通过 或 退回修改
    ↓
通过 → 批次状态变为"已放行"
```

---

## 3. 数据模型（MVP）

### 3.1 核心实体关系

```
┌──────────┐       ┌───────────────┐       ┌──────────┐
│  user    │       │    batch      │       │   coa    │
│ 用户表   │       │   批次表       │       │ CoA表    │
└──────────┘       └──────┬────────┘       └──────────┘
                          │ 1
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼ N         ▼ N         ▼ N
     ┌────────────┐ ┌──────────┐ ┌──────────┐
     │production_ │ │qc_record │ │  audit_  │
     │  task      │ │质检记录表 │ │  log    │
     │生产任务表   │ │          │ │审计日志表 │
     └────────────┘ └──────────┘ └──────────┘
                           │
                           ▼ N
                    ┌────────────┐
                    │conversation│
                    │  _message  │
                    │对话消息表   │
                    └────────────┘
```

### 3.2 Prisma Schema（MVP完整定义）

```prisma
// ============================================
// 用户
// ============================================
model User {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(64)
  email       String   @unique @db.VarChar(128)
  password    String   // bcrypt hash
  role        Role     @default(OPERATOR)
  department  String?  @db.VarChar(64)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  createdBatches    Batch[]  @relation("CreatedBatches")
  productionTasks   ProductionTask[]
  qcRecords         QcRecord[]
  auditLogs         AuditLog[]
  conversations     Conversation[]

  @@map("user")
}

enum Role {
  ADMIN      // 管理员
  SUPERVISOR // 生产主管
  OPERATOR   // 生产操作员
  QA         // QA
}

// ============================================
// 产品定义（MVP: 预置，不支持前端配置）
// ============================================
model Product {
  id              String   @id @default(cuid())
  productCode     String   @unique @db.VarChar(32) // 如 IPSC-WT-001
  productName     String   @db.VarChar(128)
  category        String   @db.VarChar(32)        // MVP固定为 "CELL_PRODUCT"
  cellType        String   @db.VarChar(32)        // IPSC
  specification   String   @db.VarChar(64)        // 1×10^6 cells/支
  storageCondition String?  @db.VarChar(64)
  shelfLife       String?  @db.VarChar(32)        // 5年
  unit            String   @db.VarChar(16)        // 支
  description     String?  @db.Text
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())

  batches         Batch[]

  @@map("product")
}

// ============================================
// 批次（MVP: 仅细胞产品）
// ============================================
model Batch {
  id              String   @id @default(cuid())

  // 基础信息
  batchNo         String   @unique @db.VarChar(32) // IPSC-260410-003-P5
  productCode     String   @db.VarChar(32)
  productName     String   @db.VarChar(128)
  productId       String
  specification   String   @db.VarChar(64)
  unit            String   @db.VarChar(16)

  // 状态
  status          BatchStatus @default(NEW)

  // 数量
  plannedQuantity Int?
  actualQuantity  Int?

  // 种子信息
  seedBatchNo     String?  @db.VarChar(32)
  seedPassage     String?  @db.VarChar(8)   // P3
  currentPassage  String?  @db.VarChar(8)   // 当前代次，随传代自动更新

  // 存储
  storageLocation String?  @db.VarChar(64)

  // 时间
  plannedStartDate DateTime?
  plannedEndDate   DateTime?
  actualStartDate  DateTime?
  actualEndDate    DateTime?

  // 创建
  createdBy       String
  createdByName   String   @db.VarChar(64)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  product         Product  @relation(fields: [productId], references: [id])
  creator         User     @relation("CreatedBatches", fields: [createdBy], references: [id])
  tasks           ProductionTask[]
  qcRecords       QcRecord[]
  coa             Coa?
  auditLogs       AuditLog[]
  conversations   Conversation[]

  @@map("batch")
}

enum BatchStatus {
  NEW              // 新建
  IN_PRODUCTION    // 生产中
  QC_PENDING       // 待质检
  QC_IN_PROGRESS   // 质检中
  QC_PASS          // 质检合格
  QC_FAIL          // 质检不合格
  COA_PENDING      // 待生成CoA
  COA_SUBMITTED    // CoA已提交审核
  COA_APPROVED     // CoA已批准
  RELEASED         // 已放行
  SCRAPPED         // 已报废
}

// ============================================
// 生产任务（MVP: 固定步骤，不做动态流程配置）
// ============================================
model ProductionTask {
  id              String   @id @default(cuid())
  batchId         String
  batchNo         String   @db.VarChar(32)

  // 任务定义
  taskCode        String   @db.VarChar(32)   // SEED_PREP, EXPANSION, HARVEST 等
  taskName        String   @db.VarChar(64)   // 种子复苏, 扩增培养, 收获冻存
  sequenceNo      Int                        // 执行顺序
  stepGroup       String?  @db.VarChar(32)   // 分组，如 EXPANSION 下有多条传代记录

  // 状态
  status          TaskStatus @default(PENDING)

  // 执行人
  assigneeId      String?
  assigneeName    String?  @db.VarChar(64)

  // 时间
  plannedStart    DateTime?
  plannedEnd      DateTime?
  actualStart     DateTime?
  actualEnd       DateTime?

  // 表单数据（JSON: 该步骤录入的所有字段值）
  formData        Json?

  // 附件（JSON: [{url, name, type, uploadedAt}]）
  attachments     Json?  @db.Text

  // 备注
  notes           String?  @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  batch           Batch    @relation(fields: [batchId], references: [id])
  assignee        User?    @relation(fields: [assigneeId], references: [id])
  auditLogs       AuditLog[]

  @@map("production_task")
}

enum TaskStatus {
  PENDING      // 待开始
  IN_PROGRESS  // 进行中
  COMPLETED    // 已完成
  SKIPPED      // 已跳过
}

// ============================================
// 质检记录
// ============================================
model QcRecord {
  id              String   @id @default(cuid())
  batchId         String
  batchNo         String   @db.VarChar(32)
  taskId          String?  // 关联的生产任务ID

  // 质检信息
  qcType          String   @db.VarChar(32) @default("ROUTINE") // ROUTINE
  templateId      String?  @db.VarChar(32) // 质检模板编码

  // 抽样信息
  sampleQuantity  Int?
  sampleTime      DateTime?

  // 检测结果（JSON数组）
  testResults     Json    // [{itemCode, itemName, method, standard,
                          //   resultValue, resultUnit, judgment, attachments}]

  // 综合判定
  overallJudgment String   @db.VarChar(16) // PASS / FAIL
  failReason      String?  @db.Text

  // 执行
  operatorId      String?
  operatorName    String?  @db.VarChar(64)
  operatedAt      DateTime?

  // 审核
  reviewerId      String?
  reviewerName    String?  @db.VarChar(64)
  reviewComment   String?  @db.Text
  reviewedAt      DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  batch           Batch    @relation(fields: [batchId], references: [id])
  operator        User?    @relation(fields: [operatorId], references: [id])
  conversationMessages ConversationMessage[]

  @@map("qc_record")
}

// ============================================
// CoA（分析证书）
// ============================================
model Coa {
  id              String   @id @default(cuid())
  batchId         String   @unique
  batchNo         String   @db.VarChar(32)
  coaNo           String   @unique @db.VarChar(32) // COA-{batchNo}

  // 模板
  templateId      String?  @db.VarChar(32)

  // CoA内容（JSON: 产品信息+质检结果汇总+附件）
  content         Json

  // 状态
  status          CoaStatus @default(DRAFT)

  // 创建
  createdBy       String?
  createdByName   String?  @db.VarChar(64)
  createdAt       DateTime @default(now())

  // 提交
  submittedBy     String?
  submittedAt     DateTime?

  // 审核
  reviewedBy      String?
  reviewedByName  String?  @db.VarChar(64)
  reviewComment   String?  @db.Text
  reviewedAt      DateTime?

  // 批准
  approvedBy      String?
  approvedByName  String?  @db.VarChar(64)
  approvedAt      DateTime?

  batch           Batch    @relation(fields: [batchId], references: [id])

  @@map("coa")
}

enum CoaStatus {
  DRAFT      // 草稿（质检通过自动生成）
  SUBMITTED  // 已提交审核
  APPROVED   // 已批准
  REJECTED   // 已退回
}

// ============================================
// 审计日志
// ============================================
model AuditLog {
  id              String   @id @default(cuid())
  eventType       String   @db.VarChar(64)  // BATCH_CREATED, TASK_COMPLETED, QC_SUBMITTED...
  intentCode      String?  @db.VarChar(64)  // 对应的操作意图编码

  // 操作对象
  targetType      String   @db.VarChar(32)  // BATCH, TASK, QC, COA
  targetId        String
  targetBatchNo   String?  @db.VarChar(32)

  // 操作信息
  operatorId      String?
  operatorName    String?  @db.VarChar(64)
  inputMode       String   @db.VarChar(32) @default("FORM_SUBMIT") // FORM_SUBMIT / AI_CONVERSATION

  // 数据变更
  dataBefore      Json?    // 操作前快照
  dataAfter       Json?    // 操作后数据

  // AI模式特有上下文
  aiContext       Json?    // {conversationId, userMessage, aiExtracted, userConfirmed}

  createdAt       DateTime @default(now())

  batch           Batch?          @relation(fields: [targetBatchNo], references: [batchNo])
  task            ProductionTask? @relation(fields: [targetId], references: [id])
  user            User?           @relation(fields: [operatorId], references: [id])

  @@map("audit_log")
}

// ============================================
// 对话会话
// ============================================
model Conversation {
  id          String   @id @default(cuid())
  sessionId   String   @db.VarChar(64)  // 用于前端关联
  batchId     String?  // 可为空（查询类对话无批次）
  batchNo     String?  @db.VarChar(32)
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
  batch       Batch?   @relation(fields: [batchId], references: [id])
  messages    ConversationMessage[]

  @@map("conversation")
}

// ============================================
// 对话消息
// ============================================
model ConversationMessage {
  id              String   @id @default(cuid())
  conversationId  String
  role            String   @db.VarChar(16)  // USER / AI / SYSTEM
  content         String?  @db.Text
  contentType     String   @db.VarChar(16) @default("TEXT") // TEXT / IMAGE / FILE / CARD

  // 附件
  attachments     Json?    // [{url, name, type}]

  // AI消息元数据
  aiMetadata      Json?    // {intentCode, params, confidence, cardData}
  cardData        Json?    // 确认卡片协议数据（可直接传给前端渲染器）

  // 关联操作
  relatedIntentCode String?  @db.VarChar(64)
  relatedActionId  String?  // 确认后产生的auditLog ID

  createdAt       DateTime @default(now())

  conversation    Conversation @relation(fields: [conversationId], references: [id])
  qcRecord        QcRecord?    @relation(fields: [relatedActionId], references: [id])

  @@map("conversation_message")
}

// ============================================
// 预置配置（MVP: 通过seed脚本初始化，不提供前端管理）
// ============================================

// iPSC产品预置生产流程步骤
// 1. SEED_PREP    种子复苏
// 2. EXPANSION    扩增培养（可多条传代记录）
// 3. HARVEST      收获冻存
// 质检、CoA、放行由状态机自动触发，不作为独立production_task

// iPSC产品预置质检模板
// 1. VIABILITY    复苏活率     台盼蓝    ≥85%      数值
// 2. MORPHOLOGY   细胞形态     显微镜    正常iPSC   选择+照片
// 3. MYCOPLASMA   支原体       PCR法     阴性       选择+照片
```

---

## 4. 功能需求（MVP）

### 4.1 模块一：认证与用户管理

#### 4.1.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| AUTH-001 | 登录/登出 | P0 | 邮箱+密码登录 |
| AUTH-002 | 角色权限 | P0 | 4种角色，API层权限校验 |
| AUTH-003 | 用户管理（管理员） | P1 | 创建/编辑/禁用用户 |

> MVP使用简单的邮箱+密码认证，不做NextAuth复杂配置。后续迭代可升级。

---

### 4.2 模块二：工作台

#### 4.2.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| WS-001 | 我的批次列表 | P0 | 左侧导航，按状态分组显示 |
| WS-002 | 批次状态统计卡片 | P1 | 顶部显示各状态批次数量 |
| WS-003 | 待办任务提醒 | P1 | 待质检、待审核的CoA数量 |
| WS-004 | 最近访问 | P2 | 快速回到最近操作的批次 |

#### 4.2.2 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  iPSC生产管理                          🔔  ⚙️  👤张三[管理员]    │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  我的批次   │  主工作区                                          │
│  ────────  │  （根据左侧选择显示：对话窗口 / 批次详情 / 列表）   │
│            │                                                    │
│  🟡 进行中  │                                                    │
│  ────────  │                                                    │
│  🔵 IPSC.. │                                                    │
│  🔵 NPC..  │                                                    │
│            │                                                    │
│  🟢 已放行  │                                                    │
│  ────────  │                                                    │
│  🟢 IPSC.. │                                                    │
│            │                                                    │
│  ────────  │                                                    │
│  [+ 新批次]│                                                    │
│  [所有批次]│                                                    │
│            │                                                    │
├────────────┴────────────────────────────────────────────────────┤
│  © 2026 iPSC生产管理系统                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.3 模块三：批次管理

#### 4.3.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| BATCH-001 | 创建批次 | P0 | 选择产品 → 自动生成批号 → 填写计划信息 |
| BATCH-002 | 批号自动生成 | P0 | 规则：`IPSC-YYMMDD-序号-PX` |
| BATCH-003 | 批次列表 | P0 | 筛选（状态/时间/负责人）、搜索（批号） |
| BATCH-004 | 批次详情页 | P0 | Tab页：概览/生产记录/质检/CoA/时间线 |
| BATCH-005 | 批次状态流转 | P0 | 通过状态机控制，API层校验 |
| BATCH-006 | 种子信息关联 | P1 | 选择种子批号、记录代次 |

#### 4.3.2 批号生成规则（MVP）

```
格式：{产品代码}-{YYMMDD}-{当日序号}-{当前代次}

示例：IPSC-260410-003-P5

产品代码：IPSC（MVP仅此一种）
日期：260410 = 2026年4月10日
序号：当日第3个批次（3位，自动递增）
代次：P5 = 第5代

实现：
- 查询数据库中当日同产品的最大序号
- +1得到新序号
- 代次取自种子信息或由用户指定
```

#### 4.3.3 批次状态流转（MVP简化版）

```
                 创建批次
                   │
                   ▼
                ┌──────┐
         ┌──────│ NEW  │──────┐
         │      └──────┘      │
         │         │ 开始生产  │ 删除（仅NEW可删）
         │         ▼          │
         │   ┌────────────┐   │
         │   │IN_PRODUCTION│   │
         │   └──────┬─────┘   │
         │          │ 提交完成  │
         │          ▼          │
         │   ┌────────────┐   │
         │   │ QC_PENDING │   │
         │   └──────┬─────┘   │
         │          │ 开始质检  │
         │          ▼          │
         │   ┌────────────┐   │
         │   │QC_IN_PROG  │   │
         │   └──┬────┬───┘   │
         │      │    │ 提交结果 │
         │      │    ├── 合格 ──→ ┌─────────┐
         │      │    │          │QC_PASS  │
         │      │    │          └────┬────┘
         │      │    │               │ 自动生成CoA
         │      │    │               ▼
         │      │    │        ┌──────────┐
         │      │    │        │COA_DRAFT │
         │      │    │        │(SUBMITTED)│
         │      │    │        └────┬─────┘
         │      │    │             │ 审核通过
         │      │    │             ▼
         │      │    │      ┌──────────┐
         │      │    │      │RELEASED  │
         │      │    │      │(已放行)  │
         │      │    │      └──────────┘
         │      │    │
         │      │  不合格
         │      │    ▼
         │      └→┌─────────┐
         │        │ QC_FAIL │
         │        └────┬────┘
         │             │ 主管决定
         │        ┌────┴────┐
         │        ▼         ▼
         │   ┌────────┐ ┌────────┐
         │   │SCRAPPED│ │返工    │
         │   │(报废)  │ │(重新质检)│
         │   └────────┘ └────────┘
         │
      删除
```

#### 4.3.4 创建批次 — 对话模式交互

```
用户：我要新建一个iPSC细胞批次，种子用的是IPSC-WSB-2603-002，P3代

AI回复：
┌─ 📝 新建批次确认 ──────────────────┐
│                                     │
│  产品：iPSC细胞株(野生型)  🔄 自动   │
│  批号：IPSC-260412-001-P3    🔄 自动 │
│  种子批号：IPSC-WSB-2603-002  ✅ 提取│
│  种子代次：P3                ✅ 提取  │
│  计划产量：___ 支             ⚠️ 需补充│
│  交付日期：___                ⚠️ 需补充│
│                                     │
│  ⚠️ 请补充计划和交付日期              │
│                                     │
│  [✅ 确认创建]  [✏️ 补充信息]  [❌ 取消]│
└─────────────────────────────────────┘
```

> **设计决策**：创建批次涉及多个配置项，AI提取已知信息后，缺失项以"需补充"标识。用户可直接在卡片中填写，也可切换到表单模式完成。

---

### 4.4 模块四：电子批生产记录 (eBPR)

#### 4.4.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| eBPR-001 | 步骤引导 | P0 | 3步：种子复苏 → 扩增培养 → 收获冻存 |
| eBPR-002 | 传代记录（表单） | P0 | 日期、比例、密度、形态描述、照片 |
| eBPR-003 | 传代记录（对话） | P0 | 自然语言录入，AI提取，确认卡片 |
| eBPR-004 | 附件上传 | P0 | 照片上传，关联到步骤 |
| eBPR-005 | 种子复苏记录 | P0 | 复苏时间、方法、复苏后状态 |
| eBPR-006 | 收获冻存记录 | P0 | 细胞计数、活率、分装规格、成品数量 |
| eBPR-007 | 自动代次计算 | P1 | 每次传代自动+1 |
| eBPR-008 | 异常上报 | P1 | 表单/对话中上报异常 |

#### 4.4.2 iPSC产品预置eBPR字段定义

**步骤1：种子复苏**

| 字段编码 | 字段名称 | 类型 | 必填 | 默认值 | 校验 |
|---------|---------|------|:----:|--------|------|
| seed_batch_no | 种子批号 | readonly | ✅ | 创建时填 | — |
| seed_passage | 种子代次 | readonly | ✅ | 创建时填 | — |
| recovery_time | 复苏时间 | datetime | ✅ | 当前时间 | — |
| recovery_method | 复苏方法 | select | ✅ | 快速复苏 | 选项:快速/慢速 |
| recovery_status | 复苏后状态 | select+photo | ✅ | — | 选项:正常/异常 |
| operator | 操作人 | readonly | ✅ | 当前用户 | — |
| notes | 备注 | textarea | ❌ | — | — |

**步骤2：扩增培养（可多次录入）**

| 字段编码 | 字段名称 | 类型 | 必填 | 默认值 | 校验 |
|---------|---------|------|:----:|--------|------|
| passage_from | 传代前代次 | readonly | ✅ | 自动 | — |
| passage_to | 传代后代次 | readonly | ✅ | from+1 | — |
| passage_date | 传代日期 | date | ✅ | 今天 | — |
| passage_ratio | 传代比例 | select | ✅ | — | 选项:1:3,1:4,1:6,1:8,1:10 |
| cell_density | 细胞密度 | number | ✅ | — | 范围:10000-1000000 |
| media_batch_no | 培养基批号 | text | ✅ | 沿用上次 | — |
| morphology | 形态描述 | textarea | ✅ | — | — |
| morphology_photo | 形态照片 | image[] | ❌ | — | 最多5张 |
| operator | 操作人 | readonly | ✅ | 当前用户 | — |

**步骤3：收获冻存**

| 字段编码 | 字段名称 | 类型 | 必填 | 默认值 | 校验 |
|---------|---------|------|:----:|--------|------|
| harvest_time | 收获时间 | datetime | ✅ | 当前时间 | — |
| total_cells | 总细胞数 | number | ✅ | — | >0 |
| viability | 活率(%) | number | ✅ | — | 0-100 |
| vial_per_spec | 每支规格 | number | ✅ | 1×10^6 | — |
| total_vials | 总支数 | number | ✅ | 自动计算 | =total_cells/vial_per_spec |
| cryoprotectant | 冻存液批号 | text | ✅ | — | — |
| storage_location | 存储位置 | text | ✅ | — | — |
| notes | 备注 | textarea | ❌ | — | — |

#### 4.4.3 对话模式 — 传代录入完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 后端处理流程                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ① 接收用户消息                                                   │
│    "今天P4到P5传代，比例1:8，密度3.2乘10的5次方，形态正常"         │
│                                                                 │
│ ② 加载上下文                                                     │
│    GET /api/context/batch/{id}                                   │
│    → 当前批次、上次记录、默认值、可用操作                          │
│                                                                 │
│ ③ 构建LLM Prompt                                                 │
│    · System: iPSC生产助手角色                                    │
│    · Context: 批次IPSC-260410-003-P5，上次P3→P4                  │
│    · Schema: EXPANSION步骤的字段定义 + ai_hint                  │
│    · History: 最近5轮对话                                       │
│                                                                 │
│ ④ 调用LLM（z-ai-web-dev-sdk）                                    │
│    → 返回: intent + params + confidence                         │
│                                                                 │
│ ⑤ 校验                                                          │
│    POST /api/validation/validate                                 │
│    → density偏高（warning）                                       │
│    → 代次递增正确（pass）                                        │
│                                                                 │
│ ⑥ 自动填充默认值                                                 │
│    media_batch_no: 沿用 Media-20260405                           │
│    operator: 张三                                                │
│    passage_date: 今天                                            │
│                                                                 │
│ ⑦ 构建确认卡片                                                   │
│    按Card Protocol格式组装                                       │
│                                                                 │
│ ⑧ 返回给前端                                                     │
│    { replyText, cardData }                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.5 模块五：质检管理

#### 4.5.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| QC-001 | 生产完成自动创建质检任务 | P0 | 批次状态→QC_PENDING时触发 |
| QC-002 | 质检结果录入（表单） | P0 | 按模板逐项录入 |
| QC-003 | 质检结果录入（对话） | P0 | 自然语言录入，AI提取+确认 |
| QC-004 | 自动判定 | P0 | 数值型与阈值比对，选择型匹配 |
| QC-005 | 附件上传 | P0 | 检测图片、图谱 |
| QC-006 | 质检审核（QA） | P1 | QA审核质检记录 |

#### 4.5.2 iPSC质检模板（预置）

| 项目编码 | 检测项 | 方法 | 标准 | 结果类型 | 必测 |
|---------|--------|------|------|---------|:----:|
| VIABILITY | 复苏活率 | 台盼蓝 | ≥85% | 数字(%) | ✅ |
| MORPHOLOGY | 细胞形态 | 显微镜 | 正常iPSC形态 | 选择+照片 | ✅ |
| MYCOPLASMA | 支原体 | PCR法 | 阴性 | 选择+照片 | ✅ |

#### 4.5.3 对话模式 — 质检录入

```
用户：这批支原体阴性，复苏活率92%，形态正常

AI回复：
┌─ 🧪 质检结果确认 ──────────────────┐
│                                     │
│  批次：IPSC-260410-003-P5           │
│                                     │
│  ✅ 复苏活率：92% （标准≥85%）→ 合格  │
│  ✅ 细胞形态：正常 → 合格             │
│  ✅ 支原体：阴性 → 合格               │
│                                     │
│  📷 请上传检测相关照片：              │
│  [支原体PCR结果图] [形态照片]         │
│                                     │
│  综合判定：✅ 合格                    │
│                                     │
│  [✅ 确认提交]  [✏️ 修改]  [❌ 取消]  │
└─────────────────────────────────────┘
```

---

### 4.6 模块六：CoA管理

#### 4.6.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| COA-001 | 质检合格自动生成CoA草稿 | P0 | 质检PASS时自动填充 |
| COA-002 | CoA详情查看 | P0 | 产品信息+质检结果+附件 |
| COA-003 | CoA提交审核 | P0 | 生产人员/主管提交 |
| COA-004 | CoA审核（主管/QA） | P0 | 通过/退回 |
| COA-005 | CoA列表 | P1 | 按状态筛选 |

#### 4.6.2 CoA自动生成逻辑

```
质检PASS触发：
    ↓
从批次信息填充：
  · 产品名称、编号、规格
  · 批号
  · 生产日期（actualStartDate）
    ↓
从质检记录填充：
  · 复苏活率结果 + 合格判定
  · 形态判定 + 形态照片
  · 支原体结果 + 检测图片
    ↓
生成CoA草稿，状态=DRAFT
    ↓
主管/QA查看 → 审核通过 → 状态=APPROVED → 批次RELEASED
```

---

### 4.7 模块七：AI对话引擎（后端）

#### 4.7.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| AI-001 | 对话API | P0 | 接收消息，返回AI回复+确认卡片 |
| AI-002 | 上下文加载 | P0 | 加载批次上下文、历史对话、模板信息 |
| AI-003 | LLM调用 | P0 | 构建Prompt，调用z-ai-web-dev-sdk |
| AI-004 | 意图识别+参数提取 | P0 | 返回结构化的intent+params |
| AI-005 | 确认卡片生成 | P0 | 按Card Protocol组装 |
| AI-006 | 确认提交API | P0 | 用户确认后，调用对应业务服务写入数据 |
| AI-007 | 对话记录保存 | P0 | 保存对话原文+AI元数据 |
| AI-008 | 降级检测 | P0 | LLM超时/不可用时返回降级提示 |

#### 4.7.2 API设计

```
POST /api/conversation/send
请求：
{
  "conversationId": "conv-xxx",  // 已有会话
  "batchId": "batch-xxx",        // 或新建会话
  "message": "今天P4到P5传代...",
  "attachments": ["url1", "url2"] // 可选图片
}

响应：
{
  "conversationId": "conv-xxx",
  "messageId": "msg-xxx",
  "replyText": "我来确认一下提取到的信息：",
  "cardData": { ... },  // 确认卡片协议JSON，null则无卡片
  "suggestions": ["确认提交", "修改"]  // 可选快捷回复
}

POST /api/conversation/confirm
请求：
{
  "conversationId": "conv-xxx",
  "messageId": "msg-xxx",      // 关联的AI消息
  "intentCode": "record_passage",
  "params": { ... },           // 用户确认/修改后的最终参数
  "confirmed": true
}

响应：
{
  "success": true,
  "auditEventId": "evt-xxx",
  "batchNewState": "IN_PRODUCTION",
  "replyText": "✅ 传代记录已提交。该批次下一次预计4/14需要进行P5→P6传代。"
}
```

#### 4.7.3 降级策略

```typescript
// 伪代码
async function handleConversation(req) {
  try {
    // 1. 尝试调用LLM（带5秒超时）
    const aiResult = await Promise.race([
      callLLM(prompt),
      timeout(5000)
    ]);
    
    if (!aiResult) {
      return { 
        degraded: true,
        replyText: "AI助手暂时响应较慢，您可以使用表单模式继续操作。",
        suggestFormMode: true 
      };
    }
    
    return { cardData: buildConfirmationCard(aiResult) };
    
  } catch (error) {
    if (error.type === 'LLM_UNAVAILABLE') {
      return {
        degraded: true,
        replyText: "AI助手暂时不可用，已自动切换为表单模式。",
        suggestFormMode: true
      };
    }
    throw error;
  }
}
```

---

### 4.8 模块八：模式切换

#### 4.8.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| SW-001 | 手动切换按钮 | P0 | 对话工作台顶部"表单模式"按钮 |
| SW-002 | 自动降级提示 | P0 | AI超时/不可用时提示切换 |
| SW-003 | 数据同步 | P0 | 对话已确认的数据在表单中显示，反之亦然 |
| SW-004 | 用户默认模式设置 | P2 | 设置中可选默认模式 |

#### 4.8.2 交互设计

```
对话工作台顶部栏：
┌──────────────────────────────────────────────────┐
│  💬 IPSC-260410-003-P5   [📋 表单模式]  [🔄 刷新] │
│                                   ↑ 点击切换      │
└──────────────────────────────────────────────────┘

切换到表单模式后：
┌──────────────────────────────────────────────────┐
│  📋 IPSC-260410-003-P5   [💬 对话模式]  [🔄 刷新] │
├──────────────────────────────────────────────────┤
│  [概览] [生产记录] [质检] [CoA] [时间线]          │
│                                                   │
│  当前显示生产记录Tab：                              │
│  · 步骤1：种子复苏 ✅ 已完成（对话模式录入）        │
│  · 步骤2：扩增培养 🔵 进行中                       │
│    - P3→P4 1:6 2.5×10⁵ （对话模式录入）           │
│    - P4→P5 ___ （待录入）                          │
│                                                   │
│  [用对话录入下一条] ← 引导回对话模式               │
└──────────────────────────────────────────────────┘
```

---

### 4.9 模块九：时间线与追溯（简化版）

#### 4.9.1 功能清单

| 编号 | 功能 | 优先级 | 说明 |
|------|------|:------:|------|
| TL-001 | 批次时间线 | P1 | 按时间倒序展示所有操作记录 |
| TL-002 | 记录来源标识 | P1 | 标注"对话录入"或"表单录入" |
| TL-003 | 对话回溯 | P2 | 点击对话录入的记录可查看原始对话 |

---

## 5. 状态机设计（MVP）

### 5.1 实现方式

状态机在后端实现为纯TypeScript模块，不依赖外部库。

```typescript
// src/lib/state-machine/batch-state-machine.ts

type BatchState = 
  | 'NEW' | 'IN_PRODUCTION' | 'QC_PENDING' | 'QC_IN_PROGRESS'
  | 'QC_PASS' | 'QC_FAIL' | 'COA_PENDING' | 'COA_SUBMITTED'
  | 'COA_APPROVED' | 'RELEASED' | 'SCRAPPED';

interface Transition {
  from: BatchState;
  to: BatchState;
  action: string;         // 意图编码
  allowedRoles: Role[];
  auto?: boolean;         // 是否自动触发
}

const TRANSITIONS: Transition[] = [
  // 手动触发
  { from: 'NEW', to: 'IN_PRODUCTION', action: 'start_production', allowedRoles: ['SUPERVISOR', 'OPERATOR'] },
  { from: 'IN_PRODUCTION', to: 'QC_PENDING', action: 'submit_production', allowedRoles: ['SUPERVISOR', 'OPERATOR'] },
  { from: 'QC_PENDING', to: 'QC_IN_PROGRESS', action: 'start_qc', allowedRoles: ['SUPERVISOR', 'OPERATOR', 'QA'] },
  { from: 'QC_IN_PROGRESS', to: 'QC_PASS', action: 'submit_qc_pass', allowedRoles: ['SUPERVISOR', 'OPERATOR', 'QA'] },
  { from: 'QC_IN_PROGRESS', to: 'QC_FAIL', action: 'submit_qc_fail', allowedRoles: ['SUPERVISOR', 'OPERATOR', 'QA'] },
  { from: 'QC_FAIL', to: 'SCRAPPED', action: 'scrap_batch', allowedRoles: ['SUPERVISOR'] },
  { from: 'COA_SUBMITTED', to: 'COA_APPROVED', action: 'approve_coa', allowedRoles: ['SUPERVISOR', 'QA'] },
  { from: 'COA_SUBMITTED', to: 'QC_PENDING', action: 'reject_coa', allowedRoles: ['SUPERVISOR', 'QA'] },
  
  // 自动触发
  { from: 'QC_PASS', to: 'COA_PENDING', action: 'auto_generate_coa', allowedRoles: [], auto: true },
  { from: 'COA_PENDING', to: 'COA_SUBMITTED', action: 'auto_submit_coa', allowedRoles: [], auto: true },
  { from: 'COA_APPROVED', to: 'RELEASED', action: 'auto_release', allowedRoles: [], auto: true },
];

// 核心方法
export function canTransition(from: BatchState, action: string, role: Role): boolean { ... }
export function getAvailableActions(state: BatchState, role: Role): Transition[] { ... }
export function getNextState(from: BatchState, action: string): BatchState { ... }
```

### 5.2 API设计

```typescript
// POST /api/batch/[id]/transition
// 统一的批次状态流转入口，表单和对话都调这里
{
  "action": "submit_production",
  "operatorId": "user-xxx",
  "operatorName": "张三",
  "inputMode": "AI_CONVERSATION",  // 或 "FORM_SUBMIT"
  "data": { ... }  // 触发该动作需要的附加数据
}

// 响应
{
  "success": true,
  "previousState": "IN_PRODUCTION",
  "newState": "QC_PENDING",
  "autoActions": [  // 自动触发的后续动作
    { "action": "auto_create_qc_record", "result": "qc_record_id" }
  ]
}
```

---

## 6. 意图层设计（MVP）

### 6.1 MVP预置意图列表

| 意图编码 | 意图名称 | 触发场景 | 目标服务 | 对话支持 | 表单支持 |
|---------|---------|---------|---------|:-------:|:-------:|
| `create_batch` | 创建批次 | 新建生产批次 | BatchService.create | ✅ | ✅ |
| `start_production` | 开始生产 | NEW→IN_PRODUCTION | StateMachine.transition | ✅ | ✅ |
| `record_recovery` | 记录复苏 | 种子复苏步骤 | TaskService.recordStep | ✅ | ✅ |
| `record_passage` | 记录传代 | 扩增培养步骤 | TaskService.recordStep | ✅ | ✅ |
| `record_harvest` | 记录收获 | 收获冻存步骤 | TaskService.recordStep | ✅ | ✅ |
| `submit_production` | 提交生产完成 | IN_PRODUCTION→QC_PENDING | StateMachine.transition | ✅ | ✅ |
| `record_qc` | 录入质检结果 | 质检阶段 | QcService.recordResult | ✅ | ✅ |
| `submit_qc_pass` | 提交质检合格 | QC→PASS | StateMachine.transition | ✅ | ✅ |
| `submit_qc_fail` | 提交质检不合格 | QC→FAIL | StateMachine.transition | ✅ | ✅ |
| `approve_coa` | 审核通过CoA | COA→APPROVED | StateMachine.transition | ❌ | ✅ |
| `reject_coa` | 退回CoA | COA→退回 | StateMachine.transition | ❌ | ✅ |
| `scrap_batch` | 报废批次 | QC_FAIL→SCRAPPED | StateMachine.transition | ❌ | ✅ |
| `report_exception` | 上报异常 | 生产过程中 | ExceptionService.create | ✅ | ✅ |
| `query_batch_status` | 查询批次状态 | 对话查询 | QueryService.batch | ✅ | ❌ |
| `query_batch_timeline` | 查询批次时间线 | 对话查询 | QueryService.timeline | ✅ | ❌ |

> 设计原则：写操作两种模式都支持，查询仅对话模式（因为结构化页面更直观）。

### 6.2 意图→服务映射

```typescript
// src/lib/intent/intent-registry.ts

interface IntentDefinition {
  code: string;
  name: string;
  description: string;
  paramsSchema: Record<string, ParamDef>;
  requiredParams: string[];
  handler: string;  // 'BatchService.create' 等
  requiresContext: string[];  // 需要的上下文
  supportsModes: ('conversation' | 'form')[];
}

// 表单模式：提交时调用 intentRegistry.execute(intentCode, formData)
// 对话模式：AI提取后调用 intentRegistry.validate(intentCode, params) → 返回确认卡片
//          用户确认后调用 intentRegistry.execute(intentCode, confirmedParams)
```

---

## 7. 非功能性需求

### 7.1 性能

| 指标 | 目标 |
|------|------|
| 页面首屏加载 | ≤ 2秒 |
| 表单提交响应 | ≤ 500ms |
| AI对话响应（首字节） | ≤ 3秒（P95） |
| 确认卡片渲染 | ≤ 500ms |
| 批次列表查询 | ≤ 300ms（100条以内） |

### 7.2 可靠性

| 项目 | 要求 |
|------|------|
| AI模式可用性 | ≥ 99%（每月约7小时不可用窗口可接受） |
| AI不可用时 | 自动降级到表单模式，不中断工作 |
| 数据一致性 | 两种模式写入的数据结构100%一致 |
| 对话中未确认数据 | 前端本地缓存，不丢失 |

### 7.3 数据安全

| 项目 | 要求 |
|------|------|
| 对话内容隔离 | 不同用户的对话严格隔离 |
| API Key管理 | LLM API Key存储在服务端环境变量 |
| 审计完整性 | 对话原文 + AI提取 + 用户确认 三层不可篡改 |

---

## 8. 开发计划（8周MVP）

### 8.1 总览

```
Week 1-2: 基础设施 + 数据层
Week 3-4: 核心业务逻辑（表单模式）
Week 5-6: AI对话引擎
Week 7: 集成联调 + 模式切换
Week 8: 测试 + 修复 + 部署
```

### 8.2 详细拆分

---

#### Week 1：项目骨架 + 认证 + 数据模型

| 天 | 任务 | 交付物 |
|----|------|--------|
| D1 | 项目结构搭建、ESLint/Tailwind配置 | 可运行的空项目 |
| D2 | Prisma Schema定义、db push | 数据库表创建完成 |
| D3 | 用户认证（注册/登录/中间件） | 登录页面、JWT token |
| D4 | 管理员：用户管理页面（CRUD） | 用户管理Tab |
| D5 | 预置数据seed脚本（产品定义、质检模板） | 可运行的seed脚本 |

**里程碑**：能登录系统，看到基础导航框架。

---

#### Week 2：状态机 + 校验服务 + 审计日志

| 天 | 任务 | 交付物 |
|----|------|--------|
| D1 | 批次状态机实现（纯TS模块） | state-machine.ts + 单元测试 |
| D2 | 状态流转API + 权限校验 | POST /api/batch/[id]/transition |
| D3 | 统一校验服务 | POST /api/validation/validate |
| D4 | 审计日志服务 | 自动记录所有状态变更 |
| D5 | 意图层注册表 + handler骨架 | intent-registry.ts |

**里程碑**：后端基础设施就绪，可通过API创建批次并流转状态。

---

#### Week 3：批次管理 + eBPR表单模式（前半）

| 天 | 任务 | 交付物 |
|----|------|--------|
| D1 | 批次创建页面（表单） | 选择产品 → 自动批号 → 创建 |
| D2 | 批次列表页面 | 筛选、搜索、状态标签 |
| D3 | 批次详情页骨架（Tab框架） | 概览Tab + 空Tab占位 |
| D4 | eBPR表单：种子复苏步骤 | 步骤1完整表单 |
| D5 | eBPR表单：扩增培养步骤 | 传代记录表单（可多次添加） |

**里程碑**：能创建批次，通过表单录入复苏和传代记录。

---

#### Week 4：eBPR表单模式（后半）+ 质检 + CoA

| 天 | 任务 | 交付物 |
|----|------|--------|
| D1 | eBPR表单：收获冻存步骤 | 步骤3完整表单 |
| D2 | 提交生产完成 → 自动创建质检任务 | 状态机串联 |
| D3 | 质检结果录入页面（表单） | 按模板逐项录入 + 自动判定 |
| D4 | CoA自动生成 + CoA详情页 | 质检PASS → 自动CoA |
| D5 | CoA审核流程 + 批次放行 | 主管审核 → 放行 |

**里程碑**：表单模式下完整闭环：创建→生产→质检→CoA→放行。

---

#### Week 5：AI对话引擎（后端）

| 天 | 任务 | 交付物 |
|----|------|--------|
| D1 | 对话API框架（send/confirm） | POST /api/conversation/* |
| D2 | 上下文服务 | 加载批次上下文、模板字段 |
| D3 | LLM集成（z-ai-web-dev-sdk） | Prompt构建 + 调用 |
| D4 | 意图识别 + 参数提取 + 确认卡片生成 | record_passage场景跑通 |
| D5 | 更多意图支持（record_qc, submit_production等） | 覆盖主要生产场景 |

**里程碑**：后端AI引擎能理解传代录入的自然语言并返回确认卡片。

---

#### Week 6：AI对话引擎（前端）+ 更多场景

| 天 | 任务 | 交付物 |
|----|------|--------|
| D1 | 对话工作台UI框架 | 左侧批次列表 + 右侧对话窗口 |
| D2 | 确认卡片通用渲染器 | 根据Card Protocol渲染 |
| D3 | 确认/修改/取消交互流程 | 确认后调用confirm API |
| D4 | 对话场景覆盖（质检录入、提交完成） | 3个主要场景对话可用 |
| D5 | 对话记录展示 + 降级处理 | 对话回溯 + AI不可用提示 |

**里程碑**：对话模式下也能完成"传代→提交→质检→CoA"完整流程。

---

#### Week 7：模式切换 + 工作台完善

| 天 | 任务 | 交付物 |
|----|------|--------|
| D1 | 模式切换机制 | 对话↔表单数据同步 |
| D2 | 工作台：批次状态统计 + 待办 | 顶部统计卡片 |
| D3 | 批次时间线Tab | 按时间展示所有操作记录 |
| D4 | 异常上报（对话+表单） | 异常记录功能 |
| D5 | 首页优化 + 整体UI打磨 | 响应式适配、加载状态 |

**里程碑**：双模式完整可用，可以互相切换。

---

#### Week 8：集成测试 + Bug修复 + 部署准备

| 天 | 任务 | 交付物 |
|----|------|--------|
| D1 | 端到端测试（表单模式完整流程） | 测试用例 + 修复 |
| D2 | 端到端测试（对话模式完整流程） | 测试用例 + 修复 |
| D3 | 权限测试 + 边界case | 各角色操作权限验证 |
| D4 | UI细节修复 + 文案校对 | 体验打磨 |
| D5 | 部署文档 + 交付准备 | README + 环境配置说明 |

**里程碑**：MVP v1.0可交付。

---

### 8.3 里程碑节点

```
Week 2 End  🔵 基础设施就绪（状态机+校验+审计+意图层）
Week 4 End  🟢 表单模式闭环（创建→生产→质检→CoA→放行）
Week 6 End  🟡 对话模式闭环（AI理解→确认→提交）
Week 8 End  🏁 MVP v1.0 交付（双模式+完整流程）
```

---

## 9. 后续迭代规划（非MVP）

### Phase 2（预计4-6周）

| 功能 | 说明 |
|------|------|
| 试剂盒产品线 | 配制→分装→质检→效力验证→CoA |
| 服务项目产品线 | 重编程/基因编辑/分化服务 |
| 完整种子库管理 | MSB/WSB独立模块 |
| 追溯查询增强 | 成品→种子的全链路追溯 |
| 报表统计 | 生产统计、质检趋势、效率分析 |

### Phase 3（预计4-6周）

| 功能 | 说明 |
|------|------|
| 语音输入 | ASR集成，戴手套操作 |
| 图片AI分析 | VLM识别细胞形态 |
| AI模板生成 | MD模板解析入库 |
| 可视化表单设计器 | 拖拽配置新产品的eBPR |
| 系统集成 | 库存系统、ELN、金蝶 |
| 偏差管理/CAPA | 不合格品处理流程 |

---

## 10. 技术约束

| 项目 | 约束 |
|------|------|
| 框架 | Next.js 16 + App Router |
| 语言 | TypeScript 5（strict mode） |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 数据库 | Prisma ORM + SQLite |
| AI调用 | z-ai-web-dev-sdk（服务端） |
| 认证 | 简单JWT（MVP），后续可升级NextAuth |
| 状态管理 | Zustand（客户端状态） |
| 文件上传 | 本地存储（/public/uploads） |
| API风格 | RESTful，POST用于写操作 |
| LLM选择 | GPT-4o（主）/ 可切换其他模型 |

---

> **文档结束**
>
> 本文档定义了MVP v1.0的完整范围、数据模型、功能需求、AI对话架构和8周开发计划。
> 核心原则：**表单模式保证可用性，对话模式提升效率，两种模式数据一致，随时可切换。**
