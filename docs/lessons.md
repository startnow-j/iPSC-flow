# iPSC-Flow 开发经验教训

> **维护说明**：本文件记录项目开发过程中发现的值得复用的经验教训，帮助后续开发和 bug 排查。
> **更新日期**：2026-06-29

---

## 1. React 状态初始化陷阱：useState vs useEffect

### 问题

编辑对话框（如用户管理）使用 `useState(editUser?.name || '')` 初始化表单字段，但点击"编辑"时表单始终为空。

### 根因

`useState` 的初始值**只在组件首次挂载时生效**。当父组件改变 props（如设置 `editUser`）时，React 重新渲染组件但不会重新挂载，因此 `useState` 不会重新执行。

### 关键陷阱

这个问题在使用 **自定义非 Radix Dialog**（如项目中的 `SimpleDialog`）时尤其容易触发，因为：

1. Radix UI Dialog 会在 `open` 变化时调用 `onOpenChange`，开发者通常在 `onOpenChange(true)` 回调中重置表单
2. 自定义 Dialog 通常只在**用户交互**（点击遮罩/关闭按钮/Escape）时调用 `onOpenChange`，**不会在 props 驱动的 `open` 变化时调用**
3. 因此，父组件通过 `setEditUser(user) + setDialogOpen(true)` 打开对话框时，重置逻辑永远不会执行

### 解决方案

```tsx
// ❌ 错误：依赖 handleOpenChange 重置（自定义 Dialog 不会在 props open 变化时触发）
const handleOpenChange = (open: boolean) => {
  if (open) {
    setName(editUser?.name || '') // 永远不会执行
  }
  onOpenChange(open)
}

// ✅ 正确：用 useEffect 监听 open 和 editUser 变化
useEffect(() => {
  if (open) {
    setName(editUser?.name || '')
    setEmail(editUser?.email || '')
    // ... 其他字段
  }
}, [open, editUser])
```

### 适用场景

任何需要根据 props 初始化内部状态的组件：编辑对话框、详情抽屉、动态表单等。

---

## 2. API 参数传递与类型不匹配：productId vs productCode

### 问题

任务指派对话框传递 `productId`（实为 `productCode`，如 `IPSC-WT-001`），但 API 端完全不读取该参数，导致所有产品线用户都出现在可指派列表中。

### 根因

1. **命名混淆**：`batch.productCode`（业务编码如 `IPSC-WT-001`）和 `batch.productId`（数据库外键 cuid 如 `cmnud9h9o0032`）含义完全不同
2. **参数沉默失败**：API 接收了查询参数但不读取也不报错，前端以为传了就生效了
3. **接口类型不一致**：前端 `AssignTaskDialogProps.productId` 传入的是 string，但含义在批次详情页和对话框之间不一致

### 经验

- 数据库 FK 字段（`productId`）和业务编码字段（`productCode`）在传递时**必须明确注释或使用类型区分**
- API 接收查询参数但不使用时应返回警告或 400，避免静默忽略
- 涉及权限过滤的场景，**始终在 API 层做权威校验**，不要只依赖前端过滤

---

## 3. 权限过滤粒度：产品线级 vs 产品级

### 问题

`/api/product-roles/available-users` 只按产品线（`CELL_PRODUCT`）过滤用户，没有按具体产品过滤 `UserProductRole`，导致没有某产品权限的用户也能被指派到该产品的任务。

### 设计原则

系统的三级权限模型中：

| 级别 | 数据表 | 粒度 | 适用场景 |
|------|--------|------|---------|
| 全局角色 | `User.roles` | 全局 | 定义资质类型（是操作员还是质检员） |
| 产品线归属 | `UserProductLine` | 产品线 | 定义活动范围（属于哪条线） |
| 产品权限 | `UserProductRole` | 具体产品 | 定义具体授权（能碰哪个产品） |

**关键区分**：
- **管理类操作**（创建批次、分配任务、审核 CoA）：检查产品线归属即可，管理角色天然覆盖产品线下所有产品
- **操作类操作**（执行生产、执行质检）：必须检查产品级授权，因为不同产品的操作技能不同

### 代码模式

```typescript
// 管理类：产品线级别
if (isManagementRole) → 允许（覆盖产品线下所有产品）

// 操作类：产品级别
if (!hasUserProductRole(userId, productId, ['OPERATOR'])) → 拒绝
```

---

## 4. SimpleDialog 组件的使用注意事项

### 背景

项目使用自实现的 `SimpleDialog`（`src/components/ui/simple-dialog.tsx`）替代 Radix UI Dialog，因为 Radix 的 `usePresence` 系统在频繁内部状态变化时会导致无限循环。

### 行为差异

| 特性 | Radix Dialog | SimpleDialog |
|------|-------------|--------------|
| `open` 变化时调用 `onOpenChange` | ✅ 是 | ❌ 否（只在用户交互时调用） |
| Escape 键关闭 | ✅ 内置 | ✅ 手动实现 |
| 点击遮罩关闭 | ✅ 内置 | ✅ 手动实现 |
| 无障碍焦点管理 | ✅ 完整 | ⚠️ 基础 |

### 开发注意

使用 SimpleDialog 时：
- **不要**在 `onOpenChange` 中依赖 `open === true` 来初始化状态
- **应该**使用 `useEffect` 监听 `open` prop 变化来初始化/重置状态
- 关闭时仍然可以通过 `onOpenChange(false)` 来清理状态

---

## 5. 前端 UI 信息层次设计：高亮 + 弱化

### 场景

权限总览页选中某个产品后，用户希望快速识别哪些人有权操作该产品，而不是被全局角色和产品线信息干扰。

### 设计模式

当页面进入"聚焦模式"时：

1. **高亮目标列**：给目标数据列加浅色背景（`bg-primary/5`），表头加粗
2. **弱化非目标列**：给非目标列降低透明度（`opacity-40`），表头文字变淡
3. **标签引导**：在表头或列标题旁加小图标（如烧瓶），增强视觉识别
4. **提示栏**：在表格上方显示当前筛选条件的信息摘要

```tsx
// 桌面端表格
<TableHead className={selectedProductId ? 'text-muted-foreground/60' : ''}>全局角色</TableHead>
<TableHead className={selectedProductId ? 'bg-primary/5 font-semibold' : ''}>产品权限</TableHead>
<TableCell className={selectedProductId ? 'opacity-40' : ''}>...</TableCell>
<TableCell className={selectedProductId ? 'bg-primary/5' : ''}>...</TableCell>

// 移动端卡片
<div className={selectedProductId ? 'opacity-40' : ''}>产品线信息</div>
<div className="rounded-md bg-primary/5 px-2.5 py-1.5">产品权限（高亮卡片）</div>
```

### 适用场景

任何"筛选后需要对比分析"的页面：权限核对、角色检查、合规审计等。

---

## 6. Next.js App Router 中 API 参数获取

### 注意

在 Next.js 16 的 Route Handler 中：

```typescript
// ✅ 推荐：使用 request.nextUrl.searchParams
const productId = request.nextUrl.searchParams.get('productId')

// ❌ 避免：手动解析 URL
const { searchParams } = new URL(request.url)
```

两种方式都可用，但 `request.nextUrl` 是 Next.js 提供的类型安全 API。

---

## 7. 开发流程建议

### 先改数据再改 UI

涉及权限/过滤类的 bug，修复顺序应为：
1. 先确认数据库中的数据关系（`UserProductRole` 是否存在记录）
2. 修复 API 层的过滤逻辑
3. 修复前端传递的参数类型
4. 最后调整 UI 展示

### 用户实测是最好的验证

用户在测试中发现的"陈五不应该出现"问题，比代码审查更容易暴露权限逻辑缺陷。鼓励用户在权限相关功能上进行边界测试。
