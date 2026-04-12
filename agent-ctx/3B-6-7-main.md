---
Task ID: 3B-6 + 3B-7
Agent: Main Agent
Task: Service Project Termination UI + QC Interface IN_PROCESS Support

Work Log:
- Read worklog.md and analyzed project history (Phase 0 through Task 5, multi-role system, eBPR, QC/CoA modules)
- Read batch detail page (1400+ lines), state-machine.ts, transition API route, QC API route
- Confirmed existing patterns: AlertDialog for confirmations, Dialog for complex forms, sonner for toasts, authFetch for API calls
- Confirmed QC API already supports `qcType` query parameter filtering (IN_PROCESS/ROUTINE)
- Confirmed state-machine.ts exports TERMINATION_REASONS and TERMINATION_REASON_LABELS constants
- Confirmed transition API route handles `terminate` action with `reason` and `terminationReason` fields

**Task 3B-6: Service Project Termination UI**

Modified file: `src/app/batches/[id]/page.tsx`

Changes:
1. Added imports:
   - TERMINATION_REASONS, TERMINATION_REASON_LABELS from state-machine
   - TriangleAlert icon from lucide-react
   - Dialog, Select, Label, Textarea UI components

2. Extended BatchDetail interface with terminationReason and scrapReason fields

3. Added state variables for terminate dialog:
   - terminateDialogOpen (boolean)
   - terminateCategory (string, selected termination reason)
   - terminateReason (string, detailed reason text)

4. Modified handleTransition to route 'terminate' actions to the new terminate dialog instead of the generic confirm dialog

5. Added handleTerminate function that:
   - Validates required fields (category + detailed reason)
   - POSTs to /api/batches/{id}/transition with action/terminationReason/reason
   - Shows toast notifications on success/failure
   - Refreshes batch detail and timeline on success

6. Added TERMINATED status display:
   - Amber warning banner with TriangleAlert icon below the header
   - Shows termination reason category (mapped via TERMINATION_REASON_LABELS)
   - Shows detailed reason from scrapReason field
   - Displays "所有已完成的生产和鉴定记录将保留为只读。此操作不可撤销。"

7. Action buttons hidden when batch.status === 'TERMINATED'

8. Added Terminate Dialog using shadcn Dialog component:
   - Title: "终止项目"
   - Warning message about irreversible action
   - Required Select for termination reason category (5 options from TERMINATION_REASONS)
   - Required Textarea for detailed reason
   - "确认终止" destructive button (disabled until both fields filled)
   - Cancel button, loading state with spinner

9. Updated generic transition confirmation dialog to remove terminate-specific branch (now handled by dedicated dialog)
   - Changed alert() calls to toast.error() for consistency

**Task 3B-7: QC Interface IN_PROCESS Support**

Rewrote file: `src/components/qc/qc-results-summary.tsx`

Changes:
1. Changed props from `qcRecords: QcRecord[]` to `batchId: string`
2. Component now fetches its own data via authFetch, with separate API calls for IN_PROCESS and ROUTINE qcTypes
3. Added internal state: inProcessRecords, routineRecords, loading

4. Added summary card at top with 3 stat cards:
   - IN_PROCESS records count (sky blue, Beaker icon)
   - ROUTINE records count (teal, ClipboardList icon)
   - Pending IN_PROCESS count (amber, Hourglass icon) - only shown if > 0

5. Added tabs when both IN_PROCESS and ROUTINE records exist:
   - "过程采样记录" tab with Beaker icon and count badge
   - "终检记录" tab with ClipboardList icon and count badge

6. Created InProcessRecordCard component for IN_PROCESS records:
   - Shows detection types from testResults
   - Shows sample number and sample time from sampleInfo
   - Shows operator name and creation time
   - PENDING judgment → amber "等待检测" badge with Hourglass icon
   - PASS → green badge, FAIL → red badge

7. Created RoutineRecordDetail component (extracted existing ROUTINE display logic):
   - Full test results table
   - Fail reason display
   - Operator/reviewer info
   - Review comments

8. Backward compatible: when only ROUTINE records exist, displays same as before (latest detail + collapsed history)

9. Updated batch detail page to use new QcResultsSummary props: `<QcResultsSummary batchId={id} />`

**Quality Checks:**
- ESLint: 0 new errors (only pre-existing generate-plan.js 2 errors)
- Dev server: Compiled successfully with no compilation errors
- All imports verified: TERMINATION_REASONS, TERMINATION_REASON_LABELS, Dialog, Select, Label, Textarea, TriangleAlert, Tabs, Skeleton, authFetch

Stage Summary:
- Modified files: 2 (batch detail page, QC results summary)
- Terminate dialog: Dedicated Dialog with required reason category select + detailed reason textarea, destructive confirm button
- TERMINATED display: Amber warning banner with reason details, action buttons hidden
- QC results: Self-fetching component with IN_PROCESS/ROUTINE tabs, summary stats, detection info display
- Code zero new ESLint errors/warnings
