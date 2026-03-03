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
