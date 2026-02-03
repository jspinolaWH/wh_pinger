#!/bin/bash

# Deployment Verification Script

echo "🔍 WasteHero Heartbeat Monitor - Deployment Verification"
echo "========================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Test function
test_check() {
    local name=$1
    local command=$2
    local expected=$3
    
    echo -n "Testing: $name... "
    
    if eval "$command" &> /dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# Check Docker
echo "📦 Docker Environment"
echo "--------------------"
test_check "Docker installed" "command -v docker"
test_check "Docker running" "docker ps"
test_check "Docker Compose installed" "docker-compose version || docker compose version"
echo ""

# Check Project Files
echo "📁 Project Files"
echo "----------------"
test_check "Backend Dockerfile exists" "test -f Dockerfile.backend"
test_check "Frontend Dockerfile exists" "test -f Dockerfile.frontend"
test_check "docker-compose.yml exists" "test -f docker-compose.yml"
test_check "nginx.conf exists" "test -f nginx.conf"
test_check "Server code exists" "test -d server"
test_check "Client code exists" "test -d client"
test_check "Config files exist" "test -d config"
echo ""

# Check Configuration
echo "⚙️  Configuration"
echo "-----------------"
test_check "services.json exists" "test -f config/services.json"
test_check "thresholds.json exists" "test -f config/thresholds.json"
test_check "config.json exists" "test -f config/config.json"
test_check "services.json valid JSON" "python3 -m json.tool config/services.json"
test_check "thresholds.json valid JSON" "python3 -m json.tool config/thresholds.json"
test_check "config.json valid JSON" "python3 -m json.tool config/config.json"
echo ""

# Check if containers are built
echo "🐳 Docker Images"
echo "----------------"
if docker images | grep -q "wastehero-backend"; then
    echo -e "${GREEN}✓ Backend image exists${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ Backend image not built yet${NC}"
fi

if docker images | grep -q "wastehero-frontend"; then
    echo -e "${GREEN}✓ Frontend image exists${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ Frontend image not built yet${NC}"
fi
echo ""

# Check if containers are running
echo "🚀 Running Containers"
echo "---------------------"
if docker ps | grep -q "wastehero-backend"; then
    echo -e "${GREEN}✓ Backend container running${NC}"
    ((PASSED++))
    
    # Test backend API
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend API responding${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Backend API not responding${NC}"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ Backend container not running${NC}"
fi

if docker ps | grep -q "wastehero-frontend"; then
    echo -e "${GREEN}✓ Frontend container running${NC}"
    ((PASSED++))
    
    # Test frontend
    if curl -s http://localhost/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend responding${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Frontend not responding${NC}"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ Frontend container not running${NC}"
fi
echo ""

# Check ports
echo "🌐 Port Availability"
echo "--------------------"
if ! netstat -an 2>/dev/null | grep -q ":80 "; then
    echo -e "${GREEN}✓ Port 80 available${NC}"
    ((PASSED++))
else
    if docker ps | grep -q "wastehero-frontend"; then
        echo -e "${GREEN}✓ Port 80 in use by frontend${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Port 80 in use by another process${NC}"
        ((FAILED++))
    fi
fi

if ! netstat -an 2>/dev/null | grep -q ":3000 "; then
    echo -e "${GREEN}✓ Port 3000 available${NC}"
    ((PASSED++))
else
    if docker ps | grep -q "wastehero-backend"; then
        echo -e "${GREEN}✓ Port 3000 in use by backend${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Port 3000 in use by another process${NC}"
        ((FAILED++))
    fi
fi

if ! netstat -an 2>/dev/null | grep -q ":3001 "; then
    echo -e "${GREEN}✓ Port 3001 available${NC}"
    ((PASSED++))
else
    if docker ps | grep -q "wastehero-backend"; then
        echo -e "${GREEN}✓ Port 3001 in use by backend WebSocket${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Port 3001 in use by another process${NC}"
        ((FAILED++))
    fi
fi
echo ""

# Summary
echo "📊 Summary"
echo "----------"
TOTAL=$((PASSED + FAILED))
echo "Total checks: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

# Final verdict
if [ $FAILED -eq 0 ]; then
    if docker ps | grep -q "wastehero-"; then
        echo -e "${GREEN}✅ SYSTEM FULLY OPERATIONAL!${NC}"
        echo ""
        echo "Access your dashboard at:"
        echo "  🌐 http://localhost"
        echo "  📡 API: http://localhost:3000"
        echo "  🔌 WebSocket: ws://localhost:3001"
    else
        echo -e "${YELLOW}⚠️  SYSTEM READY - Not deployed yet${NC}"
        echo ""
        echo "To deploy, run:"
        echo "  docker-compose up -d --build"
    fi
else
    echo -e "${RED}❌ ISSUES DETECTED${NC}"
    echo ""
    echo "To diagnose:"
    echo "  docker-compose logs"
    echo "  docker-compose ps"
    echo ""
    echo "To rebuild:"
    echo "  docker-compose down -v"
    echo "  docker-compose up -d --build"
fi

echo ""
