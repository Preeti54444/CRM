# Frontend & Backend Database Connection Setup Guide

## Current Configuration Status

**Current Setup:**
- Backend: FastAPI on port 8085
- Frontend: Static HTML on port 3000
- Database: PostgreSQL at `187.127.149.245:5432` (VPS)
- Environment: Production mode

---

## Option 1: Connect to Existing VPS Database (Recommended)

### Prerequisites
- Network access to `187.127.149.245:5432`
- PostgreSQL credentials: `postgres` / `fundingsathicrm`
- Database name: `fundingsathicrm`

### Step 1: Verify Database Configuration

Your `.env` file is already configured:
```
DATABASE_URL=postgresql://postgres:fundingsathicrm@187.127.149.245:5432/fundingsathicrm
FRONTEND_URL=http://187.127.149.245
ALLOWED_HOSTS=http://187.127.149.245,http://187.127.149.245:8085
```

### Step 2: Test Network Connectivity

```powershell
# Test if you can reach the database server
Test-NetConnection -ComputerName 187.127.149.245 -Port 5432

# Try to install postgres client tools if available
psql -h 187.127.149.245 -U postgres -d fundingsathicrm -c "SELECT version();"
```

### Step 3: Start Backend with Database Connection

```bash
cd backend

# Run migrations to set up database schema
python -m alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --port 8085 --host 0.0.0.0
```

### Step 4: Start Frontend

```bash
cd frontend

# Start development server
# Option A: Using simple_server.py (recommended)
python simple_server.py

# Option B: Using npm if installed
npm install
npm start

# Option C: Using http.server
python -m http.server 3000
```

### Step 5: Test Connection

Open browser to:
```
http://localhost:3000
```

Frontend should automatically connect to backend at:
```
http://localhost:8085
```

---

## Option 2: Local Development Setup (If VPS Database Unavailable)

### Prerequisites
- PostgreSQL 14+ installed locally
- Python 3.8+ with pip

### Step 1: Install Local PostgreSQL

**Windows:**
```powershell
# Using Chocolatey (if installed)
choco install postgresql14

# Or download from: https://www.postgresql.org/download/windows/
```

**After Installation:**
```bash
# Default credentials
# User: postgres
# Password: (set during installation)
```

### Step 2: Create Local Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE fundingsathicrm;

# Create user
CREATE USER crm_user WITH PASSWORD 'crm_password';

# Grant privileges
ALTER ROLE crm_user SET client_encoding TO 'utf8';
ALTER ROLE crm_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE crm_user SET default_transaction_deferrable TO on;
ALTER ROLE crm_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE fundingsathicrm TO crm_user;

# Exit psql
\q
```

### Step 3: Update Environment Configuration

Create or update `.env` file in project root:

```bash
# For local development
ENVIRONMENT=development
SECRET_KEY=e84bb91e4680d11d396909970785694a5c09fc7e9c9c142c583a2ede7d10ecf9
DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/fundingsathicrm
ALLOWED_HOSTS=http://localhost,http://localhost:8085,http://127.0.0.1:8085
FRONTEND_URL=http://localhost:3000
```

### Step 4: Install Backend Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\Activate.ps1
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 5: Run Migrations

```bash
cd backend

# Apply all migrations
python -m alembic upgrade head

# Check migration status
python -m alembic current
python -m alembic history
```

### Step 6: Start Backend

```bash
cd backend

# Start FastAPI server with auto-reload
uvicorn app.main:app --reload --port 8085 --host 0.0.0.0
```

### Step 7: Start Frontend

```bash
cd frontend

# Start simple development server
python simple_server.py
```

---

## Connection Verification Checklist

### Backend Verification

- [ ] Backend runs without errors: `http://localhost:8085/docs`
- [ ] Health check endpoint works: `http://localhost:8085/health`
- [ ] Database models imported successfully
- [ ] Migrations applied: `python -m alembic current`

### Frontend Verification

- [ ] Frontend loads: `http://localhost:3000`
- [ ] Network tab shows API calls to backend
- [ ] Cookies stored correctly (for JWT tokens)
- [ ] No CORS errors in console

### End-to-End Verification

```javascript
// Test in browser console
fetch('http://localhost:8085/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Should return: {"status": "ok", "database": true}
```

---

## Frontend API Configuration

The frontend automatically detects the API base URL with this priority:

1. **Explicit Override**: Set in page before loading config.js
   ```javascript
   window.API_BASE = "http://localhost:8085";
   ```

2. **Environment Variable**: 
   ```javascript
   window.CRM_API_BASE = "http://localhost:8085";
   ```

3. **LocalStorage Cache**: 
   ```javascript
   localStorage.setItem('crm_api_base', 'http://localhost:8085');
   ```

4. **Automatic Detection**:
   - Localhost → `http://localhost:8085`
   - LAN → `http://<local-ip>:8085`
   - Production → same origin (nginx proxy)

---

## Common Issues & Solutions

### Issue 1: Database Connection Refused

**Symptoms**: `Error: connect ECONNREFUSED 187.127.149.245:5432`

**Solutions**:
```bash
# Check if network can reach database
ping 187.127.149.245

# Verify PostgreSQL is running (local)
psql -U postgres -c "SELECT 1"

# Use local database instead (update .env)
DATABASE_URL=postgresql://localhost/fundingsathicrm
```

### Issue 2: CORS Errors

**Symptoms**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: Update `.env` with correct frontend URL
```bash
# If frontend on same machine
ALLOWED_HOSTS=http://localhost,http://127.0.0.1

# If frontend on LAN
ALLOWED_HOSTS=http://192.168.x.x,http://localhost
```

### Issue 3: JWT/Authentication Failures

**Symptoms**: 401 Unauthorized on every request

**Solution**: Check JWT configuration
```bash
# Ensure SECRET_KEY is set in .env
SECRET_KEY=<your-secret-key>

# Check token in storage
localStorage.getItem('access_token')
```

### Issue 4: Migrations Fail

**Symptoms**: `FAILED: Can't find alembic version table`

**Solution**: Initialize migrations
```bash
cd backend

# Create initial migration if needed
python -m alembic stamp head

# Then run
python -m alembic upgrade head
```

---

## Startup Commands Summary

### For VPS Database (Fastest):

```powershell
# Terminal 1: Backend
cd c:\Users\DELL\Downloads\CRM-fixed\crm_fixed\backend
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8085

# Terminal 2: Frontend
cd c:\Users\DELL\Downloads\CRM-fixed\crm_fixed\frontend
python simple_server.py

# Terminal 3: Browser
start http://localhost:3000
```

### For Local PostgreSQL:

```powershell
# Terminal 1: Local DB (if not already running)
net start postgresql-x64-14

# Terminal 2: Backend
cd backend
.\venv\Scripts\Activate.ps1
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8085

# Terminal 3: Frontend
cd frontend
python simple_server.py

# Terminal 4: Browser
start http://localhost:3000
```

---

## Target Assignment Feature - Database Integration

Once database is connected, the following feature becomes fully operational:

### Admin Assigns Targets
1. Admin fills target form in admin panel
2. POST `/api/targets/admin/assign-targets`
3. Backend:
   - Validates admin permission
   - Creates/updates Target record
   - Logs to audit trail
   - Creates notification
   - Returns confirmation

### Employee Sees Assignment
1. Employee logs in and views dashboard
2. GET `/api/dashboard/summary` includes:
   ```json
   {
     "assigned_target_info": {
       "assigned_at": "2026-07-20T18:30:00Z",
       "assigned_by": "Admin Name",
       "notification_sent": true
     }
   }
   ```
3. Employee sees notification: "Targets Assigned by [Admin Name]"
4. Employee tracks progress in My To-Do

### Database Records
- **targets** table: Stores assigned call/lead targets
- **performance_notifications** table: Stores assignment notifications
- **audit_logs** table: Logs all assignments by admin

---

## Next Steps

1. **Choose deployment option** (VPS or Local)
2. **Verify database connectivity** using provided commands
3. **Run migrations** to set up schema
4. **Start backend and frontend**
5. **Test in browser**
6. **Run target assignment feature tests**

Good luck! 🚀
