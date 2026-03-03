# `COPILOT.md` — ShiftSync Engineering Operating System

---

# Workflow Orchestration

---

## 1️⃣ Plan Mode Default (Non-Negotiable)

For **any non-trivial task (3+ steps, business logic, DB changes, concurrency, validation, or architecture)**:

- Enter plan mode first.
- Break into explicit, checkable steps.
- Define constraints before coding.
- Identify side effects (notifications, audit, realtime, caching).
- Identify race condition risks.
- Identify validation implications.
- Identify timezone implications.

If something breaks:

- STOP.
- Re-evaluate root cause.
- Re-plan cleanly.
- Do not patch blindly.

Verification planning is mandatory.

---

## 2️⃣ Domain-First Thinking

Always think in this order:

1. Business rule
2. Constraint
3. Data integrity
4. Concurrency
5. Side effects (notifications, audit, realtime)
6. UI impact

Never start from controller layer.
Always start from service/domain logic.

---

## 3️⃣ Subagent Strategy (Compute Discipline)

For complex problems:

- Use subagents to:
  - Analyze concurrency patterns
  - Evaluate schema impacts
  - Simulate edge cases
  - Analyze timezone scenarios
  - Validate overtime calculations

One task per subagent.
No mixing responsibilities.

Main context remains orchestration layer only.

---

## 4️⃣ Self-Improvement Loop

After ANY correction:

Update:

```
tasks/lessons.md
```

Structure:

```
Mistake:
Root Cause:
Prevention Rule:
Pattern to Watch:
```

Before starting new work:

- Review lessons.md
- Apply relevant prevention rules

Reduce repeated mistakes aggressively.

---

## 5️⃣ Verification Before “Done”

A feature is NOT done unless:

- Validation logic tested
- Edge cases manually simulated
- Concurrency tested (if applicable)
- Audit trail verified
- Notification emitted
- Realtime event fired
- Correct HTTP status returned
- Timezone correctness confirmed

Ask:

> Would a senior backend engineer approve this?

If not, refine.

---

## 6️⃣ Elegance Standard (Balanced)

For non-trivial work:

Pause and ask:

- Is this DRY?
- Is business logic centralized?
- Is this duplicating validation?
- Can this be simplified?
- Is this violating 12-factor principles?
- Is this testable?

If hacky:
Re-implement cleanly.

But:
Do NOT over-engineer trivial CRUD.

---

## 7️⃣ Autonomous Bug Fixing

When a bug appears:

1. Reproduce it
2. Trace validation path
3. Check DB constraints
4. Check transaction boundaries
5. Check locking logic
6. Check timezone conversion
7. Check audit logs

Fix root cause.
No band-aids.
No workaround patches.

---

# Task Management

---

## 1️⃣ Plan First

Write structured plan in:

```
tasks/todo.md
```

Each item must be:

- Atomic
- Checkable
- Verifiable
- Linked to business rule

Example:

```
[ ] Add headcount validation in assignment service
[ ] Add publish cutoff validation (48h rule)
[ ] Add Redis lock by userId in assignToShift
[ ] Emit ASSIGNMENT_CREATED socket event
[ ] Log audit entry for assignment
```

---

## 2️⃣ Verify Plan

Before coding:

- Review if it touches:
  - concurrency
  - timezone
  - scheduling
  - swap logic
  - overtime
  - notifications
  - audit trail

If yes:
expand plan.

---

## 3️⃣ Track Progress

- Mark tasks complete immediately after verification.
- Do not mark complete before verification.

---

## 4️⃣ Explain Changes

After finishing:

Add section to `tasks/todo.md`:

```
## Review Summary
What changed:
Why:
Edge cases handled:
Concurrency considerations:
Time zone considerations:
```

---

## 5️⃣ Capture Lessons

After mistakes:

Append to:

```
tasks/lessons.md
```

Never ignore recurring patterns.

---

# Core Engineering Principles

---

## 1️⃣ KISS (Strict)

- No microservices.
- No unnecessary abstraction layers.
- No premature optimization.
- No over-generalized repositories.

Simple service modules.
Clear responsibility boundaries.

---

## 2️⃣ DRY (Business Logic Centralized)

- All validation lives in `validation.service.js`
- No duplicated rule checks in controllers.
- No duplicated timezone logic.
- No duplicated overtime calculations.

Controllers orchestrate.
Services enforce.
DB constrains.

---

## 3️⃣ 12-Factor Discipline

- Config only in env
- Stateless backend
- Redis for shared state
- Structured logging
- No business logic in controllers
- Idempotent endpoints where possible
- One source of truth for time: UTC in DB

---

## 4️⃣ Data Integrity First

Every critical mutation must:

- Run inside transaction
- Lock affected rows
- Validate constraints
- Write audit log
- Emit notification
- Emit realtime event

Order matters.

---

## 5️⃣ Concurrency Safety (Mandatory for Scheduling)

During assignment:

- Lock by userId
- Lock shift row
- Validate after lock
- Insert
- Commit
- Release lock

Never validate before lock.
Never trust frontend.

---

## 6️⃣ Timezone Discipline

Rules:

- All DB times in UTC
- Store location.timezone
- Convert on read only
- Availability evaluated in location timezone
- Overnight shifts handled as single logical shift

Never mix user timezone into scheduling logic.

---

## 7️⃣ Explicit Error Messaging

All validation errors must include:

```
code
message
details
severity
suggestions[]
```

No vague errors.
No “Conflict occurred”.
No silent failure.

---

## 8️⃣ Audit Everything

Every mutation:

- shift create
- shift update
- publish
- assignment
- swap request
- approval
- cancellation
- override

Must generate:

```
before
after
userId
timestamp
entityType
entityId
```

---

## 9️⃣ Evaluation Scenario Discipline

Before declaring MVP complete:

Manually simulate:

1. Sunday Night Chaos
2. Overtime Trap
3. Timezone Tangle
4. Simultaneous Assignment
5. Fairness Complaint
6. Regret Swap

All must pass without manual DB edits.

---

# Anti-Patterns (Strictly Forbidden)

- Business logic in controllers
- Validation scattered across files
- Assignment without transaction
- No locking in concurrency path
- Hardcoded timezones
- Ignoring DST
- Skipping audit
- Missing socket event
- Not handling headcount
- Not enforcing 48-hour publish lock

---

# Definition of Done (ShiftSync)

A feature is done when:

- Constraint enforced
- Edge cases covered
- Concurrency safe
- Audit logged
- Notification sent
- Realtime emitted
- Timezone correct
- Role restrictions enforced
- Headcount enforced
- Publish cutoff enforced
