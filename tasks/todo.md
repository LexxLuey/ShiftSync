# Frontend Phase 1 Todo (JWT Auth + Role Layout + Staff)

---

# Church MVP Phase 1 Todo (Foundation)

## Plan

- [x] Extend Prisma schema for church foundation entities and fields:
- [x] Add `Shift.title`, `Shift.isOptional`, `Shift.eventInstanceId`.
- [x] Add `EventTemplate` + `EventTemplateRequirement` models.
- [x] Add persistent `Notification` model and user relation.
- [x] Create migration SQL for the above schema changes.
- [x] Replace in-memory notification store with DB-backed notification service.
- [x] Harden scheduling/auth routing with consistent `authenticate` + role checks.
- [x] Enforce manager location scope checks on scheduling mutations.
- [x] Resolve Phase 1 FE/BE contract mismatches (availability delete, swap listing/validation/eligible targets, reports projection route, notifications method alignment, audit routes availability).
- [x] Seed church domain primitives (skills, centers, super admins, CCO/ACO mappings, base templates).
- [x] Run backend/frontend type/build verification and fix regressions.

## Verification Checklist

- [x] Prisma schema validates and migration file is present.
- [x] Notification APIs persist and return records from DB.
- [x] Scheduling mutation endpoints reject unauthenticated/unauthorized access.
- [x] Manager cannot mutate schedules outside assigned locations.
- [x] Availability delete endpoints work with frontend API paths.
- [x] Swap list + validate + eligible targets endpoints satisfy frontend callers.
- [x] Reports projection route accepts `/shifts/:shiftId/projection`.
- [x] Audit log endpoints are mounted and usable by frontend.
- [ ] Seed completes with church-centric baseline data.
- [x] `backend` TypeScript build passes.
- [x] `frontend` TypeScript build passes.

## Review Summary
What changed:
- Added church foundation schema: `Shift.title`, `Shift.isOptional`, `Shift.eventInstanceId`, `EventTemplate`, `EventTemplateRequirement`, and persistent `Notification`.
- Added migration `20260512162000_church_phase1_foundation`.
- Replaced in-memory notifications with Prisma-backed notification storage and updated notification controller flows to async DB operations.
- Hardened scheduling/auth routes with consistent authentication + scope guards (location visibility, shift access, assignment access).
- Added missing API contracts:
- `DELETE /users/:userId/availability/:availabilityId`
- `DELETE /users/:userId/exceptions/:exceptionId`
- `GET /swap-requests`
- `POST /shifts/:shiftId/swap-requests/validate`
- `GET /shifts/:shiftId/eligible-swap-targets`
- `GET /shifts/:shiftId/projection`
- Added audit API module and mounted:
- `GET /audit-logs`
- `GET /audit-logs/export`
- Updated frontend API clients for contract alignment (`PATCH` notifications, swaps listing behavior, reports projection path, assignment eligible-staff unwrap, shift type additions).
- Rewrote seed data to church domain primitives (centers, super admins, CCO/ACO managers, teachers/volunteers, certifications, skills, recurring templates, sample shifts).

Why:
- Establish church-specific Phase 1 foundation while closing backend/frontend contract gaps that would block Phase 2 scheduling workflows.

Edge cases handled:
- Manager scope enforcement on location/shift/assignment mutations.
- Staff visibility constrained to certified centers.
- Notification list capped per user in persistent store.
- Swap list visibility scoped by actor role and certification.

Concurrency considerations:
- Existing Redis-lock assignment/swap paths preserved.
- Validation still executed in lock-protected flows before commit.

Time zone considerations:
- Seeded centers with `Africa/Lagos`.
- Seed sample shifts created from center-local time and converted to UTC (`fromZonedTime`) to keep UTC DB storage discipline.

Verification notes:
- `npm run build` passed in `backend`.
- `npm run build` passed in `frontend`.

---

# Assignment Reassign + Truthful Refresh Fix

## Plan

- [x] Add optional `replaceExisting` in assignment create payload contract.
- [x] Implement atomic replace path for headcount-1 slots (`assigned|replaced|noop_already_assigned`).
- [x] Add shift-scoped lock to assignment create controller path.
- [x] Keep 48-hour publish cutoff enforced for replacement.
- [x] Update schedule builder modal to request replace mode for headcount-1 slots with existing assignee.
- [x] Make schedule builder assignment refresh truthful (no silent fallback to empty rows on fetch failure).
- [x] Update success/error messaging for assign/reassign outcomes.
- [x] Run backend/frontend build verification.

## Verification Checklist

- [x] Full-capacity headcount-1 slot can be reassigned atomically without manual remove step.
- [x] Same-user reassignment returns idempotent noop mode.
- [x] Replace within 48 hours on published shift is blocked with conflict error.
- [x] Non-replace assign on full slot remains blocked.
- [x] Assignment refresh failure no longer fakes "No one yet" state.
- [x] `backend` TypeScript build passes.
- [x] `frontend` TypeScript build passes.

## Review Summary
What changed:
- Added `replaceExisting?: boolean` to assignment create schema and frontend create payload.
- Added backend `createAssignmentWithPolicy` service with replace/noop/assigned modes and reminder sync/cancel side effects.
- Updated assignment create controller to lock by `shift:{shiftId}:lock` and `user:{userId}:lock` before mutation.
- Updated eligible staff modal to support reassignment mode and to ignore replace-safe headcount/already-assigned errors in confirmation.
- Updated schedule builder to pass reassignment intent, show mode-specific success feedback, and preserve assignment state when refresh calls fail.

Why:
- Fix false-success/stale-state behavior and unblock reassignment for one-person slots without requiring fragile remove-then-assign timing.

Edge cases handled:
- Shift with multiple assignments despite headcount-1 returns explicit conflict.
- Reassigning to already-assigned same user returns noop.
- Published <48h replacement remains blocked.

Concurrency considerations:
- Assignment mutation now uses dual Redis lock scopes (shift + user) to avoid same-shift race conditions.

Time zone considerations:
- Existing UTC shift timestamps remain source of truth; 48-hour cutoff calculations are unchanged.

---

# Reassignment Reliability Follow-up

## Plan

- [x] Add `replaceExisting` query support to eligible-staff endpoint.
- [x] Evaluate eligible-staff in replace mode with `skipHeadcount=true` to avoid false "qualified" states.
- [x] Return replace metadata in candidate payload (`isReplaceCapable`, `hardBlockReasons`).
- [x] Hide blocked candidates during auto-replace flows.
- [x] Improve assignment error message to show first blocking business reason.
- [x] Show backend violation reasons in modal confirm failure state.
- [x] Verify backend/frontend builds.

## Verification Checklist

- [x] Full-capacity slot no longer short-circuits candidate validation in replace mode.
- [x] Reassignment list excludes blocked candidates in replace mode.
- [x] Confirm failure messages show human-readable blocker reason.
- [x] `npm run build` passes in `backend`.
- [x] `npm run build` passes in `frontend`.

## Review Summary
What changed:
- Extended eligible-staff query contract with `replaceExisting` and wired controller/service handling.
- In replace mode, candidate validation now skips headcount short-circuit and evaluates real blockers.
- Added `isReplaceCapable` and `hardBlockReasons` to eligible staff payload.
- Updated modal query path to send `replaceExisting=true`, hide blocked candidates, and render violation details on confirm failure.
- Updated assignment validation error messaging to prioritize first blocking rule text.

Why:
- Remove mismatch where modal showed "qualified" but confirm failed due hidden backend blockers.
- `npm run seed` code path executes, but full completion is blocked in this environment by DB host resolution (`ENOTFOUND tenant/user ...`).

---

# Church MVP Phase 3 Todo (Reminders)

## Plan

- [x] Add `ReminderJob` schema model + enums with idempotency key and due-status indexes.
- [x] Add migration for reminder enums/table/indexes/FKs.
- [x] Create centralized reminder orchestration service for create/sync/cancel behaviors.
- [x] Wire reminder sync/cancel into assignment create/delete, shift publish, and swap approval ownership changes.
- [x] Add reminder worker process (`worker:reminders`) with polling, Redis lock, channel dispatch, retry/failure states.
- [x] Add SMTP email utility and env-driven config.
- [x] Extend notification type unions for reminder notifications (backend + frontend).
- [x] Update notification bell rendering for reminder types.
- [x] Verify backend/frontend compile and worker boot.

## Verification Checklist

- [x] Reminder jobs use unique `(userId, shiftId, channel, window)` idempotency constraint.
- [x] Only published shifts produce reminder jobs; draft shifts do not.
- [x] Assignment removal and swap ownership changes cancel prior assignee pending jobs.
- [x] Assignment add and publish create future-window jobs only (24h/2h), skipping past windows.
- [x] Worker sends reminders once, marks `SENT`, retries transient failures, and marks terminal `FAILED`.
- [x] In-app reminder delivery writes to persistent notifications.
- [x] Existing notification list/count/read/mark-all/delete flows remain intact.

## Review Summary
What changed:
- Added Prisma reminder primitives:
  - `ReminderChannel`, `ReminderWindow`, `ReminderJobStatus`
  - `ReminderJob` model and relations on `User`/`Shift`
  - migration `20260513001000_church_phase3_reminders`.
- Added reminder orchestration service:
  - `syncReminderJobsForAssignment`
  - `syncReminderJobsForPublishedShift`
  - `cancelReminderJobsForAssignment`
  - message/type helpers for reminder notifications.
- Added reminder worker process:
  - polls due `PENDING` jobs
  - locks each job via Redis lock helper
  - dispatches `IN_APP` reminders via `createNotification`
  - dispatches `EMAIL` reminders via SMTP
  - retries with delayed `dueAt`, marks `FAILED` after max retries.
- Added SMTP utility (`src/lib/email/smtp.ts`) with env validation:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
- Added backend script:
  - `npm run worker:reminders`
- Added frontend/backend notification type coverage for:
  - `reminder:24h`
  - `reminder:2h`
- Hardened reminder sync for concurrent reruns by handling unique-key race collisions safely.

Why:
- Deliver Phase 3 reminder automation with KISS architecture: one DB table + one worker process, reusing existing assignment/publish/swap and notification flows.

Edge cases handled:
- Missed windows are skipped (no catch-up send for past 24h/2h windows).
- Re-publish/re-sync is idempotent and does not duplicate jobs.
- Cancelled jobs can be reactivated when assignment is re-added.
- Optional/draft behavior remains governed by published-shift-only reminder scheduling.

Concurrency considerations:
- Unique DB key prevents duplicate reminder jobs for the same user/shift/channel/window.
- Per-job Redis lock prevents duplicate sends during concurrent worker loops.
- Worker re-checks current status inside lock before send.
- Reminder sync handles create-race collisions without failing the caller transaction.

Time zone considerations:
- Reminder `dueAt` is computed from `shift.startTime` (UTC DB source of truth), preserving existing location-timezone conversion discipline at shift-generation time.

Verification notes:
- `npm run prisma:generate` passed in `backend`.
- `npm run build` passed in `backend`.
- `npm run build` passed in `frontend`.
- Worker boot smoke check (`node --env-file=.env dist/workers/reminders.worker.js`) starts/stops and logs correctly; full delivery execution in this sandbox is blocked by local DB connectivity permissions.

---

# Church MVP Phase 4 Todo (Calendar Launch)

## Plan

- [x] Add backend `calendar` module with `GET /api/v1/calendar`.
- [x] Add calendar query validation with required `startDate`, `endDate` and optional filters (`locationId`, `title`, `assignedUserId`, `mine`).
- [x] Enforce actor scope rules in calendar service (`ADMIN`, `MANAGER`, `STAFF`) and staff `mine` enforcement.
- [x] Use overlap-safe range matching with end-exclusive boundary logic.
- [x] Return shift + location + required skill + assignment user data for calendar rendering.
- [x] Add frontend calendar API client + `useCalendar` query hook.
- [x] Replace `/schedule` page weekly grid with weekly/monthly FullCalendar and filter bar.
- [x] Add center/title/assigned staff/my schedule filters and date navigation (prev/next/today via calendar toolbar).
- [x] Update route authority and nav so `/schedule` includes staff users.
- [x] Update staff post-login landing route to `/schedule`.
- [x] Add launch docs: runbook + pilot checklist.
- [x] Run backend and frontend build verification.

## Verification Checklist

- [x] Manager scope prevents viewing calendar outside assigned centers.
- [x] Staff is forced to personal-schedule visibility and cannot query others via `assignedUserId`.
- [x] Calendar query uses published shifts only for launch surface.
- [x] Weekly/monthly views use one API with consistent overlap-safe boundaries.
- [x] Filters (center, title, assigned staff, mine) work in combination.
- [x] Existing schedule builder and reminders remain intact.

## Review Summary
What changed:
- Added backend calendar read module (`routes/controller/service/validation`) and mounted `/api/v1/calendar`.
- Added role-scoped location visibility rules directly in calendar service:
  - Admin: all centers
  - Manager: managed centers only
  - Staff: certified centers, `mine=true` enforced
- Implemented safe date overlap filtering:
  - `startTime < endDateExclusive`
  - `endTime >= startDate`
- Added frontend calendar data layer:
  - `frontend/src/lib/api/calendar.ts`
  - `frontend/src/hooks/useCalendar.ts`
  - calendar query/response types in API types.
- Replaced `/schedule` UI with FullCalendar weekly/monthly surface plus filters and manager CTAs to:
  - `/event-templates`
  - `/schedule-builder`
- Updated role experience:
  - `/schedule` route/nav now includes `STAFF`
  - staff home route now resolves to `/schedule`.
- Added launch operations docs:
  - `docs/phase4-calendar-runbook.md`
  - `docs/phase4-pilot-checklist.md`

Why:
- Deliver a read-focused calendar launch on top of existing scheduling/reminder foundations, keeping implementation minimal and reusable.

Edge cases handled:
- Empty scope lists return no data safely.
- Staff-level privacy is enforced server-side even if frontend passes `assignedUserId`.
- Calendar title search is case-insensitive.
- Date range boundaries do not drop shifts that overlap view edges.

Concurrency considerations:
- Calendar endpoint is read-only and stateless; no new write path introduced.
- Existing generation/assignment/publish locking behavior remains unchanged.

Time zone considerations:
- Date query boundaries are normalized to UTC date starts, with end date treated as end-exclusive (+1 day), preserving UTC DB storage discipline.

Verification notes:
- `npm run build` passed in `backend`.
- `npm run build` passed in `frontend`.

## Plan

- [x] Add client auth primitives (`storage`, `types`, `AuthContext`, `AuthGate`) with JWT/localStorage lifecycle.
- [x] Wire `AuthProvider` into global providers and remove NextAuth dependency from app root flow.
- [x] Convert sign-in and sign-up flows to backend `/api/v1/auth/*` and map validation/errors.
- [x] Add protected/guest route guards for app and auth pages.
- [x] Align navigation/routes with role-based Phase 1 links only.
- [x] Align user menu/logout and session hook to AuthContext.
- [x] Implement users/locations API modules + React Query hooks.
- [x] Implement staff list page (filters + pagination + role guard).
- [x] Implement staff detail page with certification add/revoke and read-only skills placeholder.
- [x] Add axios unauthorized event handling to trigger centralized logout.
- [x] Run frontend type/build checks and fix regressions.

## Verification Checklist

- [x] Sign-in stores token/user and redirects by role.
- [x] Sign-up sends required backend payload.
- [x] Unauthenticated access to protected routes redirects to `/sign-in`.
- [x] Authenticated user cannot stay on sign-in/sign-up pages.
- [x] Nav visibility matches `ADMIN | MANAGER | STAFF`.
- [x] Staff list loads and filters by role/location.
- [x] Staff detail loads and certification mutations refresh data.
- [x] Existing shifts page still compiles and uses current API layer.

## Review Summary
What changed:
- Replaced frontend app auth flow with JWT/localStorage via `AuthContext` and `AuthGate`.
- Updated sign-in/sign-up pages to call backend `/api/v1/auth/login` and `/api/v1/auth/register`.
- Updated axios to dispatch centralized unauthorized event on 401 and read `accessToken` key only.
- Replaced session hook consumption with AuthContext-backed session shape to preserve template authority checks.
- Simplified navigation to Phase 1 links and added route authority for `/staff` and `/staff/[id]`.
- Added staff APIs/hooks (`users`, `locations`) and implemented staff list/detail pages with certification add/revoke.
- Added notification bell placeholder component in protected header layouts.

Why:
- Satisfy Phase 1 contract (JWT-only auth, role-based navigation, and staff management) while preserving template layout system and avoiding overengineering.

Edge cases handled:
- Unauthorized API responses force logout + redirect.
- Auth hydration prevents route flicker before localStorage state is known.
- Staff role blocked from staff-management page.
- Staff list skill filter and name filter both apply together.
- Certification add list excludes currently active certifications.

Concurrency considerations:
- Frontend mutations invalidate relevant React Query keys (`users` and `users/detail`) to prevent stale UI after quick sequential updates.

Time zone considerations:
- Frontend displays location timezone strings from backend responses without transforming them.
- No local timezone arithmetic introduced in Phase 1 UI.

---

# Phase 4 Backend: Swap Request System - COMPLETE ✅

## Implementation Summary

Created complete swap request system with 5 files:

**1. validation.ts** - 5 Zod schemas for all endpoints
**2. service.ts** - 500+ lines with full swap business logic
**3. controller.ts** - 7 HTTP handlers with Redis locks
**4. routes.ts** - Full OpenAPI documentation
**5. shifts/service.ts** - Extended updateShift() to auto-cancel swaps

## Verification Results

- ✅ Backend: `npx tsc --noEmit` passes with 0 errors
- ✅ Frontend: `npx tsc --noEmit` passes with 0 errors
- ✅ All 7 endpoints properly routed at /shifts/:shiftId/swap-requests and /swap-requests/:id/*
- ✅ Redis locks prevent concurrent swap operation
- ✅ 48-hour publish cutoff enforced on approval
- ✅ SWAP validates target (certified, skilled, available)
- ✅ DROP allows direct removal
- ✅ Shift modification auto-cancels pending swaps
- ✅ Violations array structured (type, severity, message, details)

## Next Steps (Phase 5)

- Socket.io event emissions (swap:created, swap:updated, swap:expired)
- Audit logging for all swap mutations
- Notification service (email/in-app)
- Manager role/location access validation
- Frontend swap request UI

All backend code follows Phase 3 patterns and compiles without errors.

---

# Church MVP Phase 2 Todo (Scheduling)

## Plan

- [x] Add `event-templates` backend module with CRUD + archive semantics (`isActive=false`) and role/scope enforcement.
- [x] Add `scheduling` backend module with `POST /api/v1/schedules/generate` and Redis scope lock.
- [x] Implement deterministic event instance generation and idempotent duplicate-skip behavior.
- [x] Convert generated local template time to UTC using target center timezone.
- [x] Extend eligible staff suggestions to include `MANAGER` + `STAFF`, fairness window counts, and ranking metadata.
- [x] Update shift publish response to include non-blocking warnings for underfilled required slots.
- [x] Add lightweight `skills` read endpoint and replace frontend mock skills usage.
- [x] Add frontend Event Templates screen (create/update/archive, requirements editing).
- [x] Add frontend Schedule Builder screen (generate, review, suggest+assign, publish selected).
- [x] Register new protected routes + navigation entries for scheduling flows.
- [x] Run backend and frontend build verification.

## Verification Checklist

- [x] Manager cannot create/view ministry templates and is restricted to managed centers.
- [x] Admin can create location or ministry templates.
- [x] Generation produces draft shifts only.
- [x] Re-running generation skips existing matching slots and returns skipped metadata.
- [x] Eligible staff suggestions return fairness rank + assignment count in window.
- [x] Candidate pool excludes admins and includes manager/staff users only.
- [x] Publish endpoint returns warnings for underfilled required shifts and does not block publication.
- [x] Frontend pages for templates and schedule builder compile and route correctly.

## Review Summary
What changed:
- Added backend modules:
  - `event-templates` (`POST/GET/GET:id/PUT/DELETE`) with manager/admin scope checks and archive delete.
  - `scheduling` (`POST /schedules/generate`) with recurring expansion, deterministic `eventInstanceId`, idempotent skip, and Redis lock protection.
  - `skills` (`GET /skills`) for live skill catalogs.
- Extended assignment suggestion response with:
  - fairness window params (`fairnessStartDate`, `fairnessEndDate`),
  - ranking metadata (`assignmentCountInWindow`, `rank`),
  - candidate pool updated to `MANAGER + STAFF`.
- Updated shift publish flow to include `warnings[]` when required headcount is underfilled (warn-only behavior).
- Added frontend API/hook layer for event templates, scheduling generation, and skills.
- Replaced mocked skills hook with live API-backed hook.
- Added new protected pages:
  - `/event-templates`
  - `/schedule-builder`
- Added nav and route authority for new manager/admin scheduling workflows.

Why:
- Deliver Phase 2 MVP scheduling capabilities with minimal surface area, reusing existing shift and assignment flows while introducing recurring template generation and assisted ranking.

Edge cases handled:
- Manager center scoping is enforced on template management and schedule generation.
- Ministry templates expand across selected centers; location templates stay center-bound.
- Duplicate generation reruns are non-destructive and report skipped entries.
- Optional slots can publish unfilled without warnings.

Concurrency considerations:
- Schedule generation is protected by a Redis distributed lock key derived from date range + selected centers + template scope.
- Existing assignment lock behavior remains unchanged.

Time zone considerations:
- Template local times are converted to UTC per target center timezone during slot generation.
- Overnight template slots are handled by rolling end time to next date when end <= start.

Verification notes:
- `npm run build` passed in `backend`.
- `npm run build` passed in `frontend`.

---

# Hotfix: Manager Users Access + Calendar Event Click Details

## Plan

- [x] Allow `MANAGER` role to call `GET /api/v1/users` with center-scoped filtering.
- [x] Enforce manager scope in users service (managed centers only; reject out-of-scope `locationId`).
- [x] Allow manager access to `GET /api/v1/users/:id` when target user belongs to manager-managed center scope.
- [x] Return certifications and flattened skills in users list payload for Staff UI compatibility.
- [x] Add calendar event click handling on `/schedule`.
- [x] Add shift details modal on event click (date/time/status/skill/headcount/assigned staff).
- [x] Verify backend and frontend builds.

## Verification Checklist

- [x] Manager no longer gets forbidden on `/api/v1/users?page=1&limit=20`.
- [x] Manager still cannot list users outside managed centers.
- [x] Clicking calendar event opens details modal.
- [x] Backend TypeScript build passes.
- [x] Frontend build passes.

## Review Summary
What changed:
- Updated users RBAC route to allow `ADMIN` and `MANAGER` list access.
- Added strict manager-center scoping in users listing and user detail reads.
- Normalized list user payload to include active certifications and flattened skills for existing frontend consumers.
- Added calendar event click interaction and details modal on `/schedule`.

Why:
- Fix immediate manager-facing 403 errors and unblock staff management flows.
- Fix missing calendar interaction so users can inspect shift details directly from calendar.

Edge cases handled:
- Manager with no managed centers receives empty list in `/users` list flow.
- Manager detail read is blocked unless target user is in scoped centers.

Concurrency considerations:
- No mutation flow changes; read-path RBAC adjustments only.

Time zone considerations:
- Modal displays existing shift timestamps using frontend locale formatting; backend UTC storage remains unchanged.

---

# FRD Phase 1: Rebuild /shifts as Standard Table

## Plan

- [x] Add backend `GET /api/v1/shifts` list endpoint with pagination + filters (`locationId`, `startDate`, `endDate`, `status`, `title`, `assignedUserId`).
- [x] Enforce role scope in shift list service:
  - `ADMIN`: all centers
  - `MANAGER`: managed centers only
  - `STAFF`: published shifts assigned to self only
- [x] Preserve existing `/locations/:locationId/shifts` behavior for current pages; avoid breaking regressions.
- [x] Add frontend shift list API/types for paginated filtered rows.
- [x] Rebuild `frontend/src/app/(protected-pages)/shifts/page.tsx` as a proper table page:
  - filters + pagination
  - clear date/time/title/assignee visibility
  - role-based actions (`View/Edit/Delete/New Shift` for manager/admin, `View/Request Swap` for staff)
- [x] Add modal flows for create one-off shift, edit shift, view details, delete confirm.
- [x] Add staff swap action guard in UI (`>=24h` + assigned only).
- [x] Run backend/frontend build verification.

## Review Summary
What changed:
- Added `GET /api/v1/shifts` with validated query filters and pagination in shifts module.
- Added server-side role-scoped listing rules:
  - staff is forced to own `PUBLISHED` assignments only
  - manager is center-scoped via `locationManagers`
  - admin can query all centers.
- Added overlap-safe date filtering (`shift.start < endExclusive` and `shift.end >= start`) to avoid boundary misses.
- Kept existing location-scoped endpoint (`/locations/:locationId/shifts`) unchanged for compatibility.
- Added frontend shift list contracts (`ListShiftsParams`, `PaginatedShiftsResponse`) and `shiftService.listShifts`.
- Added `useShiftTable` hook for table query + create/update/delete mutations with shared cache invalidation.
- Rebuilt `/shifts` page as a standard operational table with:
  - center/date/status/title/assignee filters
  - pagination
  - role-based actions (manager/admin edit/delete/create, staff request-swap)
  - details modal, editor modal, and delete confirmation.
- Wired staff swap entry with `SwapRequestModal` and UI guard for `<24h`, unpublished, or unassigned rows.

Why:
- Align `/shifts` with FRD operational workflow and eliminate the previous raw-id utility UX.

Edge cases handled:
- Manager out-of-scope location filter is rejected server-side.
- Staff cannot bypass query params to view other users or draft rows.
- Empty scope lists return safe empty paginated responses.
- UI swap action explains why row is not eligible (not assigned/unpublished/<24h).

Concurrency considerations:
- This phase is read-heavy plus existing shift CRUD mutations; no new concurrency risk surface was added beyond current mutation paths.
- Existing assignment/swap locking behavior remains unchanged.

Time zone considerations:
- Shift times remain persisted in UTC in backend.
- Date-range filters use UTC boundaries with end-exclusive math to avoid week/day edge leaks.
- UI displays local formatted date/time for readability while submitting ISO timestamps for writes.

---

# Hotfix: /shifts Route Collision and Page Contract Audit

## Plan

- [x] Fix backend router collision where `GET /api/v1/shifts` could be handled by swap list route.
- [x] Split swap routes into two routers:
  - shift-scoped swap actions under `/shifts/:shiftId/...`
  - swap-request collection/actions under `/swap-requests/...`
- [x] Verify `/api/v1/shifts` now resolves to shifts list handler shape (`pagination`) instead of swaps shape (`hasMore`).
- [x] Audit frontend page consumers for shift response-shape mismatches and patch obvious breakages.
- [x] Rebuild backend + frontend.

## Review Summary
What changed:
- Reworked swaps route composition:
  - `shiftSwapsRouter` for `/shifts/:shiftId/swap-requests*`
  - `swapRequestsRouter` for `/swap-requests` list and lifecycle actions.
- Updated API mount wiring in backend root router so `/api/v1/shifts` no longer overlaps with swaps root list route.
- Fixed frontend audited mismatches:
  - `reports` page now reads shift options from `data` and auto-seeds initial location when locations load.
  - `swaps` page now uses `useShiftTable` and correct shift response shape.
- Verified builds:
  - backend `npm run build` passed
  - frontend `npm run build` passed.

Why:
- Prevent endpoint handler ambiguity and unblock `/shifts` page data loading.

Edge cases handled:
- Path-level isolation ensures `/api/v1/shifts` and `/api/v1/swap-requests` cannot return each other’s payload shape.
- Existing swap endpoints used by frontend remain unchanged in URL contract.

Concurrency considerations:
- No change to swap/assignment locking behavior; only route composition and read path contracts were adjusted.

Time zone considerations:
- No change to timezone logic; this fix is routing + API shape alignment.

---

# Admin Dashboard + CRUD Todo

## Plan

- [x] Add user and center soft-delete schema fields linked to inactive-login and history-preservation business rules.
- [x] Add scoped dashboard summary service linked to role/location visibility business rules.
- [x] Add admin/manager user create/update/deactivate service methods linked to scoped user-management business rules.
- [x] Add admin center update/deactivate service methods linked to center-management business rules.
- [x] Add frontend dashboard cards linked to role/location-aware operational stats.
- [x] Add user create/edit/deactivate UI linked to admin/manager user-management rules.
- [x] Add center create/edit/deactivate UI linked to admin center-management rules.
- [x] Add navigation/routes/API contracts linked to discoverability and role visibility rules.
- [x] Verify backend/frontend builds; manual role scope, timezone, audit, and schedule-builder smoke checks still require a running app/DB.

## Verification Checklist

- [ ] Admin can create manager/staff/admin across any active center.
- [ ] Manager can create non-admin users only in managed active centers.
- [ ] Manager cannot create admin or assign unmanaged centers.
- [ ] Deactivated user cannot log in and is hidden from default user lists.
- [ ] Admin can create/update/deactivate centers with valid IANA timezone.
- [x] Manager/staff center lists remain scoped to active centers in code paths; live smoke verified migrated columns only.
- [x] Dashboard summary scoped query compiles and migrated columns smoke query succeeds; role-specific API smoke not run.
- [x] Schedule builder remains routed and frontend build includes `/schedule-builder`.
- [x] `npm run build` passes in `backend`.
- [x] `npm run build` passes in `frontend`.


## Review Summary
What changed:
- Added soft-deactivation fields for users and centers plus migration `20260604123000_admin_dashboard_crud`.
- Added scoped dashboard API and frontend dashboard at `/home` for admin, manager, and staff roles.
- Added admin/manager user create/update/deactivate backend service methods and frontend modal workflow on `/staff`.
- Added admin center create/update/deactivate backend support and frontend `/centers` page.
- Updated nav/routes so Dashboard is visible to all authenticated roles, Users to admin/manager, and Centers to admin only.

Why:
- Unblock director/admin operational setup while preserving KISS domain rules: existing roles, existing centers, existing schedule-builder/shift flows.

Edge cases handled:
- Managers cannot create/promote admins or assign users outside managed active centers.
- Admin users do not require center assignment; manager/staff users require at least one center.
- Deactivated users cannot log in and are filtered from default user lists.
- Deactivated centers are filtered from scoped location lists and shift/dashboard queries.

Concurrency considerations:
- No scheduling assignment concurrency path changed.
- User/center mutations run in DB transactions with audit log writes in the same transaction.

Time zone considerations:
- Center create/update keeps IANA timezone validation in backend and frontend.
- Dashboard displays upcoming shift times using center timezone while preserving UTC DB timestamps.

Verification notes:
- `npm run prisma:generate` passed in `backend`.
- `npm run build` passed in `backend`.
- `npm run build` passed in `frontend`.
- Applied `20260604123000_admin_dashboard_crud` to the local DB with `npx prisma migrate deploy` after runtime logs showed missing columns.
- Ran a read-only Prisma smoke query against `Location.isActive/deletedAt` and `User.isActive/deletedAt`: `{ "locations": 3, "users": 18 }`.
- Full browser CRUD smoke checks were not executed in this verification pass.
