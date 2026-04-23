#!/bin/bash

echo "=========================================="
echo "Testing CORS Configuration"
echo "=========================================="
echo ""

# Test 1: Health check
echo "1. Testing backend health..."
HEALTH=$(curl -s http://localhost:5000/health)
if [ $? -eq 0 ]; then
    echo "✅ Backend is running"
    echo "   Response: $HEALTH"
else
    echo "❌ Backend is not running"
    echo "   Please start the backend with: npm run dev"
    exit 1
fi

echo ""

# Test 2: CORS preflight for billing/register
echo "2. Testing CORS preflight for /api/v1/billing/register..."
CORS_RESPONSE=$(curl -s -X OPTIONS http://localhost:5000/api/v1/billing/register \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -i 2>&1)

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ CORS headers present"
    echo "$CORS_RESPONSE" | grep "Access-Control"
else
    echo "❌ CORS headers missing"
    echo "   Full response:"
    echo "$CORS_RESPONSE"
fi

echo ""

# Test 3: Actual POST request
echo "3. Testing actual POST request to /api/v1/billing/register..."
POST_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/billing/register \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Org","slug":"test-org","industry":"IT","country":"Pakistan","ownerEmail":"test@example.com","ownerName":"Test User","ownerPassword":"test123"}' \
  -i 2>&1)

if echo "$POST_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ CORS headers present in POST response"
    echo "$POST_RESPONSE" | grep "Access-Control"
else
    echo "⚠️  CORS headers might be missing in POST response"
fi

echo ""
echo "=========================================="
echo "CORS Test Complete"
echo "=========================================="
echo ""
echo "If all tests passed, the frontend should be able to"
echo "make requests to the backend without CORS errors."
echo ""
