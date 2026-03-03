# ShiftSync – Task Tracker

---

# Current Milestone

> Example: Phase 2 – Assignment Engine + Constraint Enforcement

---

# Active Tasks

## 🔐 Authentication & Roles

- [ ] JWT access + refresh token flow complete
- [ ] Role-based middleware (ADMIN, MANAGER, STAFF)
- [ ] Location-based access control enforced everywhere
- [ ] Token invalidation (logout / blacklist)

---

## 🏢 Locations & Users

- [ ] Location CRUD (Admin only)
- [ ] Manager-location assignment
- [ ] Staff certification to locations
- [ ] Staff skill assignment
- [ ] Desired hours field implemented

---

## 📅 Shift Core

- [ ] Create shift (location restricted)
- [ ] Edit shift
- [ ] Cancel shift
- [ ] Publish shift
- [ ] Enforce 48-hour publish cutoff rule
- [ ] Headcount enforcement (no over-assignment)
- [ ] Indexes added for shift time queries

---

## 🧠 Constraint Engine (Critical)

- [ ] Skill validation
- [ ] Location certification validation
- [ ] Availability validation (recurring + exception)
- [ ] Overlap detection
- [ ] 10-hour gap enforcement
- [ ] Daily hours validation (8 warn / 12 block)
- [ ] Weekly hours validation (35 warn / 40 block)
- [ ] Consecutive days logic (6 warn / 7 override)
- [ ] Suggest alternative staff logic
- [ ] Structured error response object implemented

---

## 🔄 Assignment Engine

- [ ] Assignment transaction implemented
- [ ] Redis lock by userId
- [ ] Row lock on shift
- [ ] Validate AFTER lock
- [ ] Audit log created
- [ ] Notification created
- [ ] Socket event emitted
- [ ] What-if preview endpoint implemented

---

## 🔁 Swap Workflow

- [ ] Request swap
- [ ] Request drop
- [ ] Max 3 pending enforced
- [ ] Expiry = 24h before shift start
- [ ] Accept swap
- [ ] Reject swap
- [ ] Manager approval
- [ ] Cancel request
- [ ] Auto-cancel on shift edit
- [ ] Expiration cron
- [ ] Audit logs for all transitions

---

## ⏱ Overtime Module

- [ ] Overtime calculation service
- [ ] Warning generation
- [ ] Block enforcement
- [ ] Override with reason logging
- [ ] Overtime dashboard endpoint
- [ ] What-if overtime projection

---

## 📊 Fairness Analytics

- [ ] Premium shift tagging (Fri/Sat evenings)
- [ ] Hours distribution report
- [ ] Fairness score calculation
- [ ] Under/over scheduled detection
- [ ] Premium shift heatmap endpoint

---

## 🔔 Notifications & Realtime

- [ ] Notification persistence
- [ ] Unread count endpoint
- [ ] Socket authentication
- [ ] user:{id} rooms
- [ ] location:{id} rooms
- [ ] Shift update events
- [ ] Assignment conflict events
- [ ] Swap update events

---

## 🧾 Audit Trail

- [ ] Audit log model implemented
- [ ] Before/after JSON stored
- [ ] Entity history endpoint
- [ ] Admin export endpoint

---

## 🌎 Timezone Handling

- [ ] All DB times stored in UTC
- [ ] Location timezone stored
- [ ] Convert to location timezone on read
- [ ] Overnight shift handling
- [ ] DST boundary tested
- [ ] PT/ET cross-location availability tested

---

## ⚔ Concurrency & Integrity

- [ ] Simultaneous assignment test
- [ ] Double booking prevention verified
- [ ] Version field for optimistic concurrency
- [ ] Conflict returns HTTP 409
- [ ] Integration test for locking

---

## 📡 On-Duty Now

- [ ] Endpoint to fetch current active assignments
- [ ] Live updating dashboard
- [ ] Location-based grouping
- [ ] Real-time updates

---

# Manual Evaluation Scenarios

## 1️⃣ Sunday Night Chaos

- [ ] Drop request created 1 hour before shift
- [ ] Qualified staff notified
- [ ] Staff accepts
- [ ] Manager approves
- [ ] Notifications verified

## 2️⃣ Overtime Trap

- [ ] Assignment pushing to 52 hours blocked
- [ ] Warning at 35+ verified
- [ ] Override logged

## 3️⃣ Timezone Tangle

- [ ] PT + ET certification tested
- [ ] Availability conversion verified

## 4️⃣ Simultaneous Assignment

- [ ] Two managers assign same user
- [ ] One succeeds
- [ ] One receives conflict

## 5️⃣ Fairness Complaint

- [ ] Premium distribution visible
- [ ] Hours comparison visible

## 6️⃣ Regret Swap

- [ ] Swap cancelled before approval
- [ ] Audit + notification verified

---

# Review Summary (Fill Before Marking Milestone Complete)

## What Changed

-

## Edge Cases Covered

-

## Concurrency Considerations

-

## Timezone Considerations

-

## Remaining Risks

-
