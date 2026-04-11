# P1-C3: Integrate canManage()/canOperate() into Backend APIs

## Status: COMPLETED

## Summary
Integrated the dual-track permission system (`canManage`/`canOperate` from `src/lib/roles.ts`) into four backend API routes. Each route now performs product-level permission checks in addition to the existing auth checks.

## Files Modified

### 1. `src/app/api/batches/route.ts` — POST (Batch Creation)
- **Added imports**: `getRolesFromPayload` from `@/lib/auth`, `canManage` from `@/lib/roles`
- **Permission check**: After finding the product, calls `canManage(roles, userProductLines, product.productLine, ['SUPERVISOR'])` — only SUPERVISOR (in the product's product line) or ADMIN can create batches
- **User data source**: Fetches `userProductLines` from `UserProductLine` table via DB query

### 2. `src/app/api/batches/[id]/transition/route.ts` — POST (State Transitions)
- **Added imports**: `getRolesFromPayload` from `@/lib/auth`, `canManage` + `canOperate` from `@/lib/roles`
- **Action categorization**: Defined two lookup maps:
  - `MANAGEMENT_ACTIONS`: `start_production`, `start_material_prep`, `start_identification` → SUPERVISOR; `approve_coa`, `submit_coa`, `submit_report`, `reject_coa` → SUPERVISOR/QA; `scrap` → SUPERVISOR
  - `OPERATIONAL_ACTIONS`: `pass_qc`, `fail_qc` → QC
- **Permission check flow**: After action validation, looks up the action in both maps; if found, fetches user's productLines and productRoles from DB, fetches batch's productLine and productId, then runs the appropriate check
- **Non-listed actions**: Pass through without product-level check (existing global role definitions in state machine still apply)

### 3. `src/app/api/batches/[id]/tasks/[taskId]/route.ts` — PATCH (Task Updates)
- **Added imports**: `getRolesFromPayload` from `@/lib/auth`, `canOperate` from `@/lib/roles`
- **Permission check**: After finding the batch, calls `canOperate(roles, userProductRoles, batch.productId, ['OPERATOR'])` — only OPERATOR (with product-level authorization) or ADMIN can update production tasks
- **User data source**: Fetches `userProductRoles` from `UserProductRole` table via DB query

### 4. `src/app/api/batches/[id]/qc/route.ts` — POST (QC Record Creation)
- **Added imports**: `getRolesFromPayload` from `@/lib/auth`, `canOperate` from `@/lib/roles`
- **Permission check**: After finding the batch, calls `canOperate(roles, userProductRoles, batch.productId, ['QC'])` — only QC (with product-level authorization) or ADMIN can create QC records
- **User data source**: Fetches `userProductRoles` from `UserProductRole` table via DB query

## Implementation Pattern
All permission checks follow a consistent pattern:
1. Get roles from JWT via `getRolesFromPayload(payload)`
2. Fetch user's product lines / product roles from DB (since JWT doesn't contain this data)
3. Call `canManage()` or `canOperate()` with appropriate parameters
4. Return 403 with Chinese error message if check fails

## Key Design Decisions
- **ADMIN always passes**: Both `canManage()` and `canOperate()` internally check for ADMIN role first, so ADMIN users are never blocked
- **DB-based permission data**: Product-level permissions are fetched from the database at request time (not cached in JWT) — this is the Phase 1 pragmatic approach
- **Backward compatible**: Actions not explicitly listed in the permission maps pass through without product-level checks, preserving existing behavior
- **`reject_coa` included**: Added to management actions map with SUPERVISOR/QA roles, since it's conceptually a management review action

## Lint Result
No new lint errors. Pre-existing 2 errors in `generate-plan.js` (unrelated).
