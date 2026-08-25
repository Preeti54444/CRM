# FundingSathi CRM

A full-stack fintech CRM platform for DSA (Direct Selling Agent) channel partners. Built with Python/FastAPI backend and Vue.js frontend.

## 📁 Project Structure

```
FundingSathi-CRM/
├── backend/               # Python/FastAPI backend
│   ├── app/              # Application code
│   ├── alembic/          # Database migrations
│   ├── tests/            # Unit tests
│   ├── scripts/          # Utility scripts
│   └── systemd/          # Service files
├── frontend/             # Vue.js frontend
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript utilities
│   └── plugins/          # Vue plugins
├── db/                   # Database files
│   └── indices.sql       # Database indices
├── ops/                  # Operations/deployment files
├── load_tests/           # Performance testing
├── docs/                 # Documentation
├── docker-compose.yml    # Local development
├── docker-compose.prod.yml # Production setup
└── nginx.conf            # Nginx configuration
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.12+ (for local development)
- Node.js 18+ (for frontend)

### Local Development with Docker

```bash
# 1. Copy environment files
cp .env.example .env
cp .env.prod.example .env.prod

# 2. Start services
docker-compose up -d

# 3. Initialize database
docker-compose exec backend python -m alembic upgrade head

# 4. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
```

### Local Development (Without Docker)

Refer to `docs/NO_DOCKER_STARTUP_GUIDE.md` for setup without Docker.

## 📚 Documentation

Key guides are in the `docs/` folder:

- **Getting Started**
  - `QUICK_START.md` - 5-minute setup guide
  - `README.md` - Main documentation
  
- **Deployment**
  - `WINDOWS_DEPLOYMENT_GUIDE.md` - Windows server setup
  - `VPS_DEPLOYMENT_GUIDE.md` - Linux/VPS deployment
  - `LAN_DEPLOYMENT_GUIDE.md` - LAN network setup
  - `DOCKER_STARTUP_GUIDE.md` - Docker deployment
  
- **Features**
  - `FORECAST_MODULE_DOCUMENTATION.md` - Forecast system
  - `TARGET_MANAGEMENT_SYSTEM.md` - Target management
  - `PIPELINE_SYSTEM_DOCUMENTATION.md` - Pipeline workflow
  - `IST_CLOCK_IMPLEMENTATION_GUIDE.md` - IST timezone support
  
- **Database**
  - `DATABASE_CONNECTION_GUIDE.md` - Connection setup
  - `README_DATABASE_CONNECTION.md` - Database details
  
- **Integration**
  - `FRONTEND_BACKEND_CONNECTION.md` - API integration
  - `ADMIN_EMPLOYEES_INTEGRATION_GUIDE.md` - Employee management

## 🔧 Backend

Built with FastAPI and PostgreSQL.

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
python -m alembic upgrade head

# Start server
uvicorn app.main:app --reload

# Run tests
pytest tests/
```

## 🎨 Frontend

Built with Vue.js 3.

```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build
```

## 🗄️ Database

The CRM uses PostgreSQL. Database configuration is managed through environment variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fundingsathi
```

See `db/indices.sql` for database optimization.

## 📊 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: `openapi.json`

## 🚢 Deployment

### Production Deployment

```bash
# Using docker-compose (production)
docker-compose -f docker-compose.prod.yml up -d

# Or with PowerShell scripts
./vps-deploy.ps1         # VPS deployment
./run-lan.ps1            # LAN deployment
./deploy-vps.ps1         # Alternative VPS script
```

### Load Testing

```bash
cd load_tests
locust -f locustfile.py
```

## 📝 Environment Variables

Copy template files and configure:
- `.env.example` → `.env` (local development)
- `.env.prod.example` → `.env.prod` (production)

## 🔐 Security

- Stored secrets in `/ops/SECRETS.md`
- Always use environment variables for sensitive data
- Review security guidelines before deployment

## 📦 Build & Release

- Clean distribution ready for deployment
- Removed development artifacts (venv, cache files)
- Optimized for production use
- All dependencies managed through requirements.txt and package.json

## 📞 Support

Refer to documentation in `docs/` folder for:
- Troubleshooting
- Integration steps
- Deployment procedures
- API reference

---

**Project Size**: ~35MB (production-ready, no venv/caches)  
**Last Updated**: August 2026  
**Version**: 3.0 (Final)
