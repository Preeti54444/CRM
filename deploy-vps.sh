#!/bin/bash

# FundingSathi CRM - Automated VPS Deployment Script
# Run this on your VPS with: bash deploy-vps.sh
#
# Prerequisites:
# - Ubuntu/Debian-based VPS
# - Root or sudo access
# - Domain DNS already pointing to this VPS IP
# - Git installed
#
# This script will:
# 1. Install dependencies (Docker, Docker Compose, Certbot)
# 2. Clone the repository
# 3. Generate security keys
# 4. Set up SSL certificates
# 5. Configure environment
# 6. Start services

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════"
echo "  FundingSathi CRM - VPS Deployment Script"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root or with sudo${NC}"
   exit 1
fi

# ═══════════════════════════════════════════════════════════════
# STEP 1: Get user inputs
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 1: Configuration${NC}"
echo ""

read -p "Enter your domain (e.g., fundingsathi.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain cannot be empty${NC}"
    exit 1
fi

read -p "Enter your Vercel app URL (e.g., fundingsathi-crm.vercel.app): " VERCEL_APP
if [ -z "$VERCEL_APP" ]; then
    echo -e "${RED}Vercel app URL cannot be empty${NC}"
    exit 1
fi

read -p "Enter PostgreSQL password (strong, ≥16 chars): " DB_PASSWORD
if [ ${#DB_PASSWORD} -lt 16 ]; then
    echo -e "${RED}Password must be at least 16 characters${NC}"
    exit 1
fi

read -p "Enter SMTP email for notifications (e.g., noreply@gmail.com): " SMTP_USER
read -sp "Enter SMTP app password (will not be displayed): " SMTP_PASSWORD
echo ""

PROJECT_DIR="/opt/fundingsathi-crm"
API_URL="https://api.${DOMAIN}"

echo -e "${GREEN}Configuration saved:${NC}"
echo "  Domain: $DOMAIN"
echo "  API URL: $API_URL"
echo "  Vercel App: $VERCEL_APP"
echo "  Project Directory: $PROJECT_DIR"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: Install dependencies
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 2: Installing dependencies...${NC}"

apt-get update
apt-get install -y curl gnupg lsb-release ubuntu-keyring certbot python3-certbot-nginx

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    bash get-docker.sh
    rm get-docker.sh
    usermod -aG docker $SUDO_USER
    echo -e "${GREEN}Docker installed${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: Clone repository
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 3: Cloning repository...${NC}"

if [ -d "$PROJECT_DIR" ]; then
    echo "Project directory already exists. Updating..."
    cd $PROJECT_DIR
    git pull origin master
else
    git clone https://github.com/Preeti54444/CRM.git $PROJECT_DIR
    cd $PROJECT_DIR/FundingSathi-CRM-Clean
fi

cd $PROJECT_DIR/FundingSathi-CRM-Clean
echo -e "${GREEN}Repository ready${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 4: Generate security keys
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 4: Generating security keys...${NC}"

SECRET_KEY=$(openssl rand -hex 32)
echo "SECRET_KEY generated: $SECRET_KEY"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 5: Create .env.prod
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 5: Creating .env.prod...${NC}"

cat > .env.prod << EOF
ENVIRONMENT=production
LOG_LEVEL=INFO
SECRET_KEY=${SECRET_KEY}
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=fundingsathicrm
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/fundingsathicrm
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALLOWED_HOSTS=https://${VERCEL_APP},${API_URL}
FRONTEND_URL=https://${VERCEL_APP}
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
EMAIL_FROM=noreply@fundingsathi.com
API_BASE=${API_URL}
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
EOF

chmod 600 .env.prod
echo -e "${GREEN}.env.prod created${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 6: Install SSL certificate
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 6: Installing SSL certificate...${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Your domain DNS must point to this VPS IP${NC}"
echo "Checking DNS resolution..."
echo ""

RESOLVED_IP=$(dig +short ${DOMAIN} | tail -1)
CURRENT_IP=$(hostname -I | awk '{print $1}')

echo "Domain: $DOMAIN"
echo "Resolved IP: $RESOLVED_IP"
echo "Current VPS IP: $CURRENT_IP"
echo ""

if [ "$RESOLVED_IP" != "$CURRENT_IP" ]; then
    echo -e "${YELLOW}WARNING: DNS may not be configured yet${NC}"
    read -p "Continue anyway? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        echo "Exiting. Please configure DNS first."
        exit 1
    fi
fi

echo "Requesting SSL certificate (this may take a minute)..."
certbot certonly --standalone -d api.${DOMAIN} --agree-tos --register-unsafely-without-email --non-interactive

if [ -f "/etc/letsencrypt/live/api.${DOMAIN}/fullchain.pem" ]; then
    echo -e "${GREEN}SSL certificate installed${NC}"
else
    echo -e "${RED}SSL certificate installation failed${NC}"
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 7: Update Nginx configuration
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 7: Configuring Nginx...${NC}"

# Backup current config
cp nginx.conf nginx.conf.backup

# Copy production config
cp nginx.prod.conf nginx.conf

# Replace domain placeholder
sed -i "s/YOUR-DOMAIN\.com/${DOMAIN}/g" nginx.conf

echo -e "${GREEN}Nginx configured${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 8: Start services
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 8: Starting Docker services...${NC}"
echo ""
echo "This may take 1-2 minutes on first run..."
echo ""

docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 15

echo ""
echo -e "${YELLOW}Checking service status...${NC}"
docker-compose ps

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 9: Verification
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}STEP 9: Verifying deployment...${NC}"
echo ""

# Test API health
echo "Testing API endpoint..."
HEALTH_CHECK=$(curl -s -k https://api.${DOMAIN}/health || echo "failed")

if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${YELLOW}⚠ API health check failed (may need more time to start)${NC}"
    echo "  Run manually: curl -k https://api.${DOMAIN}/health"
fi

echo ""

# Check database connection
echo "Testing database connection..."
DB_CHECK=$(docker-compose exec backend python -c "from app.database import SessionLocal; db = SessionLocal(); print('ok')" 2>&1 || echo "failed")

if [[ $DB_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}✓ Database connection working${NC}"
else
    echo -e "${YELLOW}⚠ Database check needs verification${NC}"
    echo "  Run: docker-compose logs backend"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 10: Final summary
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Frontend URL:"
echo "  https://${VERCEL_APP}"
echo ""
echo "Backend API URL:"
echo "  ${API_URL}"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose logs -f backend"
echo "  Stop services: docker-compose -f docker-compose.prod.yml down"
echo "  Start services: docker-compose -f docker-compose.prod.yml up -d"
echo "  SSH into backend: docker-compose exec backend bash"
echo "  SSH into DB: docker-compose exec postgres psql -U postgres"
echo ""
echo "Next steps:"
echo "  1. Deploy frontend to Vercel (if not done yet)"
echo "  2. Test login at ${VERCEL_APP}"
echo "  3. Monitor logs: docker-compose logs -f"
echo ""
echo "SSL Certificate:"
echo "  Location: /etc/letsencrypt/live/api.${DOMAIN}/"
echo "  Auto-renewal: Enabled (certbot.timer)"
echo ""
echo "Environment configuration:"
echo "  Location: $(pwd)/.env.prod"
echo ""
echo "IMPORTANT: Keep .env.prod secure and never commit to Git"
echo ""
echo "═══════════════════════════════════════════════════════════"
