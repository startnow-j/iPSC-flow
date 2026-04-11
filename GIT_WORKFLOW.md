# iPSC-Flow Git 工作流规范

> **适用范围**：所有参与 iPSC-Flow 项目的开发人员（包括 AI 辅助开发）
> **云端仓库**：https://github.com/startnow-j/iPSC-flow.git
> **主分支**：`main`

---

## 1. 自动保存规则

以下情况**必须**执行 `git add` + `commit` + `push`：

| 触发条件 | 提交类型 | commit message 前缀 | 示例 |
|---------|---------|-------------------|------|
| 完成一个功能模块开发 | feature | `feat:` | `feat: add batch management CRUD with state machine` |
| 修复一个 Bug | bugfix | `fix:` | `fix: state transition guard for QC_PASS to COA_PENDING` |
| 进行重大修改/重构 | refactor | `refactor:` | `refactor: extract validation service from form components` |
| 当日工作结束（无论做了什么） | daily | `chore:` | `chore: daily save - [日期] [简要描述]` |
| 更新文档/配置 | docs/config | `docs:` / `chore:` | `docs: update PRD v2.0 with MVP scope changes` |
| 调整数据库 schema | migration | `schema:` | `schema: add audit_log table with input_mode field` |

### 1.1 每日保存

每个工作日结束时，执行一次提交并推送：

```bash
git add -A
git commit -m "chore: daily save - $(date +%Y-%m-%d) [当天完成的工作摘要]"
git push origin main
```

### 1.2 功能完成保存

每完成一个独立功能（如"批次管理模块"、"质检录入页面"），立即提交：

```bash
git add -A
git commit -m "feat: 完成批次管理模块 - CRUD、状态机流转、列表筛选"
git push origin main
```

### 1.3 重大修改保存

在进行架构调整、数据库 schema 变更、核心业务逻辑修改前，先提交当前状态作为回退点：

```bash
# 修改前先保存
git add -A
git commit -m "chore: checkpoint before refactoring validation service"
git push origin main

# ... 进行修改 ...

# 修改后保存
git add -A
git commit -m "refactor: extract validation service as independent module"
git push origin main
```

---

## 2. Commit Message 规范

### 2.1 格式

```
<type>: <简短描述（中文或英文均可）>

[可选] 详细说明：
- 为什么做这个修改
- 影响了哪些模块
- 注意事项
```

### 2.2 Type 列表

| Type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（不改变外部行为） |
| `schema` | 数据库 schema 变更 |
| `docs` | 文档更新 |
| `chore` | 构建、配置、日常保存等杂项 |
| `style` | 代码格式（不影响逻辑） |
| `test` | 测试相关 |
| `perf` | 性能优化 |

### 2.3 关联任务编号

如果与开发计划中的里程碑/任务关联，在 message 中标注：

```
feat: 完成批次状态机 API [M1]
fix: 修复质检自动判定规则错误 [M3]
```

---

## 3. 分支策略

### 3.1 当前阶段（MVP）

MVP 阶段采用**单分支直接开发**策略，所有提交到 `main` 分支。

理由：
- 团队仅 1-2 人
- 主要是 AI 辅助开发，冲突风险极低
- MVP 追求速度，分支管理开销不值得

### 3.2 后续阶段

当团队扩大或进入正式维护阶段后，切换为：

```
main (生产) ← release/v1.0 ← develop ← feature/xxx
```

---

## 4. .gitignore 维护

以下内容已被排除：

| 排除项 | 原因 |
|--------|------|
| `node_modules/` | 依赖，通过 `bun install` 恢复 |
| `.next/` | 构建产物 |
| `.env*` | 敏感信息（API Key 等） |
| `db/*.db` | 本地数据库文件（通过 schema 重建） |
| `/skills/` | AI 平台内部文件 |
| `generate-*.js` | 文档生成临时脚本 |
| `*.log` / `dev.log` | 日志文件 |
| `/download/` | 下载缓存 |
| `/upload/` | 用户上传临时文件 |
| `archive/` | **已纳入 Git**（过期文档归档，因沙箱环境不稳定需要云端备份） |

**新增需要排除的内容时，先更新 `.gitignore` 再提交。**

---

## 5. 安全注意事项

- **绝不提交** `.env` 文件中的 API Key、数据库密码等敏感信息
- **绝不提交** 包含真实实验数据的数据库文件
- commit message 中不包含客户名称、细胞株具体编号等敏感业务信息
- 定期检查 `git log` 确保没有意外提交敏感数据
