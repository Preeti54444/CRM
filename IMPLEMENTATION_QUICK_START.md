# Quick Implementation Guide - Vercel + VPS Deployment

## File Checklist ✓ What Needs to Happen

| File | Status | Action |
|------|--------|--------|
| `.env.prod.example` | ✅ Updated | Reference template for VPS setup |
| `nginx.prod.conf` | ✅ Created | Production HTTPS config (use on VPS) |
| `VERCEL_VPS_DEPLOYMENT.md` | ✅ Created | Comprehensive deployment guide |
| Backend CORS | ✅ Already set | No changes needed |
| Frontend config.js | ✅ Already smart | No changes needed |
| Docker Compose | ✅ Already correct | Use as-is |
| .gitignore | ✅ Already safe | .env files protected |

---

## Quick Start - Step by Step

### PHASE 1: On Your Local Machine (NOW)

**1. Verify everything is ready**
```bash
cd c:\Users\Sneha\Downloads\FundingSathi-CRM-Clean\ \(3\)\FundingSathi-CRM-Clean\FundingSathi-CRM-Clean

# Check git status
git status

# Should show:
# On branch master
# nothing to commit, working tree clean
```

**2. Review new files**
```bash
cat nginx.prod.conf
cat VERCEL_VPS_DEPLOYMENT.md
cat .env.prod.example
```

**3. Commit and push to GitHub**
```bash
git add nginx.prod.conf VERCEL_VPS_DEPLOYMENT.md .env.prod.example
git commit -m "Add production Nginx HTTPS config and deployment guide for Vercel + VPS"
git push origin master
```

---

### PHASE 2: Set Up Vercel (5-10 minutes)

**1. Create Vercel account** (if needed)
   - Go to https://vercel.com
   - Click "Sign Up"
   - Choose "GitHub"
   - Authorize GitHub connection

**2. Create new Vercel project**
   - Dashboard → "Add New..." → "Project"
   - Select `Preeti54444/CRM` repository
   - Click "Import"

**3. Configure Vercel project**
   - **Framework Preset**: Other
   - **Build Command**: empty
   - **Output Directory**: `.`
   - **Install Command**: empty
   - Click "Deploy"

**4. Set Environment Variables in Vercel**
   - After deployment, go to Project Settings
   - Environment Variables
   - Add new variable:
     - Name: `VITE_API_URL`
     - Value: `https://api.YOUR-DOMAIN.com` (update with real domain)
     - Environments: Production
   - Save

**5. Note your Vercel URL**
   - Format: `https://your-project-name.vercel.app`
   - Go to Project Settings → Domains
   - Your default domain is there

---

### PHASE 3: Set Up VPS (30-60 minutes)

**1. SSH into your VPS**
```bash
ssh user@your-vps-ip
# or if using key file:
ssh -i /path/to/key.pem user@your-vps-ip
```

**2. Clone/Update your project**
```bash
# If first time:
git clone https://github.com/Preeti54444/CRM.git
cd CRM/FundingSathi-CRM-Clean

# If already cloned:
cd /path/to/CRM/FundingSathi-CRM-Clean
git pull origin master
```

**3. Generate secure values**
```bash
# Generate SECRET_KEY
openssl rand -hex 32
# Copy the output, you'll need it below

# Generate strong POSTGRES_PASSWORD (recommend using a password manager)
# Example format: "P@ssw0rd!Secure#12345"
```

**4. Create .env.prod file**
```bash
cat > .env.prod << 'EOF'
ENVIRONMENT=production
LOG_LEVEL=INFO
SECRET_KEY=PASTE_YOUR_GENERATED_SECRET_KEY_HERE
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD_HERE
POSTGRES_DB=fundingsathicrm
DATABASE_URL=postgresql://postgres:YOUR_STRONG_DATABASE_PASSWORD_HERE@postgres:5432/fundingsathicrm
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALLOWED_HOSTS=https://your-app.vercel.app,https://api.YOUR-DOMAIN.com
FRONTEND_URL=https://your-app.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@fundingsathi.com
API_BASE=https://api.YOUR-DOMAIN.com
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
EOF

# Verify it was created
cat .env.prod

# IMPORTANT: Never commit this file
```

**5. Install SSL Certificate**
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx -y

# Get certificate for your domain
# IMPORTANT: Your domain DNS must already point to this VPS IP
sudo certbot certonly --standalone -d api.YOUR-DOMAIN.com

# For main domain too (optional):
sudo certbot certonly --standalone -d YOUR-DOMAIN.com

# Verify certificate created
sudo ls -la /etc/letsencrypt/live/api.YOUR-DOMAIN.com/

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

**6. Update Nginx Configuration**
```bash
# Backup current config
cp nginx.conf nginx.conf.backup

# Copy production config
cp nginx.prod.conf nginx.conf

# Replace YOUR-DOMAIN.com with actual domain
sed -i 's/YOUR-DOMAIN\.com/your-actual-domain.com/g' nginx.conf

# Verify config syntax
docker-compose exec nginx nginx -t
# Should output: "test is successful"

# Or if docker not running yet:
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx:1.25-alpine nginx -t
```

**7. Start Services**
```bash
# Pull latest code if just cloned
git pull origin master

# Start all services with production config
docker-compose -f docker-compose.prod.yml up -d

# Wait 10 seconds for services to start
sleep 10

# Verify all services running
docker-compose ps

# Should show:
# postgres   UP
# backend    UP
# frontend   UP
# nginx      UP
# redis      UP
```

**8. Verify Backend is Working**
```bash
# Check if backend responds
curl -k https://api.YOUR-DOMAIN.com/health
# Should return: {"status": "ok"}

# Check backend logs
docker-compose logs backend | head -20

# Check if database is connected
docker-compose exec backend python -c "from app.database import SessionLocal; db = SessionLocal(); print('✓ Database connected!')"
```

---

### PHASE 4: Test Complete Flow

**1. Open Frontend in Browser**
   - Go to: `https://your-app.vercel.app`
   - Should see login page
   - If blank page: Check Vercel deployment logs

**2. Test CORS and API Connectivity**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Paste this:
   ```javascript
   fetch('https://api.YOUR-DOMAIN.com/health')
     .then(r => r.json())
     .then(d => console.log('✓ CORS OK:', d))
     .catch(e => console.error('✗ CORS Error:', e))
   ```
   - Should show: `✓ CORS OK: {status: 'ok'}`

**3. Test Login (if credentials available)**
   - Try logging in on frontend
   - Check Network tab in DevTools
   - Login request should go to `https://api.YOUR-DOMAIN.com/auth/...`
   - Response should contain auth token

**4. Test Data Persistence**
   - Create a test record (lead, contact, etc.)
   - Refresh the page
   - Record should still appear
   - Check database:
   ```bash
   docker-compose exec postgres psql -U postgres -d fundingsathicrm -c "\dt"
   # Should show database tables
   ```

**5. Verify Database Privacy**
   - From your LOCAL machine, try to connect to database:
   ```bash
   psql -h your-vps-ip -U postgres -d fundingsathicrm
   # Should timeout or refuse connection
   # This means database is NOT publicly exposed ✓
   ```

---

### PHASE 5: Ongoing Operations

**To Deploy Frontend Changes:**
```bash
# On local machine
git add .
git commit -m "Update frontend code"
git push origin master

# Vercel automatically detects push and redeploys
# Check https://vercel.com/dashboard for deployment status
```

**To Deploy Backend Changes:**
```bash
# On local machine
git add .
git commit -m "Update backend code"
git push origin master

# On VPS
ssh user@your-vps-ip
cd /path/to/project
git pull origin master
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Verify
docker-compose logs backend | tail -20
```

**Or create an update script on VPS:**
```bash
# On VPS
cat > update-backend.sh << 'EOF'
#!/bin/bash
cd /path/to/project
echo "Pulling latest code..."
git pull origin master
echo "Restarting services..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
echo "✓ Backend updated"
EOF

chmod +x update-backend.sh

# Run anytime with:
./update-backend.sh
```

---

## Summary of Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    YOUR DEPLOYED APPLICATION                      │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│    Vercel CDN (Frontend)    │
│  https://app.vercel.app     │
│                             │
│ - Static HTML/CSS/JS        │
│ - Deployed automatically    │
│ - Global edge network       │
└────────────┬────────────────┘
             │ HTTPS
             │
┌────────────▼────────────────────────────────────────────────┐
│              VPS with Docker Compose                         │
│              https://api.YOUR-DOMAIN.com                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Nginx (Reverse Proxy / HTTPS)                       │  │
│  │  - Listens: 0.0.0.0:443 (HTTPS)                      │  │
│  │  - SSL Certificate: /etc/letsencrypt/...             │  │
│  │  - Forwards API to FastAPI                           │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  FastAPI Backend                                      │  │
│  │  - Listens: 0.0.0.0:8085 (internal)                  │  │
│  │  - Routes: /auth, /leads, /reports, etc.             │  │
│  │  - Validates tokens                                   │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  PostgreSQL Database                                 │  │
│  │  - Listens: 127.0.0.1:5432 (localhost only)         │  │
│  │  - NOT exposed to internet                           │  │
│  │  - Persistent volume: postgres_data                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   Your Domain   │
│ your-domain.com │
│  ↓              │
│  A Record:      │
│  your-vps-ip    │
└─────────────────┘
```

---

## Troubleshooting

### Frontend blank/not loading
```bash
# Check Vercel deployment
# 1. Go to https://vercel.com/dashboard
# 2. Look for deployment status
# 3. Check "Deployments" tab for error logs
# 4. Verify Root Directory is frontend and Build Command is empty
```

### API calls getting CORS error
```bash
# Check ALLOWED_HOSTS in .env.prod
cat /path/to/.env.prod | grep ALLOWED_HOSTS

# Should include your Vercel domain:
# ALLOWED_HOSTS=https://your-app.vercel.app,https://api.YOUR-DOMAIN.com

# If wrong, edit and restart:
nano .env.prod
docker-compose -f docker-compose.prod.yml restart backend
```

### Backend not starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common issues:
# - SECRET_KEY not set or too short
# - DATABASE_URL wrong hostname
# - postgres service not running yet
# - Port 8085 already in use

# Verify .env.prod is correct
cat .env.prod | grep -E "^[A-Z]"
```

### Database connection failed
```bash
# Check postgres service
docker-compose -f docker-compose.prod.yml logs postgres

# Test database
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT version();"

# Verify password in DATABASE_URL matches POSTGRES_PASSWORD
```

### HTTPS certificate issues
```bash
# Check certificate files exist
sudo ls -la /etc/letsencrypt/live/api.YOUR-DOMAIN.com/

# Test HTTPS connection
curl -v https://api.YOUR-DOMAIN.com/health

# Check nginx config
docker-compose exec nginx nginx -t

# Renew certificate (runs automatically, but can test)
sudo certbot renew --dry-run
```

---

## Files Overview

### New/Updated Files
- ✅ `nginx.prod.conf` - Production HTTPS configuration
- ✅ `VERCEL_VPS_DEPLOYMENT.md` - Full deployment guide
- ✅ `.env.prod.example` - Updated with Vercel instructions

### Protected Files (DO NOT COMMIT)
- `.env` - Local development environment
- `.env.prod` - VPS production environment (create on VPS only)
- Any `.env.*` files with real passwords/secrets

### Already Correct Files
- `docker-compose.yml` - Base setup
- `docker-compose.prod.yml` - Production setup with Redis/Celery
- `backend/app/config.py` - CORS configuration
- `frontend/public/config.js` - Dynamic API URL detection
- `.gitignore` - Protects sensitive files

---

## Success Criteria ✓

After completion, you should have:

- [ ] Vercel project created and deployed
- [ ] Frontend accessible at `https://your-app.vercel.app`
- [ ] VPS domain configured with DNS pointing to VPS IP
- [ ] SSL certificate installed on VPS
- [ ] Nginx running with HTTPS on port 443
- [ ] FastAPI backend running on VPS
- [ ] PostgreSQL running (private, not public)
- [ ] Frontend CORS requests to backend succeed
- [ ] Database queries work from backend
- [ ] Authentication working
- [ ] Data persists across page refreshes

---

**Next Step:** Follow PHASE 1-5 above, starting with "PHASE 1: On Your Local Machine"

