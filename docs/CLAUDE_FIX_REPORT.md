# CRM Codebase Review & Fix Report

Scope: the zip you uploaded had the real project nested six folders deep
(`CRM-main/.../CRM-main/clean-project`). All work below was done inside
that `clean-project` folder, which is what this fixed zip contains at its
root.

Everything below is either **fixed already** in this zip, or **flagged**
for you to decide/act on (things I won't change without you telling me,
like credentials or which deployment path you actually want).

---

## 🔴 Critical bugs — these were breaking (or would break) your VPS deploy

### 1. Docker image was missing two files the app needs to even start
`app/main.py` imports `lender_models.py` and `lender_service.py` directly
(`from lender_models import ...`). Both files live in `backend/`'s root,
but `backend/Dockerfile` only ever copied `app/`, `alembic/`, and
`alembic.ini` into the image.

**Effect:** `docker build` succeeds, but the container crashes immediately
on start with `ModuleNotFoundError: No module named 'lender_models'`. This
alone is enough to explain "it doesn't run on the VPS."

**Fix:** added `COPY lender_models.py .` and `COPY lender_service.py .` to
`backend/Dockerfile`.

### 2. nginx was silently dropping requests to ~15 backend feature areas
`nginx.conf` only reverse-proxied a hand-picked list of path prefixes to
the backend (`auth`, `leads`, `reports`, `sod`, `eod`, `wod`, `tasks`,
`followups`, `dashboard`, `users`, `customers`, `timeline`,
`work-sessions`, `calls`, `early_logout`, `notifications`, `realtime`,
`health`). Your backend actually has **30 route groups**, and these were
missing from that list entirely:

- `/pipeline` (Pipeline)
- `/api/forecast` (Forecast)
- `/targets`, `/api/targets`, `/performance` (Target Management)
- `/admin`, `/api/admin/employees` (Admin Performance & Employees)
- `/employee` (Employee Performance)
- `/timer`, `/api/timer` (the early-logout timer — note the nginx list
  said `early_logout` but the actual route is `/timer`, so this was never
  matching even before)
- `/lenders`, `/lenders-management`, `/lender-products` (these don't
  match because the old regex required the path segment to be exactly
  `lender`, and `/lenders...` has extra characters right after)
- `/api/*` (My To-Do)
- `/debug`

**Effect:** any of these hit *through nginx* (i.e. on the real VPS, port
80) fell through to the frontend static server instead of the API and
broke silently — while working fine in local dev, where the frontend
talks to the backend directly on port 8085. This is almost certainly why
things "work on my machine" but not on the VPS.

**Fix:** rewrote `nginx.conf`'s routing logic. Instead of listing backend
paths (fragile — breaks again the next time a route is added), it now
routes by what the **frontend** is: a fixed set of static files
(`.html`, `.css`, `.js`, images, etc). Anything that isn't one of those
static assets is treated as an API/WebSocket call and goes to the
backend by default. `/openapi.json` and `/api/openapi.json` get an exact-
match exception since they're real backend JSON endpoints. This survives
new backend routes being added later without touching this file again.

---

## 🟠 Security issues

### 3. CORS was wide open despite careful-looking config
`config.py` computes a proper `allowed_origins` list from your
`ALLOWED_HOSTS`/`FRONTEND_URL` settings — but `main.py` never used it.
The actual `CORSMiddleware` was hardcoded to `allow_origins=["*"]` with
`allow_credentials=True`, meaning any website could make authenticated
requests to your API using a logged-in user's browser. Two custom
exception handlers had the same problem: they echoed back **any**
request's `Origin` header unconditionally, without checking it against
the allowed list.

**Fix:** `CORSMiddleware` now uses the real `allowed_origins` list, and
both exception handlers now only reflect an origin that's actually on
that list.

**⚠️ This fix requires your `.env` to correctly declare which origins are
allowed** — see item 6 below, which was also missing and would have
broken your own frontend if I'd only fixed the code and not the config.

### 4. Your database looks like it may be exposed to the public internet
`DATABASE_URL` in `.env` points at `187.127.149.245:5432` — your VPS's
public IP — rather than the internal Docker network, and
`docker-compose.yml` published Postgres's port 5432 to all interfaces
(`"5432:5432"`) with a plain, guessable password. If that Postgres is
reachable at that IP from outside your VPS, anyone on the internet can
attempt to log into your production database right now.

**Fix (partial — please act on this):**
- Changed `docker-compose.yml` to bind Postgres to `127.0.0.1:5432:5432`
  (localhost only) instead of all interfaces, and made the password
  configurable via `POSTGRES_PASSWORD` instead of hardcoded.
- **I did not change your actual `DATABASE_URL`** since I can't tell
  whether you're running Postgres inside this docker-compose stack or as
  a separate install on the VPS — changing it blindly could break a
  working setup. Please check:
  - If Postgres runs **in this docker-compose stack**: change
    `DATABASE_URL` in `.env` to use host `postgres` instead of the public
    IP (`postgresql://postgres:PASSWORD@postgres:5432/fundingsathicrm`) —
    faster, and 5432 doesn't need to be exposed at all.
  - If Postgres runs **separately on the VPS** (outside Docker): make
    sure your VPS firewall (`ufw`/`iptables`/your hosting provider's
    firewall) blocks port 5432 from the public internet, and only allows
    it from `127.0.0.1` or your app's own network.
  - **Either way, rotate the database password** — the current one
    (`fundingsathicrm`) is weak and has been sitting in plaintext across
    several exported zips.

### 5. 500 errors were leaking internal details to any caller
The catch-all exception handler returned the raw Python exception message
(`str(exc)`) — which can include file paths, SQL fragments, or other
internals — directly in the JSON response body to whoever made the
request.

**Fix:** in production (`ENVIRONMENT=production`), the client now gets a
generic `"Internal server error"` message; the full exception and stack
trace are still logged server-side exactly as before.

### 6. `.env` was missing `ENVIRONMENT`, `ALLOWED_HOSTS`, `FRONTEND_URL`
Your root `.env` only had `SECRET_KEY` and `DATABASE_URL`. Without
`ENVIRONMENT=production`, the app silently ran in "development" mode,
which skips the built-in production safety checks in `config.py` (weak
secret key / wildcard CORS would've been allowed). And without
`ALLOWED_HOSTS`, the CORS allowlist defaulted to a hardcoded list of
`localhost`/LAN addresses that does **not** include your real IP — so
once I fixed the CORS bug above, your own frontend would have started
getting blocked by CORS.

**Fix:** added `ENVIRONMENT=production`,
`ALLOWED_HOSTS=http://187.127.149.245,http://187.127.149.245:8085`, and
`FRONTEND_URL=http://187.127.149.245` to `.env`. Update these if your
domain/IP ever changes.

### 7. `/debug` router was mounted in production
A test endpoint (`POST /debug/notify`) that lets anyone push a fake
websocket notification to any user ID was included unconditionally.

**Fix:** now only mounted when `ENVIRONMENT` isn't `production`.

---

## 🟡 Cleanup — for a package that's actually sane to deploy

- **`backend/.venv/` (178 MB) removed.** It was a **Windows** virtualenv
  (`Scripts/` folder, not `bin/`) — useless and irrelevant on a Linux VPS,
  and it was most of your zip's size.
- **`__pycache__/`, `.pytest_cache/` removed** throughout.
- **`crm.db`, `test_db.sqlite3`, stray log files removed** — you're on
  Postgres in production; these local SQLite artifacts aren't used.
- **60 one-off debugging/maintenance scripts moved** out of `backend/`'s
  root into `backend/dev-scripts/` (things like `check_lenders_table.py`,
  `fix_alembic_version.py`, `drop_and_recreate_table.py`,
  `test_db_connection.py`, etc.). Nothing was deleted — they're just out
  of the way and excluded from the Docker build via `.dockerignore`, so
  they don't bloat the image or risk being run by accident. The two files
  the app actually needs at runtime (`lender_models.py`,
  `lender_service.py`) stayed in place.
- **Added `.dockerignore`** for both `backend/` and `frontend/` — before
  this, the Docker build context included `.venv`, `__pycache__`, `.env`,
  and stray db files, which bloats build time and risks secrets ending up
  baked into an image layer.
- **`frontend/Dockerfile` switched from `python -m http.server` to
  `nginx:1.25-alpine`.** Python's built-in server is single-threaded and
  handles one request at a time — fine for a quick local check, but a
  real bottleneck with more than one person using the CRM at once. nginx
  serves the same static files concurrently.
- **Created `.env.prod.example`** — `docker-compose.prod.yml` referenced
  a `.env.prod` file that didn't exist anywhere in the project.

---

## ✅ Checked and found to be fine (flagging so you know they were checked)

- **`requirements.txt` versions** — `fastapi==0.136.3`, `starlette==1.2.1`,
  `httpx2`/`httpcore2` all looked unusual at first glance, but I verified
  them: these are real, current, mutually-compatible releases (FastAPI
  moved to support Starlette 1.0+ and `httpx2` is a genuine newer
  package). No changes made here.
- **Password hashing** (`bcrypt` via `passlib`) and **JWT** handling
  (`python-jose`, HS256, expiry) — solid, no issues.
- **`database.py`** — sensible connection pooling, `pool_pre_ping` set.
- **`config.py`** — actually quite well-built (production validation,
  Docker-aware `DATABASE_URL` rewriting, sensible CORS origin
  normalization) — the bug was that `main.py` wasn't using what it
  computed. No changes needed to `config.py` itself.
- **Alembic migration setup** (`env.py`) — correctly prioritizes
  `DATABASE_URL` env var over `.env` files, falls back sensibly. Your
  `deploy.sh` already runs `alembic upgrade head` after bringing the
  containers up, which is the right approach.

---

## Deploying to your VPS

Your existing `deploy.sh` should now work as intended once you `scp`/`git
push` this fixed folder over:

```bash
docker-compose down
docker-compose build
docker-compose up -d
docker-compose exec -T backend alembic upgrade head
```

A few things to check before/while doing that:

1. Make sure your VPS firewall only exposes ports **80** (and 443 if you
   set up SSL) to the public internet — not 5432, not 8085 unless you
   specifically want direct API access outside nginx.
2. Confirm which Postgres you're actually pointing at (see item 4 above)
   and rotate its password.
3. If you ever move off IP `187.127.149.245` onto a domain name, update
   `ALLOWED_HOSTS` / `FRONTEND_URL` in `.env` and `server_name` in
   `nginx.conf` to match — the CORS fix means these now have to be kept
   accurate or the frontend will get blocked.
4. `backend/systemd/fundingsathi-backend.service` is a non-Docker
   alternative (systemd + a venv on `/opt/fundingsathi`) — not touched
   here since `deploy.sh`/docker-compose looks like your primary path.
   Let me know if you're actually using the systemd route instead and I
   can review that path specifically.

If anything still doesn't come up after deploying, the most useful things
to send me are: `docker-compose logs backend --tail=100` and whatever
error the browser's Network tab shows for the failing request.
