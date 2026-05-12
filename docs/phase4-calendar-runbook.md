# Phase 4 Calendar Launch Runbook

## Purpose
Operational guide for calendar schedule corrections and reminder troubleshooting during pilot and launch.

## Schedule Corrections

### Normal correction (more than 48 hours before shift start)
1. Open `Schedule Builder` and locate the affected shift.
2. Update assignment using eligible staff suggestions.
3. Publish updated shift if it is still draft.
4. Verify corrected shift appears in `/schedule` calendar.
5. Confirm affected users received updated in-app notifications/reminders.

### Urgent correction (within 48 hours of shift start)
1. Confirm the urgency and notify center lead (CCO/ACO) immediately.
2. Use swap flow (`/swaps`) for reassignment where possible.
3. If swap is not possible, use manager override assignment flow.
4. Confirm replacement user can attend and has required skill/certification.
5. Post correction update in your ministry communication channel.

## Reminder Troubleshooting

### Worker health checks
1. Confirm reminder worker process is running (`npm run worker:reminders` in backend deploy role).
2. Check worker logs for loop activity and errors (`Reminder worker started`, `Reminder job sent`, `FAILED`).
3. Verify SMTP env vars are configured: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

### Failed reminder handling
1. Inspect `ReminderJob` rows with `FAILED` status and `lastError`.
2. Fix root cause (SMTP credentials, missing user email, connectivity).
3. Requeue by setting failed jobs to `PENDING` with future `dueAt` and reset `retryCount` when appropriate.
4. Monitor logs to confirm resend succeeds once.

### User-level checks
1. Confirm shift is `PUBLISHED` (draft shifts do not get reminders).
2. Confirm user is still assigned to the shift.
3. Confirm reminder windows are not already in the past (`24h` / `2h` windows are not backfilled).

