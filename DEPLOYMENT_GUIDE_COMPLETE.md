# 🚀 FundingSathi CRM - Deployment & Verification Guide

## Summary of Changes Made

### 1. ✅ NO-INDEX SETUP (Search Engine Exclusion)
- ✓ Created `frontend/public/robots.txt` with `User-agent: * Disallow: /`
- ✓ Added `<meta name="robots" content="noindex, nofollow">` to 14 HTML files in frontend/public
- ✓ Added `add_header X-Robots-Tag "noindex, nofollow" always;` to both nginx.conf and nginx.prod.conf

**Result:** CRM is now protected from search engine indexing across all layers (HTML meta tags, robots.txt, HTTP headers).

---

### 2. ✅ VERCEL FRONTEND PREP
- ✓ **vercel.json:** Already correctly configured
  - Root Directory: `frontend/public`
  - Build Command: `null` (empty - no build needed)
  - Output Directory: `.`
  - Install Command: `null` (empty)
- ✓ **config.js:** Auto-detects environment
  - Localhost → uses `http://127.0.0.1:8085`
  - Vercel (.vercel.app) → uses VPS backend
  - Production → proxied through nginx
  - Reads from `window.CRM_API_BASE` for overrides

**Important:** In config.js, update the placeholder on line ~66:
```javascript
const vpsBackend = 'https://YOUR-VPS-DOMAIN-OR-IP:8085';
// ⚠️ CRITICAL: Must use HTTPS, not HTTP (see section 3.B below)
// Change to your actual VPS IP or domain with HTTPS:
// Examples:
//   - 'https://api.yourdomain.com:8085'
//   - 'https://187-127-149-245.nip.io:8085' (free, auto-renews, requires self-signed cert)
```

**CRITICAL ISSUE - Mixed Content Blocking:**
Vercel frontend is served over HTTPS. If the backend is HTTP, browsers will BLOCK requests.

**Choose ONE solution:**
- **(A) HTTPS Backend** (Recommended): Get TLS certificate (Let's Encrypt free, nip.io, or self-signed)
- **(B) Proxy through Vercel**: Use vercel.json rewrites to proxy /api calls through Vercel's HTTPS

See section 3.B below for detailed instructions.

---

### 3. ✅ VPS BACKEND PREP
- ✓ Created **`.env.prod`** with production configuration template
- ✓ Verified **docker-compose.prod.yml:**
  - PostgreSQL: NOT exposed to public (only internal container networking)
  - Backend: Runs on container port 8085, exposed to nginx
  - Nginx: Handles HTTPS/HTTP routing
- ✓ Verified **CORS Configuration:**
  - Backend reads `ALLOWED_HOSTS` from `.env.prod`
  - Does NOT use wildcard `*` in production
  - Validates origin before reflecting CORS headers
- ✓ Updated **update-backend.sh:**
  - Checks for `.env.prod` before proceeding
  - Includes database migration step
  - Better error handling and logging
  - ~30 second startup wait
- ✓ Updated **verify-deployment.sh:**
  - Support for both HTTP and HTTPS
  - Checks X-Robots-Tag header
  - Tests CORS headers
  - Optional database connection test
  - SSL certificate verification for HTTPS deployments

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### On Your Local Machine

- [ ] Clone/update the repository:
  ```bash
  git clone https://github.com/YOUR-ORG/FundingSathi-CRM-Clean.git
  cd FundingSathi-CRM-Clean
  ```

- [ ] Review all changes made:
  - `frontend/public/robots.txt` - new file
  - `frontend/public/*.html` - meta robots tags added
  - `.env.prod` - new file with template values
  - `nginx.conf` - X-Robots-Tag header added
  - `nginx.prod.conf` - X-Robots-Tag header added
  - `update-backend.sh` - improved with migrations
  - `verify-deployment.sh` - comprehensive checks

- [ ] Update `frontend/public/config.js`:
  - Line ~59: Change `'http://YOUR-VPS-IP:8085'` to your actual VPS IP or domain
  - Example: `'https://api.yourdomain.com'`

- [ ] Create `.env.prod` file (already created in this setup):
  - Edit `.env.prod` and replace placeholder values:
    - `SECRET_KEY` → Generate with: `openssl rand -hex 32`
    - `POSTGRES_PASSWORD` → Strong password
    - `ALLOWED_HOSTS` → Your Vercel domain(s) and custom domain(s)
    - `FRONTEND_URL` → Your Vercel frontend URL
    - `API_BASE` → Your VPS IP/domain (must be HTTPS for production)
    - `SMTP_*` → Your email service credentials

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Initial VPS Setup (One-time)

On your VPS server (as root or with sudo):

```bash
# Install docker and docker-compose if not already installed
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create project directory
sudo mkdir -p /opt/fundingsathi-crm
cd /opt/fundingsathi-crm

# Clone repository
sudo git clone https://github.com/YOUR-ORG/FundingSathi-CRM-Clean.git
cd FundingSathi-CRM-Clean

# Copy .env.prod from your local machine to the VPS
# Use scp or your preferred method
scp .env.prod root@YOUR-VPS-IP:/opt/fundingsathi-crm/FundingSathi-CRM-Clean/

# Make scripts executable
sudo chmod +x update-backend.sh verify-deployment.sh

# Start the backend stack for the first time
sudo docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
sudo docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Verify deployment
bash verify-deployment.sh 187.127.149.245
```

### Step 2: Deploy Frontend to Vercel

From your local machine:

```bash
# Make sure all changes are committed
git add .
git commit -m "Deploy: Add production setup with noindex, CORS config, and deployment scripts"

# Push to GitHub (this triggers Vercel deployment automatically)
git push origin master

# Monitor Vercel deployment
# Option 1: Via Vercel dashboard: https://vercel.com/dashboard
# Option 2: Via CLI (if installed):
vercel --prod

# Wait for deployment to complete (~2-3 minutes)
```

### Step 3: Update VPS Config (After Vercel deployment)

On your VPS, update config.js with the actual Vercel domain:

```bash
# SSH to VPS
ssh root@YOUR-VPS-IP

cd /opt/fundingsathi-crm/FundingSathi-CRM-Clean

# Edit frontend/public/config.js
# Find line ~59 with 'http://YOUR-VPS-IP:8085'
# Replace with your actual VPS domain if using custom domain with HTTPS
# Or keep it as 'http://187.127.149.245:8085' for direct IP

# Example using sed (or edit manually):
sed -i "s|'http://YOUR-VPS-IP:8085'|'http://187.127.149.245:8085'|g" frontend/public/config.js

# Rebuild frontend service to pick up changes
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml up -d frontend

# Verify
curl http://187.127.149.245/robots.txt | head -5
curl http://187.127.149.245/login.html | grep "robots"
```

### Database migrations (exact command):

```bash
# Use direct 'alembic' command (not python -m alembic)
# This works because alembic is installed as a Python package with entry point
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## ✅ VERIFICATION COMMANDS

### Test Robots/Noindex Setup

```bash
# Check robots.txt is accessible
curl http://187.127.149.245/robots.txt
# Should show: User-agent: * Disallow: /

# Check HTML meta tags
curl http://187.127.149.245/login.html | grep robots
# Should show: <meta name="robots" content="noindex, nofollow">

# Check nginx headers
curl -i http://187.127.149.245/health | grep X-Robots-Tag
# Should show: X-Robots-Tag: noindex, nofollow
```

### Test CORS Configuration

```bash
# Check CORS headers are set
curl -i http://187.127.149.245/health | grep -i access-control

# From Vercel frontend, make a request to test CORS:
# Open browser console on your Vercel domain and run:
fetch('https://api.yourdomain.com/health').then(r => r.json()).then(console.log)
# Should succeed with proper CORS headers
```

### Test Backend Health

```bash
# On VPS
curl http://127.0.0.1:8085/health
# Should return: {"status":"ok"}

# Test database connection
docker-compose -f docker-compose.prod.yml exec backend python -c \
  "from app.database import SessionLocal; db = SessionLocal(); print('Database OK')"
```

### Run Full Verification Script

```bash
# On VPS, for localhost testing
bash verify-deployment.sh

# Or for remote domain testing
bash verify-deployment.sh yourdomain.com https
```

---

## 🔒 SECURITY NOTES

### CRITICAL: Mixed Content Blocking (Vercel + VPS Backend)

**The Problem:**
- Vercel frontend: Always HTTPS (e.g., `https://my-app.vercel.app`)
- VPS backend: Currently configured as `http://YOUR-VPS-IP:8085`
- **Result**: Browser blocks all API calls (mixed content policy)

### Solution A: HTTPS Backend (Recommended for Production)

**Option 1: Let's Encrypt (Free, auto-renews)**
```bash
# On VPS
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d api.yourdomain.com
# Creates: /etc/letsencrypt/live/api.yourdomain.com/
```

**Option 2: nip.io (Free, auto-renews, no domain needed)**
```bash
# Use nip.io wildcard DNS
# IP 187.127.149.245 becomes: 187-127-149-245.nip.io
# 
# 1. Generate self-signed cert:
# openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
#
# 2. Update config.js:
# const vpsBackend = 'https://187-127-149-245.nip.io:8085';
#
# 3. Update .env.prod:
# ALLOWED_HOSTS=https://my-app.vercel.app
```

**Then update:**
1. `frontend/public/config.js` line ~66:
   ```javascript
   const vpsBackend = 'https://api.yourdomain.com:8085';
   ```
2. `nginx.prod.conf` SSL cert paths
3. `.env.prod` with your domain in `ALLOWED_HOSTS`

### Solution B: Proxy Through Vercel

Instead of browser calling VPS directly, proxy through Vercel's HTTPS:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-VPS-IP:8085/api/:path*"
    }
  ]
}
```

Then in `config.js`:
```javascript
const vpsBackend = origin; // Use same origin (Vercel)
```

### What's Protected Now:

✅ **Search Engine Exclusion:**
- robots.txt blocks all crawlers
- HTML meta tags prevent indexing
- nginx headers override any client-side changes

✅ **Production CORS:**
- Whitelist only allowed domains
- No wildcard `*` in production
- Origin validation before header reflection

✅ **Database Security:**
- PostgreSQL only accessible within container network
- No public port exposure
- Strong password requirements

⚠️ **HTTPS Required for Vercel:**
- Choose Solution A or B above BEFORE deploying to production
- Test mixed content locally before pushing to Vercel

### TODO Before Going Live:

- [ ] **CRITICAL: Fix mixed content issue** (see section 3.A: HTTPS Backend or 3.B: Proxy)
- [ ] Update all `REPLACE_WITH_*` values in `.env.prod`
- [ ] Generate secure `SECRET_KEY`: `openssl rand -hex 32`
- [ ] Set strong database password (minimum 16 characters)
- [ ] Update `ALLOWED_HOSTS` with actual domain(s)
- [ ] Update `FRONTEND_URL` with Vercel domain
- [ ] Configure SMTP credentials for email
- [ ] Update `config.js` line 66 with HTTPS backend URL (https://..., not http://)
- [ ] If using Solution A: Set up SSL certificates for HTTPS
- [ ] If using Solution B: Add rewrites to vercel.json
- [ ] Enable firewall rules to block all except ports 80/443
- [ ] Test full workflow: frontend → vercel → backend → VPS → database

---

## 📚 File Reference

| File | Purpose | Status |
|------|---------|--------|
| `frontend/public/robots.txt` | Blocks all search engine bots | ✅ Created |
| `frontend/public/*.html` | Added noindex meta tags | ✅ 14 files updated |
| `nginx.conf` | Added X-Robots-Tag header | ✅ Updated |
| `nginx.prod.conf` | Added X-Robots-Tag header | ✅ Updated |
| `.env.prod` | Production configuration template | ✅ Created |
| `.env.prod.example` | Reference template | Already exists |
| `docker-compose.prod.yml` | Postgres security verified | ✅ Verified (secure) |
| `backend/app/config.py` | CORS validation verified | ✅ Verified (secure) |
| `backend/app/main.py` | CORS middleware verified | ✅ Verified (secure) |
| `update-backend.sh` | Backend deployment script | ✅ Enhanced |
| `verify-deployment.sh` | Verification script | ✅ Enhanced |
| `vercel.json` | Vercel config verified | ✅ Verified (correct) |
| `frontend/public/config.js` | API detection logic | ✅ Verified (needs IP update) |

---

## 🆘 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Common issues:
# - .env.prod missing or invalid
# - SECRET_KEY too short
# - DATABASE_URL incorrect
# - ALLOWED_HOSTS not set for production
```

### CORS errors in Vercel frontend

```bash
# Check ALLOWED_HOSTS in .env.prod
cat .env.prod | grep ALLOWED_HOSTS

# Should include your Vercel domain:
# ALLOWED_HOSTS=https://your-app.vercel.app

# Restart backend to apply changes
docker-compose -f docker-compose.prod.yml restart backend
```

### Database migrations fail

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check logs
docker-compose -f docker-compose.prod.yml logs postgres

# Manually run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Vercel frontend can't reach backend

```bash
# 1. Check config.js has correct IP/domain
cat frontend/public/config.js | grep -A 2 "vpsBackend"

# 2. Test connectivity from VPS
curl http://187.127.149.245:8085/health

# 3. Check ALLOWED_HOSTS includes Vercel domain
cat .env.prod | grep ALLOWED_HOSTS

# 4. Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

---

## 📞 Support

For issues or questions:

1. Check deployment logs: `docker-compose logs -f`
2. Run verification: `bash verify-deployment.sh`
3. Review environment: `cat .env.prod` (mask secrets)
4. Check GitHub Actions/Vercel dashboard for build errors

---

## 📝 Next Steps

1. ✅ All preparation steps are complete
2. ⏭️ Run the deployment commands from Step 1-4 above
3. ⏭️ Verify using the verification commands
4. ⏭️ Monitor logs for the first 24 hours
5. ⏭️ Set up monitoring/alerting for production
6. ⏭️ Schedule regular backups of PostgreSQL data

