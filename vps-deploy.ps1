# VPS Deployment Script
# This script provides the commands needed to deploy the CRM application to a VPS

Write-Host "=========================================="
Write-Host "CRM Application - VPS Deployment Guide"
Write-Host "=========================================="
Write-Host ""

Write-Host "Step 1: SSH into your VPS"
Write-Host "  ssh root@YOUR_VPS_IP"
Write-Host ""

Write-Host "Step 2: Clone the repository"
Write-Host "  git clone https://github.com/Preeti54444/CRM.git"
Write-Host "  cd CRM"
Write-Host ""

Write-Host "Step 3: Configure environment variables"
Write-Host "  cp .env.production .env"
Write-Host "  # Edit .env with your actual VPS IP and database credentials"
Write-Host "  nano .env"
Write-Host ""

Write-Host "Step 4: Deploy using Docker Compose"
Write-Host "  chmod +x deploy.sh"
Write-Host "  ./deploy.sh"
Write-Host ""

Write-Host "Step 5: Configure firewall (if using UFW)"
Write-Host "  ufw allow 80/tcp"
Write-Host "  ufw allow 443/tcp"
Write-Host "  ufw allow 22/tcp"
Write-Host "  ufw --force enable"
Write-Host ""

Write-Host "Step 6: Access your application"
Write-Host "  Frontend: http://YOUR_VPS_IP"
Write-Host "  API Docs: http://YOUR_VPS_IP/api/docs"
Write-Host ""

Write-Host "=========================================="
Write-Host "Important Notes:"
Write-Host "- Ensure Docker and Docker Compose are installed on VPS"
Write-Host "- Update .env with your actual database credentials"
Write-Host "- The frontend config.js automatically detects production mode"
Write-Host "- Nginx proxies API requests to backend on same origin"
Write-Host "=========================================="
