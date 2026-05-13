# FRD: CFC Kids Shift Sync

## 1. Product Overview

| Field | Value |
|-------|-------|
| App Name | CFC Kids Shift Sync |
| Purpose | Center-based duty scheduling for children's church events |
| Scope | Web app + mobile responsive (PWA optional) |
| Target Users | CFC Kids staff (Directors, CCOs, ACOs, Teachers, Volunteers) |

## 2. User Roles & Permissions Matrix

| Permission | Super Admin (Dir/Asst/GenSec) | Center Admin (CCO/ACO) | Regular User (Teacher/Volunteer) |
|-------------|------------------------------|------------------------|----------------------------------|
| See all centers | ✅ | ❌ | ❌ |
| See only their center | ✅ | ✅ | ✅ |
| Create/edit events | ✅ | ✅ | ❌ |
| Create schedule (assign shifts) | ✅ | ✅ | ❌ |
| Auto-assign shifts | ✅ | ✅ | ❌ |
| Approve/reject swap requests | ✅ | ✅ | ❌ |
| Publish/unpublish calendar | ✅ | ✅ | ❌ |
| View calendar | ✅ | ✅ | ✅ |
| View own shifts | ✅ | ✅ | ✅ |
| Request shift swap | ✅ | ✅ | ✅ |
| Configure auto-schedule rules | ✅ | ✅* | ❌ |

*CCO/ACO can configure rules only for their center. Super Admin can configure for any center.

## 3. Core Data Models

### 3.1 User

```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "primary_role": "super_admin | center_admin | teacher | volunteer",
  "other_roles": ["teacher", "volunteer"], // optional tags
  "center_id": "uuid", // null for super admin
  "is_active": true,
  "created_at": "timestamp"
}
```

### 3.2 Center

```json
{
  "id": "uuid",
  "name": "string (e.g., 'Lekki Phase 1')",
  "location": "string",
  "country": "string",
  "is_active": true
}
```

### 3.3 Event (recurring or one-off)

```json
{
  "id": "uuid",
  "center_id": "uuid",
  "name": "string (e.g., 'Sunday Service')",
  "type": "regular | special",
  "days_of_week": [0,1,2,3,4,5,6], // 0=Sunday, 6=Saturday
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "is_one_off": false,
  "one_off_date": "YYYY-MM-DD", // if is_one_off = true
  "duty_roles_required": ["teacher", "volunteer"], // which roles can be assigned
  "is_active": true
}
```

### 3.4 Shift (instance of an event on a specific date)

```json
{
  "id": "uuid",
  "event_id": "uuid",
  "center_id": "uuid",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "status": "draft | published | completed | cancelled",
  "assigned_user_ids": ["uuid1", "uuid2"],
  "min_required_staff": 2,
  "max_required_staff": 5
}
```

### 3.5 AutoScheduleRule

```json
{
  "id": "uuid",
  "center_id": "uuid",
  "event_id": "uuid", // null = applies to all events
  "user_role": "teacher | volunteer", // which role this rule applies to
  "max_shifts_per_month": 4,
  "min_days_between_shifts": 1,
  "preferred_users": ["uuid1", "uuid2"], // optional priority list
  "excluded_users": ["uuid3"], // optional blacklist
  "is_active": true
}
```

### 3.6 SwapRequest

```json
{
  "id": "uuid",
  "shift_id": "uuid",
  "requesting_user_id": "uuid",
  "target_user_id": "uuid", // for direct swap request
  "proposed_shift_id": "uuid", // if swap with another shift
  "status": "pending | approved | rejected | cancelled",
  "reason": "string (optional)",
  "created_at": "timestamp",
  "reviewed_by": "uuid", // admin who approved/rejected
  "reviewed_at": "timestamp"
}
```

## 4. Functional Requirements

### FR-01: Authentication & Center Scoping

- **FR-01.1** Users log in with email/password or SSO (if available)
- **FR-01.2** After login, users see data ONLY for their center (unless Super Admin)
- **FR-01.3** Super Admins can switch between centers via a dropdown

### FR-02: Calendar View

- **FR-02.1** Display month/week/day calendar of shifts (published shifts only for regular users)
- **FR-02.2** Filters by: event type (Sunday/Bible Study/Prayer/Special), duty type (teacher/volunteer), date range
- **FR-02.3** Click on shift shows: event name, time, assigned users, slots remaining
- **FR-02.4** Export to iCal/Google Calendar

### FR-03: My Shifts View

- **FR-03.1** List view of all shifts assigned to logged-in user
- **FR-03.2** Show past (gray), upcoming (green), today (yellow)
- **FR-03.3** Each shift has a "Request Swap" button (if not within 24hrs of event)

### FR-04: Event & Shift Management (Admin only)

- **FR-04.1** CRUD for Events (regular recurring + special one-off)
- **FR-04.2** Generate shifts from an event for a date range (e.g., next 3 months)
- **FR-04.3** Manual assignment: pick a shift → assign/unassign users from available pool
- **FR-04.4** Auto-assignment: system assigns users based on rules (see FR-06)
- **FR-04.5** Publish/unpublish shifts (users only see published shifts)

### FR-05: Shift Swap System

- **FR-05.1** User A selects one of their shifts → clicks "Request Swap"
- **FR-05.2** Two options:
  - *Offer to specific user*: picks User B → User B gets notification
  - *Open to anyone*: posts to a "Swap Board" visible to center
- **FR-05.3** Target user accepts → request goes to Admin for final approval
- **FR-05.4** Admin sees pending swaps → approve/reject with optional reason
- **FR-05.5** Once approved, shifts are reassigned, both users notified
- **FR-05.6** Swap cannot be requested if shift is < 24 hours away

### FR-06: Auto-Schedule Engine

- **FR-06.1** Admin defines rules per event or global (see 3.5)
- **FR-06.2** When admin triggers "Auto-Assign" for a date range:
  - System fetches all unassigned shifts
  - For each shift, queries available users (role match, not exceeding max_shifts_per_month, not in min_days_between_shifts violation)
  - Assigns users fairly (round-robin or by preferred_users list)
  - Flags conflicts for manual review
- **FR-06.3** Admin can override any auto-assignment

### FR-07: Notifications

- **FR-07.1** In-app notification center
- **FR-07.2** Email notifications (optional toggle per user):
  - New shift assigned to me
  - Swap request received
  - Swap request approved/rejected
  - Schedule published

### FR-08: Audit & Reporting (Super Admin + Center Admin)

- **FR-08.1** View: "Who has how many shifts this month" per center
- **FR-08.2** View: Unfilled shifts (upcoming 7 days)
- **FR-08.3** Export to CSV

## 5. Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Performance | Calendar loads < 2 seconds for 3 months of shifts |
| Concurrent users | Support 500 users per center |
| Data isolation | Strict center_id filtering (no leaks across centers) |
| Mobile | Responsive design (works on 320px width) |
| Offline | Read-only calendar access when offline (service worker) |
| Security | Role-based access enforced on API and UI |

## 6. Pages/Screens (for UI reference)

1. **Login** – email/password, center selector for Super Admin
2. **Dashboard** – calendar + upcoming shifts summary
3. **Calendar** – full page month/week/day view
4. **My Shifts** – list view with swap buttons
5. **Swap Board** – open swap requests
6. **Admin: Events** – manage event templates
7. **Admin: Schedule** – assign shifts, auto-assign, publish
8. **Admin: Swap Approvals** – pending requests
9. **Admin: Auto Rules** – configure max shifts, exclusions
10. **Admin: Users** – add/remove users, assign roles
11. **Reports** – shift summary, unfilled shifts

## 7. API Endpoints (REST or GraphQL)

```
GET    /api/centers              # super admin only
GET    /api/centers/:id/events
GET    /api/centers/:id/shifts   # with ?date_from=&date_to=&status=
POST   /api/centers/:id/shifts/auto-assign
PUT    /api/shifts/:id/publish
POST   /api/shifts/:id/assign    # admin only
DELETE /api/shifts/:id/assign/:userId

GET    /api/my/shifts
POST   /api/swaps/request
PUT    /api/swaps/:id/accept  # target user
PUT    /api/swaps/:id/reject  # admin only

GET    /api/admin/rules
POST   /api/admin/rules
PUT    /api/admin/rules/:id
```

## 8. Success Metrics (for MVP)

- Center Admin can create a month of shifts in < 10 minutes using auto-assign
- Swap request → resolution within 24 hours (target 90%)
- Users can see their shifts in < 3 taps/clicks
