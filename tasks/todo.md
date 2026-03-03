# Frontend Phase 1 Todo (JWT Auth + Role Layout + Staff)

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
