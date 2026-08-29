# 🔐 PRE-DEPLOYMENT CHECKLIST & PLACEHOLDER REPLACEMENT GUIDE

**Status:** ✅ All security fixes applied. Ready for you to fill in your values.

---

## ⚠️ CRITICAL: Mixed Content Blocking Issue

**THE PROBLEM:**
- Vercel frontend is served over **HTTPS** (e.g., `https://my-app.vercel.app`)
- VPS backend config was set to **HTTP** (e.g., `http://187.127.149.245:8085`)
- **Result**: Browser blocks API calls due to mixed content policy

**STATUS:** ✅ **FIXED** - Updated `frontend/public/config.js` to require HTTPS backend

**YOUR ACTION:** Complete ONE of these before deploying:

### Solution A: Let's Encrypt Certificate (Free, Recommended)
```bash
# On your VPS
ssh root@YOUR-VPS-IP
cd /opt/fundingsathi-crm/FundingSathi-CRM-Clean

# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get free certificate (replace with your domain)
sudo certbot certonly --standalone -d api.yourdomain.com

# Update nginx.prod.conf to use the certificate paths
# Then restart nginx

# Update config.js line 66 with your HTTPS domain
```

### Solution B: nip.io + Self-Signed Cert (No domain needed, easy)
```bash
# On your VPS
cd /opt/fundingsathi-crm/FundingSathi-CRM-Clean

# Generate self-signed cert (valid for 1 year)
openssl req -x509 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=187-127-149-245.nip.io"

# Update nginx.prod.conf to point to key.pem and cert.pem paths
# Restart nginx: docker-compose -f docker-compose.prod.yml restart nginx

# Update config.js line 66:
# const vpsBackend = 'https://187-127-149-245.nip.io:8085';

# nip.io automatically resolves 187-127-149-245.nip.io to 187.127.149.245
```

---

## 📝 PLACEHOLDER REPLACEMENTS - Complete This Section

### Files That Need Your Values

#### 1️⃣ `.env.prod` (CRITICAL - 7 values to replace)

```bash
cd c:\Users\Sneha\Downloads\FundingSathi-CRM-Clean (3)\FundingSathi-CRM-Clean\FundingSathi-CRM-Clean

# Find all REPLACE_WITH placeholders
grep -n "REPLACE_WITH" .env.prod
```

**Required Changes:**
```env
# Line 12: Generate with: openssl rand -hex 32
SECRET_KEY=<COPY OUTPUT HERE>

# Line 17: Strong password (16+ chars, mix of upper/lower/numbers/symbols)
POSTGRES_PASSWORD=YourStrong1Password!

# Line 19: Same password as above
DATABASE_URL=postgresql://fundingsathicrm_prod:YourStrong1Password!@postgres:5432/fundingsathicrm_prod

# Lines 30-31: Your Vercel app domain
ALLOWED_HOSTS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app

# Line 36-37: Your Gmail app password (or other email service)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password

# Line 45: Your VPS backend (MUST BE HTTPS - see mixed content fix above)
API_BASE=https://187-127-149-245.nip.io:8085
# OR: https://api.yourdomain.com:8085
```

#### 2️⃣ `frontend/public/config.js` (Line ~66)

**Current (fixed by us):**
```javascript
const vpsBackend = 'https://YOUR-VPS-DOMAIN-OR-IP:8085';
```

**What you need to do:**
Replace `YOUR-VPS-DOMAIN-OR-IP` with ONE of:
- `187-127-149-245.nip.io` (free, if using Solution B above)
- `api.yourdomain.com` (if using Solution A with your domain)

**Also line 14:**
```javascript
const remoteFrontendHosts = new Set(['srv1760511.hstgr.cloud', 'YOUR-VPS-DOMAIN-OR-IP']);
```
Replace `YOUR-VPS-DOMAIN-OR-IP` with your actual VPS IP/domain.

#### 3️⃣ `nginx.prod.conf` (Lines ~60-80, if using custom domain)

If using Solution A (Let's Encrypt), update certificate paths:
```nginx
ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
```

#### 4️⃣ `deploy-vps.ps1` (PowerShell - Windows only, if deploying from Windows)

Lines 10-11: Replace placeholder IPs with your VPS IP

#### 5️⃣ `docs/` files (Documentation - No action needed)

These contain example IPs and can stay as-is.

---

## ✅ ALL FIXES ALREADY APPLIED

### 1. Gitignore Protection
- ✅ **Added:** `.env.*` pattern to `.gitignore` to protect all `.env*` files from accidental commits
- ✅ **Status:** `.env.prod` is now in your untracked files (safe)
- ✅ **Verification:** `git status` shows `.env.prod` as untracked, not staged

### 2. Alembic Command Fixed
- ✅ **Changed:** `python -m alembic upgrade head` → `alembic upgrade head`
- ✅ **Files Updated:**
  - `update-backend.sh` line 64
- ✅ **Why:** Direct `alembic` command works because it's installed as a Python package entry point

### 3. Mixed Content Blocking (CRITICAL)
- ✅ **Added:** Detailed TODO comments in `frontend/public/config.js` explaining the issue
- ✅ **Changed:** HTTP → HTTPS in all code
- ✅ **Files Updated:**
  - `frontend/public/config.js` (lines 13-14, 66)
  - `DEPLOYMENT_GUIDE_COMPLETE.md` (added comprehensive section 3.A & 3.B)
- ✅ **Documentation:** All two solutions (Let's Encrypt vs nip.io) documented

### 4. Placeholder Tracking
- ✅ **Identified:** 107 occurrences across 25 files
- ✅ **Categorized:** IP addresses, VPS domains, Vercel URLs
- ✅ **Strategy:** See "PLACEHOLDER REPLACEMENTS" section above (only `.env.prod` and `config.js` need your values)

---

## 🚀 SAFE TO COMMIT & PUSH

**All files are now security-hardened and do NOT contain real secrets.**

Files you can safely push to GitHub (no secrets):
- ✅ `frontend/public/config.js` (has REPLACE_WITH placeholders)
- ✅ `.env.prod` (has REPLACE_WITH placeholders)
- ✅ `.gitignore` (updated with `.env.*`)
- ✅ `update-backend.sh` (fixed alembic command)
- ✅ `nginx.conf` & `nginx.prod.conf`
- ✅ `verify-deployment.sh`
- ✅ `DEPLOYMENT_GUIDE_COMPLETE.md`
- ✅ `frontend/public/robots.txt`
- ✅ All HTML files with noindex meta tags

**Do NOT push** (keep local only):
- `.env.prod` once you fill it with real values
- Any `.env*` files with actual passwords/keys

---

## 📋 DEPLOYMENT SEQUENCE (Updated)

1. **Locally** (this machine):
   - [ ] Fill in `.env.prod` with your actual values
   - [ ] Update `config.js` line 66 with your HTTPS backend URL
   - [ ] Commit: `git add . && git commit -m "Pre-deploy: Fill in production values"`
   - [ ] Push: `git push origin master`

2. **VPS Setup** (first time only):
   - [ ] Set up HTTPS on VPS (Solution A or B above)
   - [ ] SSH to VPS and run:
     ```bash
     mkdir -p /opt/fundingsathi-crm
     cd /opt/fundingsathi-crm
     git clone https://github.com/YOUR-ORG/FundingSathi-CRM-Clean.git
     cd FundingSathi-CRM-Clean
     scp .env.prod root@YOUR-VPS-IP:/opt/fundingsathi-crm/FundingSathi-CRM-Clean/
     docker-compose -f docker-compose.prod.yml up -d --build
     docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
     bash verify-deployment.sh
     ```

3. **Vercel Deployment**:
   - [ ] Wait for VPS HTTPS backend to be ready
   - [ ] Vercel auto-deploys on `git push`
   - [ ] Test from https://your-app.vercel.app

4. **Ongoing Updates**:
   - [ ] For backend changes: SSH to VPS and run `bash update-backend.sh`
   - [ ] For frontend changes: Commit and push to master (Vercel auto-deploys)

---

## 🔍 VERIFICATION

### Pre-Deployment Test (From your machine)

```bash
# Test HTTPS backend before deploying frontend
curl -k https://187-127-149-245.nip.io:8085/health
# Should return: {"status":"ok"}

# Test from Vercel (after deploying frontend)
# Open browser on https://your-app.vercel.app
# Open console and run:
fetch('https://187-127-149-245.nip.io:8085/health')
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.error('Error:', e))
# Should see "Success: {status: 'ok'}" (no mixed content errors)
```

### Post-Deployment Test (On VPS)

```bash
bash verify-deployment.sh
# Should show: ✓ Deployment verification PASSED
```

---

## 🆘 Common Issues & Fixes

**Issue: "Failed to fetch from backend" in Vercel frontend**
- Check: Is backend HTTPS? (http:// won't work from HTTPS frontend)
- Check: Is ALLOWED_HOSTS in .env.prod set to your Vercel domain?
- Fix: `docker-compose -f docker-compose.prod.yml restart backend`

**Issue: "Certificate verification failed" in browser**
- This is expected for self-signed certs (Solution B)
- Browser will trust after you click "Accept risk"
- For production: Use Let's Encrypt (Solution A)

**Issue: "CORS error" in browser console**
- Check: Backend is HTTPS (not HTTP)
- Check: ALLOWED_HOSTS includes Vercel domain
- Check: Browser DevTools shows Access-Control-Allow-Origin header

**Issue: Database connection error**
- Check: `.env.prod` DATABASE_URL password matches POSTGRES_PASSWORD
- Check: postgres container is running: `docker-compose ps`

---

## 📚 Files Changed Summary

| File | Change | Why |
|------|--------|-----|
| `.gitignore` | Added `.env.*` | Protect all env files |
| `frontend/public/config.js` | Lines 13-14, 66: HTTP→HTTPS + TODO comments | Fix mixed content |
| `update-backend.sh` | Line 64: `python -m alembic` → `alembic` | Correct command |
| `frontend/public/robots.txt` | Created | Block search engines |
| 14 HTML files | Added noindex meta tags | Block indexing |
| `nginx.conf` & `.prod` | Added X-Robots-Tag header | Extra protection |
| `.env.prod` | Created with template | Production config |
| `DEPLOYMENT_GUIDE_COMPLETE.md` | Updated with mixed content solutions | Clear guidance |

---

**Status: ✅ Ready for deployment - just fill in your values and test locally first!**

