#!/bin/bash

# FundingSathi CRM - Post-Deployment Verification Script
# Run this on your VPS after deploy-vps.sh completes
# Usage: bash verify-deployment.sh YOUR-DOMAIN.com

DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo "Usage: bash verify-deployment.sh YOUR-DOMAIN.com"
    exit 1
fi

API_URL="https://api.${DOMAIN}"

echo "═══════════════════════════════════════════════════════════"
echo "  Verifying FundingSathi CRM Deployment"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected=$3
    
    echo -n "Testing $name... "
    response=$(curl -s -k "$endpoint" 2>&1)
    
    if [[ $response == *"$expected"* ]]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Response: $response"
        ((FAILED++))
    fi
}

# Test Docker services
echo -e "${YELLOW}Docker Services:${NC}"
docker-compose ps
echo ""

# Test API endpoints
echo -e "${YELLOW}API Endpoints:${NC}"
test_endpoint "Health check" "${API_URL}/health" "ok"
test_endpoint "OpenAPI docs" "${API_URL}/api/docs" "swagger"
test_endpoint "OpenAPI schema" "${API_URL}/api/openapi.json" "openapi"
echo ""

# Test CORS (from backend container)
echo -e "${YELLOW}CORS Configuration:${NC}"
echo -n "Checking CORS headers... "
cors_response=$(curl -s -k -i "${API_URL}/health" 2>&1 | grep -i "access-control-allow-origin" || true)
if [ ! -z "$cors_response" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "  $cors_response"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi
echo ""

# Test database
echo -e "${YELLOW}Database:${NC}"
echo -n "Testing database connection... "
db_test=$(docker-compose exec -T backend python -c "from app.database import SessionLocal; db = SessionLocal(); print('ok')" 2>&1)
if [[ $db_test == *"ok"* ]]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Error: $db_test"
    ((FAILED++))
fi
echo ""

# Test SSL certificate
echo -e "${YELLOW}SSL Certificate:${NC}"
echo -n "Checking certificate for api.${DOMAIN}... "
cert_file="/etc/letsencrypt/live/api.${DOMAIN}/fullchain.pem"
if [ -f "$cert_file" ]; then
    expiry=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
    echo -e "${GREEN}✓ PASS${NC}"
    echo "  Expires: $expiry"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi
echo ""

# Test Nginx
echo -e "${YELLOW}Nginx Reverse Proxy:${NC}"
echo -n "Checking Nginx configuration... "
nginx_test=$(docker-compose exec nginx nginx -t 2>&1 | grep "successful" || true)
if [ ! -z "$nginx_test" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi
echo ""

# Test Redis (if using docker-compose.prod.yml)
echo -e "${YELLOW}Redis (Background Jobs):${NC}"
echo -n "Testing Redis connection... "
redis_test=$(docker-compose exec -T redis redis-cli ping 2>&1)
if [[ $redis_test == *"PONG"* ]]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════"
echo -e "${YELLOW}Test Summary:${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Deployment successful.${NC}"
    echo ""
    echo "Frontend: https://your-app.vercel.app"
    echo "Backend:  ${API_URL}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check logs with:${NC}"
    echo "  docker-compose logs -f"
    exit 1
fi
