# CRM LAN Deployment Guide

## Network Configuration
- **Frontend Server:** 192.168.1.10:3000
- **Backend Server:** 192.168.1.11:8085
- **Database Server:** 192.168.1.12:5432

## Prerequisites
- Docker installed on all servers
- Git installed on all servers
- Network connectivity between all servers
- PostgreSQL 15 installed on database server (or use Docker)

## Database Server Setup (192.168.1.12)

### Option 1: Using Docker (Recommended)
```bash
# Clone repository
git clone https://github.com/Preeti54444/CRM.git
cd CRM/clean-project

# Start PostgreSQL container
docker run -d \
  --name crm-postgres \
  -e POSTGRES_USER=crm_user \
  -e POSTGRES_PASSWORD=SecureCRM2024Password \
  -e POSTGRES_DB=crm_database \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Allow connections from backend server
# Edit pg_hba.conf or use host-based authentication
```

### Option 2: Native PostgreSQL
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql-15 postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE crm_database;
CREATE USER crm_user WITH PASSWORD 'SecureCRM2024Password';
GRANT ALL PRIVILEGES ON DATABASE crm_database TO crm_user;
\q

# Configure postgresql.conf to listen on all interfaces
sudo nano /etc/postgresql/15/main/postgresql.conf
# Change: listen_addresses = '*'

# Configure pg_hba.conf to allow connections from backend server
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host    crm_database    crm_user    192.168.1.11/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Backend Server Setup (192.168.1.11)

```bash
# Clone repository
git clone https://github.com/Preeti54444/CRM.git
cd CRM/clean-project

# Copy LAN environment file
cp .env.lan .env

# Build and start backend
docker compose up -d backend

# Run database migrations
docker compose exec backend alembic upgrade head

# Check backend logs
docker compose logs backend -f
```

## Frontend Server Setup (192.168.1.10)

```bash
# Clone repository
git clone https://github.com/Preeti54444/CRM.git
cd CRM/clean-project

# Update config.js with backend IP if needed
# (Already configured to use 192.168.1.11)

# Build and start frontend
docker compose up -d frontend nginx

# Check frontend logs
docker compose logs frontend -f
```

## Verify Connectivity

### Test Database Connection from Backend
```bash
# On backend server (192.168.1.11)
docker compose exec backend python -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://crm_user:SecureCRM2024Password@192.168.1.12:5432/crm_database')
try:
    conn = engine.connect()
    print('Database connection successful')
    conn.close()
except Exception as e:
    print(f'Database connection failed: {e}')
"
```

### Test Backend API from Frontend
```bash
# On frontend server (192.168.1.10)
curl http://192.168.1.11:8085/health
```

### Test Frontend Access
```bash
# From any machine on LAN
curl http://192.168.1.10:3000
curl http://192.168.1.10:80
```

## Firewall Configuration

### Database Server (192.168.1.12)
```bash
sudo ufw allow from 192.168.1.11 to any port 5432
sudo ufw enable
```

### Backend Server (192.168.1.11)
```bash
sudo ufw allow 8085/tcp
sudo ufw allow from 192.168.1.10 to any port 8085
sudo ufw enable
```

### Frontend Server (192.168.1.10)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 3000/tcp
sudo ufw allow from 192.168.0.0/16 to any port 80
sudo ufw allow from 192.168.0.0/16 to any port 3000
sudo ufw enable
```

## Access URLs

- **Frontend:** http://192.168.1.10:3000 or http://192.168.1.10
- **Backend API:** http://192.168.1.11:8085
- **API Documentation:** http://192.168.1.11:8085/api/docs

## Troubleshooting

### Backend cannot connect to database
- Check firewall rules on database server
- Verify PostgreSQL is listening on correct interface
- Test connectivity: `telnet 192.168.1.12 5432`

### Frontend cannot connect to backend
- Check firewall rules on backend server
- Verify backend is running: `curl http://192.168.1.11:8085/health`
- Check browser console for CORS errors

### Database migrations fail
- Verify DATABASE_URL in .env file
- Check database server is accessible
- Ensure PostgreSQL user has proper permissions
