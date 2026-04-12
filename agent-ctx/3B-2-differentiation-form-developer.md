# Task 3B-2: Differentiation Form + eBPR Step Guide + Task Summary

## Work Log

- Read worklog.md and all relevant existing files (expansion-form, ebpr-step-guide, task-summary, task-form-wrapper, validation, tasks API, batch detail page, auth-store, task-templates)
- Analyzed existing patterns: phase-type tasks (EXPANSION) create new COMPLETED tasks per round via POST; single-type tasks (SEED_PREP, HARVEST) complete existing PENDING tasks via PATCH
- Identified that Product table has `category` field used by transition route to filter DIFFERENTIATION tasks

## Files Created

1. **`src/components/ebpr/differentiation-form.tsx`** — New differentiation form component
   - Props: `{ batch, existingDifferentiations, onSuccess }` (matching expansion-form pattern)
   - Round indicator: auto-calculates from existingDifferentiations.length + 1
   - Form fields: diff_stage, diff_date, induction_factors, medium, culture_days, morphology (select), notes
   - POSTs to `/api/batches/{batchId}/tasks` with `taskCode: 'DIFFERENTIATION'`
   - History card showing all completed differentiation records
   - Auto-clears form after successful submit

## Files Modified

2. **`src/app/api/batches/[id]/route.ts`** — Added product.category to batch detail response
   - Added `include: { product: { select: { category: true } } }` to batch query
   - Response now includes `productCategory` field

3. **`src/app/batches/[id]/page.tsx`** — Pass category to EbprStepGuide
   - Added `productCategory?: string | null` to BatchDetail interface
   - Passes `category={batch.productCategory}` to EbprStepGuide

4. **`src/lib/services/validation.ts`** — Added DIFFERENTIATION validation
   - New `validateDifferentiation()` function: diff_stage (required), diff_date (required, valid date), culture_days (required, > 0), morphology (required, enum: 正常/异常/待观察)
   - Added DIFFERENTIATION case to `validateProductionTask()` switch

5. **`src/app/api/batches/[id]/tasks/route.ts`** — Updated POST handler to support DIFFERENTIATION
   - Accepts `taskCode` in request body (defaults to 'EXPANSION' for backward compatibility)
   - Task config mapping: EXPANSION (seqNo 2, stepGroup from passage) and DIFFERENTIATION (seqNo 3, stepGroup "第N轮")
   - DIFFERENTIATION tasks are created as COMPLETED immediately (phase-type)
   - Audit logging for both task types

6. **`src/components/ebpr/task-summary.tsx`** — Added DIFFERENTIATION summary rendering
   - Added Microscope icon import
   - Added DIFFERENTIATION case to TaskIcon
   - New `DifferentiationSummary` component: 3-column grid showing diff_stage, diff_date, culture_days, induction_factors, medium, morphology (with colored badge)
   - Added DIFFERENTIATION case in TaskSummary

7. **`src/components/ebpr/ebpr-step-guide.tsx`** — Major refactor for dynamic steps
   - New prop: `category?: string | null`
   - DIFF_CATEGORIES: ['NPC', 'CM', 'DIFF_KIT', 'DIFF_SERVICE']
   - Dynamic step list: 4 steps for differentiation categories, 3 steps otherwise
   - StepCode type updated to include 'DIFFERENTIATION'
   - getStepStatus treats DIFFERENTIATION as phase-type (like EXPANSION)
   - StepProgressIcon handles DIFFERENTIATION with Microscope icon
   - StepProgressBar shows completion count badge for DIFFERENTIATION
   - DIFFERENTIATION step content: completed summaries + inline form or assignment cards
   - New DifferentiationTaskWithAssignment component
   - New DifferentiationSection component
   - allStepsCompleted check accounts for DIFFERENTIATION when present

8. **`src/components/ebpr/task-form-wrapper.tsx`** — Added DIFFERENTIATION case
   - Import DifferentiationForm
   - DIFFERENTIATION case renders DifferentiationForm with existing history (same pattern as EXPANSION)

## Key Design Decisions

1. **Phase-type task pattern**: DIFFERENTIATION follows the same pattern as EXPANSION — each submission POSTs a new COMPLETED task, rather than updating an existing PENDING task. This allows multiple rounds of differentiation records.

2. **Category-based step visibility**: The step guide dynamically shows/hides the DIFFERENTIATION step based on the product's category field. This matches the backend behavior in the transition route.

3. **Backward compatibility**: The tasks API POST handler defaults to 'EXPANSION' taskCode when not specified, maintaining backward compatibility with existing expansion form submissions.

4. **Differentiation round numbering**: stepGroup is auto-generated as "第N轮" where N = existing count + 1, matching the user's mental model of differentiation rounds.

5. **Assignment system**: DIFFERENTIATION tasks support the same assignment workflow (wait for assignment → assignee-only operation) via DifferentiationTaskWithAssignment.

## Lint & Dev Status

- ESLint: 0 new errors/warnings (only pre-existing generate-plan.js errors)
- Dev server: Compiles successfully without errors
