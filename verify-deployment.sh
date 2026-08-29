#!/bin/bash

# FundingSathi CRM - Post-Deployment Verification Script
# Run this to verify the deployment is working correctly
# Usage: bash verify-deployment.sh [DOMAIN] [PROTOCOL]
#   DOMAIN: Your domain (default: localhost)
#   PROTOCOL: http or https (default: http for localhost, https for others)

DOMAIN=${1:-localhost}
PROTOCOL=${2:-""}

# Determine default protocol
if [ -z "$PROTOCOL" ]; then
    if [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "127.0.0.1" ]; then
        PROTOCOL="http"
    else
        PROTOCOL="https"
    fi
fi

# For localhost and docker testing, use different ports
if [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "127.0.0.1" ]; then
    API_URL="${PROTOCOL}://127.0.0.1:8085"
else
    API_URL="${PROTOCOL}://api.${DOMAIN}"
fi

echo "═══════════════════════════════════════════════════════════"
echo "  Verifying FundingSathi CRM Deployment"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Testing: $API_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
SKIPPED=0

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected=$3
    
    echo -n "  Testing $name... "
    response=$(curl -s -k -L "$endpoint" 2>&1)
    
    if [[ $response == *"$expected"* ]]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        if [ ! -z "$response" ]; then
            echo "    Response: ${response:0:100}"
        fi
        ((FAILED++))
    fi
}

# Test docker services (only if on localhost)
if [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "127.0.0.1" ]; then
    echo -e "${BLUE}Docker Services:${NC}"
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "  Note: docker-compose.prod.yml not found or not running"
        echo ""
    else
        echo "  Docker not available - skipping service check"
        echo ""
    fi
fi

# Test API endpoints
echo -e "${BLUE}API Endpoints:${NC}"
test_endpoint "Health check" "${API_URL}/health" "ok"
test_endpoint "OpenAPI docs" "${API_URL}/docs" "swagger"
test_endpoint "OpenAPI schema" "${API_URL}/openapi.json" "openapi"
echo ""

# Test noindex robots header
echo -e "${BLUE}SEO/Security Headers:${NC}"
echo -n "  Checking X-Robots-Tag header... "
robots_response=$(curl -s -k -i "${API_URL}/health" 2>&1 | grep -i "x-robots-tag" || true)
if [ ! -z "$robots_response" ] && [[ $robots_response == *"noindex"* ]]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "    $robots_response"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ SKIPPED${NC}"
    echo "    No X-Robots-Tag header (may be behind reverse proxy)"
    ((SKIPPED++))
fi
echo ""

# Test CORS
echo -e "${BLUE}CORS Configuration:${NC}"
echo -n "  Checking CORS headers... "
cors_response=$(curl -s -k -i "${API_URL}/health" 2>&1 | grep -i "access-control-allow-origin" || true)
if [ ! -z "$cors_response" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "    $cors_response"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo "    No CORS headers found (may be behind proxy)"
    ((SKIPPED++))
fi
echo ""

# Test database (only if we can access docker)
if [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "127.0.0.1" ]; then
    echo -e "${BLUE}Database:${NC}"
    echo -n "  Testing database connection... "
    if command -v docker-compose &> /dev/null; then
        db_test=$(docker-compose -f docker-compose.prod.yml exec -T backend python -c "from app.database import SessionLocal; db = SessionLocal(); print('ok')" 2>&1)
        if [[ $db_test == *"ok"* ]]; then
            echo -e "${GREEN}✓ PASS${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAIL${NC}"
            echo "    Error: $db_test"
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠ SKIPPED${NC}"
        echo "    Docker not available"
        ((SKIPPED++))
    fi
    echo ""
fi

# Test SSL certificate (only for HTTPS)
if [ "$PROTOCOL" = "https" ] && [ "$DOMAIN" != "localhost" ]; then
    echo -e "${BLUE}SSL Certificate:${NC}"
    echo -n "  Checking certificate for api.${DOMAIN}... "
    cert_file="/etc/letsencrypt/live/api.${DOMAIN}/fullchain.pem"
    if [ -f "$cert_file" ]; then
        expiry=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
        echo -e "${GREEN}✓ PASS${NC}"
        echo "    Expires: $expiry"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠ SKIPPED${NC}"
        echo "    Certificate file not found at: $cert_file"
        ((SKIPPED++))
    fi
    echo ""
fi

# Summary
echo "═══════════════════════════════════════════════════════════"
echo -e "${BLUE}Test Summary:${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "  ${RED}Failed: $FAILED${NC}"
else
    echo "  Failed: 0"
fi
if [ $SKIPPED -gt 0 ]; then
    echo -e "  ${YELLOW}Skipped: $SKIPPED${NC}"
fi
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}✗ Deployment verification FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Deployment verification PASSED${NC}"
    exit 0
fi

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
