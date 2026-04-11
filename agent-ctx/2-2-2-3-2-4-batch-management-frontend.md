# Task ID: 2-2 + 2-3 + 2-4 — Batch Management Frontend Developer

## Work Summary

### Files Created (8 new files)
1. **`src/app/api/products/route.ts`** — GET /api/products
2. **`src/app/api/batches/[id]/route.ts`** — GET batch detail + PATCH update
3. **`src/app/api/batches/[id]/transition/route.ts`** — POST status transition
4. **`src/app/api/batches/[id]/timeline/route.ts`** — GET batch timeline
5. **`src/components/batches/batch-status-overview.tsx`** — Reusable status counts component
6. **`src/components/batches/create-batch-dialog.tsx`** — Create batch dialog with form
7. **`src/app/batches/page.tsx`** — Batch list page (我的批次/所有批次)
8. **`src/app/batches/[id]/page.tsx`** — Batch detail page with 5 tabs

### Files Modified (1 file)
- **`src/components/layout/sidebar.tsx`** — Replaced placeholder batch status with real BatchStatusOverview component

### Architecture Decisions
- API routes were created as supplements since the parallel API agent had not yet built batch [id] routes
- Products API added to support the create batch dialog product selector
- Mock data fallback: CreateBatchDialog falls back to hardcoded IPSC-WT-001 if /api/products fails
- Timeline is lazy-loaded (only fetched when user clicks the "时间线" tab)
- Status filter chips use inline buttons rather than shadcn Select for better mobile UX

### Integration Points
- Uses `getStatusLabel()` and `getStatusColor()` from `@/lib/services` for all status display
- Uses `useAuthStore` for current user info (my batches filter, create batch creator)
- Batch list API returns `statusCounts` which is used by BatchStatusOverview component
- Sidebar BatchStatusOverview fetches from `/api/batches?pageSize=1` to get global status counts
