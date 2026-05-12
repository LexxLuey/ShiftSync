# Phase 4 Calendar Pilot Checklist

## Pilot Scope
- Start with 1-2 centers.
- Use real weekly activities: prayer meeting, bible study, Sunday services.
- Pilot duration: minimum 2 full weekly cycles.

## Pre-Pilot Readiness
- `event-templates` configured for pilot centers.
- Schedule generated, reviewed, assigned, and published for pilot window.
- Reminder worker deployed and SMTP tested.
- Staff users can log in and access `/schedule`.

## Functional Validation
- Weekly and monthly calendar views render same published shifts.
- Center filter, title filter, assigned staff filter, and my schedule filter work together.
- Manager can run: template -> generate -> assign -> publish.
- Staff sees only own schedule when my schedule is enabled/enforced.
- 24h and 2h reminders are received (in-app + email).

## Operational Validation
- At least one schedule correction run through normal correction steps.
- At least one urgent correction rehearsed with swap/override flow.
- Failed reminder scenario rehearsed (mock SMTP failure + recovery).

## Exit Criteria (Go/No-Go)
- No high-severity access-control issue.
- No duplicate reminder sends for same user/shift/window.
- No unresolved reminder worker failures older than 24 hours.
- Center leads confirm usability and visibility are acceptable.

## Rollout to Ministry-Wide
1. Enable all centers in location scope.
2. Repeat template and schedule generation per center.
3. Confirm reminder throughput after expansion.
4. Announce go-live and support window for first two weeks.

