# ═══════════════════════════════════════════════════════════════
# CRM Frontend-Backend-Database Connection Guide
# ═══════════════════════════════════════════════════════════════

## Architecture Overview

```
┌─────────────────────┐
│  Frontend (3000)    │
│  - login.html       │  HTTP/JSON
│  - crm1.html        ├─────────────────┐
│  - JS Modules       │                 │
└─────────────────────┘                 │
                                        │
                                    ┌───▼──────────────────┐
                                    │  Backend (8085)      │
                                    │  - FastAPI           │  SQL/ORM
                                    │  - Routers           ├──────────┐
                                    │  - Models            │          │
                                    └─────────────────────┘           │
                                                                       │
                                            ┌──────────────────────────┘
                                            │
                                    ┌───────▼──────────┐
                                    │  PostgreSQL      │
                                    │  localhost:5432  │
                                    │  fundingsathicrm │
                                    └──────────────────┘
```

## Prerequisites

### 1. Database Setup
- PostgreSQL running on `localhost:5432`
- Database: `fundingsathicrm` (or as configured in `.env`)
- User: `postgres` with password `fundingsathicrm`

**Create Database:**
```sql
CREATE DATABASE fundingsathicrm;
GRANT ALL PRIVILEGES ON DATABASE fundingsathicrm TO postgres;
```

### 2. Environment Configuration

**File:** `backend/.env`
```env
ENVIRONMENT=development
LOG_LEVEL=INFO
SECRET_KEY=your-super-secret-key-change-in-production
DATABASE_URL=postgresql://postgres:fundingsathicrm@localhost:5432/fundingsathicrm
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALLOWED_HOSTS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8085,http://127.0.0.1:8085
FRONTEND_URL=http://localhost:3000
API_BASE=http://localhost:8085
```

## Running Locally

### Option 1: Using PowerShell Helper Script

```powershell
cd c:\Users\admin\Downloads\crm-final (6) (3)\crm-final (7)\crm-final (6)\crm-final\clean-project

# Install dependencies + migrate + start all services
.\run-local.ps1 -All

# Or run individually:
.\run-local.ps1 -Install    # Install Python packages
.\run-local.ps1 -Migrate    # Run database migrations
.\run-local.ps1 -Backend    # Start backend on port 8085
.\run-local.ps1 -Frontend   # Start frontend on port 3000
```

### Option 2: Manual Startup

**Terminal 1 - Database Migrations:**
```powershell
cd backend
python -m alembic upgrade head
```

**Terminal 2 - Backend Server:**
```powershell
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8085 --log-level info
```

**Terminal 3 - Frontend Server:**
```powershell
cd frontend
python -m http.server 3000
```

## Connection Flow

### 1. Frontend Initialization

When you visit `http://localhost:3000/login.html`:

```javascript
// crm-api-client.js automatically:
1. Detects API_BASE from multiple sources:
   - window.API_BASE (set in HTML)
   - localStorage.getItem('crm_api_base')
   - window.location.hostname (for localhost detection)
   - Defaults to: http://localhost:8085

2. Creates global API client: window.API
   - All API calls go through: API.post(), API.get(), etc.
   - Automatically adds authorization headers
   - Handles errors and redirects on 401 (unauthorized)
```

### 2. Login Request

**Frontend code:**
```javascript
// In login.html
const result = await API.login(email, password);
```

**Flow:**
```
Frontend (3000)
    ↓ POST /api/auth/login
Backend (8085)
    ↓ Validate credentials
    ↓ Query users table
Database (PostgreSQL 5432)
    ↓ Return user record
Backend (8085)
    ↓ Generate JWT token
    ↓ Return { access_token, user_data }
Frontend (3000)
    ↓ Store token in localStorage
    ↓ Redirect to crm1.html
```

### 3. Authenticated Requests

All subsequent requests include the JWT token:

```javascript
// API client automatically adds Authorization header:
headers: {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

## API Client Usage

The API client is loaded in both `login.html` and `crm1.html`:

```html
<script src="js/crm-api-client.js"></script>
```

**Global instance available as `window.API`**

### Authentication Endpoints

```javascript
// Login
const result = await API.login(email, password);
// Returns: { access_token, user_data }

// Get current user
const user = await API.getCurrentUser();

// Register
const newUser = await API.register(email, password, fullName, 'employee');
```

### Lead Management

```javascript
// List leads
const leads = await API.getLeads({ limit: 50, skip: 0 });

// Get single lead
const lead = await API.getLead(leadId);

// Create lead
const newLead = await API.createLead({
  fullName: 'John Doe',
  mobile: '9876543210',
  leadSource: 'Website',
  loanType: 'Personal Loan',
  loanAmount: 500000
});

// Update lead
const updated = await API.updateLead(leadId, { status: 'Contacted' });

// Delete lead
await API.deleteLead(leadId);
```

### Dashboard & Reports

```javascript
// Dashboard stats
const stats = await API.getDashboardStats({ period: 'today' });

// Dashboard metrics
const metrics = await API.getDashboardMetrics();

// List reports
const reports = await API.getReports();

// Generate report
const report = await API.generateReport('sod', { date: '2026-06-23' });
```

## Database Schema

### Key Tables

**users**
```sql
id              UUID PRIMARY KEY
email           VARCHAR(255) UNIQUE
full_name       VARCHAR(255)
password_hash   VARCHAR(255)
role            VARCHAR(50)  -- 'admin', 'manager', 'employee'
status          VARCHAR(50)  -- 'active', 'inactive'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**leads**
```sql
id              UUID PRIMARY KEY
full_name       VARCHAR(255)
mobile          VARCHAR(50)
email           VARCHAR(255)
lead_source     VARCHAR(100)
loan_type       VARCHAR(100)
loan_amount     DECIMAL
status          VARCHAR(50)
assigned_to     UUID (FK -> users.id)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

See full schema at: `backend/app/models/`

## CORS Configuration

**Configured in `backend/app/main.py`**

Allowed Origins (from `.env` ALLOWED_HOSTS):
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:8085`
- `http://127.0.0.1:8085`

**If frontend can't connect to backend:**
1. Check browser console for CORS errors
2. Verify `ALLOWED_HOSTS` in `.env` includes your frontend origin
3. Verify backend is running on port 8085
4. Check backend logs for CORS middleware messages

## Testing the Connection

### 1. Health Check

```javascript
// In browser console
await API.healthCheck();
// Expected: { status: "ok", message: "FundingSathi CRM Backend Running" }
```

### 2. API Documentation

Visit: `http://localhost:8085/api/docs`

Interactive Swagger UI to test all endpoints with live requests.

### 3. Test Login with Demo Credentials

```javascript
// In browser console
const result = await API.login('shree.rathod@fundingsathi.in', 'shree.admin@2026');
console.log(result);
// Expected: { access_token: "...", user: { id, email, full_name, role } }
```

### 4. Test Database Query

```javascript
// After successful login
const user = await API.getCurrentUser();
console.log(user);
// Should return your user profile from the database
```

## Troubleshooting

### "Failed to fetch" or CORS Error

**Solution:**
1. Ensure backend is running: `http://localhost:8085/api/docs` should load
2. Check ALLOWED_HOSTS in backend/.env
3. Clear browser cache and localStorage

### "Invalid email or password"

**Solution:**
1. Try with demo credentials (see login.html)
2. Run migrations: `python -m alembic upgrade head`
3. Check database is accessible: `psql -U postgres -d fundingsathicrm -c "SELECT * FROM users;"`

### Backend won't start

**Solution:**
1. Check Python version: `python --version` (should be 3.11+)
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Check PostgreSQL is running: `pg_isready -h localhost`
4. Verify DATABASE_URL in .env

### Frontend shows "API_BASE: null"

**Solution:**
1. Check browser console for errors
2. Verify `window.API_BASE` is set in login.html
3. Check localStorage: `localStorage.getItem('crm_api_base')`

## Security Notes

⚠️ **Development Only:**
- `.env` file included in repository for local development
- Default SECRET_KEY is not secure
- CORS allows all methods/headers

⚠️ **Before Production:**
- Generate secure SECRET_KEY: `openssl rand -hex 32`
- Set ENVIRONMENT=production in .env
- Restrict ALLOWED_HOSTS to your actual domain
- Use HTTPS (set up SSL certificates)
- Database password must be strong
- Enable proper logging and monitoring

## Additional Resources

- **Backend Docs:** http://localhost:8085/api/docs
- **OpenAPI Schema:** http://localhost:8085/api/openapi.json
- **Database Models:** `backend/app/models/`
- **API Routers:** `backend/app/routers/`
- **Frontend Scripts:** `frontend/js/`

## Support

For issues or questions:
1. Check the API documentation at /api/docs
2. Review backend logs for errors
3. Check database for data integrity
4. Run migrations if schema changed
