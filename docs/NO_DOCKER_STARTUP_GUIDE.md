# CRM Startup Guide (No Docker Required)

## Prerequisites
- Python 3.11+ installed
- PostgreSQL installed and running
- Git installed

## Project Location
**Path:** `c:\Users\Sneha\Downloads\crm-final (3) (3)\crm-final (6) (3)\crm-final (7)\crm-final (6)\crm-final\clean-project`

## PostgreSQL Setup

### 1. Create Database and User
```sql
-- Open pgAdmin or connect to PostgreSQL via psql
CREATE DATABASE crm_database;
CREATE USER crm_user WITH PASSWORD 'SecureCRM2024Password';
GRANT ALL PRIVILEGES ON DATABASE crm_database TO crm_user;
```

### 2. Configure PostgreSQL for LAN Access
Edit `postgresql.conf` (usually in `C:\Program Files\PostgreSQL\15\data\`):
```
listen_addresses = '*'
```

Edit `pg_hba.conf` (same directory):
```
# Add these lines
host    crm_database    crm_user    192.168.0.0/16    md5
host    crm_database    crm_user    172.16.0.0/12    md5
```

### 3. Restart PostgreSQL Service
```powershell
# Open PowerShell as Administrator
Restart-Service postgresql-x64-15
```

## Backend Setup

### 1. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup Environment Variables
Create `backend\.env` file:
```
ENVIRONMENT=production
SECRET_KEY=e84bb91e4680d11d396909970785694a5c09fc7e9c9c142c583a2ede7d10ecf9
DATABASE_URL=postgresql://crm_user:SecureCRM2024Password@localhost:5432/crm_database
ALLOWED_HOSTS=http://192.168.1.13,http://localhost
FRONTEND_URL=http://192.168.1.13:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### 3. Run Database Migrations
```bash
cd backend
alembic upgrade head
```

### 4. Start Backend Server
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8085
```

Backend will be available at: http://192.168.1.13:8085

## Frontend Setup

### 1. Start Frontend Server
```bash
cd frontend
python -m http.server 3000
```

Frontend will be available at: http://192.168.1.13:3000

## Access URLs

**From the same machine:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8085
- API Docs: http://localhost:8085/api/docs

**From other devices on LAN (192.168.1.x):**
- Frontend: http://192.168.1.13:3000
- Backend API: http://192.168.1.13:8085

## Configure Windows Firewall

Allow inbound connections on ports 3000 and 8085:

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "CRM Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "CRM Backend" -Direction Inbound -Protocol TCP -LocalPort 8085 -Action Allow
```

## Login Credentials
- **Email:** shree.rathod@fundingsathi.in
- **Password:** Shree.Admin@2026

## Quick Start (All Services)

Open 3 separate terminal windows:

**Terminal 1 - Backend:**
```bash
cd "c:\Users\Sneha\Downloads\crm-final (3) (3)\crm-final (6) (3)\crm-final (7)\crm-final (6)\crm-final\clean-project\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8085
```

**Terminal 2 - Frontend:**
```bash
cd "c:\Users\Sneha\Downloads\crm-final (3) (3)\crm-final (6) (3)\crm-final (7)\crm-final (6)\crm-final\clean-project\frontend"
python -m http.server 3000
```

**Terminal 3 - Database Migrations (run once):**
```bash
cd "c:\Users\Sneha\Downloads\crm-final (3) (3)\crm-final (6) (3)\crm-final (7)\crm-final (6)\crm-final\clean-project\backend"
alembic upgrade head
```

## Troubleshooting

### Backend won't start
- Check Python version: `python --version` (should be 3.11+)
- Install dependencies: `pip install -r requirements.txt`
- Check database connection: verify PostgreSQL is running

### Frontend won't start
- Check Python is installed
- Verify port 3000 is not in use: `netstat -an | findstr 3000`

### Cannot access from other devices
- Check Windows Firewall rules
- Verify server IP: `ipconfig`
- Test locally first: `curl http://localhost:3000`

### Database connection errors
- Verify PostgreSQL is running: `Get-Service postgresql*`
- Check database exists: `psql -U crm_user -d crm_database`
- Test connection string in backend/.env

## Notes
- No Docker required
- Backend runs with uvicorn
- Frontend runs with Python http.server
- PostgreSQL runs natively on Windows
- All services accessible from LAN
