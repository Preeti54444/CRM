# Target Management - Development Notes

This folder contains the FundingSathi CRM backend with the Target Management feature.

Quick start (Windows):

1. Create & activate a virtualenv, install deps:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run database migrations (Alembic):

```powershell
alembic upgrade head
```

3. Start backend (development):

```powershell
py -m uvicorn app.main:app --reload --port 8000
```

API endpoints of interest:

- `GET /targets/live` — employee live panel (polled by frontend)
- `GET /targets/today` — today's target panel
- `POST /targets/logout-check` — evaluate logout eligibility
- `POST /targets/early-logout/request` — request early logout
- `POST /targets/early-logout/review` — manager/admin review
- `GET /targets/admin/grid` — admin employee grid
- `GET /targets/admin/kpis` — admin KPIs

Scheduler
- The app starts scheduler services when `settings.scheduler_enabled` is true. See `app.services.performance_scheduler`.

Testing
- Install dev deps and run `pytest` from the backend directory.

Production checklist
1. Set environment variables in production `.env` or orchestration secrets:
	- `ENVIRONMENT=production`
	- `SECRET_KEY` (secure random, min 32 bytes)
	- `ALLOWED_HOSTS` (comma-separated full origins)
	- `DATABASE_URL` (use managed Postgres)
	- `SENTRY_DSN` (optional, for error monitoring)

2. Run database migrations:

```powershell
alembic upgrade head
```

3. Start via Docker Compose (recommended):

```powershell
cd clean-project
docker compose up -d --build
```

4. Configure TLS and reverse proxy (NGINX) in front of the `nginx` service or use a load balancer.

5. Backups: schedule `pg_dump` or use managed DB backups. Keep at least 7 days of backups offsite.

6. Monitoring: configure `SENTRY_DSN` and a Prometheus exporter (recommended) for metrics.

7. Scheduler: ensure `scheduler_enabled=true` and monitor `performance_scheduler` task via logs; in containerized setups consider running scheduler as a separate service for reliability.

8. Security: enforce HTTPS, rotate `SECRET_KEY` carefully (it invalidates tokens), and store secrets in your orchestration secrets manager.

9. Scaling: the backend Dockerfile binds `uvicorn` with `--workers 4` for basic concurrency; consider using process manager and autoscaling behind a load balancer for high load.

Audit & immutability
- Audit logs are stored in `target_audit_logs` and are append-only; do not expose deletion endpoints for audit records.

Prometheus metrics
- The backend exposes Prometheus metrics at `/metrics` when `prometheus-fastapi-instrumentator` is installed and available in the runtime environment.
- To enable metrics in Docker, add `prometheus-fastapi-instrumentator` to `requirements.txt` (already added) and rebuild the image.

Production compose and TLS
- Use `docker-compose.prod.yml` for production deployment; place TLS certificates under `clean-project/certs` and map them into the `nginx` service.

Backups
- A simple backup script is provided at `backend/scripts/pg_backup.sh`. Schedule it with cron or a systemd timer to run nightly and store backups off-host or in object storage.

Celery scheduler
- A Celery worker and beat are provided as optional production components to offload scheduled work from the FastAPI process.
- Ensure `celery[redis]` and `redis` are installed (already added to `requirements.txt`). Configure `CELERY_BROKER_URL` or `celery_broker_url` in the environment (default: `redis://redis:6379/0`).
- Example: trigger a daily performance check from the worker:

```bash
docker compose -f docker-compose.prod.yml up -d redis backend celery_worker celery_beat
# Or, call the task directly inside the backend container

docker compose -f docker-compose.prod.yml exec celery_worker python -c "from app.celery_app import run_performance_checks; run_performance_checks.delay()"
```

Security & load-testing notes
- Application-level rate limiting: `slowapi` middleware added in `app/main.py` (install via `requirements.txt`) to provide IP-based throttling. Nginx also applies `limit_req` zones.
- Secrets: follow `ops/SECRETS.md` for secure secret storage and rotation guidance.
- SQL indexes: suggested production indexes live at `db/indices.sql` — review and apply with your DBA or migration scripts.
- Load testing: a basic Locust smoke test is available at `load_tests/locustfile.py`. A GitHub Actions job `/.github/workflows/load-test.yml` can run a quick headless test against a configured `LOAD_TEST_TARGET_URL` secret.



