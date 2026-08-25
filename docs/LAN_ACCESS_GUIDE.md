# CRM LAN Access Setup

## Server Information
- **Server LAN IP:** 192.168.1.13
- **Access URL:** http://192.168.1.13

## Deployment Steps

### 1. On the Server (192.168.1.13)

```bash
# Navigate to project directory
cd CRM/clean-project

# Use production environment file
cp .env.production .env

# Build and start all services
docker compose up -d

# Run database migrations
docker compose exec backend alembic upgrade head

# Check service status
docker compose ps
```

### 2. Configure Windows Firewall

Allow inbound connections on ports 80 and 3000:

**Using PowerShell (Admin):**
```powershell
# Allow port 80 (HTTP)
New-NetFirewallRule -DisplayName "CRM HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow port 3000 (Frontend)
New-NetFirewallRule -DisplayName "CRM Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Allow port 8085 (Backend API)
New-NetFirewallRule -DisplayName "CRM Backend" -Direction Inbound -Protocol TCP -LocalPort 8085 -Action Allow
```

**Or using Windows Firewall GUI:**
1. Open Windows Defender Firewall
2. Go to "Advanced Settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → "TCP"
5. Enter specific ports: 80, 3000, 8085
6. Allow the connection
7. Apply to all profiles (Domain, Private, Public)

### 3. Access from Other Devices

From any device on the same network (192.168.1.x):
- **Main URL:** http://192.168.1.13
- **Direct Frontend:** http://192.168.1.13:3000
- **API Documentation:** http://192.168.1.13:8085/api/docs

## Troubleshooting

### Cannot access from other devices
1. Check Windows Firewall is allowing connections
2. Verify server IP hasn't changed: `ipconfig`
3. Test locally first: `curl http://localhost:80`
4. Check Docker services are running: `docker compose ps`

### Services not accessible
```bash
# Check Docker logs
docker compose logs backend
docker compose logs frontend
docker compose logs nginx

# Restart services
docker compose restart
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test database connection
docker compose exec backend python -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://crm_user:SecureCRM2024Password@postgres:5432/crm_database')
conn = engine.connect()
print('Database connection successful')
conn.close()
"
```

## Login Credentials
- **Email:** shree.rathod@fundingsathi.in
- **Password:** Shree.Admin@2026

## Notes
- All services run on the same machine (192.168.1.13)
- Frontend automatically connects to backend on same host
- ALLOWED_HOSTS configured for LAN access
- Firewall must allow ports 80, 3000, 8085
