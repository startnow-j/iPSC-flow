# Task 4-a: Add "复苏支数" field to QC workflow, update batch remaining quantity

## Work Log
- Read worklog.md to understand prior context (QC module, batch management, eBPR)
- Read all 4 target files to understand current implementation
- Verified Prisma schema: QcRecord.sampleQuantity (Int?) field exists, perfect for repurposing

### Changes Made:

#### 1. `src/app/api/batches/[id]/route.ts` (Batch GET API)
- Added computation of `remainingQuantity` and `totalConsumedVials` after fetching batch
- Queries all QC records for the batch, sums `sampleQuantity` values
- Returns `remainingQuantity = Math.max(0, actualQuantity - totalConsumed)` and `totalConsumedVials`

#### 2. `src/app/api/batches/[id]/qc/route.ts` (QC POST API)
- Accept `thawedVials` from request body
- Validate: must be a number >= 1
- Save to `qcRecord.sampleQuantity` field
- Include `sampleQuantity` in audit log `dataAfter`

#### 3. `src/components/qc/qc-form.tsx` (QC Form Component)
- Added `batchActualQuantity: number | null` and `batchUnit?: string` props
- Added `thawedVials` state (default '1')
- Added "复苏信息" card section BEFORE test items (amber-themed Card)
  - Shows "实际数量: X 支" from batch data
  - Number input for "复苏支数" (required, min 1)
  - Real-time validation: warns if exceeds actual quantity
- Includes `thawedVials` in POST body to QC API
- Frontend validation: checks valid number >= 1 before submit

#### 4. `src/app/batches/[id]/page.tsx` (Batch Detail Page)
- Added `remainingQuantity` and `totalConsumedVials` state variables
- Updated `fetchBatchDetail` to extract these from API response
- Overview tab: renamed "实际数量" to "生产数量", added "剩余数量" and "质检消耗" InfoRows (conditionally shown)
- Pass `remainingQuantity` (not raw actualQuantity) and `batch.unit` to QcForm

### Design Decisions:
- `batch.actualQuantity` remains the ORIGINAL production quantity (never modified by QC)
- Remaining quantity is computed dynamically: `actualQuantity - sum(QC.sampleQuantity)`
- QcForm receives `remainingQuantity` (not `actualQuantity`) so users see the actual available count
- "质检消耗" row only shows when totalConsumedVials > 0

### Quality:
- ESLint: 0 new errors (only pre-existing generate-plan.js errors)
- Dev server: compiled successfully, no errors
