# Vercel Deployment

This repository uses Vercel for the frontend only:

- Static CRM frontend: `frontend/public`
- FastAPI backend and PostgreSQL: VPS only
- Local development remains unchanged: frontend files are served locally and the API runs on port `8085`

## Vercel project settings

Create a Vercel project from this repository with these settings:

- Root Directory: `frontend/public`
- Framework Preset: `Other`
- Build Command: empty
- Install Command: empty
- Output Directory: `.`

The selected root contains the static `index.html` and all required assets. No npm installation or build is required.

Do not add backend environment variables or secrets to Vercel. Configure the VPS backend separately.

After deployment, open `/login.html`. The frontend uses its runtime API configuration to connect to the VPS backend.