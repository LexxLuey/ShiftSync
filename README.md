# ShiftSync - Children’s Church Scheduling System

**Production URLs:**

- **Frontend (UI):** <https://shiftsyncapi.onrender.com>
- **Backend (API):** <https://shiftsyncbackend.onrender.com>
- **GitHub Repository:** <https://github.com/LexxLuey/ShiftSync.git>

---

## 📋 Project Overview

ShiftSync is a shift management system for multi-center children’s church operations. It handles recurring event scheduling, center-scoped availability management, assignments, reminders, and fairness-aware staff distribution while enforcing business constraints.

### Key Features

- **Multi-Role Authentication:** Admin, Manager, and Staff roles with distinct permissions
- **Location-Based Scheduling:** Support for multiple locations with timezone-aware shift management
- **Constraint Enforcement:** Automatic validation of overtime limits, skill requirements, certifications, and availability
- **Shift Swap System:** Staff-initiated swap requests with manager approval workflows
- **Real-Time Updates:** Socket.io integration for live schedule changes and notifications
- **Fairness Analytics:** Computed reports showing shift distribution and premium shift allocation
- **Audit Trail:** Complete history of all scheduling actions and changes
- **Concurrent Safety:** Redis-based locking prevents double-booking and race conditions

---

## 🛠️ Tech Stack

### Backend

- **Runtime:** Node.js with Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Caching/Locking:** Redis (ioredis)
- **Real-Time:** Socket.io
- **Authentication:** JWT + bcryptjs
- **Validation:** Zod
- **Timezone:** date-fns-tz
- **API Documentation:** Swagger/OpenAPI

### Frontend

- **Framework:** Next.js 15.1.4 (App Router)
- **Language:** TypeScript
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **State Management:**
  - Server State: TanStack React Query
  - Client State: Zustand
- **Forms:** React Hook Form + Zod
- **Real-Time:** Socket.io-client
- **HTTP Client:** Axios
- **Calendar:** FullCalendar
- **Notifications:** Sonner (toast notifications)

### Infrastructure

- **Backend Hosting:** Render
- **Frontend Hosting:** Render (Static Site)
- **Database:** Render PostgreSQL
- **Redis:** Render Redis

---

## 🚀 Local Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Git

### Backend Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/LexxLuey/ShiftSync.git
   cd ShiftSync/backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the `backend` directory:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/shiftsync"

   # Redis
   REDIS_URL="redis://localhost:6379"

   # JWT
   JWT_SECRET="your-secret-key-change-this-in-production"
   JWT_EXPIRES_IN="7d"

   # Server
   PORT=5000
   NODE_ENV=development

   # CORS
   CORS_ORIGIN="http://localhost:3000"
   ```

4. **Setup database:**

   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run migrations
   npx prisma migrate deploy

   # Seed database with demo data
   npm run seed
   ```

   If you are upgrading an existing database that has legacy global availability rows (`locationId = null`), run:

   ```bash
   # Dry run
   npm run fix:availability:locations

   # Apply migration of legacy rows to center-scoped rows
   npm run fix:availability:locations -- --apply
   ```

5. **Start development server:**

   ```bash
   npm run dev
   ```

   Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**

   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the `frontend` directory:

   ```env
   NEXT_PUBLIC_API_BASE_URL="http://localhost:5000"
   NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"
   ```

4. **Start development server:**

   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

---

## 🔐 Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for JWT signing | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `http://localhost:5000` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket URL | `http://localhost:5000` |

---

## 📦 Deployment Guide

### Backend Deployment (Render)

1. **Create New Web Service:**
   - Connect GitHub repository
   - Select `backend` folder as root directory
   - Environment: Node
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`

2. **Add Environment Variables:**
   - Set all variables from the Backend section above
   - Use Render-provided DATABASE_URL and REDIS_URL

3. **Run Database Migration:**

   ```bash
   npx prisma migrate deploy
   ```

4. **Seed Database (Optional):**

   ```bash
   npm run seed
   ```

### Frontend Deployment (Render/Vercel)

**For Render:**

1. Create New Static Site
2. Build Command: `npm install && npm run build`
3. Publish Directory: `out` or `.next`
4. Add environment variables

**For Vercel:**

1. Import project from GitHub
2. Select `frontend` folder
3. Add environment variables
4. Deploy

---

## 📚 Documentation

- **[USER_GUIDE.md](./USER_GUIDE.md)** - Complete guide for using the application
- **[backend/README.md](./backend/README.md)** - Backend setup, seed, and repair scripts
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contributor workflow and standards

---

## 🧪 Test Credentials

After seeding, use these credentials to test different roles:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `director@cfc-kids.org` | `ChurchPass123!` |
| Center Manager (CCO) | `mainland.cco@cfc-kids.org` | `ChurchPass123!` |
| Center Manager (ACO) | `mainland.aco@cfc-kids.org` | `ChurchPass123!` |
| Staff (Teacher) | `teacher.mainland.1@cfc-kids.org` | `ChurchPass123!` |
| Staff (Volunteer) | `volunteer.mainland.1@cfc-kids.org` | `ChurchPass123!` |

---

## 🏗️ Project Structure

```
ShiftSync/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── seed.ts             # Seed data script
│   │   └── migrations/         # Database migrations
│   └── src/
│       ├── modules/            # Feature modules
│       │   ├── auth/           # Authentication
│       │   ├── users/          # User management
│       │   ├── locations/      # Location management
│       │   ├── shifts/         # Shift management
│       │   ├── swaps/          # Swap requests
│       │   └── audit/          # Audit logging
│       ├── lib/                # Shared utilities
│       │   ├── db/             # Database client
│       │   ├── errors/         # Custom errors
│       │   ├── timezone/       # Timezone helpers
│       │   └── validation/     # Validation schemas
│       ├── middleware/         # Express middleware
│       ├── config/             # Configuration
│       └── server.ts           # Entry point
│
└── frontend/
    └── src/
        ├── app/                # Next.js App Router
        │   ├── (auth-pages)/   # Login/Register
        │   └── (protected-pages)/  # Authenticated routes
        ├── components/         # React components
        │   ├── shifts/         # Shift components
        │   ├── calendar/       # Calendar views
        │   └── swaps/          # Swap components
        ├── hooks/              # Custom React hooks
        ├── lib/                # Utilities
        │   └── api/            # API client
        ├── services/           # API services
        └── store/              # Zustand stores
```

---

## 📝 API Documentation

When running locally, access Swagger documentation at:

- **<http://localhost:5000/api-docs>**

Production API docs:

- **<https://shiftsyncbackend.onrender.com/api-docs>**

---

## 🤝 Contributing

This is a coding assessment project. Contributions are not currently accepted.

---

## 📄 License

This project was created as a coding assessment for PrioritySoft.

---

## 👤 Author

**Built for PrioritySoft Coding Assessment**

For questions or issues, refer to the USER_GUIDE.md and ASSUMPTIONS.md documentation
