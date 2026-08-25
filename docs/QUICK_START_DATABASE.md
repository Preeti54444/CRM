# Quick Start: Connect Frontend & Backend to Database

## 🚀 Fastest Way to Get Started

### Prerequisites Check
```bash
python --version          # Should be 3.8+
```

### Step 1: Backend Setup (5 minutes)

```powershell
# Navigate to backend
cd backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run migrations (sets up database schema)
python -m alembic upgrade head

# Start backend
uvicorn app.main:app --reload --port 8085
```

**Expected output:**
```
INFO:     Application startup complete [uvicorn]
INFO:     Uvicorn running on http://0.0.0.0:8085
```

### Step 2: Frontend Setup (2 minutes)

```powershell
# In a NEW terminal window
cd frontend

# Start frontend server
python simple_server.py
```

**Expected output:**
```
Serving HTTP on 0.0.0.0 port 3000...
```

### Step 3: Open in Browser

```
http://localhost:3000
```

✓ You should see the CRM login page!

---

## 🔧 Database Configuration

### Current Configuration (from `.env`)

```
DATABASE_URL=postgresql://postgres:fundingsathicrm@187.127.149.245:5432/fundingsathicrm
ENVIRONMENT=production
FRONTEND_URL=http://187.127.149.245
```

This points to a **VPS database** at `187.127.149.245`.

### ✓ Using VPS Database (Recommended)

The configuration is already set for the VPS. You just need:
1. Network access to 187.127.149.245:5432
2. Valid credentials (already in `.env`)

### ⚙️ Using Local Database (Alternative)

If you want to use a local PostgreSQL instead:

1. **Install PostgreSQL** (download from postgresql.org)

2. **Create local database:**
```sql
psql -U postgres

CREATE DATABASE fundingsathicrm;
CREATE USER crm_user WITH PASSWORD 'crm_password';
ALTER DATABASE fundingsathicrm OWNER TO crm_user;
```

3. **Update `.env`:**
```
DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/fundingsathicrm
FRONTEND_URL=http://localhost:3000
ALLOWED_HOSTS=http://localhost,http://localhost:8085
```

4. **Run migrations:**
```bash
python -m alembic upgrade head
```

---

## ✓ Verify Everything is Connected

### From Terminal
```bash
cd backend

# Test database
python test_integration.py
```

### From Browser Console
```javascript
// Check if frontend can reach backend
fetch('http://localhost:8085/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Should print: {status: "ok", database: true}
```

---

## 📊 Test the Target Assignment Feature

Once everything is connected:

1. **Open admin panel** (login as admin)
2. **Go to Sales Targets**
3. **Assign targets to employee:**
   - Daily Calls: 35
   - Daily Leads: 3
   - Click "Assign"

4. **Employee sees notification:**
   - Employee logs in
   - Goes to My To-Do
   - Sees "Targets Assigned by [Admin]"
   - Sees progress: 0/35 calls, 0/3 leads

✓ Feature is working!

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check port 8085 is free
netstat -ano | findstr :8085

# Try different port
uvicorn app.main:app --reload --port 8086
```

### Database connection error
```bash
# Check if network can reach database
ping 187.127.149.245

# Verify connection string
echo $env:DATABASE_URL  # Show current DATABASE_URL
```

### Frontend can't reach backend
```javascript
// In browser console
localStorage.setItem('crm_api_base', 'http://localhost:8085');
location.reload();
```

### CORS errors
Update `.env`:
```
ALLOWED_HOSTS=http://localhost,http://localhost:8085,http://127.0.0.1:8085
```

---

## 📁 Project Structure

```
crm_fixed/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── main.py      # App entry point
│   │   ├── config.py    # Settings from .env
│   │   ├── database.py  # Database connection
│   │   ├── models/      # Database models (including Target)
│   │   ├── routers/     # API endpoints
│   │   └── services/    # Business logic
│   ├── alembic/         # Database migrations
│   ├── requirements.txt # Dependencies
│   └── venv/            # Virtual environment
│
├── frontend/            # Static HTML/JS/CSS
│   ├── index.html
│   ├── config.js        # API configuration
│   └── simple_server.py # Dev server
│
└── .env                 # Environment variables
```

---

## 🔑 Important Files

| File | Purpose |
|------|---------|
| `.env` | Database credentials and configuration |
| `backend/app/main.py` | Backend entry point |
| `backend/app/config.py` | Configuration loader |
| `backend/app/database.py` | Database connection setup |
| `backend/app/models/targets.py` | Target assignment data model |
| `backend/app/routers/target_management.py` | Target assignment API endpoints |
| `frontend/config.js` | Frontend API configuration |

---

## 🎯 API Endpoints

### Admin Assign Targets
```
POST /api/targets/admin/assign-targets
Body: {
  "employee_id": "...",
  "daily_call_target": 35,
  "daily_lead_target": 3,
  ...
}
Response: {
  "id": 1,
  "employee_name": "John Doe",
  "assigned_by": "Admin Name",
  "assigned_at": "2026-07-20T18:30:00Z",
  "notification_sent": true
}
```

### Employee View Targets
```
GET /api/targets/employee/my-assigned-targets
Response: {
  "daily_calls": 35,
  "daily_leads": 3,
  "assigned_by_name": "Admin Name",
  "assigned_at": "2026-07-20T18:30:00Z"
}
```

### Dashboard with Targets
```
GET /api/dashboard/summary
Response includes: {
  "calls": {"done": 0, "target": 35, "pct": 0.0},
  "leads": {"done": 0, "target": 3, "pct": 0.0},
  "assigned_target_info": {
    "assigned_by": "Admin Name",
    "assigned_at": "2026-07-20T18:30:00Z",
    "notification_sent": true
  }
}
```

---

## 📝 Database Schema

### targets table
```sql
CREATE TABLE targets (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR NOT NULL,
    daily_call_target INTEGER,
    daily_lead_target INTEGER,
    weekly_lead_target INTEGER,
    crm_log_deadline TIMESTAMP,
    effective_from DATE,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP,
    assigned_by UUID REFERENCES users(id),           -- WHO assigned targets
    assigned_at TIMESTAMP,                           -- WHEN targets were assigned
    notification_sent BOOLEAN DEFAULT FALSE          -- Was employee notified?
);
```

---

## 🚀 Next Steps

1. ✓ Start backend and frontend (see above)
2. ✓ Log in to the CRM
3. ✓ Test target assignment feature
4. ✓ Check database has records
5. Deploy to production when ready

---

## 📚 Documentation Files

- [DATABASE_CONNECTION_GUIDE.md](DATABASE_CONNECTION_GUIDE.md) - Detailed setup guide
- [TEST_REPORT.md](TEST_REPORT.md) - Feature testing results
- [FRONTEND_BACKEND_CONNECTION.md](FRONTEND_BACKEND_CONNECTION.md) - Connection troubleshooting

---

Good luck! 🎉
