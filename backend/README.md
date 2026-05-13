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

Repair legacy availability rows (if upgrading existing data):

```bash
# Dry run (no writes)
npm run fix:availability:locations

# Apply changes
npm run fix:availability:locations -- --apply
```

Notes:
- Recurring availability is now center-scoped (`locationId` required).
- The repair script clones legacy global availability (`locationId=null`) to each active certified center and removes the legacy global row.

## Seeded Test Accounts

When seed completes:

- Super Admin: `director@cfc-kids.org` / `ChurchPass123!`
- Center Manager (CCO): `mainland.cco@cfc-kids.org` / `ChurchPass123!`
- Center Staff (Teacher): `teacher.mainland.1@cfc-kids.org` / `ChurchPass123!`

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
