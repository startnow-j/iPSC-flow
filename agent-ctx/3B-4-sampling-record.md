# Task 3B-4: Sampling Record Component

## Work Summary

Created `/home/z/my-project/src/components/ebpr/sampling-record.tsx` — a reusable component that shows a "采样记录" section within production task forms.

### Implementation Details

1. **Props Interface**: `SamplingRecordProps` with `batchId`, `batchNo`, optional `taskId`, and optional `onSuccess` callback.

2. **Existing Records Display**:
   - Fetches IN_PROCESS QC records from `/api/batches/{batchId}/qc?qcType=IN_PROCESS`
   - Renders each record as a compact row with: 检测项 type, 样本编号, 取样时间, 取样人, 综合判定 badge
   - PENDING judgment shows "等待检测" amber badge
   - Max height 64 (h-64) with overflow-y-auto scroll
   - Loading skeleton and empty state handled

3. **"Add Sampling" Dialog**:
   - shadcn Dialog with form fields:
     - 检测项 (Select): 支原体检测 / 核型分析 / 留样 / 其他
     - 样本编号 (Input, auto-generated `QC-{batchNo}-{HHMM}`)
     - 取样时间 (datetime-local, defaults to now)
     - 取样人 (auto-filled from useAuthStore, disabled)
     - 备注 (Textarea)
   - Form validation with toast error messages

4. **Submit Action**:
   - POST to `/api/batches/{batchId}/qc`
   - Sends `qcType: 'IN_PROCESS'`, `taskId`, `testResults: []`, `sampleInfo: { testType, sampleNo, sampleTime, sampler }`
   - API already handles IN_PROCESS records with PENDING judgment and relaxed status requirements

5. **Pattern Consistency**:
   - Uses `authFetch` for authenticated API calls
   - Uses `useAuthStore` for current user info
   - Uses `toast` from sonner for notifications
   - Follows expansion-form.tsx patterns for structure and styling
   - shadcn/ui components: Card, Button, Dialog, Input, Select, Label, Badge, Textarea

## Files Created
- `src/components/ebpr/sampling-record.tsx`
