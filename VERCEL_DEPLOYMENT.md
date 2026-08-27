# Vercel Deployment

This repository is configured as a Vercel monorepo deployment:

- Static CRM frontend: `frontend/public`
- Vercel static output: `dist` (generated during deployment)
- FastAPI serverless API: `api/index.py`, available under `/api/*`
- Local development remains unchanged: frontend on port `3000`, API on port `8085`

## Vercel project settings

Create a Vercel project from this repository with the repository root as the project root. Do not set a separate frontend root directory.

The Vercel build copies the complete `frontend/public` directory into `dist`, so the deployed root redirects to `/login.html` through the included `index.html`.

Add these environment variables in Vercel for Preview and Production:

```text
DATABASE_URL=postgresql://...
SECRET_KEY=replace-with-a-long-random-value
ENVIRONMENT=production
ALLOWED_HOSTS=https://your-project.vercel.app,https://your-custom-domain.example
SCHEDULER_ENABLED=false
```

`DATABASE_URL` must point to a publicly reachable managed PostgreSQL database. Run Alembic migrations from a machine that can reach that database before using the deployed application:

```powershell
Set-Location backend
python -m alembic upgrade head
```

After deployment, open `/login.html`. The frontend automatically uses `/api` on Vercel and `http://127.0.0.1:8085` locally.