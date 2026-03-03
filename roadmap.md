# 🎯 FINAL TRIMMED ROADMAP - ShiftSync MVP (Zero Code, Just Tasks)

## 48-Hour Execution Plan - Production-Ready, Evaluator-Focused

---

# PHASE 0: FOUNDATION & SETUP (Hours 0-3)

## Backend Setup Tasks

### Initialize Project

- Create new Node.js project directory
- Create `.gitignore` with node_modules, .env, dist
- Create `.env` file with placeholder variables
- Setup ESLint with Airbnb/base config
- Setup Prettier with standard rules

### Install Production Dependencies

- express (web framework)
- cors (cross-origin resource sharing)
- helmet (security headers)
- compression (response compression)
- @prisma/client (database ORM)
- pg (postgres driver)
- redis + ioredis (caching/locking)
- socket.io (real-time communication)
- jsonwebtoken + bcryptjs (auth)
- zod (runtime validation)
- date-fns + date-fns-tz (timezone handling)

### Install Development Dependencies

- nodemon (auto-restart)
- prisma (orm cli)
- jest (testing)
- @types/xyz (type definitions if using TS)

### Database Setup

<!-- - Create PostgreSQL database (Supabase free tier)
- Create Redis instance (Upstash free tier) -->
- Run `prisma init` to setup schema
- Configure connection strings in `.env`

### Project Structure Creation

```
/src
├── modules/
│   ├── auth/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   └── middleware.js
│   ├── users/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   └── service.js
│   ├── locations/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   └── service.js
│   ├── shifts/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   └── validation.js
│   ├── swaps/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   └── service.js
│   └── audit/
│       ├── middleware.js
│       └── service.js
├── lib/
│   ├── errors/
│   │   └── customErrors.js
│   ├── validation/
│   │   └── index.js
│   └── timezone/
│       └── converter.js
└── server.js
```

## Frontend Setup Tasks

### Initialize Next.js

- Create new Next.js project using admin template
- Clean all example/demo pages
- Configure environment variables in `.env.local`

### Install Dependencies

- axios (api client)
- @tanstack/react-query (server state)
- zustand (client state)
- socket.io-client (real-time)
- react-hook-form (forms)
- date-fns + date-fns-tz (timezone)
- sonner (toasts)

### Project Structure

```
/src
├── app/                    # Next.js App Router (your existing structure)
│   ├── (auth-pages)/       # Keep as is
│   ├── (protected-pages)/  # Keep as is
│   │   └── home/
│   │   └── shifts/         # NEW: Add shift pages
│   │   └── schedule/       # NEW: Add schedule pages
│   │   └── swaps/          # NEW: Add swap pages
│   └── layout.tsx          # Keep as is
│
├── components/
│   ├── shared/             # Your existing shared components
│   ├── template/           # Your existing template components
│   ├── ui/                 # Your existing UI components
│   │
│   └── shifts/             # NEW: Domain components
│   │   ├── ShiftCard/      # Extend template's Card
│   │   ├── ShiftForm/      # Use template's Form + DatePicker
│   │   └── AssignmentList/ # Use template's Table
│   │
│   ├── calendar/           # NEW: Calendar components
│   │   └── WeekCalendar/   # Custom but use template's Card/Button
│   │
│   └── swaps/              # NEW: Swap components
│       ├── SwapRequestCard/
│       └── ApprovalQueue/
│
├── hooks/
│   ├── useAuth.js          # Your existing (or extend)
│   ├── useSocket.js        # NEW: Socket hook
│   └── useShifts.js        # NEW: React Query hooks
│
├── lib/
│   ├── api/
│   │   ├── client.js       # Extend your ApiService
│   │   └── shifts.js       # NEW: API endpoints
│   │
│   └── utils/
│       └── timezone.js     # NEW: Timezone utilities
│
├── store/
│   └── socketStore.js      # NEW: Zustand store
│
└── configs/
    ├── navigation.config/  # EXTEND: Add shift/swaps routes
    └── routes.config/      # EXTEND: Add new routes
```

---

# PHASE 1: CORE DATA MODELS & AUTH (Hours 3-6)

## Backend Tasks

### Create Prisma Schema

Define models with these fields (no code, just structure):

**User Model**

- id (string, primary key)
- email (string, unique)
- password (string, hashed)
- firstName (string)
- lastName (string)
- role (enum: ADMIN, MANAGER, STAFF)
- phone (string, optional)
- createdAt (datetime)
- updatedAt (datetime)
- relations: managerLocations, certifications, skills, availability, shifts, swapRequests, auditLogs

**Location Model**

- id (string, primary key)
- name (string)
- address (string)
- timezone (string, IANA format)
- createdAt (datetime)
- updatedAt (datetime)
- relations: managers, shifts, certifications

**Skill Model**

- id (string, primary key)
- name (string, unique)
- relations: users, shifts

**Certification Model**

- id (string, primary key)
- userId (string, foreign key)
- locationId (string, foreign key)
- revokedAt (datetime, optional)
- unique constraint: [userId, locationId]

**UserSkill Model**

- userId (string, foreign key)
- skillId (string, foreign key)
- composite primary key: [userId, skillId]

**Availability Model**

- id (string, primary key)
- userId (string, foreign key)
- dayOfWeek (integer, 0-6)
- startTime (string, "HH:MM")
- endTime (string, "HH:MM")
- locationId (string, optional, foreign key)
- isRecurring (boolean, default true)
- validFrom (datetime)
- validTo (datetime, optional)

**Exception Model**

- id (string, primary key)
- userId (string, foreign key)
- date (datetime, date only)
- startTime (string, optional)
- endTime (string, optional)

**Shift Model**

- id (string, primary key)
- locationId (string, foreign key)
- startTime (datetime, UTC)
- endTime (datetime, UTC)
- requiredSkillId (string, foreign key)
- headcountNeeded (integer, default 1)
- status (string: DRAFT, PUBLISHED)
- publishedAt (datetime, optional)
- createdAt (datetime)
- updatedAt (datetime)

**ShiftAssignment Model**

- id (string, primary key)
- shiftId (string, foreign key)
- userId (string, foreign key)
- status (string: ASSIGNED, PENDING_SWAP)
- unique constraint: [shiftId, userId]

**SwapRequest Model**

- id (string, primary key)
- shiftId (string, foreign key)
- requestingUserId (string, foreign key)
- targetUserId (string, optional, foreign key)
- type (string: SWAP, DROP)
- status (string: PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED)
- expiresAt (datetime)
- createdAt (datetime)

**AuditLog Model**

- id (string, primary key)
- userId (string, foreign key)
- action (string)
- entityType (string)
- entityId (string)
- beforeState (json, optional)
- afterState (json, optional)
- createdAt (datetime)

### Run Initial Migration

- Generate and run first migration
- Verify all tables created

### Auth Module Implementation

- Create registration endpoint (POST /auth/register)
  - Accept email, password, firstName, lastName, role
  - Hash password with bcrypt
  - Store user in database
  - Return JWT token

- Create login endpoint (POST /auth/login)
  - Find user by email
  - Compare password with bcrypt
  - Generate JWT with user id and role
  - Return token and user data

- Create auth middleware
  - Extract token from Authorization header
  - Verify JWT
  - Attach user to request object
  - Handle invalid/expired tokens

- Create role-based middleware
  - restrictTo(roles) function
  - Check req.user.role against allowed roles
  - Return 403 if unauthorized

### Users Module

- Create GET /users (admin only)
  - List all users with pagination
  - Filter by role/location
- Create GET /users/:id
  - Get single user with relations
- Create PUT /users/:id
  - Update user profile
- Create POST /users/:id/certifications
  - Add location certification
- Create DELETE /users/:id/certifications/:locationId
  - Soft revoke (set revokedAt)

### Locations Module

- Create GET /locations
  - List all locations
- Create POST /locations (admin only)
  - Create new location with timezone
- Create PUT /locations/:id
  - Update location
- Create POST /locations/:id/managers
  - Assign manager to location
- Create DELETE /locations/:id/managers/:userId
  - Remove manager

## Frontend Tasks

### Authentication Pages

- Create login form with email/password
- Create registration form with all fields
- Add form validation with error messages
- Store JWT in localStorage after login
- Redirect based on user role
- Add protected route wrapper component

### Layout Components

- Create main layout with sidebar
- Show different nav items based on role
  - Admin: All links
  - Manager: Schedule, Staff, Swaps
  - Staff: My Shifts, Availability, My Swaps
- Add logout button
- Add notification bell (placeholder)

### API Client Setup

- Create axios instance with base URL
- Add request interceptor for JWT
- Add response interceptor for error handling
- Setup React Query client with default options

### Staff Management Pages (Admin/Manager)

- Create staff list table with columns:
  - Name, Email, Role, Locations, Skills
- Add filter by location/skill
- Create staff detail page
- Add certification management UI
- Add skill assignment UI

---

# PHASE 2: AVAILABILITY & SHIFT CREATION (Hours 6-12)

## Backend Tasks

### Availability Module

**Create Availability Endpoints**

- POST /users/:userId/availability
  - Accept recurring availability blocks
  - Validate no overlapping blocks
  - Store in database

- POST /users/:userId/exceptions
  - Accept specific date exceptions
  - If no times provided, mark full day unavailable
  - Store exception

- GET /users/:userId/availability
  - Return all recurring blocks
  - Include active exceptions

- GET /users/:userId/availability/check
  - Query params: date, startTime, endTime, locationId
  - Check if user is available
  - Return boolean + reason if unavailable

**Availability Service Functions**

- `getUserAvailabilityForDateRange(userId, startDate, endDate)`
  - Combine recurring + exceptions
  - Return array of available time slots
  - Handle DST transitions correctly

- `isUserAvailableAtTime(userId, datetime, duration, locationId)`
  - Check all constraints
  - Return structured result

### Shift Module

**Create Shift Endpoints**

- POST /locations/:locationId/shifts
  - Required fields: startTime, endTime, requiredSkillId, headcountNeeded
  - Validate endTime after startTime
  - Store as UTC with location timezone context
  - Default status = DRAFT

- GET /locations/:locationId/shifts
  - Query params: startDate, endDate
  - Return all shifts in range
  - Include assignments

- GET /shifts/:id
  - Return shift with assignments and details

- PUT /shifts/:id
  - Update shift fields
  - Check if shift is published (block if published)
  - Re-validate all assignments if times change

- DELETE /shifts/:id
  - Soft delete or cancel
  - Check publish status
  - Notify affected staff

**Publish Endpoints**

- POST /shifts/:id/publish
  - Check 48-hour rule: shift.startTime - now >= 48 hours
  - Update status to PUBLISHED
  - Set publishedAt timestamp
  - Emit socket event

- POST /shifts/bulk-publish
  - Accept array of shift ids
  - Apply same rules to all
  - Return success/failure counts

**Schedule View (No separate model)**

- GET /schedule/week
  - Query: locationId, weekStartDate (Monday)
  - Calculate all shifts in that week
  - Group by day
  - Return organized structure

### Validation Service Functions (CRITICAL)

**Core Validation Functions - All Return Structured Results**

- `validateShiftAssignment(shiftId, userId)`
  - Check user not already assigned to shift
  - Check user certified for location
  - Check user has required skill
  - Check user availability at shift time
  - Check no overlapping shifts
  - Check 10-hour gap from previous shift
  - Check 10-hour gap to next shift
  - Check daily hour limit (12h max, 8h warning)
  - Check weekly hour limit (40h warning, hard block)
  - Check consecutive days (6th warning, 7th requires override)
  - Return { valid: boolean, violations: array, suggestions: array }

- `validateShiftCreation(shiftData)`
  - Check location exists
  - Check skill exists
  - Check end > start
  - Check headcount > 0
  - Return validation result

- `checkPublishCutoff(shiftStartTime)`
  - Calculate hours between now and shift start
  - Return { canPublish: boolean, hoursUntilCutoff: number }

### Overtime Tracking (Computed, Not Stored)

- `calculateWeeklyHours(userId, weekStartDate)`
  - Get all shifts for user in week
  - Sum durations
  - Return total hours

- `calculateDailyHours(userId, date)`
  - Get shifts for that day
  - Sum durations
  - Return total

- `getConsecutiveDaysWorked(userId, date)`
  - Check previous days for shifts
  - Count consecutive days backwards
  - Return count

- `getOvertimeWarnings(userId, proposedShiftEnd)`
  - Run all calculations
  - Return array of warnings/blocks

## Frontend Tasks

### Calendar Component (Simple Grid)

- Create week view with 7 columns
- Show hourly time slots (9am-11pm)
- Display shifts as colored cards
- Click shift to open detail modal
- Click empty slot to open create modal
- NO drag-drop functionality

### Shift Creation Modal

- Form fields:
  - Date picker
  - Time range picker (start/end)
  - Skill dropdown (from API)
  - Headcount input (number)
- Validation messages on form
- Submit button with loading state

### Shift Detail Modal

- Show all shift information
- List current assignments
- "Find Available Staff" button
- Assignment section

### Availability Pages

- Weekly grid with time slots (30-min increments)
- Checkboxes or toggle buttons for each time
- "Set Recurring" button for pattern
- Exceptions calendar with date picker
- Save button with confirmation
- View current settings summary

### Staff Availability View (Manager)

- Select staff member
- View their availability grid
- See exceptions highlighted
- Read-only mode

---

# PHASE 3: ASSIGNMENT ENGINE (Hours 12-18) - HIGHEST PRIORITY

## Backend Tasks

### Assignment Module

**Core Assignment Endpoint**

- POST /shifts/:shiftId/assignments
  - Body: { userId }
  - ACQUIRE REDIS LOCK: `user:${userId}:lock`
  - If lock exists, return 409 with conflict message
  - Call `validateShiftAssignment(shiftId, userId)`
  - If validation fails, return 400 with violations array
  - Create ShiftAssignment record
  - Update shift headcount if needed
  - Release Redis lock
  - Create audit log entry
  - Emit socket event: `assignment:changed`
  - Return success with assignment data

**Bulk Operations**

- GET /shifts/:shiftId/eligible-staff
  - Query params: limit, search
  - Get all staff certified for location
  - Filter by required skill
  - For each, check availability at shift time
  - Calculate overtime warnings for each
  - Return array with:
    - User details
    - Available (boolean)
    - Warnings array (if near limits)
    - Suggestion text

**Bulk Assignment**

- POST /shifts/:shiftId/assignments/bulk
  - Body: { userIds }
  - Validate each sequentially
  - Track successes/failures
  - Return summary with errors

**Remove Assignment**

- DELETE /assignments/:assignmentId
  - Check if shift published (48h rule)
  - Soft delete or hard delete
  - Update headcount
  - Audit log
  - Notify staff

### Conflict Resolution Service

**Structured Error Response Format**

```json
{
  "success": false,
  "error": {
    "code": "ASSIGNMENT_VIOLATION",
    "message": "Cannot assign Sarah to this shift",
    "violations": [
      {
        "type": "overlap",
        "message": "Sarah is already scheduled at Downtown location from 5pm-11pm",
        "conflictingShiftId": "123"
      },
      {
        "type": "weekly_hours",
        "message": "This would push Sarah to 42 hours this week (warning)"
      }
    ],
    "suggestions": [
      {
        "userId": "456",
        "name": "John Doe",
        "reason": "Available and qualified"
      },
      {
        "userId": "789",
        "name": "Maria Garcia",
        "reason": "Has skill but needs certification for this location"
      }
    ]
  }
}
```

### Override Functionality

- POST /assignments/override
  - Body: { shiftId, userId, reason }
  - Requires manager role
  - Bypass non-critical validations
  - Log override reason in audit
  - Still enforce hard blocks (12h daily, 7th day)

### Headcount Enforcement

- `checkHeadcountNotExceeded(shiftId)`
  - Count current assignments
  - Compare to headcountNeeded
  - Block if at capacity
  - Include in validation

## Frontend Tasks

### Staff Assignment Interface

**Shift Detail View with Assignment Section**

- Show shift info at top
- Current assignments list with:
  - Staff name
  - Status (assigned/pending)
  - Remove button (if manager)
- "Find Available Staff" button

**Eligible Staff Modal**

- List of staff with:
  - Name and role
  - Availability indicator (green/yellow/red)
  - Warning icons if near limits
  - "Select" button
- Filter by name/skill
- Sort by availability

**Assignment Confirmation**

- After clicking select:
  - Show validation summary
  - If warnings exist, show them with yellow background
  - If blocks exist, show red with reason
  - Confirm button (disabled if blocked)

**Error Display Component**

- Red alert box for blocks
- Yellow warning box for warnings
- Bulleted list of violations
- Each violation has human-readable text
- Suggestions as clickable buttons

### Weekly Hours Dashboard

**Manager View**

- Table of all staff in location
- Columns: Name, Mon, Tue, Wed, Thu, Fri, Sat, Sun, Total
- Color coding:
  - Green: <35 hours
  - Yellow: 35-40 hours
  - Red: >40 hours
- Click row to see daily breakdown

**Staff View**

- Personal hours summary
- Progress bars toward limits
- Warning messages

### Consecutive Days Warning

- On assignment, check consecutive days
- Show warning if 6th day
- Show block with override option for 7th day
- Override requires reason input

---

# PHASE 4: SWAP REQUESTS (Hours 18-22)

## Backend Tasks

### Swap Module

**Create Swap Request**

- POST /shifts/:shiftId/swap-requests
  - Body: { type, targetUserId (optional for drops) }
  - Check user owns the shift or is assigned
  - Count pending requests for user (< 3)
  - Calculate expiry:
    - For drops: shift.startTime - 24 hours
    - For swaps: 7 days from now or shift.startTime, whichever sooner
  - Create SwapRequest with status PENDING
  - If target specified, notify them via socket
  - Return request details

**Accept Swap Request (Target)**

- POST /swap-requests/:id/accept
  - Verify target user matches request
  - Check target still eligible for shift
  - Update status to PENDING (waiting manager)
  - Notify requester and managers

**Reject Swap Request**

- POST /swap-requests/:id/reject
  - Update status to REJECTED
  - Notify requester

**Cancel Swap Request (Requester)**

- DELETE /swap-requests/:id
  - Only if status = PENDING
  - Update to CANCELLED
  - Notify all parties

**Manager Approval**

- POST /swap-requests/:id/approve
  - Verify manager has access to location
  - If swap: reassign both shifts
  - If drop: remove original, assign new
  - Update status to APPROVED
  - Create audit logs
  - Notify all parties
  - Emit socket events

**Manager Rejection**

- POST /swap-requests/:id/reject
  - Body: { reason }
  - Update status to REJECTED
  - Notify all parties with reason

**Get Available Shifts (For Drops)**

- GET /shifts/available
  - Query: locationId, date range
  - Find shifts with pending drop requests
  - Return with shift details

**Expire Old Requests (Simple Service)**

- Create endpoint GET /cron/expire-swaps
- Find all requests where expiresAt < now and status = PENDING
- Update to EXPIRED
- Notify involved users
- (Can be called manually or via simple cron job)

### Auto-Cancel on Shift Edit

- In shift update service:
  - Find all pending swap requests for this shift
  - For each, update status to CANCELLED
  - Store reason: "Shift was modified by manager"
  - Notify all parties
  - Audit log the cancellation

### Pending Request Limit Check

- `countPendingRequests(userId)`
  - Count requests where:
    - (requestingUserId = userId OR targetUserId = userId)
    - AND status = PENDING
  - Return count

## Frontend Tasks

### Staff Swap Interface

**My Shifts View**

- List of assigned shifts
- Each shift has:
  - "Request Swap" button (opens modal)
  - "Drop Shift" button (immediate drop request)
- Different styling for shifts with pending requests

**Swap Request Modal**

- If swap: select target staff from list
  - Show only qualified staff
  - Show availability status
- If drop: confirm action
- Submit button
- Success/error toast

**Available Shifts View (Pickups)**

- List of shifts with drop requests
- Filter by location/skill
- Each shows:
  - Time and location
  - Required skill
  - "Pick Up" button
- Clicking pick up creates drop acceptance

**My Requests Status**

- List of all requests involving user
- Status badges: Pending, Approved, Rejected
- For pending: Cancel button
- For approved: confirmation message

### Manager Approval Queue

**Pending Approvals List**

- Table with columns:
  - Shift details
  - Requester
  - Target (if swap)
  - Type (swap/drop)
  - Time until expiry
- Click row to see details

**Approval Detail Modal**

- Show full shift information
- Show both staff details
- Warning if approval would cause conflict
- Approve button
- Reject button with reason input

**Batch Operations**

- Select multiple requests
- Approve all selected
- Reject all selected

### Real-time Notifications (Simple)

- Toast when new request created
- Toast when request status changes
- Toast when approval needed
- Notification bell with count

---

# PHASE 5: REAL-TIME & AUDIT (Hours 22-26)

## Backend Tasks

### WebSocket Setup

**Socket.io Configuration**

- Initialize Socket.IO server with CORS
- Add authentication middleware:
  - Extract token from handshake
  - Verify and attach user to socket
- Handle connection/disconnection

**Room Management**

- On connection, join user to:
  - Private room: `user:${userId}`
  - Location rooms based on assignments/management
- On location change, update rooms

**Event Definitions**

- `shift:created` - Emit to location room
- `shift:updated` - Emit to location room + affected users
- `shift:published` - Emit to location room
- `assignment:changed` - Emit to location room + affected user
- `swap:created` - Emit to target user + managers
- `swap:updated` - Emit to all involved
- `conflict:detected` - Emit to specific user during operation

### Concurrent Assignment Locking

**Redis Lock Implementation**

- Lock key pattern: `user:${userId}:lock`
- Acquire with SET NX EX 5 (5 second expiry)
- If acquire fails, return 409 with message:
  - "This staff member is being assigned by another manager. Please try again."
- Release after operation complete
- Use in all assignment/modification endpoints

**Lock Helper Functions**

- `acquireUserLock(userId)`
- `releaseUserLock(userId)`
- `executeWithLock(userId, callback)`

### Audit Logging

**Audit Middleware**

- Create middleware that:
  - Captures request before mutation
  - Executes operation
  - Captures after state
  - Creates audit log entry
- Attach to all mutation endpoints

**Audit Service Functions**

- `logAction(userId, action, entityType, entityId, beforeState, afterState)`
- `getEntityHistory(entityType, entityId)`
- `exportAuditLogs(startDate, endDate, locationId)`

**What to Log**

- All CRUD operations on:
  - Users (role changes, certifications)
  - Shifts (create, update, delete, publish)
  - Assignments (assign, remove, override)
  - Swaps (all status changes)
  - Locations (manager assignments)
- Include: timestamp, user, ip (if available), before/after JSON

### On-Duty Now Endpoint

**GET /locations/:locationId/active-shifts**

- Query: current time
- Find shifts where:
  - startTime <= now <= endTime
  - status = PUBLISHED
- For each, get assignments
- Return array with:
  - Shift details
  - Assigned staff names
- Emit socket update on shift start/end

## Frontend Tasks

### Socket Integration

**Socket Client Setup**

- Create socket instance with auth token
- Reconnection logic with backoff
- Connection status indicator

**Event Handlers**

- Register listeners for all events
- Update React Query cache on events
- Show toast notifications
- Play sound for critical events (optional)

**Real-time UI Updates**

- Calendar updates without refresh
- Assignment list updates immediately
- Swap request status updates live
- Conflict notifications as toasts

### On-Duty Now Dashboard

**Location View**

- Cards for each location
- Current active staff list
- "Working now" count
- Updates every minute via socket

**Manager View**

- See all locations
- Click location to see details
- Quick actions for coverage

### Audit Log Viewer

**Admin Interface**

- Table of audit logs
- Filter by:
  - Date range
  - Entity type
  - User
  - Action
- Click row to see before/after diff
- Export to CSV button

**Manager Interface**

- View logs for their locations only
- Limited to relevant entity types
- No export (admin only)

### Conflict Toast Component

- Red toast for blocks
- Yellow toast for warnings
- Click to navigate to relevant item
- Action button when applicable

---

# PHASE 6: FAIRNESS & REPORTS (Hours 26-28) - COMPUTED, NOT STORED

## Backend Tasks

### Fairness Service (On-Demand Calculation)

**GET /reports/fairness**

- Query params: locationId, startDate, endDate
- Get all shifts in period with assignments
- Group by user
- For each user calculate:
  - Total hours
  - Premium shifts count (Fri 6pm-Sat 11pm)
  - Percentage of total hours
  - Percentage of premium shifts
  - Fairness score = (userPremium% / userHours%) or 1 if even
- Return array sorted by fairness score

**GET /reports/hours-distribution**

- Query params: locationId, weekStartDate
- Get all shifts in week
- Group by user
- Include:
  - Daily breakdown
  - Weekly total
  - Overtime status
  - Consecutive days count

### Overtime Projection

**GET /shifts/:shiftId/projection**

- Query: proposedUserId (optional)
- Calculate current week hours for user
- Add proposed shift duration
- Return:
  - Current total
  - Projected total
  - Warnings if limits approached
  - Blocks if limits exceeded

### Premium Shift Definition

- Configuration in environment or constants
- Default: Friday 6pm to Saturday 11pm
- Can be overridden per location

### What-If Calculator (Simple)

**POST /reports/what-if**

- Body: { shifts: array of shift objects }
- Simulate assignments
- Calculate resulting hours/warnings
- Return projected metrics
- NO database writes

## Frontend Tasks

### Fairness Dashboard

**Manager View**

- Date range selector
- Table with columns:
  - Staff Name
  - Total Hours
  - Premium Shifts
  - % of Premium
  - Fairness Score (0-100)
  - Status (under/over/balanced)
- Color coding by fairness score
- Click row for details

**Charts (Simple Bar Charts)**

- Hours per staff (bar chart)
- Premium distribution (stacked bar)

### Overtime Report

**Weekly Summary**

- Card for each staff member
- Progress bar to 40 hours
- Warning icons
- Projected overtime cost (simple calculation)
- Highlight problematic assignments

**Detail View**

- Daily breakdown
- Which shifts push over limits
- Suggestions for redistribution

### What-If Tool

**Simple Interface**

- Select staff
- Select potential shift
- Click "Calculate"
- Show:
  - New weekly total
  - Warning messages
  - Block messages
- No save functionality

### Export Functionality

- CSV export button on all reports
- Simple data formatting
- Download in browser

### Notification Center UI

**Backend Changes**

- POST /notifications: Create and emit notification to user
  - Body: { userId, type, message, relatedEntityId, relatedEntityType }
  - Emit via socket.io to `user:${userId}`
  - Store in database for persistence
  - Call notification service
- GET /notifications: List all notifications for current user
  - Query: limit, offset, unreadOnly (boolean)
  - Return paginated list with read status
  - Sort by newest first
- PATCH /notifications/:id/read: Mark single notification as read
- PATCH /notifications/mark-all-read: Mark all as read
- DELETE /notifications/:id: Delete notification
- GET /notifications/count: Return unread count

**Notification Types**

- `shift:assigned` - Staff assigned to shift
- `shift:updated` - Shift time/details changed
- `shift:cancelled` - Shift cancelled
- `shift:published` - Schedule published
- `swap:created` - Swap request received
- `swap:approved` - Swap approved by manager
- `swap:rejected` - Swap rejected with reason
- `overtime:warning` - Approaching overtime limit
- `availability:updated` - Others' availability changed (if relevant)

### Notification Center Frontend

**Layout Component**

- Global notification bell icon (top-right navbar)
- Show unread count badge
- Click to open side panel (not fullscreen)
- Real-time updates via socket.io

**Notification List Panel**

- Scrollable list of notifications
- Each notification shows:
  - Type icon (shift, swap, warning, etc.)
  - Title
  - Timestamp (relative: "5m ago")
  - Read/unread indicator (blue dot if unread)
- "Mark all as read" button
- "Clear all" button
- Filter by type (optional): All, Shifts, Swaps, Warnings
- Click notification to navigate to relevant page

**Unread Indicator**

- Badge on notification bell showing count
- Badge disappears when all marked read
- Count updates in real-time via socket

### Notification Preferences (Optional)

**Backend**

- GET /users/:id/notification-preferences
  - Return user notification settings
- PUT /users/:id/notification-preferences
  - Body: { 
    - shift_assigned: { inApp: boolean, email: boolean },
    - shift_updated: { ... },
    - swap_created: { ... },
    - overtime_warning: { ... },
    - etc.
  - }
  - Update user preferences

**Frontend**

- Gear icon in notification panel → Preferences page
- Simple toggle switches:
  - In-app notification on/off per type
  - Email notification on/off per type (simulated, just logs)
- Default: all on
- Save persists to backend
- Test with verification toast

---

# PHASE 7: SEED DATA & DEPLOYMENT (Hours 28-30)

## Seed Data Creation

### Create Seed Script

- File: `prisma/seed.js`
- Run with `node prisma/seed.js`

### Users to Create

- 1 Admin user
- 4 Managers (1 per location)
- 20 Staff members with varied:
  - Names (diverse)
  - Skills (mix of bartender, line_cook, server, host)
  - Certifications (some multi-location, some single)
  - Phone numbers (dummy data)

### Locations

- Downtown - America/Los_Angeles
- Pier 39 - America/Los_Angeles
- Financial District - America/New_York
- Brooklyn Heights - America/New_York

### Skills

- bartender
- line_cook
- server
- host
- dishwasher
- manager (internal use)

### Availability Patterns

- Full-time staff: 9am-5pm weekdays
- Part-time: evenings only
- Weekend-only staff
- Mixed patterns
- Some exceptions:
  - Vacation next week
  - Doctor appointment Tuesday 2-4pm

### Shifts to Create

- Current week (partial schedule)
- Next week (full schedule)
- Include:
  - Overtime scenario: Staff with 35 hours already
  - Conflict: Overlapping shifts for same staff
  - Under-staffed shift: headcount=2, assigned=1
  - Premium shifts on Friday/Saturday

### Swap Requests

- Pending swap request (awaiting target)
- Pending approval (target accepted)
- Drop request expiring in 6 hours
- Expired request (for history)

### Audit Logs

- Recent changes for demo
- Assignment history
- Publish events

## Deployment Tasks

### Backend Deployment (Render)

**Prepare for Deployment**

- Create `render.yaml` or use dashboard
- Set environment variables:
  - DATABASE_URL
  - REDIS_URL
  - JWT_SECRET
  - CORS_ORIGIN (frontend URL)
- Ensure start script in package.json

**Database Migration**

- Run `prisma migrate deploy` on deploy
- Or run manually after deploy

**Deploy Steps**

- Push to GitHub
- Connect repository to Render
- Select Node.js environment
- Configure build command: `npm install && npx prisma generate`
- Configure start command: `npm start`
- Deploy

### Frontend Deployment (Vercel)

**Prepare for Deployment**

- Update `next.config.js` with env vars
- Set API URL in environment
- Ensure build script works

**Deploy Steps**

- Push to GitHub
- Import project to Vercel
- Set environment variables
- Deploy
- Configure custom domain (optional)

### Post-Deployment Verification

**Test All Roles**

- Login as Admin
  - Can see all locations
  - Can manage users
- Login as Manager (each location)
  - Can only see assigned location
  - Can create shifts
  - Can approve swaps
- Login as Staff
  - Can see shifts
  - Can set availability
  - Can request swaps

**Run Through Evaluation Scenarios**

- Sunday Night Chaos
  - Find call-out shift
  - Drop shift
  - Find available coverage
  - Assign
- Overtime Trap
  - Try to assign staff at 35h
  - See warning
  - Try at 52h
  - See block
- Timezone Tangle
  - Check time displays in location TZ
  - Verify availability works across zones
- Simultaneous Assignment
  - Open two browsers as different managers
  - Try to assign same staff
  - Second sees conflict
- Fairness Complaint
  - Run fairness report
  - Verify premium shift distribution
- Regret Swap
  - Create swap request
  - Cancel before approval
  - Verify original assignment remains

### Documentation

**Create README.md**

- Project overview
- Tech stack
- Setup instructions (local)
- Environment variables
- Deployment guide

**Create USER_GUIDE.md**

- Login credentials for each role
- Screenshots of key pages
- How to perform common tasks
- How to demonstrate evaluation scenarios

**Create ASSUMPTIONS.md**

- List all ambiguous requirements
- Document decisions made
- Explain trade-offs
- Note limitations

### Final Deliverables Package

**Send to Hiring Manager**

- Deployed URL (frontend)
- API URL (backend)
- GitHub repository link
- Test credentials
- Documentation links
- Any known issues
- Time spent notes

---

# SUCCESS CRITERIA CHECKLIST

## Core Functionality (Must Work)

- [ ] Users can register/login with role
- [ ] Managers can create shifts
- [ ] Managers can assign staff
- [ ] All constraints are enforced
- [ ] Clear error messages shown
- [ ] Staff can set availability
- [ ] Staff can request swaps
- [ ] Managers can approve swaps
- [ ] Overtime warnings appear
- [ ] Real-time updates work
- [ ] Audit logs are created

## Evaluation Scenarios (All Pass)

- [ ] Sunday Night Chaos: Coverage workflow works
- [ ] Overtime Trap: 35h warning, 52h block
- [ ] Timezone Tangle: Times display correctly
- [ ] Simultaneous Assignment: Lock prevents double-booking
- [ ] Fairness Complaint: Report shows distribution
- [ ] Regret Swap: Cancellation works

## Deployment & Documentation

- [ ] App deployed to public URL
- [ ] Seed data populated
- [ ] README complete
- [ ] User guide with credentials
- [ ] Assumptions documented
- [ ] Sent before deadline

---

# 🎯 FINAL NOTES

## What We Achieved

- Complete constraint enforcement engine
- Real-time updates with Socket.io
- Concurrent operation safety with Redis locks
- Clear error messaging with suggestions
- Fairness analytics (computed, not stored)
- Audit trail for all changes
- Timezone-correct display
- All evaluation scenarios covered

## What We Deliberately Omitted

- No separate Schedule model
- No persistent fairness metrics
- No notification preferences
- No complex drag-drop UI
- No CI/CD pipeline
- No monitoring stack
- No video walkthrough

## Time Buffer

- 30 hours of core work
- 18 hours buffer for:
  - Bugs (8 hours)
  - Unexpected issues (5 hours)
  - Polish (3 hours)
  - Rest (2 hours)

## Keys to Success

1. Focus on validation engine first
2. Keep error messages human-readable
3. Test concurrent scenarios early
4. Use seed data to demonstrate edge cases
5. Document assumptions clearly

---

**This roadmap will deliver a working, evaluator-ready MVP in under 48 hours.**
