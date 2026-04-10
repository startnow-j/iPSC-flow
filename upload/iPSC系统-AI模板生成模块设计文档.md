# iPSC生产管理系统 — AI模板生成模块设计文档

> **文档版本**：v1.0
> **编制日期**：2026-04-10
> **所属系统**：iPSC生产管理系统（PRD v1.0）
> **关联文档**：《iPSC生产管理系统-PRD.md》《iPSC系统-产品配置机制详解.md》

---

## 📋 文档说明

### 1.1 模块定位

**AI模板生成中心**是iPSC生产管理系统的核心配置引擎，解决"新产品如何快速接入系统"的问题。

**核心理念：约定优于配置 + 外部AI生成 + 系统直接识别**

```
┌───────────────────────────────────────────────────────┐
│                    传统方式                           │
│                                                       │
│  新产品 → 手动逐字段配置 → 30-40分钟/产品              │
│         → 易出错、难维护                              │
└───────────────────────────────────────────────────────┘

                        ↓ 升级为

┌───────────────────────────────────────────────────────┐
│                    本方案                             │
│                                                       │
│  AI工具生成标准MD → 系统解析入库 → 5-10分钟/产品        │
│         → 可追溯、可版本化                            │
└───────────────────────────────────────────────────────┘
```

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **格式标准化** | 统一使用 Markdown + YAML Front Matter，不搞多格式兼容 |
| **外部AI生成** | 系统不做AI解析，用户用ChatGPT/Claude等工具按规范生成 |
| **结构化解析** | 系统只做确定性的结构解析（YAML/表格），不做语义猜测 |
| **版本化管理** | 模板文件可入Git，支持版本对比与回滚 |
| **所见即所得** | 解析后预览确认再入库，用户完全掌控 |

### 1.3 适用范围

本模块负责以下配置对象的快速创建和导入：

| 配置对象 | 说明 |
|----------|------|
| **产品定义** | 产品基本信息、规格、分类 |
| **配方/BOM** | 原料组成、用量、配制步骤（试剂盒专用） |
| **生产流程模板** | 产品生产环节及顺序 |
| **表单字段定义** | 各环节需要录入的字段及校验规则 |
| **质检模板** | 检测项目、类型、判定标准 |
| **CoA模板** | 分析证书展示字段和数据来源映射 |

---

## 2. 标准化模板规范

### 2.1 文件命名规则

```
{类别}-{编码}.md
```

| 类别前缀 | 用途 | 示例文件名 |
|----------|------|-----------|
| `product` | 产品定义 | `product-ND-KIT-001.md` |
| `form` | 表单定义 | `form-preparation.md` |
| `qc` | 质检模板 | `qc-kit-standard.md` |
| `coa` | CoA模板 | `coa-kit-standard.md` |

### 2.2 通用格式要求

所有模板文件统一采用以下结构：

```markdown
---
# ===== YAML Front Matter =====
# 必须以 --- 开头和结尾
# 存放该文件的元数据和基础配置信息
key1: value1
key2: value2
---

## 正文内容
# 使用Markdown表格定义结构化数据
# 使用有序列表定义步骤/顺序
```

---

## 3. 产品定义模板规范

### 3.1 完整示例

**文件名**：`product-ND-KIT-001.md`

```markdown
---
product_code: ND-KIT-001
product_name: 神经分化试剂盒
category: 试剂盒                       # 枚举: 试剂盒 / 细胞产品 / 服务项目
specification: 100mL/瓶
storage_condition: -20℃
shelf_life: 12个月
responsible_dept: 试剂盒生产组          # 对应系统中的部门
safety_stock: 10
unit: 瓶
description: 用于人源iPSC向神经前体细胞分化的培养基套装
---

## 配方/BOM

| 组分名称 | 原料编码 | 原料名称 | 用量 | 单位 | 备注 |
|---------|---------|---------|------|------|------|
| 基础培养基 | RM-001 | DMEM/F12 | 89 | mL | 无钙镁型 |
| 基础培养基 | RM-002 | B27添加剂(无维A) | 2 | mL | 不含维生素A |
| 基础培养基 | RM-003 | N2添加剂 | 1 | mL | |
| 基础培养基 | RM-004 | 双抗(青链霉素) | 1 | mL | |
| 分化因子A | RM-005 | Noggin重组蛋白 | 50 | ng/mL | 终浓度 |
| 分化因子B | RM-006 | SB431542 | 10 | μM | 终浓度 |

## 配制步骤

1. 取DMEM/F12置于37℃水浴预热15分钟
2. 依次加入B27添加剂、N2添加剂、双抗，涡旋混匀
3. 加入Noggin重组蛋白和SB431542，轻柔颠倒混匀5次
4. 使用0.22μm PES滤膜过滤除菌
5. 无菌条件下分装至无菌瓶，每瓶100mL
6. 贴标签（批号、有效期、配制日期），-20℃避光保存

## 生产流程

| 序号 | 环节编码 | 环节名称 | 关联表单 | 是否必检 | 默认执行人角色 |
|-----|---------|---------|---------|---------|--------------|
| 1 | PREP | 备料 | form-material_prep | 否 | 试剂盒生产组 |
| 2 | MIX | 配制 | form-preparation | 否 | 试剂盒生产组 |
| 3 | PKG | 分装 | form-packaging | 否 | 试剂盒生产组 |
| 4 | QC_IN | 过程质检 | form-qc_input | 是 | QA |
| 5 | COA_GEN | CoA生成 | coa-auto | 否 | 系统 |
| 6 | IN | 入库 | form-inventory_in | 否 | 仓管 |

## 质检关联

| 质检模板编码 | 质检阶段 | 是否必检 | 触发条件 |
|-------------|---------|---------|---------|
| qc-kit-standard | 成品质检 | 是 | 分装完成后自动触发 |
| qc-potency | 效力验证 | 是 | 需委托细胞产品组执行 |

## CoA关联

| CoA模板编码 | CoA类型 | 自动生成 |
|------------|--------|---------|
| coa-kit-standard | 标准CoA | 是 |

## 附件参考

| 文件名 | 类型 | 说明 |
|-------|------|------|
| SOP_ND-KIT_v2.1.pdf | SOP操作规程 | 最新版SOP |
| MSDS_RM-005.pdf | 安全数据表 | Noggin MSDS |
```

### 3.2 字段说明

#### YAML Front Matter 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `product_code` | string | ✅ | 产品唯一编码，如 `ND-KIT-001` |
| `product_name` | string | ✅ | 产品名称 |
| `category` | enum | ✅ | `试剂盒` / `细胞产品` / `服务项目` |
| `specification` | string | ✅ | 规格，如 `100mL/瓶` |
| `storage_condition` | string | ❌ | 储存条件 |
| `shelf_life` | string | ❌ | 有效期 |
| `responsible_dept` | string | ❌ | 责任部门（需与系统中部门一致） |
| `safety_stock` | integer | ❌ | 安全库存数量 |
| `unit` | string | ❌ | 计量单位 |
| `description` | text | ❌ | 产品描述 |

#### 正文各节说明

| 章节 | 必填 | 说明 |
|------|:----:|------|
| `## 配方/BOM` | 试剂盒必填 | 定义原料清单，其他产品线可不写 |
| `## 配制步骤` | 试剂盒必填 | 有序列表形式的生产步骤 |
| `## 生产流程` | ✅ 必填 | 定义该产品的生产环节顺序 |
| `## 质检关联` | ✅ 必填 | 关联质检模板 |
| `## CoA关联` | ✅ 必填 | 关联CoA模板 |
| `## 附件参考` | ❌ | 可选的参考文档链接 |

### 3.3 细胞产品定义示例

**文件名**：`product-iPSC-WT-001.md`

```markdown
---
product_code: iPSC-WT-001
product_name: iPSC细胞株(野生型)
category: 细胞产品
cell_type: iPSC                         # 细胞类型
passage_limit: P10                       # 最大传代代次
specification: 1×10^6 cells/支
storage_condition: 液氮(-196℃)
shelf_life: 5年
responsible_dept: 细胞产品组
safety_stock: 30
unit: 支
description: 野生型人源iPSC，可用于分化或基因编辑
source_requirement: true                 # 是否需要指定种子来源
---

## 生产流程

| 序号 | 环节编码 | 环节名称 | 关联表单 | 是否必检 | 默认执行人角色 |
|-----|---------|---------|---------|---------|--------------|
| 1 | PLAN | 生产计划 | form-plan | 否 | 细胞产品组 |
| 2 | SEED | 种子复苏 | form-seed | 否 | 细胞产品组 |
| 3 | EXPAND | 扩增培养 | form-expand | 否 | 细胞产品组 |
| 4 | HARVEST | 收获冻存 | form-harvest | 否 | 细胞产品组 |
| 5 | QC | 质量检测 | form-qc_cell | 是 | QA |
| 6 | COA_GEN | CoA生成 | coa-cell-auto | 否 | 系统 |
| 7 | IN | 入库 | form-inventory_in | 否 | 仓管 |

## 种子库要求

| 种子库级别 | 来源要求 | 代次范围 | 最小可用量 |
|-----------|---------|---------|-----------|
| 工作种子库(WSB) | 从主种子库扩增 | P3-P8 | ≥2支 |
| 主种子库(MSB) | 经鉴定合格的原代株 | P0-P3 | — |

## 质检关联

| 质检模板编码 | 质检阶段 | 是否必检 | 触发条件 |
|-------------|---------|---------|---------|
| qc-ipsc-release | 放行检测 | 是 | 收获冻存后自动触发 |

## CoA关联

| CoA模板编码 | CoA类型 | 自动生成 |
|------------|--------|---------|
| coa-cell-standard | 标准CoA | 是 |
```

### 3.4 服务项目定义示例

**文件名**：`product-SVC-REPROG-001.md`

```markdown
---
product_code: SVC-REPROG-001
product_name: 重编程建系服务
category: 服务项目
service_type: 重编程建系               # 服务子类型
estimated_duration: 45天                # 预估周期(天)
responsible_dept: 服务生产组
description: 将外周血单个核细胞重编程为iPSC并完成初步鉴定
requires_sample: true                  # 是否需要客户样本
sample_type: PBMC                      # 样本类型
---

## 服务流程

| 序号 | 环节编码 | 环节名称 | 关联表单 | 是否必检 | 预计工期(天) |
|-----|---------|---------|---------|---------:|------------:|
| 1 | SAMPLE_RECV | 样本接收 | form-sample_recv | 否 | 1 |
| 2 | REPROG | 重编程诱导 | form-reprogramming | 否 | 21-28 |
| 3 | PICK_CLONE | 克隆挑选 | form-colony_pick | 否 | 7-14 |
| 4 | EXPAND | 扩增培养 | form-expand_svc | 否 | 7-10 |
| 5 | IDENTIFY | 鉴定检测 | form-identification | 否 | 5-7 |
| 6 | HANDOVER | 内部交接 | form-handover | 否 | 1 |
| 7 | REPORT | 报告生成 | report-auto | 否 | 系统 |

## 质检项目(融入流程)

| 环节编码 | 检测项名称 | 判定标准 |
|---------|-----------|---------|
| PICK_CLONE | 克隆形态 | 典型iPSC集落形态 |
| IDENTIFY | 多能性标志物(OCT4/SOX4/NANOG) | 阳性率≥95% |
| IDENTIFY | 核型分析(G显带) | 正常核型 |
| IDENTIFY | 支原体检测 | 阴性 |
| IDENTIFY | 无菌检测 | 阴性 |

## 输出交付物

| 交付物 | 格式 | 说明 |
|-------|------|------|
| iPSC细胞株 | 实体 | 至少2支冻存管 |
| 建系报告 | PDF | 含鉴定结果和图片 |
| eBPR记录 | 电子 | 系统内完整记录 |
```

---

## 4. 表单定义模板规范

### 4.1 完整示例

**文件名**：`form-preparation.md`

```markdown
---
form_code: preparation
form_name: 试剂盒配制记录
form_type: production                # 枚举: production / qc / coa / inventory / handover
applicable_to:                       # 适用产品线,留空表示通用
  - 试剂盒
related_process_step: MIX            # 关联的生产环节编码
version: 1.0
---

## 字段定义

| 字段编码 | 字段名称 | 字段类型 | 必填 | 单位 | 默认值 | 校验规则 | 显示提示 |
|---------|---------|---------|:----:|------|--------|---------|---------|
| batch_no | 批号 | readonly | 是 | | | | 自动带出 |
| product_info | 产品信息 | readonly | 是 | | | | 自动带出 |
| operator | 操作人 | select_user | 是 | | | 当前登录人 | |
| start_time | 开始时间 | datetime | 是 | | | | |
| env_temp | 环境温度 | number | 是 | ℃ | | 18-28 | 记录洁净间温度 |
| env_humidity | 环境湿度 | number | 是 | %RH | | 40-70 | |
| preheat_temp | 培养基预热温度 | number | 是 | ℃ | 37 | 35-40 | |
| vol_dmem | DMEM/F12用量 | number | 是 | mL | 89 | >0, ≤500 | |
| vol_b27 | B27用量 | number | 是 | mL | 2 | >0 | |
| vol_n2 | N2用量 | number | 是 | mL | 1 | >0 | |
| vol_antibiotic | 双抗用量 | number | 是 | mL | 1 | >0 | |
| conc_noggin | Noggin终浓度 | number | 是 | ng/mL | 50 | >0 | |
| conc_sb | SB431542终浓度 | number | 是 | μM | 10 | >0 | |
| filter_pore | 滤膜孔径 | select | 是 | | 0.22μm | | 选项:0.22μm,0.45μm |
| filter_type | 滤膜材质 | select | 是 | | PES | | 选项:PES,PVDF,MCE |
| mix_method | 混匀方式 | select | 是 | | 轻柔颠倒 | | 选项:轻柔颠倒,涡旋,手动 |
| appearance | 外观检查 | select | 是 | | | | 选项:澄清透明,微浑浊,沉淀,变色 |
| ph_actual | 实测pH值 | number | 是 | | | 7.0-7.8 | pH试纸或pH计测量 |
| osmo_actual | 实测渗透压 | number | 否 | mOsm/kg | | 250-350 | 渗透压仪测量 |
| end_time | 结束时间 | datetime | 是 | | | | |
| duration | 配制时长 | computed | 否 | min | | auto | 自动计算(end-start) |
| exception_note | 异常情况说明 | textarea | 否 | | 无异常 | | 异常时必填 |
| attachment_photo | 配制后照片 | image | 否 | | | | 上传照片 |
| signature | 电子签名 | esign | 是 | | | | 密码确认 |
```

### 4.2 支持的字段类型一览

| 类型编码 | 类型名称 | UI组件 | 特殊行为 |
|----------|---------|--------|----------|
| `text` | 单行文本 | Input | 普通文本输入 |
| `textarea` | 多行文本 | TextArea | 支持多行输入 |
| `number` | 数字 | InputNumber | 支持小数位、单位显示 |
| `select` | 下拉选择 | Select | 需在`校验规则`中定义选项列表 |
| `select_user` | 人员选择 | UserSelect | 弹窗选择系统用户 |
| `datetime` | 日期时间 | DateTimePicker | 选择日期+时间 |
| `date` | 日期 | DatePicker | 仅选择日期 |
| `image` | 图片上传 | ImageUpload | 支持拍照/相册选择，限制格式 |
| `file` | 文件上传 | FileUpload | 附件上传，限制大小和格式 |
| `readonly` | 只读显示 | DisplayText | 系统自动填充，不可编辑 |
| `computed` | 计算字段 | DisplayText | 根据其他字段自动计算 |
| `esign` | 电子签名 | ESignButton | 触发密码确认签名 |
| `barcode` | 条码扫描 | BarcodeInput | 支持扫码枪输入 |

### 4.3 校验规则语法

校验规则字段使用简洁的表达式语法：

| 规则 | 示例 | 说明 |
|------|------|------|
| 数值范围 | `7.0-7.8` 或 `<7.4` 或 `>90` | 数字字段的取值范围 |
| 枚举选项 | `澄清透明,微浑浊,沉淀,变色` | 逗号分隔的可选值 |
| 最大长度 | `max:200` | 文本最大字符数 |
| 正则匹配 | `regex:^IPSC-\\w+-\\d+$` | 正则表达式 |
| 必填 | 在`必填`列标记 | 空值校验 |
| 自动计算 | `auto` | computed字段自动计算 |
| 条件必填 | `when:appearance!=澄清透明` | 满足条件时变为必填 |

---

## 5. 质检模板规范

### 5.1 完整示例

**文件名**：`qc-kit-standard.md`

```markdown
---
qc_code: qc-kit-standard
qc_name: 试剂盒成品质检标准
qc_category: release                   # 枚举: in_process(过程)/release(放行)/stability(稳定性)/identity(鉴定)
applicable_to:
  - 试剂盒
version: 1.0
---

## 检测项定义

| 检测项编码 | 检测项名称 | 检测方法 | 结果类型 | 标准值 | 单位 | 小数位 | 判定规则 | 必测 |
|-----------|-----------|---------|---------|--------|------|:------:|--------|:---:|
| PH | pH值 | pH计测量 | numeric | 7.2-7.4 | | 2 | range | ✅ |
| OSMO | 渗透压 | 渗透压仪 | numeric | 280-320 | mOsm/kg | 0 | range | ✅ |
| STERILE | 无菌检测 | 薄膜过滤法 | select | 阴性 | | | equals | ✅ |
| ENDO | 内毒素 | LAL法 | numeric | <0.5 | EU/mL | 2 | upper_limit | ✅ |
| APPEARANCE | 外观 | 目视检查 | select | 澄清无色 | | | equals | ✅ |
| PARTICLE | 可见异物 | 目视检查 | select | 不得检出 | | | equals | ❌ |
| VOLUME_CHECK | 装量 | 称重法 | numeric | ≥95 | % | 1 | lower_limit | ✅ |

## 判定逻辑

### 合格条件
所有标记为"必测(✅)"的项目全部符合标准值。

### 不合格处理
- 任一必测项不合格 → 整批次判定为**不合格**
- 系统自动标记不合格项，高亮显示
- 生成偏差报告，需QA审核处理方案

## 关联CoA字段映射

| 检测项编码 | 映射到CoA字段 | CoA显示名称 |
|-----------|-------------|-----------|
| PH | ph_value | pH值(25℃) |
| OSMO | osmolarity | 渗透压(mOsm/kg) |
| STERILE | sterile_test | 无菌检测 |
| ENDO | endotoxin | 内毒素(EU/mL) |
```

---

## 6. CoA模板规范

### 6.1 完整示例

**文件名**：`coa-kit-standard.md`

```markdown
---
coa_code: coa-kit-standard
coa_name: 试剂盒标准分析证书
coa_type: standard                   # 枚举: standard / simplified / report
applicable_to:
  - 试剂盒
template_layout: A4纵向
version: 1.0
---

## 页眉信息

| 显示序号 | 字段编码 | 字段名称 | 数据来源 | 字体大小 |
|:-------:|---------|---------|---------|:-------:|
| 1 | coa_title | 证书标题 | 固定值:"Certificate of Analysis" | 16号加粗 |
| 2 | coa_no | 证书编号 | 自动生成:COA-{batch_no} | 12号 |
| 3 | issue_date | 签发日期 | 系统当前日期 | 11号 |
| 4 | page | 页码 | 自动:第X页/共Y页 | 9号 |

## 产品信息区

| 显示序号 | 字段编码 | 字段名称 | 数据来源 | 必填 |
|:-------:|---------|---------|---------|:---:|
| 5 | product_name | 产品名称 | 产品定义.product_name | ✅ |
| 6 | product_code | 产品编号 | 产品定义.product_code | ✅ |
| 7 | batch_no | 批号 | 批次.batch_no | ✅ |
| 8 | specification | 规格 | 产品定义.specification | ✅ |
| 9 | manufacture_date | 生产日期 | 批次.manufacture_date | ✅ |
| 10 | expiry_date | 有效期至 | 计算:manufacture_date + shelf_life | ✅ |
| 11 | storage_condition | 储存条件 | 产品定义.storage_condition | ✅ |

## 质检结果区

| 显示序号 | 字段编码 | 字段名称 | 数据来源 | 单位列 | 标准值列 | 结果列 | 判定列 |
|:-------:|---------|---------|---------|:-----:|:-------:|:-----:|:-----:|
| 12 | ph_value | pH值 | 质检.PH.result | — | 7.2-7.4 | 7.35 | ✓ |
| 13 | osmolarity | 渗透压 | 质检.OSMO.result | mOsm/kg | 280-320 | 298.5 | ✓ |
| 14 | sterile_result | 无菌检测 | 质检.STERILE.result | — | 阴性 | 阴性 | ✓ |
| 15 | endotoxin | 内毒素 | 质检.ENDO.result | EU/mL | <0.5 | 0.12 | ✓ |

## 页脚信息

| 显示序号 | 字段编码 | 字段名称 | 数据来源 |
|:-------:|---------|---------|---------|
| 16 | qa_signature | QA审核签名 | 审核人电子签名 |
| 17 | approve_date | 批准日期 | 审核通过时间 |
| 18 | company_info | 公司信息 | 固定值(公司名称地址等) |
| 19 | contact_info | 联系方式 | 固定值 |
| 20 | remark | 备注 | 可编辑文本 |

## 导出设置

| 设置项 | 值 |
|-------|---|
| 导出格式 | PDF |
| 水印 | "CONFIDENTIAL"斜向水印 |
| 二维码 | 包含批次号+CoA编号，用于在线验证 |
| 字体 | 宋体(SimSun), 英文Times New Roman |
```

---

## 7. 系统功能设计

### 7.1 功能架构图

```
┌─────────────────────────────────────────────────────────────┐
│                  AI模板生成中心                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 模板上传 │  │ 模板预览  │  │ 解析入库  │  │ 批量导入  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └──────────────┼────────────┼──────────────┘         │
│                     ▼                                     │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  解析引擎                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │  │
│  │  │YAML解析器│  │表格解析器│  │校验引擎  │             │  │
│  │  └─────────┘  └─────────┘  └─────────┘             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 模板库   │  │ 版本对比 │  │ 导出模板 │  │ 校验日志  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 功能详情

#### 7.2.1 模板上传

**入口位置**：系统管理 → AI模板生成中心 → 模板上传

**支持的文件**：
- 单个 `.md` 文件（Markdown）
- `.zip` 压缩包（批量上传多个`.md`文件）

**上传界面设计**：

```
┌─────────────────────────────────────────────────────────────┐
│  模板上传                                [批量导入] [导出空模板]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │    ┌─────────┐                                      │   │
│  │    │  📄     │   点击或拖拽上传模板文件               │   │
│  │    │         │                                      │   │
│  │    │ .md文件  │   支持 .md 格式                      │   │
│  │    │ 或.zip  │   ZIP包内包含多个.md文件               │   │
│  │    └─────────┘                                      │   │
│  │                                                     │   │
│  │  已选择的文件:                                      │   │
│  │  ✓ product-ND-KIT-001.md (4.2KB)                   │   │
│  │  ✓ form-preparation.md (2.1KB)                      │   │
│  │  ✓ qc-kit-standard.md (1.8KB)                       │   │
│  │  ✓ coa-kit-standard.md (2.3KB)                      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [取消]                          [开始解析预览 →]           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**上传后的处理流程**：

```
上传文件
   ↓
格式校验（是否为合法的.md文件？ZIP是否解压成功？）
   ↓
编码检测（UTF-8 with BOM / UTF-8 / GBK）
   ↓
基础结构校验（是否有YAML Front Matter？是否有必需章节？）
   ↓ ──通过──→ 进入预览界面
   ↓ ──失败──→ 返回错误信息（具体到行号+原因）
```

#### 7.2.2 解析预览

**核心功能**：将上传的Markdown文件解析为结构化数据，供用户确认后再入库。

**预览界面设计**：

```
┌─────────────────────────────────────────────────────────────┐
│  模板解析预览: product-ND-KIT-001.md     [返回][确认入库]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────── 解析摘要 ─────────────────────────────────────┐   │
│  │  文件格式: ✅ 通过    编码: UTF-8    大小: 4.2KB   │   │
│  │  YAML解析: ✅ 通过 (14个字段)                       │   │
│  │  表格解析: ✅ 6个表格 (配方6行/流程6行/质检2行...)   │   │
│  │  整体状态: ⚠️ 有2条警告（非阻断）                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────── 基本信息 ──────────────────────────────────────┐   │
│  │  产品编码: ND-KIT-001  [✅ 编码唯一]                 │   │
│  │  产品名称: 神经分化试剂盒                              │   │
│  │  产品线:  试剂盒                                       │   │
│  │  规格:    100mL/瓶                                     │   │
│  │  责任部门: 试剂盒生产组 [⚠️ 部门名称与系统不完全一致]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────── 配方/BOM (6条记录) ───────────────────────────┐   │
│  │  # │ 组分      │ 原料编码  │ 原料名称    │ 用量 │ 单位│   │
│  │  1 │ 基础培养基 │ RM-001   │ DMEM/F12    │ 89  │ mL │   │
│  │  2 │ 基础培养基 │ RM-002   │ B27添加剂   │ 2   │ mL │   │
│  │  3 │ 基础培养基 │ RM-003   │ N2添加剂    │ 1   │ mL │   │
│  │  ...                                                    │   │
│  │  [展开查看全部]                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────── 生产流程 (6个环节) ──────────────────────────┐   │
│  │  1. 备料(PREP) → 2. 配制(MIX) → 3. 分装(PKG) → ...  │   │
│  │  [展开查看完整流程图]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────── 关联配置 ─────────────────────────────────────┐   │
│  │  质检模板: qc-kit-standard [⚠️ 该模板尚未入库]       │   │
│  │  CoA模板:  coa-kit-standard [⚠️ 该模板尚未入库]       │   │
│  │  表单模板: form-material_prep [✅ 已存在]             │   │
│  │           form-preparation [✅ 已存在]                │   │
│  │           form-packaging [⚠️ 尚未入库]                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────── 警告/错误信息 ─────────────────────────────────┐   │
│  │  ⚠️ W01: 第24行 - "试剂盒生产组"在系统中对应为        │   │
│  │         "试剂盒生产组(制造部)"，建议确认               │   │
│  │  ⚠️ W02: 关联的质检模板 qc-kit-standard 尚未入库，    │   │
│  │         请先上传该模板或在入库后补充关联                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 7.2.3 解析引擎详细设计

**解析流水线**：

```
原始文本
   │
   ▼
┌─────────────┐
│ Step 1      │  文本预处理
│ 编码检测    │  → 检测UTF-8/GBK/ASCII
│ BOM去除     │  → 移除BOM标记
│ 换行符统一  │  → \r\n → \n
└──────┬──────┘
       ▼
┌─────────────┐
│ Step 2      │  Front Matter提取
│ YAML提取    │  → 定位 --- 分隔符
│ YAML解析    │  → 解析YAML内容为JSON对象
│ 字段校验    │  → 对照Schema校验必填/类型
└──────┬──────┘
       ▼
┌─────────────┐
│ Step 3      │  Markdown正文解析
│ 章节提取    │  → 提取 ## 开头的各级标题
│ 表格解析    │  → 解析Markdown表格为二维数组
│ 列表解析    │  → 解析有序/无序列表
└──────┬──────┘
       ▼
┌─────────────┐
│ Step 4      │  数据映射与转换
│ 字段映射    │  → 表格列名 → 数据库字段
│ 类型转换    │  → 字符串→数字/布尔/枚举
│ 引用解析    │  → 解析form-/qc-/coa-引用关系
└──────┬──────┘
       ▼
┌─────────────┐
│ Step 5      │  业务校验
│ 引用完整性  │  → 关联的模板是否存在
│ 编码唯一性  │  → product_code/form_code是否重复
│ 枚举有效性  │  → category/type是否在允许范围内
│ 数值合理性  │  → 流水号顺序、百分比范围等
└──────┬──────┘
       ▼
   输出: 结构化数据对象 + 校验结果(通过/警告/错误)
```

**关键校验规则矩阵**：

| 校验项 | 严重级别 | 触发条件 | 处理方式 |
|--------|---------|---------|---------|
| YAML格式错误 | 🔴 错误 | Front Matter不是合法YAML | 阻断入库，提示具体行号 |
| 缺少必填字段 | 🔴 错误 | 必填字段为空 | 阻断入库，列出缺失字段 |
| 表格格式错误 | 🔴 错误 | 表格列数不一致 | 阻断入库，提示问题行 |
| 编码已存在 | 🔴 错误 | product_code重复 | 阻断入库，提示已有产品 |
| 枚举值无效 | 🟡 警告 | category不在[试剂盒,细胞产品,服务项目]中 | 提示修正建议，可强制入库 |
| 部门名称模糊 | 🟡 警告 | dept名称与系统不完全一致 | 提示最接近的匹配，可确认 |
| 关联模板缺失 | 🟡 警告 | 引用的form/qc/coa尚未入库 | 允许入库，后续补关联 |
| 原料编码不存在 | 🟡 警告 | BOM中的原料编码在物料表中不存在 | 允许入库，后续补充物料 |
| 数值超出常规范围 | 🔵 信息 | 如安全库存=99999 | 仅提示，不阻断 |

#### 7.2.4 确认入库

用户在预览页面确认无误后，点击「确认入库」触发写入操作：

```
确认入库
   ↓
开启数据库事务
   ↓
写入产品定义 → product_definition表
   ↓
写入配方/BOM → product_formula表（如有）
   ↓
写入生产流程 → process_template表（含环节排序）
   ↓
写入质检关联 → product_qc_mapping表
   ↓
写入CoA关联 → product_coa_mapping表
   ↓
保存原始模板文件 → template_file_store表（用于审计）
   ↓
记录操作日志 → system_audit_log表
   ↓
提交事务
   ↓
返回成功 + 生成的产品ID
```

#### 7.2.5 批量导入

**场景**：一次性导入多个产品及其配套模板

**操作流程**：

```
准备ZIP文件
   │
   ├── templates/
   │   ├── product-ND-KIT-001.md
   │   ├── product-HP-KIT-001.md
   │   ├── form-preparation.md
   │   ├── form-packaging.md
   │   ├── qc-kit-standard.md
   │   └── coa-kit-standard.md
   │
   └── manifest.json（可选，声明导入顺序和依赖）
   ↓
上传ZIP
   ↓
系统解压并扫描所有.md文件
   ↓
根据文件名前缀(product-/form-/qc-/coa-)分类
   ↓
按依赖顺序排列:
   ① 先解析form/qc/coa（被引用方）
   ② 再解析product（引用方）
   ↓
逐一解析每个文件
   ↓
汇总预览界面（显示所有文件的解析结果）
   ↓
用户确认 → 全部入库（事务保证原子性）
```

**manifest.json 格式**（可选）：

```json
{
  "import_version": "1.0",
  "description": "2026Q2新增产品包",
  "import_order": [
    "form-preparation.md",
    "form-packaging.md",
    "qc-kit-standard.md",
    "coa-kit-standard.md",
    "product-ND-KIT-001.md",
    "product-HP-KIT-001.md"
  ],
  "dependencies": {
    "product-ND-KIT-001.md": ["form-preparation.md", "qc-kit-standard.md", "coa-kit-standard.md"]
  }
}
```

#### 7.2.6 模板库管理

**功能**：管理已入库的所有模板配置

```
┌─────────────────────────────────────────────────────────────┐
│  模板库                                    [上传新模板]      │
├─────────────────────────────────────────────────────────────┤
│  [全部] [产品定义] [表单] [质检] [CoA]  🔍 搜索...          │
├────┬────────────────┬──────┬──────┬────┬────┬──────────────┤
│ #  │ 名称           │ 编码 │ 类型 │版本│状态│ 操作         │
├────┼────────────────┼──────┼──────┼────┼────┼──────────────┤
│ 1  │ 神经分化试剂盒  │ ND-..│ 产品 │v1.0│🟢启│[查看][编辑] │
│ 2  │ 肝祖细胞分化试剂│ HP-..│ 产品 │v1.1│🟢启│[查看][编辑] │
│ 3  │ 试剂盒配制记录 │ prep│ 表单 │v1.0│🟢启│[查看][编辑] │
│ 4  │ 试剂盒成品质检 │ kit-│ 质检 │v2.0│🟢启│[查看][编辑] │
│ 5  │ 试剂盒标准CoA  │ coa-│ CoA  │v1.0│🟢启│[查看][编辑] │
│ 6  │ iPSC细胞株     │ iPS..│ 产品 │v1.0│⛔停│[查看][启用] │
└────┴────────────────┴──────┴──────┴────┴──────────────────┘

  共 6 条记录    第 1/1 页
```

**每条记录的操作**：

| 操作 | 说明 |
|------|------|
| 查看 | 以渲染后的视图查看完整配置（非原始MD） |
| 编辑 | 在可视化编辑器中修改配置（修改后生成新的版本） |
| 版本历史 | 查看该配置的所有历史版本，支持版本差异对比 |
| 导出 | 导出当前版本的原始MD文件 |
| 停用/启用 | 控制配置是否可选（停用不影响已有数据） |
| 复制 | 基于当前配置快速创建新产品（复制后修改差异点） |

#### 7.2.7 快速复制功能

**场景**：基于现有产品快速创建相似的新产品

```
选中 "神经分化试剂盒"
   ↓
点击 [复制为新产品]
   ↓
弹出复制对话框:

  ┌──────────────────────────────────────┐
  │  基于以下产品创建新产品              │
  │  源产品: 神经分化试剂盒 (ND-KIT-001) │
  │                                      │
  │  新产品编码: [HP-KIT-___]             │
  │  新产品名称: [肝祖细胞分化试剂盒      ] │
  │                                      │
  │  复制内容:                            │
  │  ☑ 基本信息 (修改编码和名称)          │
  │  ☑ 配方/BOM                         │
  │  ☑ 生产流程                          │
  │  ☑ 表单字段                          │
  │  ☑ 质检模板 (生成新副本)             │
  │  ☑ CoA模板 (生成新副本)              │
  │                                      │
  │  [取消]           [创建草稿]         │
  └──────────────────────────────────────┘
   ↓
进入编辑模式，仅修改差异部分
   ↓
保存 → 新产品入库
```

#### 7.2.8 导出空模板/样例

**功能**：帮助用户了解正确的模板格式

系统提供两类导出：

| 导出类型 | 内容 | 用途 |
|----------|------|------|
| **空模板** | 仅含字段头和注释说明的空白MD | 用户填写自己的数据 |
| **样例模板** | 带有示例数据的完整MD | 作为编写参考 |

**导出的空模板示例（产品定义）**：

```markdown
---
# ===== 产品定义模板 =====
# 请根据注释填写各项内容
# 带 * 的字段为必填项

product_code: ""                  # * 产品唯一编码, 如: ND-KIT-001
product_name: ""                  # * 产品名称
category: ""                      # * 产品线枚举: 试剂盒 / 细胞产品 / 服务项目
specification: ""                 # * 规格, 如: 100mL/瓶
storage_condition: ""             # 储存条件, 如: -20℃
shelf_life: ""                    # 有效期, 如: 12个月
responsible_dept: ""              # 责任部门(需与系统中的部门名称一致)
safety_stock: ""                  # 安全库存数字
unit: ""                          # 计量单位, 如: 瓶/支/盒
description: ""                   # 产品描述
---

## 配方/BOM
<!-- 试剂盒产品必填，其他产品线可删除此节 -->

| 组分名称 | 原料编码 | 原料名称 | 用量 | 单位 | 备注 |
|---------|---------|---------|------|------|------|

## 配制步骤
<!-- 试剂盒产品必填，有序列表 -->

1.

## 生产流程
<!-- 必填: 定义生产环节及顺序 -->

| 序号 | 环节编码 | 环节名称 | 关联表单 | 是否必检 | 默认执行人角色 |
|-----|---------|---------|---------|---------|--------------|

## 质检关联
<!-- 必填: 关联质检模板编码 -->

| 质检模板编码 | 质检阶段 | 是否必检 | 触发条件 |
|-------------|---------|---------|---------|

## CoA关联
<!-- 必填: 关联CoA模板编码 -->

| CoA模板编码 | CoA类型 | 自动生成 |
|------------|--------|---------|
```

---

## 8. 数据模型设计

### 8.1 ER关系图（核心表）

```
┌──────────────────┐     ┌──────────────────┐
│ product_def      │     │ template_file    │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │────<│ id (PK)          │
│ product_code (U) │ 1:1 │ target_type      │ ←── 枚举: product/form/qc/coa
│ product_name     │     │ target_id (FK)   │
│ category         │     │ file_name        │
│ specification    │     │ file_content(LB) │ ←── 存储原始MD文本
│ storage_cond     │     │ version          │
│ ...              │     │ uploaded_by      │
│ created_at       │     │ uploaded_at      │
└────────┬─────────┘     └──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐     ┌──────────────────┐
│ formula_item     │     │ process_template │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ product_id (FK)  │     │ product_id (FK)  │
│ component_name   │     │ step_seq         │
│ material_code    │     │ step_code (U)    │ ←── 同一产品下环节编码唯一
│ material_name    │     │ step_name        │
│ amount           │     │ form_template_id │ ──→ form_def.id
│ unit             │     │ is_qc_required   │
│ note             │     │ default_role     │
└──────────────────┘     └──────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ form_def         │     │ qc_template      │     │ coa_template     │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ form_code (U)    │     │ qc_code (U)      │     │ coa_code (U)     │
│ form_name        │     │ qc_name          │     │ coa_name         │
│ form_type        │     │ qc_category      │     │ coa_type         │
│ applicable_to    │     │ applicable_to    │     │ applicable_to    │
│ version          │     │ version          │     │ version          │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                       │                       │
         │ 1:N                   │ 1:N                   │ 1:N
         ▼                       ▼                       ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ form_field       │     │ qc_item          │     │ coa_field        │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ form_id (FK)     │     │ qc_id (FK)       │     │ coa_id (FK)      │
│ field_code (U)   │     │ item_code (U)    │     │ display_order    │
│ field_name       │     │ item_name        │     │ field_code       │
│ field_type       │     │ method           │     │ field_name       │
│ is_required      │     │ result_type      │     │ data_source      │
│ unit             │     │ standard_value   │     │ data_source_expr │
│ default_value    │     │ unit             │     │ unit_column     │
│ validation_rule  │     │ decimal_places   │     │ std_column      │
│ hint_text        │     │ is_required      │     │ result_column   │
│ options          │     │ judgment_rule    │     │ judge_column    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 8.2 核心表DDL

```sql
-- =============================================
-- 1. 产品定义表
-- =============================================
CREATE TABLE product_definition (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_code    VARCHAR(50) NOT NULL COMMENT '产品唯一编码',
    product_name    VARCHAR(200) NOT NULL COMMENT '产品名称',
    category        ENUM('试剂盒','细胞产品','服务项目') NOT NULL COMMENT '产品线',
    specification   VARCHAR(100) NOT NULL COMMENT '规格',
    storage_condition VARCHAR(100) DEFAULT NULL COMMENT '储存条件',
    shelf_life      VARCHAR(50) DEFAULT NULL COMMENT '有效期',
    responsible_dept VARCHAR(100) DEFAULT NULL COMMENT '责任部门',
    safety_stock    INT DEFAULT NULL COMMENT '安全库存',
    unit            VARCHAR(20) DEFAULT NULL COMMENT '计量单位',
    description     TEXT DEFAULT NULL COMMENT '产品描述',

    -- 细胞产品特有字段
    cell_type       VARCHAR(50) DEFAULT NULL COMMENT '细胞类型',
    passage_limit   VARCHAR(20) DEFAULT NULL COMMENT '最大代次',
    source_require TINYINT(1) DEFAULT 0 COMMENT '是否需要种子来源',

    -- 服务项目特有字段
    service_type    VARCHAR(50) DEFAULT NULL COMMENT '服务子类型',
    estimated_duration INT DEFAULT NULL COMMENT '预估周期(天)',
    requires_sample TINYINT(1) DEFAULT 0 COMMENT '是否需要客户样本',
    sample_type     VARCHAR(50) DEFAULT NULL COMMENT '样本类型',

    status          ENUM('active','inactive') DEFAULT 'active' COMMENT '状态',
    version         VARCHAR(20) DEFAULT '1.0' COMMENT '配置版本',
    created_by      BIGINT DEFAULT NULL COMMENT '创建人',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_product_code (product_code)
) COMMENT='产品定义表';

-- =============================================
-- 2. 配方/BOM明细表
-- =============================================
CREATE TABLE product_formula (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id      BIGINT NOT NULL COMMENT '关联产品ID',
    component_name  VARCHAR(100) NOT NULL COMMENT '组分名称',
    sort_order      INT DEFAULT 0 COMMENT '组分内排序',
    material_code   VARCHAR(50) DEFAULT NULL COMMENT '原料编码',
    material_name   VARCHAR(200) NOT NULL COMMENT '原料名称',
    amount          DECIMAL(12,4) NOT NULL COMMENT '用量',
    unit            VARCHAR(20) NOT NULL COMMENT '单位',
    note            VARCHAR(500) DEFAULT NULL COMMENT '备注',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id)
) COMMENT='配方/BOM明细表';

-- =============================================
-- 3. 生产流程模板表
-- =============================================
CREATE TABLE process_template (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id      BIGINT NOT NULL COMMENT '关联产品ID',
    step_seq        INT NOT NULL COMMENT '环节顺序',
    step_code       VARCHAR(50) NOT NULL COMMENT '环节编码',
    step_name       VARCHAR(100) NOT NULL COMMENT '环节名称',
    form_template_id BIGINT DEFAULT NULL COMMENT '关联表单模板ID',
    is_qc_required  TINYINT(1) DEFAULT 0 COMMENT '该环节是否含质检',
    default_role    VARCHAR(100) DEFAULT NULL COMMENT '默认执行人角色',
    estimated_days  INT DEFAULT NULL COMMENT '预计天数(服务项目)',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_product_step (product_id, step_code),
    INDEX idx_product_id (product_id)
) COMMENT='生产流程模板表';

-- =============================================
-- 4. 表单定义表
-- =============================================
CREATE TABLE form_definition (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    form_code       VARCHAR(50) NOT NULL COMMENT '表单编码',
    form_name       VARCHAR(200) NOT NULL COMMENT '表单名称',
    form_type       ENUM('production','qc','coa','inventory','handover','other') NOT NULL COMMENT '表单类型',
    applicable_to   JSON DEFAULT NULL COMMENT '适用产品线(JSON数组)',
    related_process_step VARCHAR(50) DEFAULT NULL COMMENT '关联环节编码',
    version         VARCHAR(20) DEFAULT '1.0' COMMENT '版本',
    status          ENUM('active','inactive') DEFAULT 'active',
    created_by      BIGINT DEFAULT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_form_code (form_code)
) COMMENT='表单定义表';

-- =============================================
-- 5. 表单字段定义表
-- =============================================
CREATE TABLE form_field (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    form_id         BIGINT NOT NULL COMMENT '关联表单ID',
    field_code      VARCHAR(50) NOT NULL COMMENT '字段编码',
    field_name      VARCHAR(100) NOT NULL COMMENT '字段名称',
    field_type      VARCHAR(30) NOT NULL COMMENT '字段类型(text/number/select/datetime/image/file/readonly/computed/esign/barcode/select_user/textarea)',
    is_required     TINYINT(1) DEFAULT 0 COMMENT '是否必填',
    unit            VARCHAR(20) DEFAULT NULL COMMENT '单位',
    default_value   VARCHAR(200) DEFAULT NULL COMMENT '默认值',
    validation_rule VARCHAR(500) DEFAULT NULL COMMENT '校验规则',
    hint_text       VARCHAR(200) DEFAULT NULL COMMENT '显示提示',
    options         JSON DEFAULT NULL COMMENT '下拉选项(select类型)',
    sort_order      INT DEFAULT 0 COMMENT '排序',
    condition_expr  VARCHAR(200) DEFAULT NULL COMMENT '条件必填表达式',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_form_field (form_id, field_code),
    INDEX idx_form_id (form_id)
) COMMENT='表单字段定义表';

-- =============================================
-- 6. 质检模板表
-- =============================================
CREATE TABLE qc_template (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    qc_code         VARCHAR(50) NOT NULL COMMENT '质检模板编码',
    qc_name         VARCHAR(200) NOT NULL COMMENT '质检模板名称',
    qc_category     ENUM('in_process','release','stability','identity') NOT NULL COMMENT '质检类型',
    applicable_to   JSON DEFAULT NULL COMMENT '适用产品线',
    judgment_logic  TEXT DEFAULT NULL COMMENT '综合判定逻辑说明',
    version         VARCHAR(20) DEFAULT '1.0',
    status          ENUM('active','inactive') DEFAULT 'active',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_qc_code (qc_code)
) COMMENT='质检模板表';

-- =============================================
-- 7. 质检检测项表
-- =============================================
CREATE TABLE qc_item (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    qc_id           BIGINT NOT NULL COMMENT '关联质检模板ID',
    item_code       VARCHAR(50) NOT NULL COMMENT '检测项编码',
    item_name       VARCHAR(100) NOT NULL COMMENT '检测项名称',
    method          VARCHAR(200) DEFAULT NULL COMMENT '检测方法',
    result_type     ENUM('numeric','select','text','pass_fail') NOT NULL COMMENT '结果类型',
    standard_value  VARCHAR(200) NOT NULL COMMENT '标准值',
    unit            VARCHAR(20) DEFAULT NULL COMMENT '单位',
    decimal_places  TINYINT DEFAULT 2 COMMENT '小数位数',
    is_required     TINYINT(1) DEFAULT 1 COMMENT '是否必测',
    judgment_rule   VARCHAR(50) DEFAULT 'range' COMMENT '判定规则(range/equals/upper_limit/lower_limit)',
    coa_map_field   VARCHAR(50) DEFAULT NULL COMMENT '映射到CoA的字段编码',
    coa_display_name VARCHAR(100) DEFAULT NULL COMMENT 'CoA上的显示名称',
    sort_order      INT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_qc_item (qc_id, item_code)
) COMMENT='质检检测项表';

-- =============================================
-- 8. CoA模板表
-- =============================================
CREATE TABLE coa_template (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    coa_code        VARCHAR(50) NOT NULL COMMENT 'CoA模板编码',
    coa_name        VARCHAR(200) NOT NULL COMMENT 'CoA模板名称',
    coa_type        ENUM('standard','simplified','report') NOT NULL COMMENT 'CoA类型',
    applicable_to   JSON DEFAULT NULL COMMENT '适用产品线',
    template_layout VARCHAR(50) DEFAULT 'A4纵向' COMMENT '版面布局',
    export_format   VARCHAR(20) DEFAULT 'PDF' COMMENT '导出格式',
    watermark_text  VARCHAR(100) DEFAULT NULL COMMENT '水印文字',
    version         VARCHAR(20) DEFAULT '1.0',
    status          ENUM('active','inactive') DEFAULT 'active',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_coa_code (coa_code)
) COMMENT='CoA模板表';

-- =============================================
-- 9. CoA字段布局表
-- =============================================
CREATE TABLE coa_field (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    coa_id          BIGINT NOT NULL COMMENT '关联CoA模板ID',
    section         ENUM('header','product_info','qc_results','footer') NOT NULL COMMENT '所在区域',
    display_order   INT NOT NULL COMMENT '显示顺序',
    field_code      VARCHAR(50) NOT NULL COMMENT '字段编码',
    field_name      VARCHAR(100) NOT NULL COMMENT '字段名称',
    data_source     VARCHAR(200) DEFAULT NULL COMMENT '数据来源(固定值/字段路径/计算公式)',
    unit_column     TINYINT(1) DEFAULT 0 COMMENT '是否显示单位列',
    std_column      TINYINT(1) DEFAULT 0 COMMENT '是否显示标准值列',
    result_column   TINYINT(1) DEFAULT 0 COMMENT '是否显示结果列',
    judge_column    TINYINT(1) DEFAULT 0 COMMENT '是否显示判定列',
    font_size       VARCHAR(10) DEFAULT '11' COMMENT '字体大小',
    font_bold       TINYINT(1) DEFAULT 0 COMMENT '是否加粗',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_coa_section (coa_id, section, display_order)
) COMMENT='CoA字段布局表';

-- =============================================
-- 10. 模板文件存储表（审计用）
-- =============================================
CREATE TABLE template_file_store (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    target_type     ENUM('product','form','qc','coa') NOT NULL COMMENT '目标类型',
    target_id       BIGINT NOT NULL COMMENT '目标记录ID',
    file_name       VARCHAR(200) NOT NULL COMMENT '原始文件名',
    file_content    LONGTEXT NOT NULL COMMENT '原始MD文件内容',
    file_size       INT DEFAULT NULL COMMENT '文件大小(字节)',
    version         VARCHAR(20) NOT NULL COMMENT '版本号',
    upload_source   ENUM('upload','copy','edit','import') DEFAULT 'upload' COMMENT '来源',
    uploaded_by     BIGINT DEFAULT NULL COMMENT '操作人',
    uploaded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    md5_hash        VARCHAR(32) DEFAULT NULL COMMENT '文件MD5',
    INDEX idx_target (target_type, target_id)
) COMMENT='模板文件存储表(审计溯源)';
```

---

## 9. API接口设计

### 9.1 模板上传与解析

#### POST `/api/v1/template/upload`

**功能**：上传单个模板文件并解析

**请求**：
```
Content-Type: multipart/form-data

参数:
- file: 文件(MD文件)
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "file_id": "tmp_abc123",
    "file_name": "product-ND-KIT-001.md",
    "parse_status": "warning",
    "parsed_data": {
      "type": "product",
      "yaml": { "product_code": "ND-KIT-001", ... },
      "sections": {
        "formula": [...],
        "process_flow": [...],
        "qc_mapping": [...],
        "coa_mapping": [...]
      }
    },
    "warnings": [
      {
        "code": "W_DEPT_FUZZY",
        "line": 8,
        "message": "部门名称'试剂盒生产组'与系统中'试剂盒生产组(制造部)'近似"
      }
    ],
    "errors": []
  }
}
```

#### POST `/api/v1/template/batch-upload`

**功能**：批量上传ZIP包

**请求**：
```
Content-Type: multipart/form-data

参数:
- zip_file: ZIP压缩包
```

**响应**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "batch_id": "batch_xyz789",
    "total_files": 6,
    "parsed_files": 6,
    "files": [
      {
        "file_name": "product-ND-KIT-001.md",
        "type": "product",
        "status": "ok"
      },
      ...
    ],
    "dependency_graph": {
      "product-ND-KIT-001.md": ["form-preparation.md", "qc-kit-standard.md"]
    }
  }
}
```

### 9.2 预览与入库

#### GET `/api/v1/template/preview/{fileId}`

**功能**：获取解析后的预览数据

#### POST `/api/v1/template/confirm`

**功能**：确认解析结果，写入数据库

**请求体**：
```json
{
  "file_id": "tmp_abc123",
  "ignore_warnings": true,
  "manual_fixes": {
    "responsible_dept": "试剂盒生产组(制造部)"
  }
}
```

**响应**：
```json
{
  "code": 0,
  "message": "入库成功",
  "data": {
    "product_id": 1001,
    "product_code": "ND-KIT-001",
    "created_tables": [
      "product_definition (1)",
      "product_formula (6)",
      "process_template (6)"
    ],
    "template_file_id": 5001
  }
}
```

### 9.3 模板库管理

#### GET `/api/v1/templates`

**功能**：分页查询模板列表

**参数**：`type`, `keyword`, `status`, `page`, `size`

#### GET `/api/v1/templates/{id}`

**功能**：获取模板详情（渲染后的结构化数据）

#### GET `/api/v1/templates/{id}/versions`

**功能**：获取版本历史

#### GET `/api/v1/templates/{id}/export`

**功能**：导出原始MD文件

#### POST `/api/v1/templates/{id}/duplicate`

**功能**：基于现有模板快速复制

**请求体**：
```json
{
  "new_code": "HP-KIT-001",
  "new_name": "肝祖细胞分化试剂盒",
  "copy_items": ["basic", "formula", "process", "forms", "qc", "coa"]
}
```

### 9.4 辅助接口

#### GET `/api/v1/template/sample/{type}`

**功能**：获取指定类型的样例模板（带示例数据）

**参数**：`type` ∈ [`product`, `form`, `qc`, `coa`]

#### GET `/api/v1/template/blank/{type}`

**功能**：获取指定类型的空白模板（带注释说明）

#### GET `/api/v1/template/validate-reference`

**功能**：实时校验引用关系

**参数**：`code` (要校验的form_code/qc_code/coa_code)

---

## 10. 用户界面交互流程

### 10.1 完整的用户操作旅程

```
场景: 研发人员要添加一个新试剂盒产品

  步骤1: 获取模板规范
  ┌────────────────────────────────────────────┐
  │  系统管理 → AI模板生成中心 → 导出空模板    │
  │  选择"产品定义" → 下载 blank-product.md   │
  │  选择"表单定义" → 下载 blank-form.md      │
  │  选择"质检模板" → 下载 blank-qc.md        │
  │  选择"CoA模板"  → 下载 blank-coa.md       │
  └────────────────────────────────────────────┘

  步骤2: 使用AI生成模板
  ┌────────────────────────────────────────────┐
  │  打开 ChatGPT / Claude / DeepSeek          │
  │  粘贴空模板 + 填入产品实际信息作为Prompt   │
  │  AI生成完整的模板文件内容                   │
  │  人工审核生成的MD内容                       │
  └────────────────────────────────────────────┘

  步骤3: 上传到系统
  ┌────────────────────────────────────────────┐
  │  回到系统 → 模板上传 → 选择文件            │
  │  系统自动解析 → 展示预览                    │
  │  查看警告信息 → 确认无误                    │
  │  点击"确认入库"                             │
  └────────────────────────────────────────────┘

  步骤4: 验证效果
  ┌────────────────────────────────────────────┐
  │  进入批次管理 → 新建批次                    │
  │  产品下拉列表中看到新产品 ✓                 │
  │  选择新产品 → 流程/表单/质检正确加载 ✓      │
  │  完成！新产品可在系统中正常使用             │
  └────────────────────────────────────────────┘
```

### 10.2 错误处理与引导

| 场景 | 系统行为 | 用户指引 |
|------|---------|---------|
| YAML格式有误 | 高亮出错行，提示具体原因 | 提示"请检查第X行的YAML缩进/语法" |
| 必填字段缺失 | 列出所有缺失字段 | 提示"以下字段为必填，请在MD中补充" |
| 表格列数不一致 | 标记出问题的表格行 | 提示"第X行表格列数与表头不一致" |
| 编码重复 | 阻断入库 | 提示"编码XXX已被产品YYY占用，请更换" |
| 关联模板未入库 | 允许入库但标记警告 | 提示"请先上传关联的XXX模板，或稍后在编辑中补充" |
| 部门名称不匹配 | 列出最接近的候选 | 提供下拉选择或确认使用新名称 |

---

## 11. 外部AI工具使用指南

### 11.1 ChatGPT Prompt模板

**用途**：让AI生成符合规范的完整产品模板

```
你是一个生物制药行业的产品数据专家。
请根据我提供的信息，生成符合以下iPSC生产管理系统模板规范的Markdown文件。

## 输出格式要求
1. 必须以YAML Front Matter开头（---包裹的元数据）
2. 正文使用Markdown表格定义结构化数据
3. 严格按照下面的字段规范填写

## 我要生成的产品信息

【在此填写产品的基本信息、配方、流程等】

## 参考模板结构

【粘贴从系统导出的空白模板或样例模板】

## 要求
- 直接输出Markdown代码块，不要多余解释
- 所有字段都要填充合理的示例数据
- 表格列数必须与表头严格一致
- 编码使用大写字母+数字+连字符格式
```

### 11.2 Claude Prompt模板

```
<role>
你是iPSC生产管理系统的配置工程师，擅长将产品信息转化为标准化的系统配置模板。
</role>

<task>
请根据以下产品信息，输出一份完整的Markdown格式产品定义模板。
</task>

<format_rules>
- 使用YAML Front Matter存放基本属性
- 使用 ## 二级标题划分章节
- 使用 | 管道符表格定义配方、流程、质检等信息
- 字段编码使用 UPPER_SNAKE_CASE 风格
</format_rules>

<product_info>
产品名称: {name}
产品编码: {code}
产品线: {category}
...
</product_info>

<output>
请输出完整的Markdown内容，放入 ```markdown 代码块中。
</output>
```

### 11.3 DeepSeek Prompt模板（中文优化版）

```
请帮我为一个生物制品生成iPSC生产管理系统需要的配置模板。

## 产品信息
- 名称：{产品名称}
- 编码：{编码}
- 类型：{试剂盒/细胞产品/服务项目}
- 规格：{规格}
- 配方：{原料和用量}
- 质检项目：{检测项和标准}
- 生产步骤：{简要流程}

## 模板格式要求
1. 第一段是YAML格式的元数据，用---包裹
2. 下面用##标题+表格的形式写配置
3. 试剂盒要有配方表和生产步骤（有序列表）
4. 细胞产品要有种子库要求和生产流程表
5. 服务项目要有服务流程表和交付物表

请直接输出Markdown格式的完整模板。
```

---

## 12. 与其他模块的关系

### 12.1 模块依赖图

```
┌─────────────────────────────────────────────────────────┐
│                    其他模块调用此模块                     │
│                                                         │
│  批次管理模块                                           │
│  └── 新建批次时 → 读取 product_definition 获取流程模板   │
│  └── 加载eBPR → 读取 form_definition + form_field 渲染  │
│                                                         │
│  质检管理模块                                           │
│  └── 创建质检任务 → 读取 qc_template + qc_item          │
│  └── 结果判定 → 按照 judgment_rule 自动判定             │
│                                                         │
│  CoA管理模块                                            │
│  └── 生成CoA → 读取 coa_template + coa_field            │
│  └── 数据填充 → 从质检结果按 data_source 映射填充       │
│                                                         │
│  系统管理模块                                           │
│  └── 基础数据维护 → 调用模板中心的导入和管理能力         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 12.2 数据流向

```
模板文件(.md)
    │
    ▼ [上传]
AI模板生成中心
    │
    ├─→ product_definition ──→ 批次管理(新建批次时选用)
    │       │
    │       ├─→ product_formula ──→ eBPR(物料核对)
    │       └─→ process_template ──→ 任务分解
    │
    ├─→ form_definition + form_field ──→ eBPR(动态渲染表单)
    │
    ├─-> qc_template + qc_item ──→ 质检管理(加载检测项)
    │
    └─-> coa_template + coa_field ──→ CoA管理(生成证书)
```

---

## 13. 测试要点

### 13.1 解析引擎测试

| 测试用例 | 输入 | 预期结果 |
|----------|------|---------|
| 标准格式MD | 符合规范的产品模板 | 全部解析成功，无警告 |
| 缺少必填字段 | product_code为空 | 返回错误，列出缺失字段 |
| YAML格式错误 | 缩进混乱的Front Matter | 返回错误，指出具体行号 |
| 表格列数不一致 | 某行缺少一列 | 返回错误，标出问题行 |
| 编码重复 | product_code与已有产品相同 | 返回错误，提示冲突 |
| 中文编码GBK | GBK编码的MD文件 | 正确识别并转换为UTF-8 |
| ZIP批量上传 | 包含6个MD的ZIP包 | 全部解析，按依赖排序 |
| 循环引用依赖 | A引用B，B又引用A | 检测到循环依赖并报错 |
| 特殊字符 | 字段值含引号/管道符/换行 | 正确转义，不破坏表格结构 |
| 空文件 | 0字节的MD文件 | 返回错误"文件为空" |
|超大文件 | 2MB的MD文件 | 正常处理或提示"超过大小限制" |

### 13.2 入库测试

| 测试用例 | 操作 | 预期结果 |
|----------|------|---------|
| 正常入库 | 预览确认后入库 | 所有相关表写入成功，模板文件存储 |
| 回滚测试 | 入库中途模拟失败 | 数据库回滚，不留脏数据 |
| 并发入库 | 两个用户同时导入相同编码 | 第二个用户收到编码重复错误 |
| 版本迭代 | 修改后重新上传同编码产品 | 旧版本保留，生成新版本号 |

### 13.3 集成测试

| 测试用例 | 场景 | 预期结果 |
|----------|------|---------|
| 端到端 | 上传产品模板→新建批次→生产录入→质检→CoA | 全流程走通，数据正确传递 |
| 表单渲染 | 产品关联的表单字段正确显示 | 字段类型、校验、默认值均生效 |
| CoA生成 | 质检完成后生成CoA | 数据自动填充，格式正确 |

---

## 14. 附录

### 附录A：完整字段类型参考手册

| 类型 | UI组件 | 数据库存储 | 适用场景 |
|------|--------|-----------|---------|
| `text` | `<input>` | VARCHAR | 简短文本：备注、说明 |
| `textarea` | `<textarea>` | TEXT | 长文本：异常描述、实验观察 |
| `number` | `<input type="number">` | DECIMAL(12,4) | 数值：温度、用量、浓度、pH |
| `select` | `<el-select>` | VARCHAR | 固定选项：外观、合格/不合格 |
| `select_user` | 自定义弹窗选择器 | BIGINT(FK→user.id) | 人员：操作人、复核人 |
| `datetime` | `<el-date-picker>` | DATETIME | 时间：开始/结束时间 |
| `date` | `<el-date-picker type="date">` | DATE | 日期：生产日期、有效期 |
| `image` | `<el-upload accept="image/*">` | VARCHAR(路径) | 图片：细胞形态、外观照片 |
| `file` | `<el-upload>` | VARCHAR(路径) | 文件：SOP、MSDS |
| `readonly` | `<span>` 只读展示 | — | 自动带出：批号、产品信息 |
| `computed` | `<span>` 计算展示 | — | 自动计算：时长、总产量 |
| `esign` | 电子签名按钮 | JSON(签名快照) | 签名：操作确认、审核确认 |
| `barcode` | `<input>` + 扫描事件 | VARCHAR | 条码：物料扫码、批号扫码 |

### 附录B：错误码速查表

| 错误码 | 含义 | 处理建议 |
|--------|------|---------|
| E001 | 文件格式不支持 | 请上传.md格式文件 |
| E002 | 文件为空 | 请检查文件内容 |
| E003 | 编码无法识别 | 请确保文件为UTF-8编码 |
| E004 | 缺少YAML Front Matter | 文件必须以`---`开头的YAML Front Matter |
| E005 | YAML解析失败 | 请检查YAML语法（缩进、冒号后空格、特殊字符转义） |
| E006 | 必填字段缺失: {field} | 在YAML或对应表格中补充该字段 |
| E007 | 表格格式的行{line}列数不一致 | 检查该行的表格列是否与表头对齐 |
| E008 | 编码 {code} 已被占用 | 请更换为未使用的编码 |
| W001 | 部门名称模糊匹配 | 系统中找到近似名称"{match}"，请确认 |
| W002 | 关联模板 {code} 尚未入库 | 允许入库，请后续补充上传 |
| W003 | 原料编码 {code} 不存在于物料表 | 允许入库，请在物料管理中补充 |
| I001 | 数值 {value} 超出常规范围 | 仅为提示信息，如无误可忽略 |

### 附录C：三种产品线模板对比速查

| 对比项 | 试剂盒 (`product-*.md`) | 细胞产品 (`product-*.md`) | 服务项目 (`product-*.md`) |
|--------|----------------------|------------------------|-------------------------|
| **category** | `试剂盒` | `细胞产品` | `服务项目` |
| **必填章节** | 配方/BOM ✅ | 种子库要求 ✅ | 服务流程 ✅ |
| **必填章节** | 配制步骤 ✅ | — | 输出交付物 ✅ |
| **特有YAML字段** | — | cell_type, passage_limit, source_require | service_type, estimated_duration, requires_sample, sample_type |
| **生产流程** | 备料→配制→分装→质检→CoA→入库 | 计划→复苏→扩增→收获→质检→CoA→入库 | 接收→重编程→挑选→扩增→鉴定→交接→报告 |
| **质检位置** | 生产后集中质检 | 生产后集中质检 | **融入流程**（鉴定环节即质检） |
| **CoA类型** | standard(标准) | standard(标准) | report(实验报告) |
| **配方/BOM** | 必填 | 不需要 | 不需要 |

### 附录D：模板文件目录结构建议

```
/ipsc-templates/                    # 团队共享模板仓库
  │
  ├── README.md                     # 使用说明
  │
  ├── _standards/                   # 规范文档
  │   ├── template-spec-v1.0.md     # 模板规范完整版
  │   └── field-type-reference.md   # 字段类型参考手册
  │
  ├── _examples/                    # 样例模板（供参考）
  │   ├── product/
  │   │   ├── product-ND-KIT-001.example.md
  │   │   ├── product-iPSC-WT-001.example.md
  │   │   └── product-SVC-REPROG-001.example.md
  │   ├── form/
  │   │   └── form-preparation.example.md
  │   ├── qc/
  │   │   └── qc-kit-standard.example.md
  │   └── coa/
  │       └── coa-kit-standard.example.md
  │
  ├── blanks/                       # 空白模板（用于填写）
  │   ├── blank-product-kit.md
  │   ├── blank-product-cell.md
  │   ├── blank-product-service.md
  │   ├── blank-form.md
  │   ├── blank-qc.md
  │   └── blank-coa.md
  │
  └── products/                     # 实际产品配置（按产品线分目录）
      ├── kits/
      │   ├── ND-KIT-001/
      │   │   ├── product-ND-KIT-001.md
      │   │   ├── form-preparation.md
      │   │   ├── form-packaging.md
      │   │   ├── qc-kit-standard.md
      │   │   └── coa-kit-standard.md
      │   └── HP-KIT-001/
      │       └── ...
      ├── cells/
      │   └── iPSC-WT-001/
      │       └── ...
      └── services/
          └── SVC-REPROG-001/
              └── ...
```

---

## 文档修订记录

| 版本 | 日期 | 修订内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-04-10 | 初版，完成全部设计内容 | 技术文档工程师 |