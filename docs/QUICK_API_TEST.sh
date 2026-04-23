#!/bin/bash

# WorkNex AI Backend - Quick API Testing Script
# This script tests all major endpoints in sequence

BASE_URL="http://localhost:5000/api/v1"
TOKEN=""
USER_ID=""
LEAVE_ID=""
DEPT_ID=""

echo "========================================="
echo "WorkNex AI Backend - API Testing"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}[1/10] Testing Health Check...${NC}"
curl -s -X GET http://localhost:5000/health | jq '.'
echo ""

# Test 2: Register User
echo -e "${YELLOW}[2/10] Registering Test User...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.api@company.com",
    "password": "TestPass123!",
    "firstName": "API",
    "lastName": "Test",
    "employeeId": "EMP-API-001",
    "role": "EMPLOYEE"
  }')
echo "$REGISTER_RESPONSE" | jq '.'
echo ""

# Test 3: Login
echo -e "${YELLOW}[3/10] Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.api@company.com",
    "password": "TestPass123!"
  }')
echo "$LOGIN_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful! Token obtained.${NC}"
else
  echo -e "${RED}✗ Login failed! Cannot proceed.${NC}"
  exit 1
fi
echo ""

# Test 4: Get My Profile
echo -e "${YELLOW}[4/10] Getting My Profile...${NC}"
curl -s -X GET "$BASE_URL/users/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 5: Get Departments
echo -e "${YELLOW}[5/10] Getting Departments...${NC}"
DEPT_RESPONSE=$(curl -s -X GET "$BASE_URL/users/departments/all" \
  -H "Authorization: Bearer $TOKEN")
echo "$DEPT_RESPONSE" | jq '.'
DEPT_ID=$(echo "$DEPT_RESPONSE" | jq -r '.data[0].id')
echo ""

# Test 6: Check In
echo -e "${YELLOW}[6/10] Checking In...${NC}"
curl -s -X POST "$BASE_URL/attendance/check-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 24.8607,
    "longitude": 67.0011
  }' | jq '.'
echo ""

# Test 7: Get Today's Attendance
echo -e "${YELLOW}[7/10] Getting Today's Attendance...${NC}"
curl -s -X GET "$BASE_URL/attendance/today" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 8: Apply for Leave
echo -e "${YELLOW}[8/10] Applying for Leave...${NC}"
LEAVE_RESPONSE=$(curl -s -X POST "$BASE_URL/leave" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveType": "ANNUAL",
    "startDate": "2025-04-20",
    "endDate": "2025-04-22",
    "reason": "API Testing Leave"
  }')
echo "$LEAVE_RESPONSE" | jq '.'
LEAVE_ID=$(echo "$LEAVE_RESPONSE" | jq -r '.data.id')
echo ""

# Test 9: Get My Leaves
echo -e "${YELLOW}[9/10] Getting My Leaves...${NC}"
curl -s -X GET "$BASE_URL/leave/my" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 10: Get Leave Balances
echo -e "${YELLOW}[10/10] Getting Leave Balances...${NC}"
curl -s -X GET "$BASE_URL/leave/balances/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✓ API Testing Complete!${NC}"
echo "========================================="
echo ""
echo "Saved Information:"
echo "  Token: $TOKEN"
echo "  User ID: $USER_ID"
echo "  Leave ID: $LEAVE_ID"
echo "  Department ID: $DEPT_ID"
echo ""
echo "You can now use these IDs for further testing!"
echo ""
