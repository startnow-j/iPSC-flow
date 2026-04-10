# iPSC生产管理系统 - 多产品线生产实现方案

> **文档版本**: v1.0  
> **编制日期**: 2026-04-10  
> **关联文档**: 《iPSC生产管理系统-PRD》

---

## 1. 三种产品线生产过程全景图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         三大产品线生产过程对比                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │    服务项目          │  │    细胞产品          │  │    试剂盒            │ │
│  │   (订单驱动)         │  │   (库存驱动)         │  │   (产品驱动)         │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘ │
│             │                        │                        │            │
│             ▼                        ▼                        ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ ① 订单接收          │  │ ① 库存预警/生产计划  │  │ ① 生产指令          │ │
│  │    客户下单          │  │    低于安全库存      │  │    MRP计算          │ │
│  │    可行性评估        │  │    或销售预测        │  │    批量生产计划      │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘ │
│             │                        │                        │            │
│             ▼                        ▼                        ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ ② 样本/种子准备      │  │ ② 种子库管理         │  │ ② 物料准备          │ │
│  │    客户样本接收      │  │    MSB/WSB建立       │  │    原料出库          │ │
│  │    或种子细胞准备    │  │    种子复苏          │  │    配方核对          │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘ │
│             │                        │                        │            │
│             ▼                        ▼                        ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ ③ 核心生产           │  │ ③ 扩增/分化生产      │  │ ③ 配制生产          │ │ │
│  │    ├─重编程(2-4周)   │  │    iPSC扩增冻存      │  │    按配方配制       │ │
│  │    ├─基因编辑(2-4周) │  │    或分化培养        │  │    过滤除菌         │ │
│  │    └─分化(10-30天)   │  │    (10-30天)         │  │    (1-3天)          │ │
│  │                     │  │                     │  │                     │ │
│  │    ⚠️ 质检融入过程   │  │    标准化操作        │  │    标准化操作        │ │
│  │    克隆挑选即质检    │  │                     │  │                     │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘ │
│             │                        │                        │            │
│             ▼                        ▼                        ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ ④ 鉴定/质检          │  │ ④ 产品质检           │  │ ④ 质检+效力验证      │ │
│  │    建系鉴定          │  │    每批抽检          │  │    无菌检测(必检)    │ │
│  │    或编辑鉴定        │  │    活率/支原体/形态  │  │    效力验证(选检)    │ │
│  │    (服务的一部分)    │  │                     │  │    ⏱ 0.5-1个月      │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘ │
│             │                        │                        │            │
│             ▼                        ▼                        ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ ⑤ 报告/CoA生成       │  │ ⑤ CoA生成           │  │ ⑤ CoA生成           │ │
│  │    实验报告+CoA      │  │    标准CoA           │  │    简化CoA           │ │
│  │    整合所有数据      │  │    质检数据自动填充   │  │    无原始图片        │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘ │
│             │                        │                        │            │
│             ▼                        ▼                        ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ ⑥ 交付              │  │ ⑥ 入库→销售         │  │ ⑥ 入库→销售         │ │
│  │    直接发给客户      │  │    库存管理          │  │    库存管理          │ │
│  │    或移交产品组      │  │    按订单出库        │  │    按订单出库        │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 系统架构设计：如何统一支持三种产品线

### 2.1 核心设计思想："流程模板化 + 环节可配置"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         统一生产管理平台架构                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        业务流程引擎层                                │  │
│   │                                                                     │  │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │  │
│   │   │ 服务项目流程 │    │ 细胞产品流程 │    │ 试剂盒流程   │            │  │
│   │   │   模板      │    │   模板      │    │   模板      │            │  │
│   │   │             │    │             │    │             │            │  │
│   │   │ 环节1:订单  │    │ 环节1:计划  │    │ 环节1:指令  │            │  │
│   │   │ 环节2:样本  │    │ 环节2:种子  │    │ 环节2:备料  │            │  │
│   │   │ 环节3:生产  │    │ 环节3:生产  │    │ 环节3:配制  │            │  │
│   │   │ 环节4:鉴定  │    │ 环节4:质检  │    │ 环节4:质检  │            │  │
│   │   │ 环节5:报告  │    │ 环节5:CoA   │    │ 环节5:CoA   │            │  │
│   │   │ 环节6:交付  │    │ 环节6:入库  │    │ 环节6:入库  │            │  │
│   │   └─────────────┘    └─────────────┘    └─────────────┘            │  │
│   │                                                                     │  │
│   │   【配置化定义每个环节的：表单模板、审批流、执行人、前置条件】        │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        通用业务服务层                                │  │
│   │                                                                     │  │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│   │   │ 批次服务  │ │ 任务服务  │ │ 质检服务  │ │ CoA服务  │ │ 追溯服务  │ │  │
│   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│   │                                                                     │  │
│   │   【所有产品线共享的基础服务，通过参数区分行为差异】                  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        数据模型层                                    │  │
│   │                                                                     │  │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│   │   │ 批次表   │ │ 任务表   │ │ 质检表   │ │ CoA表    │ │ 物料表   │ │  │
│   │   │ (统一)   │ │ (统一)   │ │ (统一)   │ │ (统一)   │ │ (统一)   │ │  │
│   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│   │                                                                     │  │
│   │   【统一的数据模型，通过 type 字段区分产品线】                        │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 关键抽象：生产环节（Activity）

将三种产品线的生产过程抽象为统一的生产环节：

```typescript
// 生产环节定义
interface ProductionActivity {
  // 基础信息
  activityCode: string;        // 环节编码：如 "PRODUCE", "QC", "COA"
  activityName: string;        // 环节名称：如 "生产执行"
  
  // 配置属性
  productLine: 'SERVICE' | 'CELL' | 'KIT';  // 适用产品线
  isRequired: boolean;         // 是否必须
  order: number;               // 执行顺序
  
  // 表单配置
  formTemplateId: string;      // 关联的表单模板
  
  // 流程配置
  preConditions: Condition[];  // 前置条件
  nextActivities: string[];    // 可流转到的下一环节
  
  // 执行配置
  defaultAssignee: AssigneeRule;  // 默认分配规则
  timeoutWarning: number;      // 超时预警（小时）
  
  // 特殊配置
  specialConfig: {
    // 服务项目特有
    serviceType?: 'REPROGRAM' | 'EDIT' | 'DIFFERENTIATION';
    
    // 细胞产品特有
    cellType?: 'IPSC' | 'DIFFERENTIATED';
    
    // 试剂盒特有
    kitType?: 'DIFFERENTIATION' | 'MEDIUM';
    
    // 质检特有
    qcTemplateId?: string;     // 质检模板
    
    // CoA特有
    coaTemplateId?: string;    // CoA模板
  };
}
```

### 2.3 三种产品线的环节配置对比

```yaml
# 服务项目 - 重编程建系流程配置
service_reprogramming_flow:
  activities:
    - code: ORDER
      name: 订单接收
      form: service_order_form
      
    - code: SAMPLE_RECEIVE
      name: 样本接收
      form: sample_receive_form
      
    - code: REPROGRAMMING
      name: 重编程
      form: reprogramming_record_form
      duration: 14-28  # 天
      
    - code: EARLY_PASSAGE
      name: 早代冻存
      form: cryopreservation_form
      # 关键：此处触发交接
      trigger_handover: true
      
    - code: EXPANSION
      name: 扩增培养
      form: culture_record_form
      # 服务特有：可能由不同人员执行
      allow_reassignment: true
      
    - code: CHARACTERIZATION
      name: 建系鉴定
      form: characterization_form
      # 鉴定即质检，融入过程
      is_qc: true
      
    - code: REPORT
      name: 报告生成
      form: service_report_form
      # 服务报告 + CoA 合并
      generate_coa: true
      
    - code: DELIVERY
      name: 交付
      form: delivery_form
      # 可选择移交产品组
      allow_transfer_to_product: true

---
# 细胞产品 - iPSC生产流程配置
cell_ipsc_flow:
  activities:
    - code: PLAN
      name: 生产计划
      form: production_plan_form
      trigger: INVENTORY_LOW  # 库存预警触发
      
    - code: SEED_PREP
      name: 种子准备
      form: seed_preparation_form
      # 关联种子库
      link_to_seed_bank: true
      
    - code: EXPANSION
      name: 扩增冻存
      form: batch_production_form
      template_id: eBPR_IPSC_001
      
    - code: QC
      name: 产品质检
      form: qc_record_form
      template_id: QC_IPSC_001
      # 必须抽检
      sampling_required: true
      sampling_ratio: 1  # 每批抽1支
      
    - code: COA
      name: CoA生成
      form: coa_form
      template_id: COA_IPSC_001
      # 自动填充质检数据
      auto_fill_from_qc: true
      
    - code: RELEASE
      name: 放行入库
      form: release_form
      # 集成库存系统
      integrate_inventory: true

---
# 试剂盒 - 分化试剂盒生产流程配置
kit_differentiation_flow:
  activities:
    - code: ORDER
      name: 生产指令
      form: kit_production_order_form
      # MRP计算
      mrp_calculation: true
      
    - code: MATERIAL_PREP
      name: 物料准备
      form: material_preparation_form
      # 配方展开
      expand_formula: true
      
    - code: PREPARATION
      name: 配制
      form: preparation_record_form
      # 多组分
      multi_component: true
      component_count: 5-10
      
    - code: DISPENSING
      name: 分装贴标
      form: dispensing_form
      
    - code: QC
      name: 质检
      form: kit_qc_form
      items:
        - name: 无菌检测
          required: true
        - name: 效力验证
          required: false
          # 长周期验证
          long_term: true
          duration: 15-30  # 天
          # 委托细胞产品组
          delegate_to: CELL_PRODUCT_TEAM
          
    - code: COA
      name: CoA生成
      form: kit_coa_form
      template_id: COA_KIT_001
      # 简化CoA，无原始图片
      include_raw_data: false
      
    - code: RELEASE
      name: 放行入库
      form: release_form
```

---

## 3. 统一数据模型设计

### 3.1 核心表结构

```sql
-- ============================================
-- 批次主表 (统一三种产品线)
-- ============================================
CREATE TABLE batch (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- 基础信息
    batch_no VARCHAR(32) NOT NULL COMMENT '批号',
    batch_type TINYINT NOT NULL COMMENT '批次类型: 1服务 2细胞产品 3试剂盒',
    
    -- 产品线细分
    product_line VARCHAR(32) COMMENT '产品线细分',
    -- 服务项目: REPROGRAM(重编程), EDIT(基因编辑), DIFF_SERVICE(分化服务)
    -- 细胞产品: IPSC, NPC(神经前体), CM(心肌细胞)
    -- 试剂盒: DIFF_KIT(分化试剂盒), MEDIUM(培养基)
    
    -- 产品信息
    product_id BIGINT COMMENT '产品ID',
    product_code VARCHAR(32) COMMENT '产品代码',
    product_name VARCHAR(128) COMMENT '产品名称',
    specification VARCHAR(64) COMMENT '规格',
    
    -- 状态管理
    status VARCHAR(32) COMMENT '状态',
    -- 通用状态: NEW/IN_PROGRESS/QC_PENDING/QC_IN_PROGRESS/QC_PASS/QC_FAIL
    --           COA_PENDING/COA_REVIEW/RELEASED/IN_STORAGE/SHIPPED/SCRAPPED
    
    -- 数量信息
    planned_quantity INT COMMENT '计划产量',
    actual_quantity INT COMMENT '实际产量',
    unit VARCHAR(16) COMMENT '单位',
    
    -- 时间信息
    planned_start_date DATE COMMENT '计划开始日期',
    planned_end_date DATE COMMENT '计划完成日期',
    actual_start_date DATE COMMENT '实际开始日期',
    actual_end_date DATE COMMENT '实际完成日期',
    
    -- 关联信息
    order_id BIGINT COMMENT '关联订单ID（服务/试剂盒）',
    order_no VARCHAR(32) COMMENT '订单号',
    
    -- 种子信息（细胞产品/服务项目）
    seed_batch_id BIGINT COMMENT '种子批次ID',
    seed_batch_no VARCHAR(32) COMMENT '种子批号',
    passage VARCHAR(8) COMMENT '细胞代次',
    
    -- 存储信息
    storage_location VARCHAR(64) COMMENT '存储位置',
    
    -- 创建信息
    created_by BIGINT COMMENT '创建人ID',
    created_by_name VARCHAR(64) COMMENT '创建人姓名',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_batch_no (batch_no),
    INDEX idx_batch_type (batch_type),
    INDEX idx_status (status),
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at)
) COMMENT='批次主表';

-- ============================================
-- 生产任务表 (统一三种产品线的任务)
-- ============================================
CREATE TABLE production_task (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL COMMENT '关联批次ID',
    
    -- 任务定义
    task_code VARCHAR(32) COMMENT '任务编码',
    task_name VARCHAR(64) COMMENT '任务名称',
    task_type VARCHAR(32) COMMENT '任务类型',
    -- PRODUCE(生产), QC(质检), COA(CoA), RELEASE(放行)
    
    -- 执行顺序
    sequence_no INT COMMENT '执行顺序',
    
    -- 状态
    status VARCHAR(32) COMMENT '状态: PENDING/IN_PROGRESS/COMPLETED/REJECTED',
    
    -- 负责人
    assignee_id BIGINT COMMENT '负责人ID',
    assignee_name VARCHAR(64) COMMENT '负责人姓名',
    
    -- 时间
    planned_start_time DATETIME COMMENT '计划开始时间',
    planned_end_time DATETIME COMMENT '计划完成时间',
    actual_start_time DATETIME COMMENT '实际开始时间',
    actual_end_time DATETIME COMMENT '实际完成时间',
    
    -- 表单数据（JSON格式，存储各环节填写的数据）
    form_data JSON COMMENT '表单数据',
    form_template_id VARCHAR(32) COMMENT '表单模板ID',
    
    -- 附件
    attachments JSON COMMENT '附件列表',
    
    -- 审核信息
    reviewer_id BIGINT COMMENT '审核人ID',
    review_comment VARCHAR(512) COMMENT '审核意见',
    review_time DATETIME COMMENT '审核时间',
    
    -- 创建信息
    created_by BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_batch_id (batch_id),
    INDEX idx_status (status),
    INDEX idx_assignee (assignee_id)
) COMMENT='生产任务表';

-- ============================================
-- 质检记录表 (统一三种产品线的质检)
-- ============================================
CREATE TABLE qc_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL COMMENT '关联批次ID',
    task_id BIGINT COMMENT '关联任务ID',
    
    -- 质检类型
    qc_type VARCHAR(32) COMMENT '质检类型',
    -- ROUTINE(常规质检), CHARACTERIZATION(鉴定), POTENCY(效力验证)
    
    -- 质检模板
    template_id VARCHAR(32) COMMENT '质检模板ID',
    template_name VARCHAR(64) COMMENT '模板名称',
    
    -- 抽样信息
    sample_quantity INT COMMENT '抽样数量',
    sample_batch_no VARCHAR(32) COMMENT '抽样批号',
    
    -- 检测结果（JSON数组）
    test_results JSON COMMENT '检测结果',
    -- 格式: [
    --   {
    --     "item_code": "VIABILITY",
    --     "item_name": "复苏活率",
    --     "method": "台盼蓝",
    --     "standard": ">=85%",
    --     "result_value": 92,
    --     "result_unit": "%",
    --     "result_text": "92%",
    --     "judgment": "PASS",
    --     "attachments": [...]
    --   }
    -- ]
    
    -- 综合判定
    overall_judgment VARCHAR(16) COMMENT '综合判定: PASS/FAIL',
    fail_reason VARCHAR(512) COMMENT '不合格原因',
    
    -- 效力验证特有（试剂盒）
    is_potency_test BOOLEAN DEFAULT FALSE COMMENT '是否效力验证',
    potency_delegate_to BIGINT COMMENT '委托给（细胞产品组）',
    potency_start_date DATE COMMENT '验证开始日期',
    potency_expected_end DATE COMMENT '预计完成日期',
    potency_actual_end DATE COMMENT '实际完成日期',
    
    -- 执行信息
    operator_id BIGINT,
    operator_name VARCHAR(64),
    operation_time DATETIME,
    
    -- 审核信息
    reviewer_id BIGINT,
    reviewer_name VARCHAR(64),
    review_time DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_batch_id (batch_id),
    INDEX idx_qc_type (qc_type)
) COMMENT='质检记录表';

-- ============================================
-- CoA表
-- ============================================
CREATE TABLE coa (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL COMMENT '关联批次ID',
    
    coa_no VARCHAR(32) COMMENT 'CoA编号',
    
    -- 模板信息
    template_id VARCHAR(32) COMMENT '模板ID',
    template_name VARCHAR(64) COMMENT '模板名称',
    
    -- CoA内容（JSON）
    content JSON COMMENT 'CoA内容',
    -- 包含产品信息、检测结果、附件等
    
    -- 状态
    status VARCHAR(32) COMMENT '状态: DRAFT/SUBMITTED/APPROVED/REJECTED',
    
    -- 创建信息
    created_by BIGINT,
    created_by_name VARCHAR(64),
    created_at DATETIME,
    
    -- 提交信息
    submitted_by BIGINT,
    submitted_at DATETIME,
    
    -- 审核信息
    reviewed_by BIGINT,
    reviewed_by_name VARCHAR(64),
    review_comment VARCHAR(512),
    reviewed_at DATETIME,
    
    -- 批准信息
    approved_by BIGINT,
    approved_by_name VARCHAR(64),
    approved_at DATETIME,
    
    -- 电子签名
    signature_data TEXT COMMENT '签名数据',
    
    -- PDF文件
    pdf_url VARCHAR(256) COMMENT 'PDF文件地址',
    
    INDEX idx_batch_id (batch_id),
    INDEX idx_status (status)
) COMMENT='CoA表';

-- ============================================
-- 物料使用记录表
-- ============================================
CREATE TABLE material_usage (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL COMMENT '关联批次ID',
    task_id BIGINT COMMENT '关联任务ID',
    
    -- 物料信息
    material_id BIGINT COMMENT '物料ID',
    material_code VARCHAR(32) COMMENT '物料编码',
    material_name VARCHAR(128) COMMENT '物料名称',
    material_batch_no VARCHAR(32) COMMENT '物料批号',
    
    -- 使用信息
    quantity DECIMAL(10,3) COMMENT '用量',
    unit VARCHAR(16) COMMENT '单位',
    usage_date DATE COMMENT '使用日期',
    
    -- 关联库存
    inventory_id BIGINT COMMENT '库存记录ID',
    
    -- 录入方式
    input_method VARCHAR(16) COMMENT '录入方式: SCAN/MANUAL/SELECT',
    
    operator_id BIGINT,
    operator_name VARCHAR(64),
    created_at DATETIME,
    
    INDEX idx_batch_id (batch_id)
) COMMENT='物料使用记录表';
```

### 3.2 数据模型关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            数据模型关系图                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│   │   order     │◄────────│   batch     │────────►│   coa       │          │
│   │   (订单)    │  1:N    │   (批次)    │   1:1   │   (CoA)     │          │
│   └─────────────┘         └──────┬──────┘         └─────────────┘          │
│                                  │                                          │
│                    ┌─────────────┼─────────────┐                           │
│                    │             │             │                           │
│                    ▼             ▼             ▼                           │
│            ┌───────────┐ ┌───────────┐ ┌───────────┐                      │
│            │production │ │  qc_record│ │  material │                      │
│            │   _task   │ │  (质检)   │ │  _usage   │                      │
│            │  (任务)   │ │           │ │ (物料使用)│                      │
│            └───────────┘ └───────────┘ └───────────┘                      │
│                                                                             │
│   【关系说明】                                                               │
│   - 一个订单可以有多个批次（服务订单可能分多个批次执行）                        │
│   - 一个批次有多个生产任务（按环节拆分）                                      │
│   - 一个批次有多个质检记录（服务项目可能有多个阶段质检）                        │
│   - 一个批次有多个物料使用记录                                               │
│   - 一个批次对应一个CoA                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 业务流程实现细节

### 4.1 服务项目流程实现

#### 4.1.1 重编程建系服务 - 系统流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     重编程建系服务 - 系统流程                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ① 订单创建                                                                 │
│     ├─ 销售在CRM/订单系统录入订单                                           │
│     ├─ 同步到生产管理系统 → 生成服务订单                                    │
│     ├─ 主管评估可行性 → 确认排期                                            │
│     └─ 系统生成服务批次（批号格式：SRV-YYMM-XXX）                           │
│                                                                             │
│  ② 样本接收登记                                                             │
│     ├─ 收到客户样本 → 仓管/生产扫码登记                                     │
│     ├─ 系统记录：样本信息、接收时间、存储位置                               │
│     └─ 自动生成样本接收任务 → 分配给指定人员                                │
│                                                                             │
│  ③ 重编程生产（阶段一）                                                     │
│     ├─ 生产人员领取任务 → 开始重编程                                        │
│     ├─ 按天录入重编程记录（系统按SOP提示每日操作）                          │
│     ├─ 关键节点：克隆出现 → 拍照上传 → 系统记录                             │
│     └─ 阶段完成：早代冻存                                                   │
│                                                                             │
│  ④ ⚠️ 交接点（系统关键设计）                                                │
│     ├─ 人员A完成早代冻存 → 在系统提交"交接申请"                             │
│     ├─ 系统生成《批次交接单》                                               │
│     ├─ 包含：细胞信息、冻存位置、代次、已完成工作摘要                       │
│     ├─ 人员B在系统"接收交接" → 确认信息无误                                 │
│     └─ 系统记录交接双方、时间，批次继续流转                                 │
│                                                                             │
│  ⑤ 扩增培养（阶段二）                                                       │
│     ├─ 人员B领取交接后的批次 → 开始扩增                                     │
│     ├─ 录入细胞培养记录（复苏、传代、冻存）                                 │
│     └─ 系统自动计算细胞代次                                                 │
│                                                                             │
│  ⑥ 建系鉴定（融入过程的质检）                                               │
│     ├─ 系统根据SOP提示鉴定节点                                              │
│     ├─ 鉴定项目：支原体、核型、多能性标记、STR                              │
│     ├─ 每项鉴定在系统中录入结果                                             │
│     ├─ 外送检测（核型）：系统记录送检信息，结果回填                         │
│     └─ 系统自动判定每项鉴定是否合格                                         │
│                                                                             │
│  ⑦ 报告与CoA生成                                                            │
│     ├─ 所有鉴定完成后 → 系统自动汇总数据                                    │
│     ├─ 生成《实验报告》+《CoA》草稿                                         │
│     ├─ 实验报告：完整的建系过程记录                                         │
│     ├─ CoA：符合交付标准的质检数据                                          │
│     ├─ 主管审核 → 电子签名                                                  │
│     └─ 系统标记"可交付"                                                     │
│                                                                             │
│  ⑧ 交付与移交                                                              │
│     ├─ 路径A：直接交付客户                                                  │
│     │        ├─ 仓管在系统创建出库单                                        │
│     │        ├─ 打印CoA随货                                                 │
│     │        └─ 系统更新批次状态为"已出库"                                  │
│     │                                                                       │
│     └─ 路径B：移交产品组（成为现货细胞）                                    │
              ├─ 在系统提交"移交产品组"申请                                   │
              ├─ 额外冻存种子级细胞                                           │
              ├─ 填写《细胞株移交单》（系统表单）                             │
              ├─ 产品组接收确认                                               │
              └─ 系统创建新的产品批次，关联原服务批次                         │
                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.2 服务项目的关键系统特性

| 特性 | 实现方式 | 说明 |
|------|----------|------|
| **长周期任务管理** | 任务状态持久化 + 每日提醒 | 重编程2-4周，系统每日提醒录入记录 |
| **交接机制** | 交接申请 → 交接确认 → 记录留痕 | 确保责任转移可追溯 |
| **过程质检融合** | 鉴定任务与生产任务并行 | 不区分生产和质检，统一按SOP执行 |
| **报告+CoA合并** | 一份文档同时满足内部记录和外部交付 | 减少重复工作 |
| **灵活交付路径** | 直接交付 or 移交产品组 | 支持业务扩展 |

### 4.2 细胞产品流程实现

#### 4.2.1 iPSC细胞产品 - 系统流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      iPSC细胞产品 - 系统流程                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  阶段一：种子获取与评估                                                      │
│  ═══════════════════════                                                    │
│                                                                             │
│  种子来源（三选一）：                                                         │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ a) 服务移交      │  │ b) 研发转移      │  │ c) 外部引进      │             │
│  │                 │  │                 │  │                 │             │
│  │ 服务完成时      │  │ 研发完成时      │  │ 采购入库时      │             │
│  │ 系统显示        │  │ 研发在ELN标记   │  │ 采购系统同步    │             │
│  │ "可移交种子"    │  │ "可转移"        │  │ "待检验"        │             │
│  │                 │  │                 │  │                 │             │
│  │ 产品组在系统    │  │ 生产主管在系统  │  │ QA在系统完成    │             │
│  │ 提交"接收申请"  │  │ 发起"技术转移"  │  │ 入厂检验后      │             │
│  │                 │  │                 │  │                 │             │
│  │ 系统生成        │  │ 系统生成        │  │ 系统生成        │             │
│  │ 《种子接收评估》│  │ 《TT报告》模板  │  │ 《入库检验报告》│             │
│  │                 │  │                 │  │                 │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                ▼                                            │
│                    ┌─────────────────────┐                                  │
│                    │  种子接收评估记录    │                                  │
│                    │  - 来源信息          │                                  │
│                    │  - 鉴定数据核查      │                                  │
│                    │  - 接收人确认        │                                  │
│                    └──────────┬──────────┘                                  │
│                               │                                             │
│                               ▼                                             │
│                    ┌─────────────────────┐                                  │
│                    │  创建种子库批次      │                                  │
│                    │  批号：IPSC-MSB-xxx │                                  │
│                    └─────────────────────┘                                  │
│                                                                             │
│  阶段二：种子库建立                                                          │
│  ═══════════════════                                                        │
│                                                                             │
│  ┌─ 主种子库(MSB) ─┐      ┌─ 工作种子库(WSB) ─┐                            │
│  │                 │      │                   │                            │
│  │ 种子扩增        │ ──►  │ 从MSB取种        │                            │
│  │ 多支冻存        │      │ 扩增冻存         │                            │
│  │ 长期保存        │      │ 用于生产         │                            │
│  │                 │      │                   │                            │
│  │ 系统记录：      │      │ 系统记录：        │                            │
│  │ - 来源批号      │      │ - 来源MSB批号    │                            │
│  │ - 冻存管数      │      │ - 代次           │                            │
│  │ - 存储位置      │      │ - 存储位置       │                            │
│  │ - 代次          │      │                   │                            │
│  │                 │      │                   │                            │
│  └─────────────────┘      └───────────────────┘                            │
│                                                                             │
│  阶段三：生产批次制备                                                        │
│  ═════════════════════                                                      │
│                                                                             │
│  触发条件：                                                                  │
│  ├─ 库存低于安全库存 → 系统自动预警                                         │
│  ├─ 销售预测需求 → 主管创建生产计划                                         │
│  └─ 客户订单 → 创建关联生产批次                                             │
│                                                                             │
│  生产执行：                                                                  │
│  ├─ 从WSB选种 → 系统显示可用种子列表                                        │
│  ├─ 扫码/选择种子 → 系统自动带出种子信息                                    │
│  ├─ 确认生产计划 → 系统生成生产批次                                         │
│  │              批号：IPSC-YYMMDD-XXX-PX（自动生成）                         │
│  ├─ 开始生产 → 系统按eBPR模板引导操作                                       │
│  │          ├─ 种子复苏记录                                                 │
│  │          ├─ 传代记录（多次）                                             │
│  │          ├─ 物料使用记录（扫码录入）                                     │
│  │          └─ 收获冻存记录                                                 │
│  └─ 生产完成 → 提交质检                                                     │
│                                                                             │
│  阶段四：质检（每批必做）                                                    │
│  ═══════════════════════                                                    │
│                                                                             │
│  系统自动创建质检任务                                                        │
│  ├─ 显示待检批次队列                                                         │
│  ├─ 质检员领取任务 → 开始质检                                               │
│  ├─ 系统按质检模板提示检测项目：                                             │
│  │   1. 复苏活率（台盼蓝）→ 录入数值 → 自动判定                             │
│  │   2. 细胞形态（显微镜）→ 上传照片 → 人工判定                             │
│  │   3. 支原体（PCR）→ 上传结果图 → 人工判定                                │
│  │   4. 核型（选检）→ 记录送检信息 → 结果回填                               │
│  │   5. 多能性（选检）→ 上传流式图 → 人工判定                               │
│  ├─ 所有项目完成 → 系统综合判定                                             │
│  │              ├─ 合格 → 进入CoA生成                                       │
│  │              └─ 不合格 → 进入不合格品处理流程                            │
│  └─ 质检记录永久关联批次                                                     │
│                                                                             │
│  阶段五：CoA生成与放行                                                       │
│  ═══════════════════════                                                    │
│                                                                             │
│  合格批次：                                                                  │
│  ├─ 系统自动生成CoA草稿（从质检记录抽取数据）                                │
│  ├─ 自动关联原始图片（形态图、PCR图等）                                      │
│  ├─ 生产人员确认 → 提交审核                                                 │
│  ├─ QA/主管在线审核                                                          │
│  │          ├─ 通过 → 电子签名 → CoA生效                                    │
│  │          └─ 退回 → 修改 → 重新提交                                       │
│  ├─ CoA状态变为"已批准"                                                     │
│  └─ 批次状态变为"可入库"                                                    │
│                                                                             │
│  阶段六：入库与销售                                                          │
│  ═══════════════════                                                        │
│                                                                             │
│  入库：                                                                      │
│  ├─ 仓管在系统确认入库                                                       │
│  ├─ 系统调用库存管理API → 同步入库数据                                       │
│  │   推送数据：                                                             │
│  │   - 批号、产品、数量、规格                                               │
│  │   - 生产日期、有效期                                                     │
│  │   - 存储位置、CoA编号                                                    │
│  ├─ 系统标记批次"已入库"                                                    │
│  └─ 批次进入可销售库存                                                       │
│                                                                             │
│  销售出库：                                                                  │
│  ├─ 客户下单 → 销售系统在库存系统扣减                                       │
│  ├─ 库存系统回调生产系统 → 记录出库信息                                      │
│  ├─ 仓管打印发货单 + CoA                                                    │
│  ├─ 打包发货 → 系统记录快递单号                                             │
│  └─ 批次状态变为"已出库"                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 细胞产品的关键系统特性

| 特性 | 实现方式 | 说明 |
|------|----------|------|
| **种子库管理** | MSB/WSB两级批次关联 | 清晰追溯种子来源 |
| **库存预警驱动** | 安全库存设置 + 自动预警 | 被动补货变主动计划 |
| **eBPR引导** | 按产品类型加载不同模板 | 标准化操作，降低培训成本 |
| **必检机制** | 生产完成强制创建质检任务 | 不漏检 |
| **CoA自动** | 质检数据自动填充 | 减少人工错误 |
| **库存集成** | API双向同步 | 数据一致性 |

### 4.3 试剂盒流程实现

#### 4.3.1 分化试剂盒 - 系统流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      分化试剂盒 - 系统流程                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  阶段一：生产准备                                                            │
│  ═══════════════════                                                        │
│                                                                             │
│  生产指令创建：                                                              │
│  ├─ MRP计算 → 系统根据库存和销售预测生成建议生产计划                         │
│  ├─ 主管确认 → 创建生产指令                                                  │
│  │         批号：NPC-KIT-YYMM-XXX（自动生成）                                │
│  └─ 系统展开配方 → 生成物料需求清单                                          │
│                                                                             │
│  物料准备：                                                                  │
│  ├─ 仓管根据系统物料清单出库                                                 │
│  ├─ 生产人员扫码核对物料批号                                                 │
│  ├─ 系统记录使用的原料批号（追溯用）                                         │
│  └─ 确认洁净环境/设备状态                                                    │
│                                                                             │
│  阶段二：配制生产                                                            │
│  ═══════════════════                                                        │
│                                                                             │
│  多组分配制（系统支持）：                                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  组分配置表（按配方展开）                                             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  组分1: 基础培养基                                                    │   │
│  │    ├─ 原料A 批号:XXX 用量:XXmL  ┐                                     │   │
│  │    ├─ 原料B 批号:XXX 用量:XXmL  ├→ 系统生成《配制记录》               │   │
│  │    └─ 操作: 混合 → 调pH → 过滤       │  每个组分一条记录              │   │
│  │                                    │                                  │   │
│  │  组分2: 添加剂A                                      │                │   │
│  │    ├─ 原料C 批号:XXX 用量:XXmg ├─────────────────────┘                │   │
│  │    └─ 操作: 溶解 → 过滤                                                   │   │
│  │                                                                         │   │
│  │  组分3-8: ...（类似）                                                    │   │
│  │                                                                         │   │
│  │  [全部完成] → 进入分装阶段                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  阶段三：分装与贴标                                                          │
│  ═════════════════════                                                      │
│                                                                             │
│  分装：                                                                      │
│  ├─ 按规格分装入瓶/管                                                        │
│  ├─ 系统记录分装数量、操作人、时间                                           │
│  ├─ 打印标签（含批号、有效期、储存条件）                                     │
│  └─ 组装成套 → 外包装                                                        │
│                                                                             │
│  阶段四：质检（关键差异点）                                                   │
│  ═════════════════════════                                                  │
│                                                                             │
│  必检项目：                                                                  │
│  ├─ 无菌检测 → 系统记录检测方法、结果                                        │
│  ├─ pH值检测 → 录入数值                                                      │
│  └─ 内毒素（如适用）→ 录入数值                                               │
│                                                                             │
│  选检项目 - 效力验证（特殊流程）：                                           │
│  ├─ 需要效力验证时 → 系统创建《效力验证委托单》                              │
│  ├─ 委托单包含：                                                             │
│  │   - 试剂盒批号                                                           │
│  │   - 验证方案（SOP）                                                      │
│  │   - 样品数量                                                             │
│  │   - 预计完成时间（自动计算：15-30天）                                    │
│  ├─ 委托给细胞产品组（系统通知）                                             │
│  ├─ 细胞产品组接收委托 → 使用试剂盒进行分化验证                              │
│  ├─ 验证完成后 → 在系统录入《验证报告》                                      │
│  │            ├─ 分化效率                                                   │
│  │            ├─ 细胞质量评估                                               │
│  │            └─ 结论（通过/不通过）                                        │
│  └─ 试剂盒批次关联验证结果                                                   │
│                                                                             │
│  ⚠️ 效力验证周期长，系统特殊处理：                                           │
│     - 试剂盒可先放行（基于无菌检测）                                         │
│     - 效力验证结果后续补充                                                   │
│     - 系统标记"效力验证待完成"                                               │
│     - 验证完成前，CoA标注"效力验证进行中"                                    │
│                                                                             │
│  阶段五：CoA生成（简化版）                                                    │
│  ═══════════════════════                                                    │
│                                                                             │
│  系统自动生成CoA：                                                           │
│  ├─ 产品名称、批号、组分清单                                                 │
│  ├─ 无菌检测结果                                                             │
│  ├─ 效力验证结果（文字描述，无原始图片）                                     │
│  ├─ 有效期、储存条件                                                         │
│  ├─ 生产人员确认 → 提交审核                                                  │
│  ├─ QA审核 → 电子签名                                                        │
│  └─ CoA生效                                                                  │
│                                                                             │
│  阶段六：入库与销售                                                          │
│  ═══════════════════                                                        │
│                                                                             │
│  同细胞产品流程...                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 试剂盒的关键系统特性

| 特性 | 实现方式 | 说明 |
|------|----------|------|
| **配方展开** | BOM管理 + 自动生成物料清单 | 减少人工计算错误 |
| **多组分记录** | 一个批次多条配制记录 | 每个组分独立追溯 |
| **效力验证委托** | 跨部门任务流转 | 试剂盒组→细胞产品组 |
| **长周期任务跟踪** | 独立的状态管理 | 15-30天验证不阻塞入库 |
| **简化CoA** | 无原始图片，文字描述 | 符合试剂盒特点 |

---

## 5. 系统统一支撑机制

### 5.1 流程引擎设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          流程引擎核心设计                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     流程定义层 (Flow Definition)                     │  │
│   │                                                                     │  │
│   │   每种产品线定义一个流程模板：                                        │  │
│   │   ┌─────────────────────────────────────────────────────────────┐  │  │
│   │   │ 流程: CELL_IPSC_FLOW                                         │  │  │
│   │   │                                                              │  │  │
│   │   │ 环节1: PLAN         → 表单: production_plan_form            │  │  │
│   │   │         ↓                                                    │  │  │
│   │   │ 环节2: SEED_PREP    → 表单: seed_preparation_form           │  │  │
│   │   │         ↓                                                    │  │  │
│   │   │ 环节3: PRODUCE      → 表单: batch_production_form           │  │  │
│   │   │         ↓                                                    │  │  │
│   │   │ 环节4: QC           → 表单: qc_record_form                  │  │  │
│   │   │         ↓                                                    │  │  │
│   │   │ 环节5: COA          → 表单: coa_form                        │  │  │
│   │   │         ↓                                                    │  │  │
│   │   │ 环节6: RELEASE      → 表单: release_form                    │  │  │
│   │   └─────────────────────────────────────────────────────────────┘  │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     流程执行层 (Flow Execution)                      │  │
│   │                                                                     │  │
│   │   当创建一个批次时：                                                  │  │
│   │   1. 根据 batch_type 加载对应流程模板                                 │  │
│   │   2. 按顺序创建各环节任务 (production_task 表)                        │  │
│   │   3. 第一个任务状态设为 PENDING，其余为 WAITING                       │  │
│   │   4. 任务完成后，自动激活下一个任务                                   │  │
│   │   5. 支持跳环节、回退、并行等特殊处理                                 │  │
│   │                                                                     │  │
│   │   任务状态流转：                                                      │  │
│   │   WAITING → PENDING → IN_PROGRESS → COMPLETED/REJECTED               │  │
│   │                ↑__________________________↓                          │  │
│   │                         (退回修改)                                    │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     表单渲染层 (Form Rendering)                      │  │
│   │                                                                     │  │
│   │   每个表单模板定义：                                                  │  │
│   │   - 字段列表（名称、类型、校验规则）                                  │  │
│   │   - 布局配置（分组、顺序）                                            │  │
│   │   - 特殊组件（扫码器、图片上传、电子签名）                            │  │
│   │   - 计算公式（如：自动计算代次）                                      │  │
│   │   - 联动规则（如：选择产品后加载对应SOP）                             │  │
│   │                                                                     │  │
│   │   前端根据表单配置动态渲染界面                                        │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 统一状态机

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        统一批次状态机                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   所有产品线共享统一的状态定义，但状态流转路径不同：                          │
│                                                                             │
│   状态定义：                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │   NEW (新建)                                                        │  │
│   │     │                                                               │  │
│   │     ▼                                                               │  │
│   │   IN_PROGRESS (生产中/执行中)                                       │  │
│   │     │                                                               │  │
│   │     ▼                                                               │  │
│   │   QC_PENDING (待质检) ──► QC_IN_PROGRESS (质检中)                   │  │
│   │     │                          │                                    │  │
│   │     │    ┌─────────────────────┘                                    │  │
│   │     │    │                                                          │  │
│   │     │    ▼                                                          │  │
│   │     │   QC_PASS (质检合格)                                          │  │
│   │     │     │                                                         │  │
│   │     │     ▼                                                         │  │
│   │     │   COA_PENDING (待CoA) ──► COA_REVIEW (CoA审核中)              │  │
│   │     │     │                          │                              │  │
│   │     │     │    ┌─────────────────────┘                              │  │
│   │     │     │    │                                                    │  │
│   │     │     │    ▼                                                    │  │
│   │     │     │   RELEASED (已批准/已放行)                              │  │
│   │     │     │     │                                                   │  │
│   │     │     │     ▼                                                   │  │
│   │     │     │   IN_STORAGE (已入库)                                   │  │
│   │     │     │     │                                                   │  │
│   │     │     │     ▼                                                   │  │
│   │     │     │   SHIPPED (已出库/已交付)                               │  │
│   │     │     │                                                         │  │
│   │     │     │                                                         │  │
│   │     └──► QC_FAIL (质检不合格)                                       │  │
│   │            │                                                        │  │
│   │            ├──► REWORK (返工中) ──► 回到 IN_PROGRESS                │  │
│   │            │                                                        │  │
│   │            └──► SCRAPPED (已报废)                                   │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   不同产品线的状态流转差异：                                                  │
│                                                                             │
│   服务项目：                                                                │
│   NEW → IN_PROGRESS (长周期，可能包含多个子阶段)                            │
│       → QC_PENDING (鉴定阶段，融入生产过程)                                 │
│       → COA_PENDING (报告生成)                                              │
│       → RELEASED → SHIPPED (直接交付)                                       │
│                                                                             │
│   细胞产品：                                                                │
│   NEW → IN_PROGRESS (标准化生产)                                            │
│       → QC_PENDING → QC_IN_PROGRESS (必检)                                  │
│       → QC_PASS → COA_PENDING → COA_REVIEW → RELEASED                       │
│       → IN_STORAGE → SHIPPED                                                │
│                                                                             │
│   试剂盒：                                                                  │
│   NEW → IN_PROGRESS (配制生产)                                              │
│       → QC_PENDING → QC_IN_PROGRESS (无菌检测)                              │
│       → QC_PASS (可能效力验证还在进行中)                                    │
│       → COA_PENDING → RELEASED → IN_STORAGE → SHIPPED                       │
│       → 效力验证完成后更新CoA                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 表单模板配置示例

```yaml
# ============================================
# 表单模板配置示例
# ============================================

# 1. iPSC细胞批生产记录模板
templates:
  - id: eBPR_IPSC_001
    name: iPSC细胞批生产记录
    product_line: CELL
    product_type: IPSC
    
    sections:
      - code: basic_info
        name: 基本信息
        fields:
          - name: batch_no
            label: 批号
            type: text
            disabled: true  # 系统自动生成
            
          - name: product_name
            label: 产品名称
            type: select
            options_from: product_list
            required: true
            
          - name: planned_quantity
            label: 计划产量
            type: number
            unit: 支
            required: true
      
      - code: seed_info
        name: 种子信息
        fields:
          - name: seed_batch_no
            label: 种子批号
            type: search_select
            search_from: seed_bank
            placeholder: 扫描或选择种子批号
            required: true
            
          - name: seed_passage
            label: 种子代次
            type: text
            disabled: true  # 从种子信息自动带出
            
          - name: seed_storage_location
            label: 种子存储位置
            type: text
            disabled: true
      
      - code: material_usage
        name: 物料使用
        type: table  # 表格形式
        fields:
          - name: material_name
            label: 物料名称
            type: search_select
            search_from: material_inventory
            
          - name: material_batch_no
            label: 批号
            type: text
            input_method: [scan, manual, select]
            
          - name: quantity
            label: 用量
            type: number
            
          - name: unit
            label: 单位
            type: select
            options: [mL, mg, L, g]
      
      - code: operation_records
        name: 操作记录
        type: timeline  # 时间线形式
        activities:
          - code: revival
            name: 种子复苏
            fields:
              - name: revival_time
                label: 复苏时间
                type: datetime
                default: now
                
              - name: revival_method
                label: 复苏方法
                type: radio
                options: [快速复苏, 慢速复苏]
                
              - name: revival_result
                label: 复苏结果
                type: radio
                options: [正常, 异常]
                
              - name: photos
                label: 复苏后照片
                type: image_upload
                multiple: true
                max: 5
                
          - code: passage
            name: 传代培养
            repeatable: true  # 可重复多次
            fields:
              - name: passage_date
                label: 传代日期
                type: date
                
              - name: from_passage
                label: 起始代次
                type: text
                
              - name: to_passage
                label: 目标代次
                type: text
                # 自动计算：from_passage + 1
                
              - name: passage_ratio
                label: 传代比例
                type: select
                options: [1:3, 1:6, 1:8, 1:10]
                
              - name: cell_density
                label: 细胞密度
                type: number
                unit: cells/cm²
                
              - name: morphology_photos
                label: 形态照片
                type: image_upload
                required: true
                
          - code: harvest
            name: 收获冻存
            fields:
              - name: harvest_time
                label: 收获时间
                type: datetime
                
              - name: total_cell_count
                label: 总细胞数
                type: number
                
              - name: viability
                label: 活率
                type: number
                unit: '%'
                min: 0
                max: 100
                
              - name: vial_count
                label: 冻存支数
                type: number
                
              - name: cells_per_vial
                label: 每支细胞数
                type: number
                # 自动计算：total_cell_count / vial_count
                
              - name: storage_location
                label: 存储位置
                type: text
                placeholder: 如：液氮罐A-01-05
      
      - code: exception
        name: 异常情况
        fields:
          - name: has_exception
            label: 是否有异常
            type: radio
            options: [无, 有]
            
          - name: exception_description
            label: 异常描述
            type: textarea
            condition: has_exception == '有'
            
          - name: exception_photos
            label: 异常照片
            type: image_upload
            condition: has_exception == '有'
      
      - code: confirmation
        name: 完成确认
        fields:
          - name: operator_signature
            label: 操作人签名
            type: signature
            required: true
            
          - name: operator_name
            label: 操作人
            type: text
            default: current_user
            disabled: true
            
          - name: operation_time
            label: 操作时间
            type: datetime
            default: now
            disabled: true

---
# 2. 试剂盒配制记录模板
templates:
  - id: eBPR_KIT_001
    name: 分化试剂盒配制记录
    product_line: KIT
    product_type: DIFFERENTIATION_KIT
    
    sections:
      - code: basic_info
        name: 基本信息
        # 类似iPSC模板...
      
      - code: formula_expansion
        name: 配方展开
        type: dynamic_table  # 动态表格，根据配方自动生成
        data_source: product_formula  # 从产品配方自动加载
        fields:
          - name: component_name
            label: 组分名称
            type: text
            disabled: true  # 从配方带出
            
          - name: raw_materials
            label: 原料清单
            type: sub_table
            fields:
              - name: material_name
                label: 原料名称
                type: search_select
                
              - name: material_batch_no
                label: 原料批号
                type: text
                input_method: [scan, select]
                
              - name: planned_amount
                label: 计划用量
                type: number
                disabled: true  # 从配方计算
                
              - name: actual_amount
                label: 实际用量
                type: number
                required: true
      
      - code: preparation_records
        name: 配制记录
        type: card_list  # 卡片列表，每个组分一张卡片
        item_source: formula_components
        fields_per_item:
          - name: component_name
            label: 组分名称
            type: label
            
          - name: preparation_steps
            label: 配制步骤
            type: checklist
            options_from: sop_steps
            
          - name: ph_value
            label: pH值
            type: number
            condition: component_type == 'liquid'
            
          - name: appearance
            label: 外观性状
            type: select
            options: [澄清无色, 微黄澄清, 浑浊, 其他]
            
          - name: filtration_info
            label: 过滤信息
            type: group
            fields:
              - name: filter_pore_size
                label: 滤膜孔径
                type: select
                options: ['0.22μm', '0.45μm']
                
              - name: filtration_pressure
                label: 过滤压力
                type: number
                unit: MPa
      
      - code: dispensing
        name: 分装记录
        fields:
          - name: dispensing_spec
            label: 分装规格
            type: text
            unit: mL/瓶
            
          - name: total_bottles
            label: 总分装瓶数
            type: number
            
          - name: qualified_bottles
            label: 合格瓶数
            type: number
            
          - name: label_sample
            label: 标签样本
            type: image_upload
            required: true
```

---

## 6. 用户界面统一设计

### 6.1 统一的操作界面框架

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        统一操作界面框架                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  顶部导航栏                                                          │   │
│  │  [Logo]  iPSC生产管理系统    工作台 | 订单管理 | 批次管理 | 质检...   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────┬──────────────────────────────────────────────────────────┐   │
│  │          │                                                          │   │
│  │  左侧    │                    主内容区                              │   │
│  │  导航    │                                                          │   │
│  │          │   ┌──────────────────────────────────────────────────┐   │   │
│  │  ·工作台 │   │  页面标题 + 操作按钮                               │   │   │
│  │  ·我的   │   │  [新建批次] [导出] [筛选]                          │   │   │
│  │    任务  │   └──────────────────────────────────────────────────┘   │   │
│  │  ·批次   │                                                          │   │
│  │    管理  │   ┌──────────────────────────────────────────────────┐   │   │
│  │  ·质检   │   │                                                    │   │   │
│  │    管理  │   │              列表/表单/详情内容                     │   │   │
│  │  ·CoA    │   │                                                    │   │   │
│  │    管理  │   │                                                    │   │   │
│  │  ·追溯   │   │                                                    │   │   │
│  │    查询  │   │                                                    │   │   │
│  │  ·报表   │   │                                                    │   │   │
│  │    统计  │   │                                                    │   │   │
│  │          │   └──────────────────────────────────────────────────┘   │   │
│  │          │                                                          │   │
│  └──────────┴──────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 不同产品线的界面适配

#### 6.2.1 批次列表页 - 根据产品线显示不同字段

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  批次管理                                    [新建批次▼] [导出] [筛选]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [全部] [服务项目] [细胞产品] [试剂盒]                                       │
│                                                                             │
│  ┌────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┐│
│  │ 批号   │ 类型     │ 产品     │ 状态     │ 关键信息1 │ 关键信息2 │ 操作   ││
│  ├────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤│
│  │        │          │          │          │          │          │        ││
│  │ SRV-001│ 服务项目 │ 重编程   │ 生产中   │ 客户:张  │ 阶段:扩增│ [查看] ││
│  │        │          │ 建系     │          │ 样本:血  │          │        ││
│  ├────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤│
│  │        │          │          │          │          │          │        ││
│  │ IPSC-  │ 细胞产品 │ iPSC     │ 待CoA    │ 产量:50  │ 质检:合格│ [查看] ││
│  │ 260410 │          │ 野生型   │          │ 支       │          │ [CoA]  ││
│  ├────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤│
│  │        │          │          │          │          │          │        ││
│  │ NPC-   │ 试剂盒   │ 神经分化 │ 质检中   │ 组分:8个 │ 效力验证 │ [查看] ││
│  │ KIT-001│          │ 试剂盒   │          │          │ 待完成   │        ││
│  └────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────┘│
│                                                                             │
│  【动态列说明】                                                              │
│  - 服务项目：显示客户信息、当前阶段、服务类型                                │
│  - 细胞产品：显示产量、代次、质检结果                                        │
│  - 试剂盒：显示组分数、效力验证状态                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.2 新建批次 - 根据选择的产品线显示不同表单

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  新建批次                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  步骤1：选择产品线                                                           │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │             │  │             │  │             │                         │
│  │   服务项目   │  │   细胞产品   │  │   试剂盒    │                         │
│  │             │  │             │  │             │                         │
│  │  订单驱动   │  │  库存驱动   │  │  批量生产   │                         │
│  │  定制化服务 │  │  预制备产品 │  │  配方生产   │                         │
│  │             │  │             │  │             │                         │
│  │  [选择]     │  │  [选择]     │  │  [选择]     │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  步骤2：填写信息（根据步骤1的选择动态变化）                                   │
│                                                                             │
│  【如果选择了"服务项目"】                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  关联订单： [选择/输入服务订单号 ▼]                                  │   │
│  │  服务类型： ○ 重编程建系  ○ 基因编辑  ○ 定制分化                     │   │
│  │  客户信息： [自动从订单带出]                                          │   │
│  │  预计周期： [根据服务类型自动计算]                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  【如果选择了"细胞产品"】                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  触发类型： ○ 库存预警  ○ 生产计划  ○ 客户订单                       │   │
│  │  产品：     [选择产品 ▼]                                             │   │
│  │  种子来源： [选择种子批号 ▼]  [扫码]                                 │   │
│  │  计划产量： [    ] 支                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  【如果选择了"试剂盒"】                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  产品：     [选择试剂盒产品 ▼]                                       │   │
│  │  配方版本： [自动加载最新配方]                                        │   │
│  │  计划产量： [    ] 套                                                │   │
│  │  物料检查： [展开查看所需物料清单]                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                                    [取消]    [创建批次]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. 系统集成策略

### 7.1 与库存系统的集成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      与库存系统集成方案                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   生产管理系统                    库存管理系统                               │
│   ┌─────────────┐                ┌─────────────┐                            │
│   │             │                │             │                            │
│   │  批次放行   │ ─────────────► │  成品入库   │                            │
│   │  需要入库   │   API:入库     │             │                            │
│   │             │   推送         │  更新库存   │                            │
│   │             │                │             │                            │
│   │  需要查库存 │ ◄───────────── │  库存查询   │                            │
│   │  物料可用量 │   API:库存查询 │             │                            │
│   │             │                │             │                            │
│   │  销售出库   │ ◄───────────── │  出库回调   │                            │
│   │  更新状态   │   API:出库     │             │                            │
│   │             │   回调         │             │                            │
│   └─────────────┘                └─────────────┘                            │
│                                                                             │
│   集成数据格式：                                                             │
│                                                                             │
│   1. 入库推送                                                                │
│   {                                                                         │
│     "batch_no": "IPSC-260410-003-P5",                                       │
│     "product_code": "IPSC-WT-001",                                          │
│     "product_name": "iPSC细胞(野生型)",                                      │
│     "quantity": 48,                                                         │
│     "unit": "支",                                                           │
│     "specification": "1×10^6 cells/支",                                     │
│     "manufacture_date": "2026-04-10",                                       │
│     "expiry_date": "2028-04-09",                                            │
│     "storage_location": "液氮罐A-01",                                       │
│     "coa_no": "CoA-IPSC-260410-003",                                        │
│     "operator": "张三"                                                      │
│   }                                                                         │
│                                                                             │
│   2. 出库回调                                                                │
│   {                                                                         │
│     "batch_no": "IPSC-260410-003-P5",                                       │
│     "outbound_no": "OUT-260415-001",                                        │
│     "outbound_quantity": 10,                                                │
│     "outbound_date": "2026-04-15",                                          │
│     "customer": "XX大学",                                                   │
│     "remaining_quantity": 38                                                │
│   }                                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 与ELN的集成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      与ELN系统集成方案                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   生产管理系统 ◄────────────── ELN系统                                      │
│                                                                             │
│   只读查询研发阶段数据：                                                      │
│                                                                             │
│   场景1：研发技术转移                                                        │
│   ├─ 研发在ELN标记"可转移"                                                  │
│   ├─ 生产系统查询该标记，显示待转移项目                                      │
│   ├─ 生产主管确认转移                                                        │
│   └─ 系统从ELN拉取：                                                         │
│       - 细胞株基本信息                                                       │
│       - 关键工艺参数                                                         │
│       - 鉴定数据摘要                                                         │
│                                                                             │
│   场景2：服务项目交接                                                        │
│   ├─ 服务组完成建系                                                          │
│   ├─ 需要移交产品组                                                          │
│   ├─ 产品组在系统查看服务记录                                                │
│   └─ 系统从ELN查询关联的实验记录                                             │
│                                                                             │
│   注意：生产系统不修改ELN数据，只读取参考                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. 总结：如何实现"同时支持"

### 8.1 核心设计原则

| 原则 | 实现方式 | 效果 |
|------|----------|------|
| **抽象统一** | 批次、任务、质检、CoA统一数据模型 | 一套代码支持三种产品线 |
| **配置差异化** | 流程模板、表单模板可配置 | 不同产品线有不同流程 |
| **状态机统一** | 统一状态定义，不同流转路径 | 清晰的批次生命周期管理 |
| **界面自适应** | 根据产品线动态加载字段和组件 | 用户体验一致又贴合场景 |

### 8.2 关键成功因素

1. **流程模板化**：将三种产品线的流程抽象为可配置的模板，新增产品线只需配置新模板
2. **表单动态化**：使用动态表单引擎，根据模板自动渲染界面，无需为每个产品线开发独立页面
3. **状态清晰化**：统一状态定义，让所有人对批次状态有一致理解
4. **集成标准化**：与外部系统通过标准API集成，降低耦合

### 8.3 扩展性考虑

```
未来新增产品线的支持方式：

1. 定义新产品线代码（如：ORGANOID - 类器官）
2. 配置新的流程模板（复制相似产品线修改）
3. 配置新的表单模板
4. 配置新的质检模板
5. 配置新的CoA模板
6. 无需修改代码，系统即可支持新产品线
```

---

> **文档结束**
>
> 本文档详细阐述了iPSC生产管理系统如何同时支持服务项目、细胞产品、试剂盒三种产品线的生产过程。
>
> 核心思路是"统一数据模型 + 配置化流程 + 动态表单"，实现一套系统支撑多种业务场景。
