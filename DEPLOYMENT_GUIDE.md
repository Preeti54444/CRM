# 🚀 FundingSathi CRM - Deployment Guide

**Complete guide to deploy FundingSathi CRM with Frontend on Vercel and Backend on VPS.**

---

## ⚡ Quick Start (5 Minutes)

### What You'll Get
- **Frontend**: Hosted on Vercel CDN (https://your-app.vercel.app)
- **Backend**: Running on your VPS (https://api.your-domain.com)
- **Database**: PostgreSQL on VPS (private, not exposed)
- **SSL/HTTPS**: Auto-renewing Let's Encrypt certificates

### Prerequisites
1. GitHub account with access to: https://github.com/Preeti54444/CRM
2. Vercel account: https://vercel.com (free)
3. VPS with public IP (AWS, DigitalOcean, Linode, etc.)
4. Domain name (for API endpoint: api.your-domain.com)
5. Email account for SMTP (Gmail recommended)

### Three Simple Phases

| Phase | What | Where | Time |
|-------|------|-------|------|
| **1** | Deploy Frontend | Vercel UI | 5-10 min |
| **2** | Deploy Backend | VPS (via script) | 30-60 min |
| **3** | Test Everything | Browser + Terminal | 10-15 min |

---

## 📋 Detailed Instructions

### PHASE 1️⃣: Deploy Frontend to Vercel (5-10 minutes)

**Step 1: Open Vercel**
- Go to https://vercel.com/dashboard
- Sign in with GitHub

**Step 2: Create Project**
- Click "Add New" → "Project"
- Find and click on `Preeti54444/CRM`
- Click "Import"

**Step 3: Configure Build**

In the "Configure Project" dialog, set:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend/public` |
| **Framework Preset** | Other |
| **Build Command** | empty |
| **Output Directory** | `.` |
| **Install Command** | empty |

Click **"Deploy"** and wait 2-3 minutes.

**Step 4: Add Environment Variable**

After deployment completes:

1. Go to **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://api.YOUR-DOMAIN.com` (replace with your domain)
   - **Environment**: Production
   - Click **"Save"**

**Step 5: Note Your Vercel URL**

In the deployment screen, copy your URL. It will look like:
```
https://fundingsathi-crm.vercel.app
```

You'll use this in Phase 2.

---

### PHASE 2️⃣: Deploy Backend to VPS (30-60 minutes)

**Prerequisites for this phase:**
- ✅ Vercel URL from Phase 1
- ✅ SSH access to your VPS
- ✅ Your domain DNS configured (A record pointing to VPS IP)

**Step 1: Connect to Your VPS**

Open terminal and SSH into your VPS:

```bash
ssh root@YOUR-VPS-IP
# OR
ssh -i /path/to/ssh/key.pem ubuntu@YOUR-VPS-IP
```

**Step 2: Download and Run Deployment Script**

```bash
cd /tmp

# Option A: Download script directly
wget https://raw.githubusercontent.com/Preeti54444/CRM/master/FundingSathi-CRM-Clean/deploy-vps.sh
bash deploy-vps.sh

# Option B: Clone repo and run
git clone https://github.com/Preeti54444/CRM.git
cd CRM/FundingSathi-CRM-Clean
bash deploy-vps.sh
```

**Step 3: Answer the Prompts**

The script will ask for:

```
Enter your domain (e.g., fundingsathi.com): 
your-domain.com

Enter your Vercel app URL (e.g., fundingsathi-crm.vercel.app):
your-app.vercel.app

Enter PostgreSQL password (strong, ≥16 chars):
YourSuperSecurePassword123!@#

Enter SMTP email for notifications (e.g., noreply@gmail.com):
your-email@gmail.com

Enter SMTP app password (will not be displayed):
YOUR-GMAIL-APP-PASSWORD
```

**Notes:**
- **Domain**: Use your actual domain (no `https://` or `api.`)
- **DB Password**: Use a strong password, at least 16 characters
- **SMTP**: Use Gmail with an App Password (not your regular password)
  - Enable 2FA on Gmail: https://myaccount.google.com/security
  - Create App Password: https://myaccount.google.com/apppasswords

**Step 4: Wait for Completion**

The script will:
1. ✅ Install Docker & Docker Compose
2. ✅ Clone the repository
3. ✅ Generate security keys
4. ✅ Install SSL certificate (requires DNS to be configured)
5. ✅ Configure Nginx
6. ✅ Start all services
7. ✅ Run verification tests

The entire process takes 30-60 minutes depending on VPS speed.

**Step 5: Verify Deployment Completed**

At the end, you should see:
```
═══════════════════════════════════════════════════════════
✓ DEPLOYMENT COMPLETE
═══════════════════════════════════════════════════════════

Frontend URL:
  https://your-app.vercel.app

Backend API URL:
  https://api.your-domain.com
```

---

### PHASE 3️⃣: Verify Everything Works (10-15 minutes)

**Test 1: Check API Health**

From your local machine (or VPS):

```bash
curl -k https://api.YOUR-DOMAIN.com/health
```

Should respond with:
```json
{"status": "ok"}
```

**Test 2: Check All Services Running**

On VPS:
```bash
docker-compose ps
```

Should show all services as "UP":
```
NAME          STATUS
postgres      Up 2 minutes
backend       Up 2 minutes
nginx         Up 2 minutes
redis         Up 2 minutes
frontend      Up 2 minutes
```

**Test 3: Check CORS (Browser Test)**

1. Open your frontend: `https://your-app.vercel.app`
2. Press `F12` to open Developer Console
3. Go to **Console** tab
4. Paste this code and press Enter:

```javascript
fetch('https://api.YOUR-DOMAIN.com/health')
  .then(r => r.json())
  .then(d => console.log('✓ Success:', d))
  .catch(e => console.error('✗ Error:', e))
```

Should see in console:
```
✓ Success: {status: 'ok'}
```

If you see "✗ Error", then CORS is not configured correctly. Check the troubleshooting section.

**Test 4: Database is Private**

From your local machine (NOT VPS):
```bash
psql -h YOUR-VPS-IP -U postgres -d fundingsathicrm
```

Should timeout or refuse connection (this is good!). Database should NOT be publicly accessible.

**Test 5: Automated Verification Script**

On VPS:
```bash
bash verify-deployment.sh YOUR-DOMAIN.com
```

Should show multiple "✓ PASS" results.

---

## 🎯 Testing the Application

Once all components are deployed:

### Test Data Flow
1. **Open frontend**: https://your-app.vercel.app
2. **Log in** with your credentials
3. **Create a test record** (lead, contact, opportunity, etc.)
4. **Verify it appears** in the list
5. **Refresh the page** (Ctrl+R / Cmd+R)
6. **Check the record still appears** (verifies database persistence)

### Monitor Logs
```bash
# On VPS, view backend logs:
docker-compose logs -f backend

# View all service logs:
docker-compose logs -f

# View database logs:
docker-compose logs -f postgres
```

---

## 📋 Important Files

| File | Purpose |
|------|---------|
| **deploy-vps.sh** | Automated VPS deployment script (run this!) |
| **update-backend.sh** | Update backend code after pushing to GitHub |
| **verify-deployment.sh** | Run verification tests after deployment |
| **PRE_DEPLOYMENT_CHECKLIST.md** | Complete checklist (read before deploying) |
| **IMPLEMENTATION_QUICK_START.md** | Quick reference guide |
| **ENV_PROD_TEMPLATE.md** | Environment variables reference |
| **.env.prod** | Created on VPS (NEVER commit to Git) |
| **nginx.prod.conf** | Production Nginx config |
| **docker-compose.prod.yml** | Production Docker Compose setup |

---

## 🔄 After Deployment: Workflows

### To Push Frontend Updates

```bash
# On your local machine:
git add .
git commit -m "Your commit message"
git push origin master

# Vercel automatically detects the push
# Frontend redeploys within 1-2 minutes
# Monitor at: https://vercel.com/dashboard
```

### To Push Backend Updates

```bash
# On your local machine:
git add .
git commit -m "Your backend update message"
git push origin master

# Then SSH into VPS and update:
ssh root@YOUR-VPS-IP

cd /opt/fundingsathi-crm/FundingSathi-CRM-Clean
bash update-backend.sh

# The script will:
# 1. Pull latest code
# 2. Rebuild Docker images
# 3. Restart services
# 4. Verify deployment
```

### Monitoring Logs

```bash
# SSH into VPS and view real-time logs:
docker-compose logs -f backend     # Backend logs
docker-compose logs -f postgres    # Database logs
docker-compose logs -f             # All services
docker-compose logs -f --tail=50   # Last 50 lines
```

---

## 🛠️ Common Operations

### Check Service Status
```bash
docker-compose ps
```

### View a Specific Service's Logs
```bash
docker-compose logs -f backend          # Backend logs
docker-compose logs -f postgres         # Database logs
docker-compose logs -f nginx            # Reverse proxy logs
docker-compose logs -f redis            # Cache/message broker
```

### Stop All Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Start All Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Restart a Service
```bash
docker-compose restart backend          # Restart backend only
docker-compose restart postgres         # Restart database only
```

### SSH into a Container
```bash
docker-compose exec backend bash        # Access backend container
docker-compose exec postgres psql -U postgres -d fundingsathicrm  # Access database
```

### Update Just the Backend (Without Frontend)
```bash
git pull origin master
docker-compose restart backend
# OR for code changes:
docker-compose up -d --build backend
```

---

## 🔐 Security Checklist

After deployment, verify:

- [ ] `.env.prod` is NOT in Git (should be in `.gitignore`)
- [ ] Database is NOT publicly accessible (connection should timeout from outside VPS)
- [ ] PostgreSQL uses strong password (≥16 characters, random)
- [ ] SECRET_KEY is random and unique (generated by script)
- [ ] HTTPS is enforced (no HTTP traffic)
- [ ] SSL certificate is auto-renewing (check: `sudo systemctl status certbot.timer`)
- [ ] CORS is configured only for your Vercel domain (not "*")
- [ ] ALLOWED_HOSTS in .env.prod includes your Vercel domain

---

## ⚠️ Troubleshooting

### API Returns 502 Bad Gateway

**Cause**: Backend service not responding

**Fix**:
```bash
docker-compose logs -f backend          # Check backend logs
docker-compose restart backend          # Restart backend
docker-compose ps                       # Verify it's UP
```

### CORS Error in Browser Console

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Cause**: Backend CORS not configured for Vercel domain

**Fix**:
```bash
# On VPS, edit .env.prod:
nano .env.prod

# Make sure ALLOWED_HOSTS includes your Vercel domain:
# ALLOWED_HOSTS=https://your-app.vercel.app,https://api.your-domain.com

# Restart backend:
docker-compose restart backend
```

### Frontend Shows Blank Page

**Cause**: API URL not configured correctly

**Fix**:
1. Check Vercel environment variable:
   - Go to https://vercel.com/dashboard
   - Project Settings → Environment Variables
   - Verify `VITE_API_URL` is set to `https://api.YOUR-DOMAIN.com`
2. Redeploy on Vercel (manual redeploy)
3. Hard refresh in browser (Ctrl+Shift+R)

### SSL Certificate Not Renewing

**Status**:
```bash
sudo certbot status
sudo systemctl status certbot.timer
```

**Renew manually**:
```bash
sudo certbot renew --force-renewal
```

### Cannot Connect to Database from Command Line

**Expected Behavior**: This is correct! Database should only accept connections from within Docker network.

**To access database**:
```bash
# From within Docker:
docker-compose exec postgres psql -U postgres -d fundingsathicrm

# OR from VPS (using socket):
sudo -u postgres psql fundingsathicrm
```

### Services Keep Restarting

**Check logs**:
```bash
docker-compose logs backend    # Full logs, not following
docker-compose logs postgres   # Database logs
```

**Common causes**:
1. Database password wrong in .env.prod
2. Insufficient disk space (check: `df -h`)
3. Insufficient memory (check: `free -h`)
4. Port already in use (check: `netstat -tlnp`)

---

## 📞 Support & Documentation

**Complete Guides in This Repository:**

1. **PRE_DEPLOYMENT_CHECKLIST.md**
   - Full checklist before, during, and after deployment
   - Verification procedures
   - Success indicators

2. **IMPLEMENTATION_QUICK_START.md**
   - Quick reference for common tasks
   - Commands cheatsheet
   - Troubleshooting guide

3. **ENV_PROD_TEMPLATE.md**
   - All environment variables explained
   - Security best practices
   - Optional services setup

4. **DEPLOYMENT_STATUS.md**
   - Current project status
   - What's configured
   - What still needs setup

---

## 🎉 Next Steps

1. **Read**: PRE_DEPLOYMENT_CHECKLIST.md (5 minutes)
2. **Deploy Frontend**: Phase 1 above (5-10 minutes)
3. **Deploy Backend**: Phase 2 above (30-60 minutes)
4. **Verify**: Phase 3 above (10-15 minutes)
5. **Test**: Application data flow
6. **Monitor**: Regular log reviews
7. **Maintain**: Update code and monitor deployments

---

## 🏆 Success Indicators

You've successfully deployed when:

- ✅ Frontend loads at `https://your-app.vercel.app`
- ✅ API responds at `https://api.your-domain.com/health`
- ✅ HTTPS works (green lock in browser)
- ✅ CORS requests succeed (browser console shows success)
- ✅ Can log in to the application
- ✅ Can create and view records
- ✅ Records persist after page refresh
- ✅ Database is private (not publicly accessible)
- ✅ All services show "UP" in docker-compose ps
- ✅ No errors in docker-compose logs

---

## 📝 License & Attribution

This is FundingSathi CRM, originally created by @Preeti54444 at https://github.com/Preeti54444/CRM

Deployment infrastructure configured for:
- Frontend: Vercel (free tier supported)
- Backend: Any Linux VPS
- Database: PostgreSQL (containerized)

---

**Happy Deploying! 🚀**

Need help? Check the PRE_DEPLOYMENT_CHECKLIST.md or see the Troubleshooting section above.

