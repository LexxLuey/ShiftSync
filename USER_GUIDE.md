# ShiftSync User Guide

Complete guide for using the ShiftSync shift management system.

---

## 🔐 Login Credentials

Use these credentials to test different user roles:

### Administrator

- **Email:** `admin@shiftsync.com`
- **Password:** `AdminPass123`
- **Access:** All features, all locations

### Managers (One per location)

- **Email:** `manager1@shiftsync.com` - `manager4@shiftsync.com`
- **Password:** `ManagerPass123`
- **Access:** Specific location management, staff assignment, swap approval

### Staff Members

- **Email:** `staff1@shiftsync.com` - `staff20@shiftsync.com`
- **Password:** `StaffPass123`
- **Access:** View assigned shifts, set availability, request swaps

---

## 📍 Demo Locations

The seed data includes 4 locations:

1. **Downtown** - Los Angeles, CA (America/Los_Angeles timezone)
   - Manager: <manager1@shiftsync.com>

2. **Pier 39** - San Francisco, CA (America/Los_Angeles timezone)
   - Manager: <manager2@shiftsync.com>

3. **Financial District** - New York, NY (America/New_York timezone)
   - Manager: <manager3@shiftsync.com>

4. **Brooklyn Heights** - Brooklyn, NY (America/New_York timezone)
   - Manager: <manager4@shiftsync.com>

---

## 🎯 Common Tasks

### For Staff Members

#### 1. Set Your Availability

1. Login as a staff member (e.g., `staff1@shiftsync.com`)
2. Navigate to **My Availability** in the sidebar
3. Click on time slots in the weekly grid to mark when you're available
4. Click **"Save Recurring Pattern"** to apply to all weeks
5. Use **"Add Exception"** to mark specific dates when you're unavailable (vacation, appointments)

#### 2. View Your Assigned Shifts

1. Navigate to **My Shifts** from the sidebar
2. See all your scheduled shifts in a calendar view
3. Click on any shift to view details
4. See total hours worked for the week

#### 3. Request a Shift Swap

1. Go to **My Shifts**
2. Click on the shift you want to swap
3. Click **"Request Swap"**
4. Choose swap type:
   - **Swap:** Select a specific coworker to trade with
   - **Drop:** Make shift available to anyone who can pick it up
5. Submit request
6. Wait for manager approval

#### 4. Accept a Drop Request

1. Navigate to **Available Shifts**
2. Browse shifts with pending drop requests
3. Click **"Pick Up"** on a shift you want
4. Wait for manager approval

### For Managers

#### 1. Create a New Shift

1. Login as manager (e.g., `manager1@shiftsync.com`)
2. Navigate to **Schedule** → **Create Shift**
3. Fill in shift details:
   - **Date & Time:** Start and end times
   - **Location:** Your assigned location
   - **Required Skill:** Bartender, server, line cook, etc.
   - **Headcount:** Number of staff needed (default: 1)
4. Click **"Save as Draft"**
5. Shift is created but NOT visible to staff yet

#### 2. Assign Staff to Shifts

1. Navigate to **Schedule** and click on a shift
2. Click **"Find Available Staff"**
3. System shows eligible staff with:
   - ✅ **Green:** Available and qualified
   - ⚠️ **Yellow:** Available but approaching overtime limits
   - ❌ **Red:** Not available or would violate constraints
4. Click **"Assign"** next to a staff member
5. If warnings appear (e.g., "38 hours this week"), review and confirm
6. If blocked (e.g., "Already assigned to overlapping shift"), select another staff member

#### 3. Publish Shifts

1. Shifts must be published at least **48 hours before** the shift start time
2. Navigate to **Schedule**
3. Select shifts to publish (or use bulk select)
4. Click **"Publish Selected"**
5. System validates all assignments
6. Staff receive real-time notifications and can now see the shifts

#### 4. Approve/Reject Swap Requests

1. Navigate to **Swap Requests** → **Pending Approvals**
2. Review each request:
   - See original staff member
   - See target staff (if swap) or "Open" (if drop)
   - View shift details
   - Check for warnings (overtime, conflicts)
3. Click **"Approve"** to execute the swap
4. Click **"Reject"** and provide a reason
5. Both parties receive notifications

#### 5. View Staff Hours & Overtime

1. Navigate to **Reports** → **Hours Distribution**
2. Select location and week
3. View table showing:
   - Each staff member's daily hours
   - Weekly totals
   - Overtime warnings (>40 hours)
   - Color coding: Green (<35h), Yellow (35-40h), Red (>40h)

#### 6. Check Shift Fairness

1. Navigate to **Reports** → **Fairness Dashboard**
2. Select date range and location
3. View metrics:
   - **Total Hours:** Hours worked per staff member
   - **Premium Shifts:** Friday/Saturday evening shifts
   - **Fairness Score:** Percentage distribution of premium shifts
   - **Status:** Under-utilized, Balanced, Over-utilized
4. Use this to ensure equitable shift distribution

### For Administrators

#### 1. Create a New Location

1. Login as admin (`admin@shiftsync.com`)
2. Navigate to **Admin** → **Locations**
3. Click **"Add Location"**
4. Enter:
   - **Name:** Restaurant name
   - **Address:** Full address
   - **Timezone:** IANA timezone (e.g., America/New_York)
5. Click **"Create"**

#### 2. Manage Users

1. Navigate to **Admin** → **Users**
2. View all users with filters:
   - Filter by role (Admin, Manager, Staff)
   - Filter by location
   - Search by name/email
3. Click on a user to:
   - Edit profile information
   - Change role
   - Add/remove certifications
   - Assign/revoke skills

#### 3. Assign Managers to Locations

1. Navigate to **Admin** → **Locations**
2. Click on a location
3. Go to **"Managers"** section
4. Click **"Add Manager"**
5. Select manager from dropdown
6. Click **"Assign"**

#### 4. Manage Skills & Certifications

1. Navigate to **Admin** → **Skills**
2. Create new skills (e.g., "Sommelier", "Pastry Chef")
3. Go to **Users** → Select a staff member
4. In **Certifications** section:
   - Click **"Add Certification"** to certify for a location
   - Click **"Revoke"** to remove certification (soft delete)
5. In **Skills** section:
   - Select skills from dropdown
   - Click **"Add Skill"**

#### 5. View Audit Logs

1. Navigate to **Admin** → **Audit Logs**
2. Filter by:
   - Date range
   - Entity type (Users, Shifts, Assignments, Swaps)
   - User who performed action
3. Click on a log entry to see:
   - **Before State:** Data before change
   - **After State:** Data after change
   - **Timestamp:** When action occurred
   - **User:** Who performed the action

---

## 🧪 Demonstrating Evaluation Scenarios

The seed data includes specific scenarios to test constraint enforcement:

### 1. **Sunday Night Chaos** - Finding Emergency Coverage

**Scenario:** A staff member calls in sick and you need immediate coverage.

**Steps:**

1. Login as `manager1@shiftsync.com`
2. Navigate to a shift on the current week
3. Click **"Find Available Staff"**
4. System shows:
   - Available staff in green
   - Staff with conflicts in red (with reason: "Already assigned to...")
   - Staff approaching overtime in yellow
5. Select an available staff member
6. If near overtime (35-40h), system shows warning but allows assignment
7. If over 40 hours, system may block or require override
8. Click **"Assign"** → Assignment successful
9. Real-time notification sent to staff member

**Result:** System prevents double-booking and shows clear availability status.

---

### 2. **Overtime Trap** - Approaching/Exceeding Limits

**Scenario:** Prevent staff from being assigned shifts that would cause excessive overtime.

**Pre-seeded Data:** `staff3@shiftsync.com` has been assigned 35 hours already this week.

**Steps:**

1. Login as `manager1@shiftsync.com`
2. Find a shift later in the week (Friday or Saturday)
3. Try to assign `staff3@shiftsync.com` to an 8-hour shift
4. System calculates: 35 current + 8 proposed = 43 hours total
5. System displays:
   - ⚠️ **Warning:** "This will push staff3 to 43 hours this week (3 hours overtime)"
   - Suggested alternatives shown
6. You can:
   - Proceed with assignment (overtime accepted)
   - Select a different staff member
   - Split the shift

**Test the Hard Block:**

1. Try assigning same staff to multiple shifts totaling >52 hours
2. System blocks: ❌ **"Cannot exceed 52 hours in a single week"**
3. Assignment is prevented (no override option)

**Result:** Managers are warned before creating overtime situations.

---

### 3. **Timezone Tangle** - Cross-Timezone Accuracy

**Scenario:** Ensure shifts display correctly in different timezones.

**Steps:**

1. Login as `manager3@shiftsync.com` (Financial District - NY timezone)
2. Create a shift:
   - Start: 5:00 PM EST
   - End: 11:00 PM EST
3. Logout and login as `manager1@shiftsync.com` (Downtown - LA timezone)
4. Navigate to **All Locations** view
5. View the Financial District shift
6. System displays:
   - Original time: 5:00 PM - 11:00 PM (EST)
   - Converted time: 2:00 PM - 8:00 PM (PST) - 3 hour difference
7. Times shown in location's timezone by default
8. Hover to see UTC time

**Verify Availability Works:**

1. As LA manager, try to assign LA staff (`staff1`) to NY shift
2. Check staff availability set for 9am-5pm PST
3. System converts: 9am PST = 12pm EST
4. NY shift (5pm EST) is outside availability
5. System shows: ❌ **"staff1 is not available at this time"**

**Result:** All times stored in UTC, displayed in location timezone, availability evaluated correctly.

---

### 4. **Simultaneous Assignment** - Preventing Race Conditions

**Scenario:** Two managers try to assign the same staff member at the same time.

**Steps:**

1. Open two browser windows (or use incognito + regular)
2. **Window 1:** Login as `manager1@shiftsync.com`
3. **Window 2:** Login as `manager2@shiftsync.com`
4. Both select different shifts at the same time
5. Both click **"Find Available Staff"** for `staff5@shiftsync.com`
6. **Window 1:** Click **"Assign"** for staff5
7. **Immediately**, **Window 2:** Click **"Assign"** for staff5 (overlapping shift time)
8. First request acquires Redis lock and completes
9. Second request:
   - Detects lock
   - Returns: ⚠️ **"This staff member is being assigned by another manager. Please try again."**
   - OR validates after lock and shows: ❌ **"staff5 is already assigned to an overlapping shift"**

**Result:** No double-booking occurs, even under concurrent operations.

---

### 5. **Fairness Complaint** - Premium Shift Distribution

**Scenario:** Staff member complains some people always get the good (high-tip) shifts.

**Pre-seeded Data:** Premium shifts (Friday/Saturday evenings) are distributed unevenly among staff.

**Steps:**

1. Login as `manager1@shiftsync.com` (or admin)
2. Navigate to **Reports** → **Fairness Dashboard**
3. Select:
   - **Location:** Downtown
   - **Date Range:** Last 2 weeks
4. View results table:
   - **staff7:** 40 hours total, 6 premium shifts (60% of premium)
   - **staff12:** 38 hours total, 1 premium shift (10% of premium)
   - **staff15:** 35 hours total, 0 premium shifts (0%)
5. System calculates **Fairness Score**:
   - staff7: Over-utilized (red)
   - staff12: Balanced (green)
   - staff15: Under-utilized (yellow)
6. Review bar chart showing premium shift distribution

**Action:**

1. Use this data to balance future assignments
2. When creating Friday/Saturday shifts, prioritize staff15 and staff12
3. Re-run report after 2-3 weeks to verify improvement

**Result:** Transparent metrics prevent favoritism and ensure equitable treatment.

---

### 6. **Regret Swap** - Canceling a Swap Request

**Scenario:** Staff member requests a swap but changes their mind before approval.

**Pre-seeded Data:** There is a pending swap request from `staff8@shiftsync.com`

**Steps:**

1. Login as `staff8@shiftsync.com`
2. Navigate to **My Swaps** → **My Requests**
3. See pending swap request (status: PENDING)
4. Click **"Cancel Request"**
5. Confirmation modal: "Are you sure you want to cancel this swap request?"
6. Click **"Confirm"**
7. Request status changes to: CANCELLED
8. Original shift assignment remains intact
9. Target staff member (if swap) receives notification: "Swap request cancelled"
10. Manager sees request disappear from approval queue

**Verify Expiry:**

1. Create a new drop request for a shift starting in 20 hours
2. System calculates expiry: shift start - 24 hours = expired
3. Request immediately shows: EXPIRED
4. Cannot be accepted by other staff
5. Original assignment unchanged

**Result:** Staff maintain control over requests until approved, with automatic expiry protection.

---

## 🔔 Real-Time Notifications

The system uses Socket.io for real-time updates:

### Notification Types

| Event | Who Receives | Description |
|-------|-------------|-------------|
| **Shift Assigned** | Staff member | "You've been assigned to [Shift Details]" |
| **Shift Updated** | Assigned staff + managers | "Shift on [Date] has been updated" |
| **Shift Cancelled** | Assigned staff | "Your shift on [Date] has been cancelled" |
| **Schedule Published** | All staff at location | "New shifts published for week of [Date]" |
| **Swap Created** | Target staff + managers | "[Name] wants to swap [Shift]" |
| **Swap Approved** | Requester + target | "Swap request approved by [Manager]" |
| **Swap Rejected** | Requester + target | "Swap request rejected: [Reason]" |
| **Overtime Warning** | Staff + manager | "[Name] approaching 40 hour limit" |

### Notification Bell

- Top-right corner of navigation
- Red badge shows unread count
- Click to open notification panel
- Notifications auto-update via WebSocket
- Click notification to navigate to relevant page

---

## 🎨 UI Components Guide

### Calendar View

- **Week View:** Default view showing 7 days
- **Day Cells:** Click to create new shift
- **Shift Cards:** Color-coded by status
  - Gray: Draft
  - Blue: Published
  - Yellow: Partially staffed
  - Red: Unstaffed
- **Hover:** Shows shift details and assigned staff

### Assignment Interface

- **Green Checkmark:** Staff is available and qualified
- **Yellow Warning:** Available but approaching limits
- **Red X:** Not available or blocked
- **Info Icon:** Hover for detailed reason

### Status Badges

- **Draft** (Gray): Not visible to staff
- **Published** (Blue): Live and confirmed
- **Pending** (Yellow): Awaiting action
- **Approved** (Green): Completed successfully
- **Rejected** (Red): Denied with reason
- **Expired** (Gray): Past deadline
- **Cancelled** (Gray Strikethrough): Voluntarily cancelled

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **No Email Notifications:** Only in-app notifications (not required for MVP)
2. **No Drag-and-Drop:** Shifts cannot be moved via dragging (by design for simplicity)
3. **No Mobile App:** Web-only interface (responsive design)
4. **Limited Timezone Support:** Assumes locations don't change timezones
5. **No Shift Templates:** Each shift created individually
6. **No Recurring Shifts:** Must create weekly schedules manually
7. **Basic Fairness Metrics:** Does not account for shift difficulty/desirability beyond time slot

### Edge Cases Handled

✅ **Daylight Saving Time:** All times stored in UTC, converted correctly  
✅ **Overnight Shifts:** Shifts spanning midnight handled correctly  
✅ **Consecutive Days:** 7th consecutive day requires override  
✅ **10-Hour Rest:** Enforced between shifts  
✅ **Headcount Limits:** Cannot exceed required headcount  
✅ **Published Shift Protection:** Cannot edit published shifts within 48 hours  

---

## 💡 Tips & Best Practices

### For Managers

1. **Publish Early:** Publish shifts as soon as possible (48+ hours in advance)
2. **Check Fairness Weekly:** Run fairness reports regularly
3. **Review Overtime:** Monitor weekly hours before assigning weekend shifts
4. **Use Bulk Publish:** Select multiple shifts and publish together
5. **Document Overrides:** Always provide a reason when overriding constraints

### For Staff

1. **Update Availability Weekly:** Keep your availability current
2. **Add Exceptions Early:** Submit vacation requests as early as possible
3. **Monitor Swap Expiry:** Drop requests expire 24h before shift
4. **Check Notifications Daily:** Stay updated on schedule changes
5. **Cancel Unwanted Swaps:** Cancel requests you no longer need

### For Admins

1. **Certify Before Assigning:** Ensure staff are certified for locations before managers can assign them
2. **Review Audit Logs:** Check logs weekly for unusual patterns
3. **Balance Manager Workload:** Don't assign one manager to too many locations
4. **Create Skills Proactively:** Set up all required skills before shift creation

---

## 📞 Support

For issues or questions about this assessment project:

- Review this guide
- Check ASSUMPTIONS.md for design decisions
- Review API documentation at `/api-docs`
- Check audit logs for action history

---

**Last Updated:** March 3, 2026
