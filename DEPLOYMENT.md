# Deployment runbook

How to take this app from "runs on my machine" to a live, public URL. This
covers a **standalone deploy** (its own URL, e.g. `khalsa-sikhi-tracker.vercel.app`)
using Render (backend + Postgres) and Vercel (frontend) — neither requires
touching any existing domain's hosting.

`render.yaml` provisions both the backend and the database on Render's paid
**Starter** plan (~$7/month each, ~$14/month combined) rather than the free
tier. That's a deliberate choice once this app is serving real students
across multiple schools, not just a personal demo: Starter keeps the backend
always-on (no 30-50s cold start on the first request after a quiet period),
gives the database automated daily backups, and lets the backend reach
Postgres over Render's private network instead of the public internet —
worth the cost once real student data is on the line. Vercel (frontend)
stays on its free tier throughout; that's plenty for this app's traffic.

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
   service (`khalsa-sikhi-tracker-api`), both on the paid **Starter** plan —
   Render will ask you to add a payment method before it lets you apply a
   blueprint with paid-tier resources.
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

## 6. Custom domain (optional — e.g. kssikhitracking.ca)

The steps above give you a working app at a `*.vercel.app` URL. To put it on
your own domain instead, with the API left on Render's free `onrender.com`
URL (simplest option — no extra DNS record needed for the API):

1. **Register the domain first**, if you haven't — a `.ca` domain requires
   the registrant to meet CIRA's Canadian Presence Requirements (a Canadian
   school easily qualifies). Any CIRA-accredited registrar works — e.g.
   [Namecheap](https://namecheap.com), [godaddy.ca](https://godaddy.ca), or
   [easyDNS](https://easydns.com) (Canadian-based). Expect ~$15–20 CAD/year.
2. In the **Vercel** dashboard, open your frontend project → **Settings** →
   **Domains** → **Add**, and enter your domain (e.g. `kssikhitracking.ca`).
   Vercel shows you the DNS records to add — typically an `A` record for the
   bare domain plus a `CNAME` for `www` pointing at `cname.vercel-dns.com`
   (exact values are shown in Vercel's UI; they can change, so use whatever
   it displays rather than guessing).
3. Add those records at your registrar's DNS management page (or wherever
   your domain's nameservers point). DNS propagation can take anywhere from
   a few minutes to a few hours.
4. Back in Vercel, wait for the domain to show a green "Valid Configuration"
   status — it auto-provisions an SSL certificate once DNS resolves.
5. Update `FRONTEND_URL` in Render's **Environment** tab to your new domain
   (e.g. `https://kssikhitracking.ca`) — the backend's CORS check only
   allows requests from whatever this is set to, so requests from the new
   domain will be rejected until this is updated.
6. Visit the custom domain and confirm login/signup work end to end.

## Updating after this — pushing new changes

Both Render and Vercel auto-deploy on every push to `main` by default. If a
change includes a **new Alembic migration**, you additionally need to run it
against production once, since nothing does that automatically:

1. Push your change (auto-deploys as usual).
2. Open Render's **Shell** tab and run `alembic upgrade head`.

If a change doesn't touch the database schema, there's nothing extra to do.

