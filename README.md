# ShiftSync

ShiftSync is a full-stack workforce scheduling app.

- Repo: https://github.com/LexxLuey/ShiftSync
- Frontend: Next.js + TypeScript
- Backend: Express + TypeScript + Prisma + PostgreSQL

## Project Structure

- `frontend/` - Next.js app
- `backend/` - API server, Prisma schema/migrations/seed
- `roadmap.md` - delivery roadmap

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init_phase
npm run seed
npm run dev
```

Backend runs on `http://localhost:4000` by default.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Seeded Test Accounts

If you run `npm run seed` in `backend`:

- Admin: `admin@shiftsync.com` / `AdminPass123`
- Manager: `manager1@shiftsync.com` / `ManagerPass123`
- Staff: `staff1@shiftsync.com` / `StaffPass123`

## Deployment Notes

### Backend (Render)

Build command:

```bash
npm i && npm run prisma:generate && npx prisma migrate deploy && npm run build
```

Start command:

```bash
npm run start
```

Required env vars (minimum):

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

Optional:

- `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`)

### Frontend

Set `NEXT_PUBLIC_API_BASE_URL` to your backend base URL.

## Docs

- Backend Swagger: `/docs` and `/docs.json`
