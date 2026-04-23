# 🧪 COMPLETE TESTING GUIDE

## Prerequisites

### 1. Start Backend
```bash
cd worknex-backend
npm start
```
Backend should be running on: http://localhost:5000

### 2. Start Frontend
```bash
cd frontend
npm run dev
```
Frontend should be running on: http://localhost:3000

### 3. Clear Browser Cache
Press `Ctrl + Shift + Delete` and clear all cached files

---

## 🎯 TEST SUITE 1: Registration & Login

### Test 1.1: Complete Registration Flow

**Steps:**
1. Open http://localhost:3000/register
2. Fill in the form:
   - Full Name: `John Admin`
   - Email: `admin@testcompany.com`
   - Company Name: `Test Company`
   - Industry: `Technology`
   - Company Domain: `testcompany.com`
   - City: `New York`
   - Country: `United States`
   - Subscription Plan: `Pro`
   - Password: `Admin123!`
   - Confirm Password: `Admin123!`
3. Click "Create Account"

**Expected Results:**
- ✅ Alert: "Registration successful! You can now login with your credentials."
- ✅ Redirect to /login page
- ✅ No OTP modal appears
- ✅ Check database: Organization created
- ✅ Check database: User created with role SUPER_ADMIN

**Backend Verification:**
```bash
# Check organization created
curl http://localhost:5000/api/v1/billing/plans

# Try login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@testcompany.com","password":"Admin123!"}'
```

---

### Test 1.2: Login with SUPER_ADMIN

**Steps:**
1. Open http://localhost:3000/login
2. Enter credentials:
   - Email: `admin@testcompany.com`
   - Password: `Admin123!`
3. Click "Sign In"

**Expected Results:**
- ✅ No errors
- ✅ Redirect to /dashboard/admin
- ✅ Token stored in localStorage
- ✅ User data stored in localStorage

**Verification:**
```javascript
// Open browser console (F12)
localStorage.getItem('token')  // Should return JWT token
localStorage.getItem('user')   // Should return user JSON
```

---

### Test 1.3: Role-Based Routing

**Test SUPER_ADMIN:**
- Login as SUPER_ADMIN
- Should redirect to: `/dashboard/admin` ✅

**Test ADMIN:**
1. Create ADMIN user via API or admin panel
2. Login as ADMIN
3. Should redirect to: `/dashboard/admin` ✅

**Test MANAGER:**
1. Create MANAGER user
2. Login as MANAGER
3. Should redirect to: `/dashboard/manager` ✅

**Test EMPLOYEE:**
1. Create EMPLOYEE user
2. Login as EMPLOYEE
3. Should redirect to: `/dashboard/employee` ✅

---

## 🎯 TEST SUITE 2: User Management

### Test 2.1: Create Employee

**API Test:**
```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@testcompany.com","password":"Admin123!"}' \
  | jq -r '.data.accessToken')

# Create employee
curl -X POST http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@testcompany.com",
    "firstName": "Jane",
    "lastName": "Employee",
    "employeeId": "EMP-001",
    "role": "EMPLOYEE",
    "designation": "Software Engineer"
  }'
```

**Expected Results:**
- ✅ Status 201
- ✅ User created in database
- ✅ Temp password generated
- ✅ Email sent (if SMTP configured)

---

### Test 2.2: Get All Users

```bash
curl -X GET "http://localhost:5000/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**
- ✅ Returns array of users
- ✅ Includes pagination meta
- ✅ Shows both admin and employee

---

## 🎯 TEST SUITE 3: Attendance

### Test 3.1: Check In

```bash
curl -X POST http://localhost:5000/api/v1/attendance/check-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7128, "longitude": -74.0060}'
```

**Expected Results:**
- ✅ Status 200
- ✅ Attendance record created
- ✅ checkIn timestamp set
- ✅ status = "PRESENT"

---

### Test 3.2: Check Out

```bash
curl -X POST http://localhost:5000/api/v1/attendance/check-out \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**
- ✅ Status 200
- ✅ checkOut timestamp set
- ✅ workingHours calculated

---

### Test 3.3: Get Today's Attendance

```bash
curl -X GET http://localhost:5000/api/v1/attendance/today \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**
- ✅ Returns today's attendance record
- ✅ Shows check-in and check-out times
- ✅ Shows working hours

---

## 🎯 TEST SUITE 4: Leave Management

### Test 4.1: Apply Leave

```bash
curl -X POST http://localhost:5000/api/v1/leave \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaveType": "ANNUAL",
    "startDate": "2024-02-01",
    "endDate": "2024-02-03",
    "reason": "Family vacation"
  }'
```

**Expected Results:**
- ✅ Status 201
- ✅ Leave request created
- ✅ status = "PENDING"
- ✅ totalDays calculated correctly

---

### Test 4.2: Get My Leaves

```bash
curl -X GET http://localhost:5000/api/v1/leave/my \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**
- ✅ Returns array of leave requests
- ✅ Shows status, dates, reason

---

### Test 4.3: Get Leave Balances

```bash
curl -X GET http://localhost:5000/api/v1/leave/balances/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Results:**
- ✅ Returns leave balances for all types
- ✅ Shows totalDays, usedDays, remainingDays

---

### Test 4.4: Approve Leave (Manager/Admin)

```bash
# Get leave ID from previous test
LEAVE_ID="leave-uuid-here"

curl -X PUT http://localhost:5000/api/v1/leave/$LEAVE_ID/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note": "Approved"}'
```

**Expected Results:**
- ✅ Status 200
- ✅ Leave status changed to "APPROVED"
- ✅ Leave balance updated

---

## 🎯 TEST SUITE 5: Frontend Integration

### Test 5.1: Dashboard Loading

**Steps:**
1. Login as admin
2. Navigate to /dashboard/admin

**Expected Results:**
- ✅ Dashboard loads without errors
- ✅ User data displayed correctly
- ✅ Navigation works

---

### Test 5.2: API Calls from Frontend

**Open browser console and test:**
```javascript
// Test get profile
const { userAPI } = await import('/lib/api.js');
const profile = await userAPI.getMe();
console.log(profile);

// Test get users
const users = await userAPI.getAll();
console.log(users);

// Test attendance
const { attendanceAPI } = await import('/lib/api.js');
const today = await attendanceAPI.getToday();
console.log(today);
```

**Expected Results:**
- ✅ All API calls succeed
- ✅ Data returned correctly
- ✅ No CORS errors
- ✅ Authorization headers sent

---

## 🎯 TEST SUITE 6: Error Handling

### Test 6.1: Invalid Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@email.com","password":"wrongpass"}'
```

**Expected Results:**
- ✅ Status 401
- ✅ Error message: "Invalid credentials"

---

### Test 6.2: Duplicate Registration

```bash
# Try to register same email twice
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@testcompany.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "employeeId": "EMP-999",
    "role": "EMPLOYEE"
  }'
```

**Expected Results:**
- ✅ Status 409
- ✅ Error message: "Email already registered"

---

### Test 6.3: Unauthorized Access

```bash
# Try to access protected route without token
curl -X GET http://localhost:5000/api/v1/users/me
```

**Expected Results:**
- ✅ Status 401
- ✅ Error message: "Access token required"

---

## 🎯 TEST SUITE 7: Token Management

### Test 7.1: Token Refresh

```bash
# Get refresh token from login
REFRESH_TOKEN="refresh-token-here"

curl -X POST http://localhost:5000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

**Expected Results:**
- ✅ Status 200
- ✅ New access token returned
- ✅ New refresh token returned

---

### Test 7.2: Logout

```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

**Expected Results:**
- ✅ Status 200
- ✅ Refresh token invalidated
- ✅ Cannot use old token anymore

---

## 📊 Test Results Checklist

### Registration & Login
- [ ] Organization registration works
- [ ] Admin user created automatically
- [ ] Login successful
- [ ] Role-based routing works
- [ ] Token stored correctly

### User Management
- [ ] Create employee works
- [ ] Get all users works
- [ ] Update user works
- [ ] Deactivate user works

### Attendance
- [ ] Check-in works
- [ ] Check-out works
- [ ] Get today's attendance works
- [ ] Working hours calculated correctly

### Leave Management
- [ ] Apply leave works
- [ ] Get my leaves works
- [ ] Approve/reject leave works
- [ ] Leave balances updated correctly

### Frontend Integration
- [ ] Dashboard loads correctly
- [ ] API calls work from frontend
- [ ] Navigation works
- [ ] Error handling works

### Security
- [ ] Unauthorized access blocked
- [ ] Token validation works
- [ ] Token refresh works
- [ ] Logout works

---

## 🐛 Common Issues & Solutions

### Issue: "Organization table doesn't exist"
**Solution:** Run migrations
```bash
cd worknex-backend
npx prisma migrate deploy
```

### Issue: "Cannot connect to database"
**Solution:** Check PostgreSQL is running and DATABASE_URL is correct

### Issue: Frontend shows old version
**Solution:** Clear .next folder
```bash
rm -rf frontend/.next
npm run dev
```

### Issue: CORS errors
**Solution:** Check FRONTEND_URL in backend .env matches frontend URL

### Issue: Token not working
**Solution:** Check JWT_SECRET in .env, regenerate token

---

## ✅ All Tests Passed?

If all tests pass, your system is:
- ✅ Fully functional
- ✅ Properly integrated
- ✅ Ready for production (after fixing critical issues)
