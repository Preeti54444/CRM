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

# Pull latest code
echo -e "${YELLOW}1. Pulling latest code from GitHub...${NC}"
git pull origin master
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Stop services
echo -e "${YELLOW}2. Stopping services...${NC}"
docker-compose -f docker-compose.prod.yml down
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Start services with new code
echo -e "${YELLOW}3. Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Wait for services
echo -e "${YELLOW}4. Waiting for services to start...${NC}"
sleep 10
echo -e "${GREEN}   ✓ Done${NC}"
echo ""

# Verify
echo -e "${YELLOW}5. Verifying deployment...${NC}"
docker-compose ps
echo ""

# Check API
DOMAIN=$(grep "server_name" nginx.conf | head -1 | awk '{print $2}' | tr -d ';' | head -1)
if [ ! -z "$DOMAIN" ]; then
    echo -e "${YELLOW}6. Testing API...${NC}"
    HEALTH=$(curl -s -k "https://api.${DOMAIN}/health" || echo "failed")
    if [[ $HEALTH == *"ok"* ]]; then
        echo -e "${GREEN}   ✓ API is responding${NC}"
    else
        echo -e "${YELLOW}   ⚠ API check inconclusive (may still be starting)${NC}"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Backend update complete!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "View logs:"
echo "  docker-compose logs -f backend"
echo ""
echo "Rollback if needed:"
echo "  git reset --hard HEAD~1"
echo "  bash update-backend.sh"
echo ""
