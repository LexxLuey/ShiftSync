# ShiftSync Frontend

Next.js frontend for ShiftSync.

- Repo: https://github.com/LexxLuey/ShiftSync

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- TanStack React Query
- Axios
- Zustand

## Setup

```bash
npm install
```

Create/update local env (`.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Run

Dev:

```bash
npm run dev
```

Type check:

```bash
npx tsc --noEmit
```

Build:

```bash
npm run build
```

Start production build:

```bash
npm run start
```

## Auth and Test Accounts

Frontend uses backend JWT auth endpoints.

If backend seed was run:

- Admin: `admin@shiftsync.com` / `AdminPass123`
- Manager: `manager1@shiftsync.com` / `ManagerPass123`
- Staff: `staff1@shiftsync.com` / `StaffPass123`

## Notes

- Ensure backend is running and reachable from frontend.
- Main API calls go to backend `/api/v1` through `NEXT_PUBLIC_API_BASE_URL`.
