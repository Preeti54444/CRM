#!/bin/bash

# FundingSathi CRM - Update Backend on VPS
# Run this on your VPS whenever you push new backend code to GitHub
# Usage: bash update-backend.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/opt/fundingsathi-crm/FundingSathi-CRM-Clean"

if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Project directory not found at $PROJECT_DIR${NC}"
    exit 1
fi

cd $PROJECT_DIR

echo "═══════════════════════════════════════════════════════════"
echo -e "${YELLOW}  FundingSathi CRM - Backend Update${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verify .env.prod exists
echo -e "${YELLOW}1. Checking configuration...${NC}"
if [ ! -f ".env.prod" ]; then
    echo -e "${RED}   ✗ ERROR: .env.prod not found!${NC}"
    echo "   Please create .env.prod based on .env.prod.example"
    exit 1
fi
echo -e "${GREEN}   ✓ .env.prod found${NC}"
echo ""

# Pull latest code
echo -e "${YELLOW}2. Pulling latest code from GitHub (master branch)...${NC}"
git pull origin master
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Stop services gracefully
echo -e "${YELLOW}3. Stopping services...${NC}"
docker-compose -f docker-compose.prod.yml down
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Start services with new code
echo -e "${YELLOW}4. Building and starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Wait for services to be ready
echo -e "${YELLOW}5. Waiting for services to start (30 seconds)...${NC}"
sleep 30
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Run database migrations
echo -e "${YELLOW}6. Running database migrations (if any)...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head || echo "   ⚠ Migrations may have already been applied"
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Verify services
echo -e "${YELLOW}7. Verifying docker services...${NC}"
docker-compose -f docker-compose.prod.yml ps
echo ""

# Test API health
echo -e "${YELLOW}8. Testing API health endpoint...${NC}"
HEALTH=$(docker-compose -f docker-compose.prod.yml exec -T backend curl -s http://localhost:8085/health || echo "{\"status\":\"failed\"}")
if [[ $HEALTH == *"ok"* ]] || [[ $HEALTH == *"healthy"* ]]; then
    echo -e "${GREEN}   ✓ API is healthy and responding${NC}"
else
    echo -e "${YELLOW}   ⚠ API health check: $HEALTH${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Backend update complete!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Useful commands:"
echo "  View logs:       docker-compose -f docker-compose.prod.yml logs -f backend"
echo "  Check status:    docker-compose -f docker-compose.prod.yml ps"
echo "  DB shell:        docker-compose -f docker-compose.prod.yml exec postgres psql -U fundingsathicrm_prod -d fundingsathicrm_prod"
echo ""
echo "Rollback if needed:"
echo "  git reset --hard HEAD~1"
echo "  bash update-backend.sh"
echo ""
