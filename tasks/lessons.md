# ShiftSync – Engineering Lessons Log

Purpose:
Reduce repeat mistakes. Capture patterns. Enforce senior standards.

---

## Format

Mistake:
Root Cause:
Prevention Rule:
Pattern to Watch:

---

## Initial Safeguards

---

### 1. Validation Must Run After Lock

Mistake:
Validated before acquiring DB/Redis lock.

Root Cause:
Forgot race condition scenario.

Prevention Rule:
All scheduling validations must execute inside transaction AFTER locking affected records.

Pattern to Watch:
assignToShift(), approveSwap()

---

### 2. Never Trust Frontend Constraints

Mistake:
Relied on UI to block invalid assignment.

Root Cause:
Assumed frontend was authoritative.

Prevention Rule:
All business rules must be enforced server-side.

Pattern to Watch:
headcount, availability, overtime

---

### 3. Timezone Drift Errors

Mistake:
Compared Date objects without converting to location timezone.

Root Cause:
Mixed UTC and local time.

Prevention Rule:
All DB times in UTC. Convert using location.timezone before comparison logic.

Pattern to Watch:
availability validation, consecutive days logic

---

### 4. Missing Audit Entry

Mistake:
Forgot audit log on mutation.

Root Cause:
Added feature quickly without side-effect checklist.

Prevention Rule:
Every mutation must trigger:

- Audit log
- Notification (if user-facing)
- Socket event (if relevant)

Pattern to Watch:
shift update, swap approval

---

### 5. Overwriting Instead of Cancelling Swaps

Mistake:
Edited shift without handling pending swaps.

Root Cause:
Forgot dependent state transitions.

Prevention Rule:
Editing shift must:

- Find pending swaps
- Cancel them
- Notify all parties

Pattern to Watch:
updateShift()

---

### 6. Headcount Not Enforced

Mistake:
Allowed assignment beyond headcountNeeded.

Root Cause:
Did not re-check after transaction lock.

Prevention Rule:
Headcount must be re-validated inside transaction.

Pattern to Watch:
assignToShift()

---

### 7. Publish Cutoff Ignored

Mistake:
Allowed shift edits within 48-hour window.

Root Cause:
Cutoff rule not centralized.

Prevention Rule:
validatePublishCutoff() must run on:

- updateShift
- unassign
- cancel

Pattern to Watch:
any shift mutation

---

### 8. Inconsistent Role Checks

Mistake:
Manager accessed location not assigned to them.

Root Cause:
Checked role but not location.

Prevention Rule:
All manager actions must verify locationId ownership.

Pattern to Watch:
analytics endpoints, shift creation

---

### 0. Understand and Document Project Structure First

Mistake:
Started backend setup without fully understanding or documenting the overall project folder structure, leading to misplacement and confusion.

Root Cause:
Did not review or map the workspace directory tree before initializing backend or running commands.

Prevention Rule:
Always list and review the entire project directory structure before any setup or code generation. Document the structure and confirm locations for backend, frontend, and shared resources.

Pattern to Watch:
Initial project setup, backend/frontend separation, directory navigation, automation scripts

---

### 9. Combined Filter Logic Must Be Evaluated Together

Mistake:
Introduced staff filtering where `nameQuery` short-circuit returned all rows, bypassing skill filter.

Root Cause:
Applied an early return before evaluating all active filter criteria.

Prevention Rule:
When multiple optional filters exist, normalize each criterion first and return combined predicate (`&&`) result.

Pattern to Watch:
list pages with compound filters (staff/users/shifts)

### 10. Escaped Route-Group Folder Names Break Next Typed Routes

Mistake:
Created a literal `src/app/\(protected-pages\)` directory instead of using `src/app/(protected-pages)`.

Root Cause:
Shell escaping was applied to the actual filesystem path during folder creation.

Prevention Rule:
When creating App Router route-group folders, always verify resulting directory names with `find src/app -maxdepth 2 -type d`.

Pattern to Watch:
commands that include parentheses in Next.js route-group paths

### 11. Avoid Eager Redis Connections in Environments Without Redis

Mistake:
Redis lock client connected at boot and retried forever with localhost defaults, causing noisy deploy logs.

Root Cause:
Client initialization assumed Redis availability and used eager connection behavior.

Prevention Rule:
Initialize Redis clients with lazy connection and connect only on first lock usage; support `REDIS_URL` and optional password-based host/port config.

Pattern to Watch:
infrastructure-backed clients (Redis, queues, brokers) initialized during app startup

### 12. Exact Optional Types Require Omitted Keys, Not Undefined Values

Mistake:
Passed `{ key: undefined }` into service methods while `exactOptionalPropertyTypes` was enabled, causing compile failures.

Root Cause:
Built parameter objects eagerly instead of conditionally spreading present values.

Prevention Rule:
When optional fields are truly optional under strict TS config, construct payloads with conditional spreads so absent keys are omitted.

Pattern to Watch:
controller-to-service query/filter object assembly

### 13. Prisma Include Shape Must Match Downstream Usage

Mistake:
Used `shift._count.assignments` in publish logic without updating the Prisma query include shape for that code path.

Root Cause:
Copied warning logic across methods but missed the exact `findUnique` include block in the target function.

Prevention Rule:
Any time a service reads `_count` or nested relations, confirm the same function’s query explicitly includes that relation before compiling.

Pattern to Watch:
publish/update/delete service methods with similar find queries

### 14. Worker Runtime Dependencies Must Be Verified Beyond Type Build

Mistake:
Reminder worker compiled successfully, but runtime dependency checks (`nodemailer`, env loading, process boot) were not validated immediately.

Root Cause:
Relied on TypeScript build as proxy for runtime readiness of background process code.

Prevention Rule:
For every new worker/process type, verify three things before closing phase:
- dependency present in `package.json` + lockfile
- process boots with env file
- startup logs confirm worker loop entered

Pattern to Watch:
new worker entrypoints, SMTP/queue integrations, optional runtime imports

### 15. React Query Error Shapes Need Explicit Unknown Narrowing

Mistake:
Directly cast `calendarQuery.error` from React Query to a custom API error type, causing strict TypeScript compile failure.

Root Cause:
React Query exposes `error` as `Error | null` by default, which does not structurally match custom API error types.

Prevention Rule:
When reading `query.error` with custom normalized error contracts, first cast through `unknown` (or add a type guard) before reading custom fields.

Pattern to Watch:
frontend query/mutation error rendering paths in new pages

### 16. Reassign Flows Must Be Atomic for Headcount-1 Slots

Mistake:
UI allowed remove-then-assign as separate operations, leading to false success perception and "full capacity" errors during reassignment.

Root Cause:
Assignment API lacked an atomic replace path and frontend treated assignment refresh failures as empty assignment state.

Prevention Rule:
For single-headcount shifts, support explicit atomic reassignment on backend and keep frontend assignment state truthful on refresh failures (never silently coerce to empty).

Pattern to Watch:
schedule-builder reassignment UX, assignment modals, and any optimistic update paths that depend on follow-up refetch.

### 17. Candidate Eligibility and Mutation Validation Must Share the Same Rule Mode

Mistake:
Eligible-staff lookup evaluated standard assignment mode while confirm action executed replace mode, causing "qualified" UI states that failed on submit.

Root Cause:
Headcount short-circuit in eligibility check masked deeper blockers (availability/overlap/overtime/48h), while mutation path evaluated them.

Prevention Rule:
Whenever mutation behavior has modes (assign vs replace), expose the same mode in eligibility/read endpoints and evaluate with identical validation options.

Pattern to Watch:
all "preview then confirm" flows (eligible staff, swap targets, publish previews) where read-path and write-path can drift.

### 13. Route Authority and API RBAC Must Stay Aligned

Mistake:
Frontend exposed staff-management screens to managers while backend `/users` list endpoint was admin-only.

Root Cause:
Route authority and backend `restrictTo` rules were changed in different phases without a parity check.

Prevention Rule:
For every protected page, verify matching backend endpoint role matrix before release. Add a checklist item: "frontend route authority == backend endpoint authority".

Pattern to Watch:
`/staff`, `/users`, manager-scoped operational pages.

### 14. Calendar UX Requires Explicit Event Click Handlers

Mistake:
Calendar rendered shifts but had no event click behavior, making events feel broken.

Root Cause:
Assumed visual rendering was sufficient without interaction acceptance criteria.

Prevention Rule:
Any calendar/list card showing schedule entries must define click behavior (details modal, navigation, or action panel) and include a test for it.

Pattern to Watch:
`/schedule` calendar views and any FullCalendar wrappers.

### 18. Operational Pages Need Collection Endpoints, Not Raw-ID Utility Flows

Mistake:
`/shifts` depended on a location-id utility flow, which made core operations hard to use and blocked FRD-style filtering.

Root Cause:
The API shape optimized for low-level utility calls (`/locations/:id/shifts`) instead of role-scoped table operations.

Prevention Rule:
For operational management pages, define a dedicated collection endpoint with pagination, filters, and server-enforced role/location scope.

Pattern to Watch:
Any management surface that currently asks users for raw IDs or lacks combined filters.

### 19. Never Mount a Router With Root List Endpoints Under Multiple Unrelated Prefixes

Mistake:
Swap router (with `GET /`) was mounted under both `/swap-requests` and `/shifts`, which caused `/api/v1/shifts` to return swap-list payload shape.

Root Cause:
A shared router mixed shift-scoped routes and collection routes, then got mounted on multiple bases.

Prevention Rule:
Split routers by resource root (`shift-scoped` vs `collection`) before mounting; avoid ambiguous `GET /` handlers on multi-mounted routers.

Pattern to Watch:
Modules mounted under two prefixes where one router includes root-level handlers.

### 13. Build Passing Does Not Apply DB Migrations

Mistake:
Declared implementation verified after TypeScript builds while the live database still lacked newly-added Prisma columns.

Root Cause:
Verified generated client/schema compilation but did not run or confirm migration deployment against the local database before runtime smoke testing.

Prevention Rule:
After Prisma schema changes, run `prisma generate`, apply migrations with `prisma migrate deploy` or `prisma migrate dev`, then run a DB smoke query against new fields before claiming runtime readiness.

Pattern to Watch:
Any feature adding Prisma model fields used immediately by API list/count queries.
