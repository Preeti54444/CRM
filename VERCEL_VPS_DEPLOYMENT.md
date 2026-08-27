# FundingSathi CRM - Vercel + VPS Deployment Guide

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Developer
   ↓
   git push origin main
   ↓
GitHub (https://github.com/Preeti54444/CRM)
   ↓
   ┌────────────────────┬────────────────────┐
   ↓                    ↓                     
Vercel               Manual VPS Update
   ↓                    ↓
Frontend           git pull + restart
   ↓                    ↓
https://            Backend  PostgreSQL
your-app.vercel.app    ↓
   ↓            https://api.YOUR-DOMAIN.com
   └─────────────→ Nginx
                   ↓
                 FastAPI (8085 internal)
                   ↓
                 PostgreSQL (127.0.0.1:5432 PRIVATE)
```

---

## Part A: Pre-Deployment Setup Checklist

### 1. VPS Requirements
- [ ] A domain name (e.g., `your-domain.com`)
- [ ] VPS with public IP (e.g., from Hostinger, AWS, DigitalOcean)
- [ ] SSH access to VPS
- [ ] Docker and Docker Compose installed on VPS
- [ ] Strong database password (≥16 characters, mixed case/numbers/symbols)
- [ ] Strong SECRET_KEY (run: `openssl rand -hex 32`)

### 2. GitHub Repository
- [ ] Repository is at https://github.com/Preeti54444/CRM
- [ ] Working Git remotes configured (already set up ✓)
- [ ] Current branch is `master` or `main` ✓

### 3. Vercel Account
- [ ] Create free account at https://vercel.com
- [ ] Connect GitHub account to Vercel
- [ ] Have Vercel project name ready (e.g., `fundingsathi-crm-frontend`)

---

## Part B: Frontend Preparation for Vercel

### Step 1: Verify Frontend Build
The frontend is already configured correctly. It uses `frontend/public/` with dynamic API URL detection.

**Build command**: none required for the static frontend.

The frontend is served directly from the `frontend/` directory in Vercel.

**Verify the project is configured correctly in Vercel:**
- Root Directory: `frontend`
- Framework Preset: `Other`
- Build Command: empty
- Output Directory: `.`
- Install Command: empty

### Step 2: API URL Configuration
The frontend is already smart about API URLs. In `frontend/public/config.js`:

- **Development** (localhost): Calls `http://127.0.0.1:8085`
- **Vercel (.vercel.app)**: Calls `/api` (proxied on Vercel)
- **Production (nginx)**: Calls same origin (proxied via nginx)

**No code changes needed** ✓

### Step 3: Environment Variables for Vercel
When you create the Vercel project, only set this if you explicitly decide to override the frontend’s runtime API detection. The static frontend already resolves the API URL using its own runtime config, so do not add backend secrets here.

If you do override it, set this value in the Vercel dashboard:

```
VITE_API_URL=https://api.YOUR-DOMAIN.com
```

(Do not add DATABASE_URL, SECRET_KEY, SMTP_PASSWORD, or any backend secret.)

---

## Part C: Backend Preparation for VPS

### Step 1: Create Production Environment File

On your VPS, create `.env.prod`:

```bash
ssh user@your-vps-ip

# Generate a strong secret key
openssl rand -hex 32
# Output: abc123def456... (copy this)

# Create .env.prod
nano .env.prod
```

Copy this template and fill in your actual values:

```env
# ─── ENVIRONMENT ───
ENVIRONMENT=production
LOG_LEVEL=INFO

# ─── SECURITY ───
# Generate with: openssl rand -hex 32
SECRET_KEY=<paste-your-generated-secret-key-here>

# ─── DATABASE ───
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<use-a-strong-password-16+-chars>
POSTGRES_DB=fundingsathicrm
DATABASE_URL=postgresql://postgres:<same-password>@postgres:5432/fundingsathicrm

# ─── JWT SETTINGS ───
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ─── CORS & ALLOWED HOSTS ───
# Critical: Include BOTH Vercel domain AND your custom domain
ALLOWED_HOSTS=https://your-app.vercel.app,https://api.YOUR-DOMAIN.com
FRONTEND_URL=https://your-app.vercel.app

# ─── EMAIL ───
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@fundingsathi.com

# ─── API BASE OVERRIDES ───
API_BASE=https://api.YOUR-DOMAIN.com

# ─── CELERY / REDIS ───
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

### Step 2: SSL Certificates (HTTPS)

**Install Certbot on VPS:**
```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx -y
```

**Get Let's Encrypt certificate for your domain:**
```bash
sudo certbot certonly --standalone -d api.YOUR-DOMAIN.com -d YOUR-DOMAIN.com
```

This creates:
- `/etc/letsencrypt/live/api.YOUR-DOMAIN.com/fullchain.pem`
- `/etc/letsencrypt/live/api.YOUR-DOMAIN.com/privkey.pem`

**Enable auto-renewal:**
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Step 3: Update Nginx Configuration

Copy the new production Nginx config to your VPS:

```bash
# On your local machine:
scp nginx.prod.conf user@your-vps-ip:/path/to/project/nginx.prod.conf

# On VPS:
ssh user@your-vps-ip
cd /path/to/project
cp nginx.conf nginx.conf.backup
cp nginx.prod.conf nginx.conf

# Edit to replace YOUR-DOMAIN.com with actual domain
sed -i 's/YOUR-DOMAIN.com/your-actual-domain.com/g' nginx.conf

# Verify config
docker-compose exec nginx nginx -t
```

### Step 4: Start Backend with Docker Compose

```bash
# On VPS, in project directory:
docker-compose -f docker-compose.prod.yml up -d

# Verify services are running:
docker-compose ps

# Check backend health:
curl https://api.YOUR-DOMAIN.com/health

# Check logs:
docker-compose logs backend
```

---

## Part D: Database Configuration

### Verification (Already Correct ✓)

The Docker Compose setup already has:

```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"  # ✓ Only accessible locally
  
  volumes:
    - postgres_data:/var/lib/postgresql/data  # ✓ Persistent volume
```

This ensures:
- **PostgreSQL is NOT exposed** to the internet
- **Persistent data** survives container restarts
- **Database is private** — only reachable from FastAPI container

✓ **No changes required**

---

## Part E: CORS Configuration

### Verification (Already Correct ✓)

Backend CORS settings in `backend/app/config.py`:

- **Development**: Automatically allows localhost + LAN IPs
- **Production**: Requires explicit `ALLOWED_HOSTS` environment variable
- **Security**: Does NOT use `allow_origins=["*"]` in production

### For Your Deployment

Set in `.env.prod`:
```env
ALLOWED_HOSTS=https://your-app.vercel.app,https://api.YOUR-DOMAIN.com
```

✓ **No code changes required**

---

## Part F: GitHub and Version Control

### Current Status ✓

- Remote: `https://github.com/Preeti54444/CRM.git`
- Branch: `master`
- Status: Working tree clean

### Before Deployment

Ensure these files are NOT committed:

```bash
git status
```

Check that `.env` files are in `.gitignore` ✓

---

## Part G: Vercel Deployment (Frontend Only)

### Step 1: Connect Repository to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select GitHub repository: `Preeti54444/CRM`
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Other`
   - **Build Command**: empty
   - **Output Directory**: `.`
   - **Install Command**: empty

### Step 2: Set Environment Variables in Vercel

In Vercel Project Settings → Environment Variables:

```
Name: VITE_API_URL
Value: https://api.YOUR-DOMAIN.com
Environments: Production, Preview, Development
```

### Step 3: Deploy

Click "Deploy" — Vercel will:
1. Clone your repository
2. Run the static frontend without a custom build command
3. Upload `dist/` folder to Vercel's CDN
4. Assign URL like: `https://your-app.vercel.app`

### Step 4: Trigger Automatic Deployment

Push to `master` branch:
```bash
git add .
git commit -m "Prepare CRM for Vercel and VPS deployment"
git push origin master
```

Vercel automatically detects the push and redeploys the frontend.

---

## Part H: VPS Backend Update Workflow

### Initial Deployment

```bash
ssh user@your-vps-ip
cd /path/to/project
git pull origin master
docker-compose -f docker-compose.prod.yml up -d
```

### Future Updates

After pushing code to GitHub:

```bash
ssh user@your-vps-ip
cd /path/to/project
git pull origin master
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

Or create a simple script (e.g., `update.sh`):

```bash
#!/bin/bash
cd /path/to/project
git pull origin master
docker-compose -f docker-compose.prod.yml up -d --build
echo "Backend updated successfully"
```

Make executable:
```bash
chmod +x update.sh
```

Run:
```bash
./update.sh
```

---

## Part I: Post-Deployment Verification

### Test Frontend
1. Open browser: `https://your-app.vercel.app`
2. Should load the login page
3. Open Developer Console (F12)
4. Check Network tab — API calls should go to `https://api.YOUR-DOMAIN.com`

### Test Backend API
```bash
# On local machine or VPS:
curl -X GET https://api.YOUR-DOMAIN.com/health

# Should return:
{"status": "ok"}
```

### Test Database Connection
```bash
# From backend container:
docker-compose exec backend python -c "from app.database import SessionLocal; db = SessionLocal(); print('DB Connected!')"
```

### Test CORS
In browser console on Vercel frontend:
```javascript
fetch('https://api.YOUR-DOMAIN.com/health')
  .then(r => r.json())
  .then(d => console.log('CORS OK:', d))
  .catch(e => console.error('CORS Error:', e))
```

### Test Authentication
1. Login on frontend with test credentials
2. Check that login API call returns token
3. Verify subsequent API calls include Authorization header

### Test Data Flow
1. Create a new record (e.g., lead)
2. Verify it's persisted in database:
   ```bash
   docker-compose exec postgres psql -U postgres -d fundingsathicrm -c "SELECT * FROM leads LIMIT 1;"
   ```
3. Refresh frontend — record should still appear

---

## Part J: Troubleshooting

### Frontend not loading
- **Check Vercel**: https://vercel.com/dashboard
- **Check deployment logs** in Vercel Project → Deployments
- **Verify build command**: Should be blank / empty
- **Verify dist/ folder**: Should contain HTML/CSS/JS files

### API calls failing (CORS error)
- **Check backend logs**: `docker-compose logs backend`
- **Verify ALLOWED_HOSTS**: Should match Vercel domain in `.env.prod`
- **Verify HTTPS**: API URL must be `https://`, not `http://`
- **Check nginx**: `docker-compose logs nginx`

### Backend not starting
- **Check environment**: `cat .env.prod`
- **Verify SECRET_KEY**: Must be set and ≥32 characters
- **Verify DATABASE_URL**: Should use `postgres` hostname, not IP
- **Check logs**: `docker-compose logs backend`

### Database not accessible
- **Verify postgres service**: `docker-compose ps postgres`
- **Check volume**: `docker volume ls | grep postgres`
- **Verify password**: Must match `POSTGRES_PASSWORD` in `.env.prod`
- **Port check**: Should only be `127.0.0.1:5432`, NOT public

### HTTPS certificate issues
- **Check certificates**: `sudo ls -la /etc/letsencrypt/live/`
- **Renew certificate**: `sudo certbot renew --dry-run`
- **Update Nginx path**: `nginx.conf` must point to correct cert paths

### SSL not working
1. **Verify certificate exists**:
   ```bash
   sudo ls -la /etc/letsencrypt/live/api.YOUR-DOMAIN.com/
   ```

2. **Test SSL**:
   ```bash
   curl https://api.YOUR-DOMAIN.com/health
   ```

3. **Check Nginx config**:
   ```bash
   docker-compose exec nginx nginx -t
   ```

---

## Summary

### ✓ Already Correct
- Docker Compose setup
- PostgreSQL private (localhost only)
- Backend CORS configuration
- Frontend API URL detection
- .env files in .gitignore

### ✓ To Complete (One-Time)
1. Create `.env.prod` on VPS with real values
2. Install SSL certificates on VPS
3. Deploy Nginx HTTPS config
4. Create Vercel project and set environment variables
5. Test complete flow

### ✓ Ongoing Workflow
```
Developer
  ↓ (edit code)
git add .
git commit
git push origin master
  ↓
Frontend: Automatic deploy to Vercel
Backend: Manual SSH + git pull + docker-compose up
```

---

## Final Verification Checklist

- [ ] VPS has domain DNS pointing to its IP
- [ ] SSL certificates installed on VPS
- [ ] `.env.prod` created with strong passwords
- [ ] `docker-compose.prod.yml` configured
- [ ] Nginx production config deployed
- [ ] Vercel project created and connected to GitHub
- [ ] Vercel environment variables set (`VITE_API_URL`)
- [ ] Backend started with `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Frontend accessible at Vercel URL
- [ ] API accessible at HTTPS endpoint
- [ ] CORS working (frontend → backend calls succeed)
- [ ] Database private (port 5432 not publicly exposed)
- [ ] Authentication working
- [ ] Data persistence verified

---

**Need Help?**

Check logs with:
```bash
docker-compose logs -f backend    # Backend logs
docker-compose logs -f postgres   # Database logs
docker-compose logs -f nginx      # Proxy logs
vercel logs                       # Frontend logs (requires Vercel CLI)
```

