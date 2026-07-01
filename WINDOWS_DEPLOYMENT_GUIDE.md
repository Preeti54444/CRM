# CRM Windows Deployment Guide (Local PostgreSQL)

## Prerequisites
- Docker Desktop installed on Windows
- PostgreSQL installed and running on Windows (port 5432)
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

### 2. Configure PostgreSQL to Accept Connections
Edit `postgresql.conf` (usually in `C:\Program Files\PostgreSQL\15\data\`):
```
listen_addresses = '*'
```

Edit `pg_hba.conf` (same directory):
```
# Add this line to allow connections from Docker
host    crm_database    crm_user    172.16.0.0/12    md5
host    crm_database    crm_user    192.168.0.0/16    md5
```

### 3. Restart PostgreSQL Service
```powershell
# Open PowerShell as Administrator
Restart-Service postgresql-x64-15
```

## Deployment Steps

### 1. Navigate to Project Directory
```bash
cd "c:\Users\Sneha\Downloads\crm-final (3) (3)\crm-final (6) (3)\crm-final (7)\crm-final (6)\crm-final\clean-project"
```

### 2. Setup Environment File
```bash
cp .env.production .env
```

### 3. Start Docker Desktop
Make sure Docker Desktop is running on Windows.

### 4. Build and Start Services
```bash
docker compose up -d
```

### 5. Run Database Migrations
```bash
docker compose exec backend alembic upgrade head
```

### 6. Check Service Status
```bash
docker compose ps
```

## Configure Windows Firewall

Allow inbound connections on ports 80, 3000, and 8085:

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "CRM HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "CRM Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "CRM Backend" -Direction Inbound -Protocol TCP -LocalPort 8085 -Action Allow
```

## Access URLs

**From the same machine:**
- http://localhost
- http://localhost:3000
- http://localhost:8085/api/docs (API documentation)

**From other devices on LAN (192.168.1.x):**
- http://192.168.1.13
- http://192.168.1.13:3000

## Login Credentials
- **Email:** shree.rathod@fundingsathi.in
- **Password:** Shree.Admin@2026

## Troubleshooting

### Docker Desktop not running
- Start Docker Desktop from Windows Start menu
- Wait for it to fully initialize (check system tray)

### Cannot connect to PostgreSQL from Docker
- Verify PostgreSQL is running: `Get-Service postgresql*`
- Check PostgreSQL is listening on port 5432: `netstat -an | findstr 5432`
- Verify `host.docker.internal` resolves: `docker compose exec backend ping host.docker.internal`

### Database connection fails
```bash
# Test connection from backend container
docker compose exec backend python -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://crm_user:SecureCRM2024Password@host.docker.internal:5432/crm_database')
try:
    conn = engine.connect()
    print('Database connection successful')
    conn.close()
except Exception as e:
    print(f'Database connection failed: {e}')
"
```

### Services not accessible from other devices
- Check Windows Firewall rules
- Verify server IP hasn't changed: `ipconfig`
- Test locally first: `curl http://localhost:80`

### Migration errors
```bash
# Check migration status
docker compose exec backend alembic current

# Reset migrations (WARNING: deletes data)
docker compose exec backend alembic downgrade base
docker compose exec backend alembic upgrade head
```

## Management Commands

```bash
# View logs
docker compose logs backend -f
docker compose logs frontend -f
docker compose logs nginx -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Start services
docker compose up -d

# Rebuild services
docker compose up -d --build
```

## Notes
- Backend connects to local PostgreSQL via `host.docker.internal`
- Frontend automatically connects to backend on same host
- All services run in Docker containers except PostgreSQL
- ALLOWED_HOSTS configured for LAN access (192.168.1.13)
