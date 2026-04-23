# 🧪 COMPLETE API TESTING SAMPLES

## Environment Setup
```bash
BASE_URL="http://localhost:5000/api/v1"
TOKEN=""  # Will be set after login
```

---

## 🔐 AUTHENTICATION FLOW

### Test 1: Register Organization + Admin User

#### Step 1A: Register Organization
```bash
curl -X POST ${BASE_URL}/billing/register \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "TestCorp",
    "ownerEmail": "admin@testcorp.com",
    "ownerFirstName": "Admin",
    "ownerLastName": "User",
    "industry": "Technology",
    "country": "United States",
    "phone": "+1234567890",
    "website": "https://testcorp.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Organization registered successfully",
  "data": {
    "organization": { "id": "org-uuid", "name": "TestCorp" },
    "licenseKey": "WNX-...",
    "trialEndsAt": "2024-02-15T00:00:00.000Z"
  }
}
```

#### Step 1B: Register Admin User
```bash
curl -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@testcorp.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User",
    "employeeId": "ADMIN-001",
    "role": "SUPER_ADMIN"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "user-uuid",
    "email": "admin@testcorp.com",
    "role": "SUPER_ADMIN",
    "firstName": "Admin",
    "lastName": "User",
    "employeeId": "ADMIN-001"
  }
}
```

---

### Test 2: Login as Admin

```bash
curl -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@testcorp.com",
    "password": "Admin123!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "email": "admin@testcorp.com",
      "role": "SUPER_ADMIN",
      "firstName": "Admin",
      "lastName": "User"
    }
  }
}
```

**Save Token:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Test 3: Get My Profile

```bash
curl -X GET ${BASE_URL}/users/me \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile fetched",
  "data": {
    "id": "user-uuid",
    "employeeId": "ADMIN-001",
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@testcorp.com",
    "role": "SUPER_ADMIN",
    "designation": null,
    "phone": null,
    "joiningDate": null,
    "isActive": true,
    "twoFAEnabled": false,
    "department": null,
    "manager": null
  }
}
```

---

## 👥 USER MANAGEMENT FLOW

### Test 4: Create Employee

```bash
curl -X POST ${BASE_URL}/users \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@testcorp.com",
    "firstName": "John",
    "lastName": "Doe",
    "employeeId": "EMP-001",
    "role": "EMPLOYEE",
    "designation": "Software Engineer",
    "joiningDate": "2024-01-15",
    "phone": "+1234567890"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User created",
  "data": {
    "id": "employee-uuid",
    "employeeId": "EMP-001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@testcorp.com",
    "role": "EMPLOYEE",
    "designation": "Software Engineer"
  }
}
```

**Note:** Employee receives email with temp password

---

### Test 5: Get All Users

```bash
curl -X GET "${BASE_URL}/users?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Users fetched",
  "data": [
    {
      "id": "user-uuid",
      "employeeId": "ADMIN-001",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@testcorp.com",
      "role": "SUPER_ADMIN"
    },
    {
      "id": "employee-uuid",
      "employeeId": "EMP-001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@testcorp.com",
      "role": "EMPLOYEE"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 📅 ATTENDANCE FLOW

### Test 6: Check In

```bash
curl -X POST ${BASE_URL}/attendance/check-in \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Checked in successfully",
  "data": {
    "id": "attendance-uuid",
    "userId": "user-uuid",
    "date": "2024-01-15",
    "checkIn": "2024-01-15T09:00:00.000Z",
    "checkOut": null,
    "status": "PRESENT",
    "workingHours": null
  }
}
```

---

### Test 7: Check Out

```bash
curl -X POST ${BASE_URL}/attendance/check-out \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Checked out successfully",
  "data": {
    "id": "attendance-uuid",
    "userId": "user-uuid",
    "date": "2024-01-15",
    "checkIn": "2024-01-15T09:00:00.000Z",
    "checkOut": "2024-01-15T17:30:00.000Z",
    "status": "PRESENT",
    "workingHours": 8.5
  }
}
```

---

### Test 8: Get Today's Attendance

```bash
curl -X GET ${BASE_URL}/attendance/today \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🏖️ LEAVE MANAGEMENT FLOW

### Test 9: Apply Leave

```bash
curl -X POST ${BASE_URL}/leave \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveType": "ANNUAL",
    "startDate": "2024-02-01",
    "endDate": "2024-02-03",
    "reason": "Family vacation"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Leave applied successfully",
  "data": {
    "id": "leave-uuid",
    "employeeId": "user-uuid",
    "leaveType": "ANNUAL",
    "startDate": "2024-02-01T00:00:00.000Z",
    "endDate": "2024-02-03T00:00:00.000Z",
    "totalDays": 3,
    "reason": "Family vacation",
    "status": "PENDING"
  }
}
```

---

### Test 10: Get My Leaves

```bash
curl -X GET "${BASE_URL}/leave/my?status=PENDING" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### Test 11: Approve Leave (Manager/Admin)

```bash
curl -X PUT ${BASE_URL}/leave/{leave-id}/approve \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Approved for vacation"
  }'
```

---

### Test 12: Get Leave Balances

```bash
curl -X GET ${BASE_URL}/leave/balances/me \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Leave balances fetched",
  "data": [
    {
      "id": "balance-uuid",
      "leaveType": "ANNUAL",
      "totalDays": 20,
      "usedDays": 3,
      "remainingDays": 17,
      "year": 2024
    },
    {
      "id": "balance-uuid-2",
      "leaveType": "SICK",
      "totalDays": 10,
      "usedDays": 0,
      "remainingDays": 10,
      "year": 2024
    }
  ]
}
```

---

## 📊 ANALYTICS FLOW

### Test 13: Get Dashboard Analytics

```bash
curl -X GET ${BASE_URL}/analytics/dashboard \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### Test 14: Get Attendance Trends

```bash
curl -X GET "${BASE_URL}/analytics/attendance/trends?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🔄 COMPLETE END-TO-END TEST FLOW

```bash
#!/bin/bash
# Save as test-complete-flow.sh

BASE_URL="http://localhost:5000/api/v1"

echo "=== Step 1: Register Organization ==="
ORG_RESPONSE=$(curl -s -X POST ${BASE_URL}/billing/register \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "TestCorp",
    "ownerEmail": "admin@testcorp.com",
    "ownerFirstName": "Admin",
    "ownerLastName": "User",
    "industry": "Technology",
    "country": "United States"
  }')
echo $ORG_RESPONSE | jq .

echo "\n=== Step 2: Register Admin User ==="
USER_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@testcorp.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User",
    "employeeId": "ADMIN-001",
    "role": "SUPER_ADMIN"
  }')
echo $USER_RESPONSE | jq .

echo "\n=== Step 3: Login ==="
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@testcorp.com",
    "password": "Admin123!"
  }')
echo $LOGIN_RESPONSE | jq .

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
echo "Token: $TOKEN"

echo "\n=== Step 4: Get Profile ==="
curl -s -X GET ${BASE_URL}/users/me \
  -H "Authorization: Bearer ${TOKEN}" | jq .

echo "\n=== Step 5: Create Employee ==="
curl -s -X POST ${BASE_URL}/users \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@testcorp.com",
    "firstName": "John",
    "lastName": "Doe",
    "employeeId": "EMP-001",
    "role": "EMPLOYEE"
  }' | jq .

echo "\n=== Step 6: Check In ==="
curl -s -X POST ${BASE_URL}/attendance/check-in \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7128, "longitude": -74.0060}' | jq .

echo "\n=== Step 7: Apply Leave ==="
curl -s -X POST ${BASE_URL}/leave \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveType": "ANNUAL",
    "startDate": "2024-02-01",
    "endDate": "2024-02-03",
    "reason": "Vacation"
  }' | jq .

echo "\n=== Test Complete ==="
```

**Run:**
```bash
chmod +x test-complete-flow.sh
./test-complete-flow.sh
```
