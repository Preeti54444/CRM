# VPS Deployment Guide

This guide covers deploying the Funding Sathi CRM application to a Virtual Private Server (VPS) using Docker Compose.

## Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04 LTS or later (recommended)
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB
- **CPU**: 2 cores minimum

### Software Requirements on VPS
- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- Git
- UFW firewall (optional but recommended)

## Quick Deployment

### Step 1: SSH into your VPS
```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Install Docker and Docker Compose
```bash
# Update package index
apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Enable Docker to start on boot
systemctl enable docker
```

### Step 3: Clone the Repository
```bash
git clone https://github.com/Preeti54444/CRM.git
cd CRM
```

### Step 4: Configure Environment Variables
```bash
# Copy production environment template
cp .env.production .env

# Edit with your actual configuration
nano .env
```

**Important .env variables to update:**
```bash
ENVIRONMENT=production
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://username:password@host:5432/database_name
ALLOWED_HOSTS=your-vps-ip,localhost
FRONTEND_URL=http://your-vps-ip
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### Step 5: Deploy the Application
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Step 6: Configure Firewall
```bash
# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS (if using SSL)
ufw allow 443/tcp

# Allow SSH
ufw allow 22/tcp

# Enable firewall
ufw --force enable
```

### Step 7: Access Your Application
- **Frontend**: `http://YOUR_VPS_IP`
- **API Documentation**: `http://YOUR_VPS_IP/api/docs`
- **Health Check**: `http://YOUR_VPS_IP/health`

## Architecture Overview

The application uses Docker Compose with the following services:

### Services
1. **Backend** (FastAPI)
   - Port: 8085 (internal)
   - Exposed through nginx on port 80
   - Handles all API requests

2. **Frontend** (Static HTML/JS)
   - Port: 3000 (internal)
   - Exposed through nginx on port 80
   - Serves the CRM interface

3. **Nginx** (Reverse Proxy)
   - Port: 80 (external)
   - Routes API requests to backend
   - Serves frontend static files
   - Handles WebSocket connections
   - Provides SSL termination (when configured)

4. **PostgreSQL** (Database)
   - Port: 5432
   - Stores all application data
   - Can be external or containerized

## Configuration Details

### Frontend API Base URL Detection

The frontend (`config.js`) automatically detects the environment and configures the API base URL:

**Priority Order:**
1. `window.CRM_API_BASE` (environment variable)
2. `window.API_BASE` (manual override)
3. `localStorage.crm_api_base` (cached value)
4. **Production Mode**: Same origin (when on port 80/443)
5. **Localhost**: `http://localhost:8085`
6. **LAN**: Same host with port 8085

**Production Detection:**
When accessed on standard HTTP/HTTPS ports (80/443), the frontend assumes nginx is proxying API requests and uses the same origin.

### Nginx Configuration

Nginx acts as a reverse proxy with the following features:

- **API Routes**: Proxies `/auth`, `/sod`, `/eod`, `/leads`, etc. to backend
- **WebSocket Support**: Proxies `/ws/` endpoints for real-time notifications
- **Static File Caching**: Caches JS, CSS, images for 1 year
- **Security Headers**: HSTS, X-Frame-Options, XSS Protection
- **Rate Limiting**: 10 req/s general, 5 req/m for login
- **SPA Routing**: Serves `index.html` for unknown routes

## Database Setup

### Option 1: Containerized PostgreSQL (Recommended for Testing)

Add to `docker-compose.yml`:
```yaml
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: crm_database
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

Update `.env`:
```bash
DATABASE_URL=postgresql://crm_user:your_password@postgres:5432/crm_database
```

### Option 2: External PostgreSQL (Recommended for Production)

Use a managed PostgreSQL service (e.g., AWS RDS, DigitalOcean Managed Database):

Update `.env`:
```bash
DATABASE_URL=postgresql://username:password@external-host:5432/database_name
```

## SSL/HTTPS Configuration

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

Update `nginx.conf` to uncomment SSL configuration section.

### Manual SSL Configuration

1. Obtain SSL certificate from your provider
2. Place certificate files in `/etc/nginx/ssl/`
3. Update `nginx.conf` SSL section with your paths
4. Restart nginx: `docker-compose restart nginx`

## Monitoring and Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend alembic upgrade head
```

### Backup Database
```bash
# Backup
docker-compose exec postgres pg_dump -U crm_user crm_database > backup.sql

# Restore
docker-compose exec -T postgres psql -U crm_user crm_database < backup.sql
```

## Troubleshooting

### Application Not Accessible
```bash
# Check service status
docker-compose ps

# Check nginx logs
docker-compose logs nginx

# Check firewall status
ufw status
```

### Database Connection Issues
```bash
# Check backend logs
docker-compose logs backend

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test database connection
docker-compose exec backend python -c "from app.database import engine; print(engine.connect())"
```

### API 404 Errors
- Verify nginx is running: `docker-compose ps nginx`
- Check nginx configuration: `docker-compose logs nginx`
- Verify backend is accessible: `curl http://localhost:8085/health`

### Frontend API Connection Issues
- Open browser console and check for API base URL logs
- Verify `config.js` is loaded
- Check that nginx is proxying API routes correctly
- Test API directly: `curl http://YOUR_VPS_IP/health`

## Security Best Practices

1. **Change Default Passwords**: Update all default passwords in `.env`
2. **Use Strong SECRET_KEY**: Generate a secure random key
3. **Enable HTTPS**: Use SSL/TLS for production
4. **Configure Firewall**: Only allow necessary ports
5. **Regular Updates**: Keep Docker and system packages updated
6. **Monitor Logs**: Regularly check for suspicious activity
7. **Database Backups**: Implement automated backup strategy
8. **Limit SSH Access**: Use key-based authentication instead of passwords

## Performance Optimization

### Nginx Tuning
- Adjust `worker_connections` based on traffic
- Enable gzip compression (already configured)
- Configure caching for static assets (already configured)

### Database Optimization
- Use connection pooling
- Add indexes to frequently queried columns
- Regular vacuum and analyze operations

### Docker Resource Limits
Add to `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

## Scaling

### Horizontal Scaling
For high-traffic deployments, consider:
- Load balancer (HAProxy, AWS ALB)
- Multiple backend instances
- Redis for session caching
- CDN for static assets

### Vertical Scaling
- Increase VPS resources (CPU, RAM)
- Optimize database queries
- Enable database caching

## Support

For issues or questions:
- Check application logs: `docker-compose logs -f`
- Review this guide's troubleshooting section
- Check existing documentation in the repository
