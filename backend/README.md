# ShiftSync Backend

Express + TypeScript + Prisma backend for ShiftSync.

## Stack

- Express 5
- Prisma ORM
- PostgreSQL (Supabase compatible)
- JWT auth
- Socket.io
- Zod validation

## Setup

```bash
npm install
cp .env.example .env
```

Set at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

Optional (for distributed locks):

- `REDIS_URL`
- or `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

## Database

Generate Prisma client:

```bash
npm run prisma:generate
```

Run local migration:

```bash
npm run prisma:migrate -- --name init_phase
```

Seed data:

```bash
npm run seed
```

## Seeded Test Accounts

When seed completes:

- Admin: `admin@shiftsync.com` / `AdminPass123`
- Manager: `manager1@shiftsync.com` / `ManagerPass123`
- Staff: `staff1@shiftsync.com` / `StaffPass123`

## Run

Dev:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

## API Base Path

`/api/v1`

## API Documentation

- Swagger UI: `/docs`
- OpenAPI JSON: `/docs.json`

## Render Deployment

Build command:

```bash
npm i && npm run prisma:generate && npx prisma migrate deploy && npm run build
```

Start command:

```bash
npm run start
```

Notes for Supabase:

- Use properly URL-encoded password in DB URL.
- Keep `sslmode=require` in connection string.
