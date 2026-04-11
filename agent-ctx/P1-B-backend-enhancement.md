---
Task ID: P1-B
Agent: Backend Enhancement Developer
Task: User Management Backend Enhancement + Product-Roles API

Work Log:
- Read worklog.md, prisma/schema.prisma, existing API routes, auth.ts, roles.ts, audit-log.ts, auth-store.ts
- Confirmed auth APIs (login + me) already include productLines and productRoles in response (completed in Phase 0)

**Part 1: Updated Users API to Support UserProductLine CRUD**

1. `src/app/api/users/route.ts` (GET + POST):
   - GET: Added `roles` to select, added `include: { productLines: { select: { productLine: true } } }`, returns parsed roles + productLines array
   - POST: Accepts `productLines: string[]` from request body, validates against valid product line values (SERVICE/CELL_PRODUCT/KIT), uses `db.$transaction()` to atomically create user + UserProductLine records, returns created user with productLines

2. `src/app/api/users/[id]/route.ts` (GET + PATCH + DELETE):
   - GET: Added `roles` to select, added productLines include, returns parsed roles + productLines array
   - PATCH: Accepts `productLines: string[]` in request body, uses `db.$transaction()` to delete existing UserProductLine records and create new ones, combined with user field updates
   - DELETE: Uses `db.$transaction()` to clean up UserProductLine AND UserProductRole records before soft-deleting user

**Part 2: Created Product-Roles API**

3. `src/app/api/product-roles/route.ts` (GET + POST):
   - GET: Returns product role assignments with filtering by productLine and userId
     - SUPERVISOR: only sees users within their own product lines
     - ADMIN: sees everything
     - Returns: array of { userId, userName, productId, productCode, productName, productLine, roles }
   - POST: Creates/updates product role assignments (SUPERVISOR within their lines, ADMIN any)
     - Validates: user exists, product exists & active, user belongs to product's line, roles don't exceed user's global roles, requester has SUPERVISOR permission for the line
     - Uses upsert for create-or-update semantics
     - Creates audit log (PRODUCT_ROLE_ASSIGNED)

4. `src/app/api/product-roles/[userId]/[productId]/route.ts` (GET + PATCH + DELETE):
   - GET: Returns specific assignment; user can see own, SUPERVISOR can see within their lines, ADMIN sees all
   - PATCH: Updates roles with same validation as POST; upsert semantics; creates audit log (PRODUCT_ROLE_UPDATED)
   - DELETE: Removes assignment; SUPERVISOR within their lines, ADMIN any; creates audit log (PRODUCT_ROLE_REMOVED)

**Part 3: Verified Auth APIs**
- `/api/auth/me/route.ts` — Already includes productRoles (UserProductRole with product info) and productLines (UserProductLine entries). ✅
- `/api/auth/login/route.ts` — Same, already includes both. ✅

- Lint: Only pre-existing generate-plan.js errors (2), zero new errors
- Dev server compiled successfully, no errors

Stage Summary:
- Modified files: src/app/api/users/route.ts, src/app/api/users/[id]/route.ts (2)
- New files: src/app/api/product-roles/route.ts, src/app/api/product-roles/[userId]/[productId]/route.ts (2)
- Users API now supports productLines CRUD with transactional consistency
- Product-Roles API provides full CRUD for SUPERVISOR/ADMIN to manage OPERATOR/QC per-product assignments
- All mutations include audit logging (PRODUCT_ROLE_ASSIGNED, PRODUCT_ROLE_UPDATED, PRODUCT_ROLE_REMOVED)
- Permission model: ADMIN full access, SUPERVISOR scoped to their product lines
- Code zero new ESLint error/warning
