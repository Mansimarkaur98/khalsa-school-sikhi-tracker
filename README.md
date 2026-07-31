# Khalsa School Sikhi Progress Tracker

A web app for tracking students' progress across Sikhi-related skill
categories (Gurbani Reading, Kirtan, Tabla, Gatka, Nitnem, daily
Paath/Simran, Amrit status) at Khalsa School, across multiple school
locations with role-based access for teachers and admins.

## Features

- **Multi-school support** — students, staff, and grade ranges are scoped
  per school (e.g. Fraser Valley serves grades 4–12, Newton serves 4–7).
- **Role-based access control** — teachers see and manage only their own
  school's students; admins see and manage everything across all schools,
  including reassigning a student's school or user accounts.
- **Student records** — add/edit/archive/restore students, with a photo
  (privately stored — never publicly accessible without going through the
  app's own authentication), grade validated against the destination
  school's allowed range, and full audit tracking (who created/last updated
  each record).
- **Assessments** — record a student's level in each category per term,
  view current progress and progress over time, with grade-level averages
  across a whole cohort.
- **Category management** — admins can add/edit/deactivate/restore
  assessment categories and their levels without touching the database
  directly.
- **Auth** — signup restricted to `@khalsaschool.ca` addresses, email
  verification, forgot/reset password, idle-session timeout, and rate
  limiting on login/signup/password-reset endpoints.
- **Admin user management** — promote/reassign/remove staff accounts, with
  guards against self-deletion and deleting the last remaining admin.

## Tech stack

**Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, JWT auth (`python-jose`
+ `passlib`/bcrypt), Cloudinary (photo storage), rate limiting (`slowapi`).

**Frontend:** React 19, TypeScript, Vite, MUI, react-router-dom, axios,
Recharts.

## Project structure

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, pytest suite
frontend/   React + Vite SPA
render.yaml           Render deployment blueprint (backend + Postgres)
frontend/vercel.json  Vercel SPA routing config
DEPLOYMENT.md         Full deployment runbook
```

## Local development setup

### Prerequisites

- Python 3.11+
- Node 20+
- A local PostgreSQL instance

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt

cp .env.example .env         # then fill in real values — see comments in the file
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

The API is served at `http://localhost:8000`; interactive docs at
`http://localhost:8000/docs` (only in dev — closed automatically when
`ENVIRONMENT=production`).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env         # VITE_API_BASE_URL should point at the backend above
npm run dev
```

Served at `http://localhost:5173` by default (Vite falls back to 5174, 5175,
etc. if that port's taken — the backend's CORS config already allows any
localhost port).

## Testing

The backend has a pytest suite (82 tests) covering auth flows, student CRUD
with RBAC and grade validation, category admin CRUD, admin user-management
guards, and assessment/grade-progress logic. It runs against a dedicated
`khalsa_school_test` database — see the setup instructions at the top of
`backend/tests/conftest.py` for one-time creation of that database.

```bash
cd backend
python -m pytest
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full runbook — deploying the
backend to Render, the frontend to Vercel, bootstrapping a fresh production
database, and handling future schema migrations.
