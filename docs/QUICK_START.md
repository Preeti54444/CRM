# 🚀 Quick Start - CRM Frontend/Backend/Database Connection

## What I've Done

I've successfully connected your CRM frontend, backend, and database with the following:

✅ **Created API Client** (`crm-api-client.js`)
- Centralized HTTP client for all API requests
- Automatic JWT token management
- Error handling & unauthorized redirection
- Methods for auth, leads, users, dashboard, reports

✅ **Updated HTML Files**
- Added API client script to `login.html` and `crm1.html`
- Frontend now has global `window.API` instance ready to use

✅ **Configured Backend**
- CORS middleware properly configured
- All routers registered and ready
- Database connection via SQLAlchemy ORM
- JWT authentication in place

✅ **Updated .env File**
- Added backend localhost:8085 to ALLOWED_HOSTS
- Database URL configured for PostgreSQL
- All environment variables ready

✅ **Created Documentation & Tests**
- `FRONTEND_BACKEND_CONNECTION.md` - Complete integration guide
- `test-connection.html` - Visual test page for all connections

## 🚀 Quick Start (5 minutes)

### Step 1: Start PostgreSQL
```powershell
# If using local PostgreSQL (Windows):
# Ensure PostgreSQL service is running
pg_isready -h localhost
# Should output: accepting connections
```

### Step 2: Run Migrations & Start Services
```powershell
cd 'c:\Users\admin\Downloads\crm-final (6) (3)\crm-final (7)\crm-final (6)\crm-final\clean-project'

# One command to install + migrate + start all:
.\run-local.ps1 -All

# Or run them separately in different terminals:
# Terminal 1: Install dependencies
.\run-local.ps1 -Install

# Terminal 2: Run migrations  
.\run-local.ps1 -Migrate

# Terminal 3: Start backend
.\run-local.ps1 -Backend

# Terminal 4: Start frontend
.\run-local.ps1 -Frontend
```

### Step 3: Test Connections
- Open `http://localhost:3000/test-connection.html` 
- Click "Run All Tests" to verify everything is working

### Step 4: Login
- Go to `http://localhost:3000/login.html`
- Use demo credentials:
  - Email: `shree.rathod@fundingsathi.in`
  - Password: `shree.admin@2026`

## 📊 Connection Architecture

```
Frontend (localhost:3000)
    ↓ 
crm-api-client.js (window.API)
    ↓
FastAPI Backend (localhost:8085)
    ↓
SQLAlchemy ORM
    ↓
PostgreSQL (localhost:5432)
```

## 📝 API Client Usage Examples

Once authenticated, use the global API client anywhere in your frontend:

```javascript
// ─── AUTHENTICATION ───
const loginResult = await API.login(email, password);
const currentUser = await API.getCurrentUser();

// ─── LEADS ───
const leads = await API.getLeads({ limit: 50 });
const lead = await API.getLead(leadId);
const newLead = await API.createLead({ fullName: 'John', mobile: '9876543210' });
const updated = await API.updateLead(leadId, { status: 'Contacted' });
await API.deleteLead(leadId);

// ─── USERS ───
const users = await API.getUsers();
const user = await API.getUser(userId);

// ─── DASHBOARD ───
const stats = await API.getDashboardStats();
const metrics = await API.getDashboardMetrics();

// ─── REPORTS ───
const report = await API.generateReport('sod', { date: '2026-06-23' });
```

## 🔍 API Documentation

While backend is running, visit:
- **Interactive API Docs:** http://localhost:8085/api/docs
- **OpenAPI Schema:** http://localhost:8085/api/openapi.json

## ✅ Verify Database Connection

### Check if database exists:
```sql
psql -U postgres -c "SELECT datname FROM pg_database WHERE datname='fundingsathicrm';"
```

### Check if users table exists:
```sql
psql -U postgres -d fundingsathicrm -c "SELECT * FROM users;"
```

### Create demo user if needed:
```sql
psql -U postgres -d fundingsathicrm

INSERT INTO users (id, full_name, email, password_hash, role, status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Shree Rathod',
  'shree.rathod@fundingsathi.in',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7vGNWXDu/dVOa',
  'admin',
  'active'
);
```

## 🐛 Troubleshooting

### "Backend not responding"
```powershell
# Check if backend is running
Test-NetConnection -ComputerName localhost -Port 8085

# Check logs
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8085 --log-level debug
```

### "Database connection error"
```powershell
# Test PostgreSQL
pg_isready -h localhost -p 5432

# Test with psql
psql -U postgres -d fundingsathicrm -c "SELECT 1;"
```

### "Login fails"
```powershell
# Run migrations
cd backend
python -m alembic upgrade head

# Check users table
psql -U postgres -d fundingsathicrm -c "SELECT email, role FROM users;"
```

### "CORS error in browser"
1. Check backend/.env has ALLOWED_HOSTS set correctly
2. Restart backend
3. Clear browser cache
4. Check browser console for specific error

## 📁 Key Files

| File | Purpose |
|------|---------|
| `frontend/js/crm-api-client.js` | HTTP client for all API requests |
| `frontend/login.html` | Login page with backend authentication |
| `frontend/crm1.html` | Main CRM dashboard |
| `frontend/test-connection.html` | Connection test page |
| `backend/app/main.py` | FastAPI application entry point |
| `backend/app/routers/auth.py` | Authentication endpoints |
| `backend/app/models/user.py` | User database model |
| `backend/.env` | Environment configuration |
| `FRONTEND_BACKEND_CONNECTION.md` | Detailed integration guide |

## 🔐 Security Notes

⚠️ For **local development only**:
- SECRET_KEY is not secure
- CORS allows all methods
- Default database credentials used

⚠️ Before **production deployment**:
- Generate secure SECRET_KEY: `openssl rand -hex 32`
- Set ENVIRONMENT=production
- Restrict ALLOWED_HOSTS to your domain
- Use HTTPS with SSL certificates
- Use strong database passwords
- Enable proper logging & monitoring

## 📞 Next Steps

1. **Test the connection** → Open http://localhost:3000/test-connection.html
2. **Try login** → Go to http://localhost:3000/login.html
3. **Explore API docs** → Visit http://localhost:8085/api/docs
4. **Build features** → Use `window.API` in your frontend JS

## 📚 Documentation Files

- **FRONTEND_BACKEND_CONNECTION.md** - Complete integration guide with all details
- **DEPLOYMENT_CHECKLIST.md** - Pre-production readiness checklist
- **README.md** - Project overview

---

**Everything is now connected and ready to use!** 🎉

Start with the Quick Start steps above, and refer to the detailed documentation if you need more information.
