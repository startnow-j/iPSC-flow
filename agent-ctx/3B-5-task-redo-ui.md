# Task 3B-5: Task Redo UI (Generic Task List)

## Work Summary

Created `/home/z/my-project/src/components/batches/generic-task-list.tsx` — a generic task list component with redo support for redoable tasks.

### Implementation Details

1. **Component Interface**: `GenericTaskListProps` with `batchId`, optional `tasks` (for external control), `onTasksLoaded`, and `onRedoSuccess` callbacks.

2. **Redoable Task Identification**:
   - `REDOABLE_TASK_CODES = ['REPROGRAM', 'GENE_EDITING', 'CLONE_SCREENING']`
   - `canShowRedoButton()` checks both taskCode and status (COMPLETED/REVIEWED/FAILED)
   - Backend already validates template taskType='redoable' in PATCH endpoint

3. **"重做" (Redo) Button**:
   - Amber-styled outline button with RotateCcw icon
   - Only shown for COMPLETED/REVIEWED/FAILED tasks with redoable taskCodes
   - Uses AlertDialog for confirmation with warning message:
     "确认重做任务 [taskName]？原任务将标记为失败，并创建新的待办任务。"
   - On confirm: PATCH `/api/batches/{batchId}/tasks/{taskId}` with `{ action: 'redo' }`
   - Success toast shows the redo round number

4. **Visual Indicators**:
   - **FAILED tasks**: Red/orange background, red border, "已失败" badge with AlertTriangle icon
   - **Redo round indicator**: stepGroup with "-R{n}" suffix shows amber "R{n}" badge (e.g., "R2")
   - **New pending redo tasks**: "重做" or "重做 (第N轮)" badge for tasks whose notes contain '重做'

5. **Task Locking**:
   - `isTaskLocked()` checks if a task's immediate predecessor (by sequenceNo) is not COMPLETED/REVIEWED/SKIPPED
   - Locked tasks show Lock icon, "锁定" badge, reduced opacity (opacity-70)
   - Locked tasks don't show redo button or status badge

6. **Status Badge Styles**:
   - Each task status has distinct color scheme (PENDING=slate, IN_PROGRESS=sky, COMPLETED=emerald, REVIEWED=teal, FAILED=red)
   - Status icons: CheckCircle2 (completed), XCircle (failed), Clock (in_progress/pending)

7. **Pattern Consistency**:
   - Uses `authFetch` for authenticated API calls
   - Uses `toast` from sonner for notifications
   - Follows project conventions for component structure
   - shadcn/ui components: Card, Button, Badge, AlertDialog, Skeleton

## Files Created
- `src/components/batches/generic-task-list.tsx`

## Notes
- The backend PATCH `/api/batches/[id]/tasks/[taskId]` already supports `action: 'redo'` (implemented in prior task)
- The backend validates template taskType='redoable' before allowing redo
- The backend calculates round number from stepGroup suffix -R{n} pattern
