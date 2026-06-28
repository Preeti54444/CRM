# CRM Application - Production Ready

A comprehensive Customer Relationship Management (CRM) application built with FastAPI (Python backend) and vanilla JavaScript frontend.

## Project Structure

```
clean-project/
├── backend/              # FastAPI backend
│   ├── app/             # Main application code
│   ├── alembic/         # Database migrations
│   ├── scripts/         # Utility scripts
│   ├── Dockerfile       # Backend container config
│   ├── requirements.txt  # Python dependencies
│   └── alembic.ini      # Migration config
├── frontend/            # Web frontend
│   ├── js/              # JavaScript modules
│   ├── css/             # Stylesheets
│   ├── data/            # Frontend data files
│   ├── crm1.html        # Main CRM page
│   ├── login.html       # Login page
│   ├── Dockerfile       # Frontend container config
│   └── package.json     # Node dependencies
├── docker-compose.yml   # Multi-container orchestration
├── nginx.conf           # Nginx reverse proxy config
├── init-db.sh           # Database initialization script
├── .env.example         # Environment variables template
└── openapi.json         # API documentation (OpenAPI 3.0)
```

## Quick Start - Local (No Docker)

This project supports a production-like local workflow using PostgreSQL directly, without Docker.

### Prerequisites
- Python 3.11+ installed
- PostgreSQL running locally on `localhost:5432`
- A `backend/.env` file configured with your local database connection
- Node.js is not required for the static frontend

### Setup

1. **Copy the environment template into the backend folder:**
   ```powershell
   Copy-Item .\.env.example backend\.env
   ```

2. **Edit `backend/.env` with your local values:**
   ```powershell
   $env:DATABASE_URL = 'postgresql://postgres:fundingsathicrm@localhost:5432/fundingsathicrm'
   $env:ALLOWED_HOSTS = 'http://localhost:3000,http://127.0.0.1:3000'
   $env:FRONTEND_URL = 'http://localhost:3000'
   $env:API_BASE = 'http://localhost:8085'
   ```

3. **Install backend dependencies:**
   ```powershell
   cd backend
   python -m pip install -r requirements.txt
   ```

4. **Run Alembic migrations:**
   ```powershell
   cd ..\backend
   python -m alembic upgrade head
   ```

5. **Start the backend:**
   ```powershell
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8085 --log-level info
   ```

6. **Start the frontend static server:**
   ```powershell
   cd ..\frontend
   python -m http.server 3000
   ```

7. **Open the frontend in your browser:**
   - http://localhost:3000

8. **Verify the backend:**
   - http://localhost:8085/api/docs

### Helpful helper script
A local helper script is available to run migrations and start servers on Windows:
```powershell
.\run-local.ps1 -All
```

---

## Quick Start - Docker Compose

### Prerequisites
- Docker & Docker Compose v2.0+
- At least 4GB RAM available

### Setup

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your configuration:**
   ```bash
   # Security
   SECRET_KEY=<generate-with: openssl rand -hex 32>
   
   # Database
   DATABASE_URL=postgresql://crm_user:crm_password@postgres:5432/crm_database
   
   # URLs
   FRONTEND_URL=https://your-domain.com
   ALLOWED_HOSTS=https://your-domain.com
   
   # Email (optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-specific-password
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8085
   - API Docs: http://localhost:8085/api/docs
   - Nginx (production): http://localhost:80

### Stop services:
```bash
docker-compose down
```

## Services

### PostgreSQL Database
- Port: 5432
- User: `crm_user`
- Database: `crm_database`
- Volume: `postgres_data` (persistent)

### Backend (FastAPI)
- Port: 8085
- Framework: FastAPI
- Python Version: 3.11+
- Auto-reloading on code changes

### Frontend (Web)
- Port: 3000
- Technology: Vanilla JavaScript, HTML5, CSS3
- Features: Employee management, task tracking, CRM dashboard

### Nginx Reverse Proxy
- Port: 80
- Routes requests to frontend and backend

## Environment Variables

See `.env.example` for all available environment variables:
- `ENVIRONMENT` - deployment environment (development/production)
- `LOG_LEVEL` - logging level (DEBUG/INFO/WARNING/ERROR)
- `SECRET_KEY` - JWT secret key
- `DATABASE_URL` - PostgreSQL connection string
- `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT token expiration
- `FRONTEND_URL` - Frontend URL for CORS
- `SMTP_*` - Email configuration

## API Documentation

Full API documentation available at `/api/docs` when backend is running.

Exported OpenAPI specification: `openapi.json`

## Database

Database schema is managed via Alembic migrations in `backend/alembic/versions/`.

To create a new migration:
```bash
docker-compose exec backend alembic revision --autogenerate -m "Description"
```

## Deployment to VPS

1. **Clone repository** on VPS
2. **Install Docker & Docker Compose**
3. **Configure .env** with production values
4. **Set up SSL certificates** (update nginx.conf)
5. **Run docker-compose up -d**
6. **Configure domain DNS** to point to VPS IP

## Production Checklist

- [ ] Set `ENVIRONMENT=production` in .env
- [ ] Generate strong `SECRET_KEY`
- [ ] Configure valid `DATABASE_URL`
- [ ] Set `ALLOWED_HOSTS` and `FRONTEND_URL`
- [ ] Configure SMTP for email notifications
- [ ] Set up SSL/TLS certificates
- [ ] Configure backup strategy for PostgreSQL
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules
- [ ] Enable database backups

## Support

For issues or questions, refer to the API documentation or check backend logs:
```bash
docker-compose logs -f backend
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-06-16  
**License**: Proprietary
