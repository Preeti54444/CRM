#!/bin/bash
# CRM Application - VPS Deployment Script
# Run this script on your VPS after cloning the repository

set -e

echo "🚀 CRM Application - VPS Deployment Script"
echo "==========================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Install Docker from: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    echo "Install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env with your configuration${NC}"
    exit 1
fi

# Pull latest images
echo ""
echo "📦 Pulling Docker images..."
docker-compose pull

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo ""
echo "🟢 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready (30 seconds)..."
sleep 30

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
docker-compose exec -T backend alembic upgrade head

# Check service health
echo ""
echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📱 Access your application at:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "   Backend API: http://$(hostname -I | awk '{print $1}'):8000"
echo "   API Docs: http://$(hostname -I | awk '{print $1}'):8000/api/docs"
echo ""
echo "🛑 To stop services, run: docker-compose down"
echo "📊 To view logs, run: docker-compose logs -f [service-name]"
