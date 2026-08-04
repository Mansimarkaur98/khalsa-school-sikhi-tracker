# Deployment runbook

How to take this app from "runs on my machine" to a live, public URL. This
covers a **standalone deploy** (its own URL, e.g. `khalsa-sikhi-tracker.vercel.app`)
using Render (backend + Postgres) and Vercel (frontend) — both have workable
free tiers and don't require touching any existing domain's hosting.

Everything the repo needs is already committed: `render.yaml` (backend
blueprint), `frontend/vercel.json` (SPA routing), and
`backend/scripts/seed_production.py` (one-time database bootstrap). The
steps below are the parts only a human can do — creating accounts, clicking
through dashboards, pasting in secrets.

## 1. Deploy the backend (Render)

1. Go to [render.com](https://render.com) and sign up (GitHub login is easiest).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account if prompted, then select this repo. Render
   will read `render.yaml` at the repo root and show you the two resources
   it's about to create: a Postgres database (`khalsa-school-db`) and a web
   service (`khalsa-sikhi-tracker-api`).
4. Before clicking **Apply**, you'll be prompted to fill in the env vars
   marked `sync: false` in `render.yaml` (Render won't let secrets live in
   the committed file). Open your local `backend/.env` and copy these over:
   - `CLOUDINARY_URL`
   - `SMTP_USERNAME`
   - `SMTP_PASSWORD`
   - `FRONTEND_URL` — leave this as `http://localhost:5173` for now; you'll
     update it to the real Vercel URL in step 3 below.
5. Click **Apply**. Render provisions the database, then builds and starts
   the web service. First deploy takes a few minutes — watch the build logs
   in the Render dashboard.
6. Once it's live, note the backend's URL (something like
   `https://khalsa-sikhi-tracker-api.onrender.com`). Confirm it's actually
   up by visiting `<that-url>/health` — you should see `{"status":"ok"}`.

**The database is empty at this point** — no tables, no schools, no
categories. That's expected; the next step fixes that.

## 2. Bootstrap the database (one-time)

The existing Alembic migration history assumes tables already exist (it
predates Alembic being added to this project), so `alembic upgrade head`
alone can't build a schema from nothing. `scripts/seed_production.py`
handles this instead: it creates the schema/tables from the current models,
stamps Alembic at `head` so future migrations apply cleanly, and seeds the
required reference data (schools, assessment categories, and their levels),
plus an optional admin account.

1. In the Render dashboard, open your web service → **Shell** tab (gives you
   a terminal inside the running instance, already pointed at the
   production `DATABASE_URL`).
2. Run:
   ```bash
   ADMIN_EMAIL=you@khalsaschool.ca ADMIN_PASSWORD=choose-a-strong-password \
     ADMIN_FIRST_NAME=Your ADMIN_LAST_NAME=Name \
     python scripts/seed_production.py
   ```
3. You should see it report schools/categories/levels seeded and an admin
   account created. This script is safe to re-run — it checks for existing
   data before inserting anything, so running it again later (e.g. after
   adding a new migration) won't duplicate data.

## 3. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up (GitHub login again is
   easiest).
2. Click **Add New** → **Project**, then import this same repo.
3. When configuring the project:
   - **Root Directory**: set to `frontend` (this repo has both `backend/`
     and `frontend/` at the root — Vercel needs to know which one is the
     frontend).
   - **Framework Preset**: Vercel should auto-detect Vite.
   - **Environment Variables**: add `VITE_API_BASE_URL` set to your Render
     backend URL from step 1 (e.g. `https://khalsa-sikhi-tracker-api.onrender.com`).
4. Click **Deploy**. A couple minutes later you'll have a live URL like
   `https://khalsa-sikhi-tracker.vercel.app`.

## 4. Wire the two together

The backend's CORS config only allows requests from whatever `FRONTEND_URL`
is set to (plus `localhost` for local dev) — so right now it's still only
allowing `localhost:5173`, not your new Vercel URL.

1. Back in the Render dashboard, open your web service → **Environment**.
2. Update `FRONTEND_URL` to your real Vercel URL from step 3.
3. Save — Render will automatically redeploy the backend with the new value.

## 5. Verify it actually works

1. Visit your Vercel URL, log in with the admin account you created in step 2.
2. Confirm you can see the (currently empty) student list, and that
   **Manage Categories** shows the 8 seeded categories with their levels.
3. Try adding a test student, then archive/delete it — confirms the database
   round-trip works end to end.

## Updating after this — pushing new changes

Both Render and Vercel auto-deploy on every push to `main` by default. If a
change includes a **new Alembic migration**, you additionally need to run it
against production once, since nothing does that automatically:

1. Push your change (auto-deploys as usual).
2. Open Render's **Shell** tab and run `alembic upgrade head`.

If a change doesn't touch the database schema, there's nothing extra to do.

