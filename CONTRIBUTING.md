# Contributing to ShiftSync

Thanks for contributing.

## Quick Start

1. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure env files:
- `backend/.env`
- `frontend/.env.local`

3. Prepare backend data:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name your_change_name
npm run seed
```

## Important Domain Rules

- Recurring availability is center-scoped (`locationId` required).
- Assignment availability checks are location-specific (no global fallback).
- If you are working on existing data, run availability repair script first.

## Repair Script for Legacy Availability

```bash
cd backend

# Dry run
npm run fix:availability:locations

# Apply changes
npm run fix:availability:locations -- --apply
```

The script:
- Finds recurring availability rows with `locationId = null`
- Clones each row to all active certified centers for that user
- Skips duplicates
- Removes legacy global rows after successful clone

## Validation Before PR

Run these before submitting:

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

Also include documentation updates when behavior or API contracts change.
