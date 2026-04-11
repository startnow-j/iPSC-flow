# Task P1-A: Navigation Architecture Refactoring (§2.7)

## Agent: Main Agent

## Task Summary
Implement the §2.7 navigation architecture design: replace old "我的批次/所有批次" with 3 product-line entry points.

## Work Log

### Part 1: Refactor BatchListPage → BatchListContent

**File: `src/app/batches/page.tsx`**
- Extracted the main batch list logic into a named export `BatchListContent` component
- Added `BatchListContentProps` interface with 3 props:
  - `defaultProductLine?: string` — Locks the product line filter to a specific value
  - `hideProductLineFilter?: boolean` — Hides the product line filter tabs
  - `viewMode?: 'my' | 'all'` — Overrides view mode; defaults to 'all' when defaultProductLine is set
- Added `PRODUCT_LINE_ICONS` mapping: CELL_PRODUCT → FlaskConical, SERVICE → Microscope, KIT → TestTubes
- Dynamic batch card icons: each card now shows the correct product-line icon with matching colors
- Page title dynamically shows product line name when locked (e.g., "细胞产品" instead of "我的批次")
- CreateBatchDialog receives `defaultProductLine` prop for product-line locking
- Default export `BatchListPage` preserved as backward-compatible wrapper (renders `<BatchListContent />`)
- Fixed `viewMode` variable reference → `resolvedViewMode` in fetchBatches callback

### Part 2: CreateBatchDialog Product Line Lock

**File: `src/components/batches/create-batch-dialog.tsx`**
- Added `defaultProductLine?: string` prop to `CreateBatchDialogProps`
- When `defaultProductLine` is set:
  - Filters the products list to only show products from that line
  - Auto-selects the first matching product
  - Handles both API response and fallback scenarios
- Added `defaultProductLine` to `fetchProducts` useCallback dependency array

### Part 3: Create 3 Product-Line Route Pages

**File: `src/app/batches/cell-product/page.tsx`** (NEW)
- Renders `BatchListContent` with `defaultProductLine="CELL_PRODUCT"`, `hideProductLineFilter`, `viewMode="all"`

**File: `src/app/batches/service/page.tsx`** (NEW)
- Renders `BatchListContent` with `defaultProductLine="SERVICE"`, `hideProductLineFilter`, `viewMode="all"`

**File: `src/app/batches/kit/page.tsx`** (NEW)
- Renders `BatchListContent` with `defaultProductLine="KIT"`, `hideProductLineFilter`, `viewMode="all"`

All 3 pages are thin wrappers ('use client') that delegate to the shared BatchListContent component.

### Part 4: Restructure Sidebar Navigation

**File: `src/components/layout/sidebar.tsx`**

OLD structure:
```
导航菜单: 工作台 / 我的批次 / 所有批次
批次状态概览 + [新建批次] button
系统管理: 产品管理 / 用户管理 / 审计日志
更多功能: 待办事项
```

NEW structure:
```
导航菜单: 工作台
生产管理: 细胞产品 / 服务项目 / 试剂盒   (ALL users, no role restriction)
批次状态概览 (kept, without 新建批次 button)
系统管理: 全部批次 / 产品管理 / 用户管理 / 审计日志  (role-filtered)
更多功能: 待办事项
```

Changes:
- Added `Microscope, TestTubes` to lucide-react imports (removed `Plus` usage, kept import)
- `mainNavItems`: reduced to just dashboard
- NEW `productionNavItems`: 3 product-line entries (visible to ALL users)
- `adminNavItems`: added "全部批次" with `roles: ['ADMIN', 'SUPERVISOR']`
- Removed "新建批次" button from batch status overview section
- Kept `Button` import (still used in sidebar footer user dropdown)

### Part 5: Update Header Page Titles

**File: `src/components/layout/header.tsx`**
- Added 3 new route titles to `pageTitles` mapping:
  - `/batches/cell-product` → '细胞产品'
  - `/batches/service` → '服务项目'
  - `/batches/kit` → '试剂盒'
- Changed `/batches/all` title from '所有批次' to '全部批次' (consistent with sidebar)

### Part 6: Dashboard Quick Actions

**File: `src/components/dashboard/my-tasks.tsx`** (NO CHANGES)
- Reviewed all batch route references
- Existing links kept as-is:
  - `/batches/all` → SUPERVISOR global view ✓
  - `/batches/all?status=QC_PENDING` → QC pending batches ✓
  - `/batches` → OPERATOR my batches ✓
  - "新建批次" → `/batches` ✓
- The task specified to keep existing status-filter links on `/batches/all`

## Quality Check
- ESLint: Only pre-existing 2 errors in `generate-plan.js` (unrelated), zero new errors
- Dev server: Running normally, no compilation errors
- Backward compatibility: Default export `BatchListPage` preserved, `all/page.tsx` still works

## Files Modified
1. `src/app/batches/page.tsx` — Refactored BatchListPage → BatchListContent + backward-compatible default export
2. `src/components/batches/create-batch-dialog.tsx` — Added `defaultProductLine` prop support
3. `src/components/layout/sidebar.tsx` — Restructured navigation (§2.7)
4. `src/components/layout/header.tsx` — Added product-line route titles

## Files Created
1. `src/app/batches/cell-product/page.tsx` — 细胞产品 route
2. `src/app/batches/service/page.tsx` — 服务项目 route
3. `src/app/batches/kit/page.tsx` — 试剂盒 route
