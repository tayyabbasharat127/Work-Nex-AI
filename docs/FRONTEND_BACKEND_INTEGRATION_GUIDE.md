# Frontend-Backend Integration Guide
# Complete Setup & Testing Instructions

## 🚀 QUICK START

### Step 1: Start Backend

```bash
cd worknex-backend

# Install dependencies (if not done)
npm install

# Setup database (first time only)
npm run setup

# Start backend server
npm run dev
```

**Backend will run on:** `http://localhost:5000`

### Step 2: Start Frontend

```bash
cd frontend

# Install dependencies (if not done)
npm install

# Start frontend server
npm run dev
```

**Frontend will run on:** `http://localhost:3000`

---

## 📝 API TESTING

### Option 1: HTML API Tester (Easiest)

1. Open `API_TESTER.html` in your browser
2. Click "Run All Tests" button
3. Watch tests execute automatically
4. View results for each module

### Option 2: Manual Testing with cURL

```bash
# 1. Register a user
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@worknex.com",
    "password": "Test@123456",
    "firstName": "Test",
    "lastName": "User",
    "employeeId": "EMP-001",
    "role": "EMPLOYEE"
  }'

# 2. Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@worknex.com",
    "password": "Test@123456"
  }'

# Save the accessToken from response

# 3. Get profile
curl -X GET http://localhost:5000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Check in
curl -X POST http://localhost:5000/api/v1/attendance/check-in \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 24.8607, "longitude": 67.0011}'
```

### Option 3: Postman Collection

1. Import `WORKNEX_POSTMAN_COLLECTION.json` into Postman
2. Set `baseUrl` variable to `http://localhost:5000/api/v1`
3. Run "Login" request first to get token
4. Token will be saved automatically
5. Run other requests

---

## 🔧 FRONTEND API INTEGRATION

### ✅ Fixed Issues

1. **Base URL**: Changed from `/api` to `/api/v1`
2. **Auth Endpoints**: Fixed register/login response handling
3. **Attendance Endpoints**: Updated to match backend routes
4. **Leave Endpoints**: Changed from `/leaves` to `/leave` (singular)
5. **User Endpoints**: Fixed to use correct routes
6. **Department Endpoints**: Changed to `/users/departments/all`
7. **Analytics Endpoints**: Updated all analytics routes
8. **Response Handling**: Fixed to extract `data` from response

### API Usage in Frontend

```javascript
import { authAPI, userAPI, attendanceAPI, leaveAPI } from '@/lib/api';

// Login
const handleLogin = async () => {
  try {
    const response = await authAPI.login(email, password);
    if (response.success) {
      // Token is automatically saved
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Login failed:', error.message);
  }
};

// Get profile
const fetchProfile = async () => {
  try {
    const profile = await userAPI.getMe();
    setUser(profile);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }
};

// Check in
const handleCheckIn = async () => {
  try {
    const result = await attendanceAPI.checkIn(latitude, longitude);
    console.log('Checked in:', result);
  } catch (error) {
    console.error('Check-in failed:', error);
  }
};

// Apply leave
const applyLeave = async (leaveData) => {
  try {
    const result = await leaveAPI.apply(leaveData);
    console.log('Leave applied:', result);
  } catch (error) {
    console.error('Failed to apply leave:', error);
  }
};
```

---

## 🗂️ COMPLETE API REFERENCE

### Authentication (`authAPI`)
- `register(userData)` - Register new user
- `login(email, password)` - Login user
- `logout()` - Logout user
- `changePassword(oldPassword, newPassword)` - Change password
- `forgotPassword(email)` - Request password reset
- `resetPassword(token, newPassword)` - Reset password

### Users (`userAPI`)
- `getMe()` - Get my profile
- `updateMe(userData)` - Update my profile
- `getAll(params)` - Get all users (admin)
- `getById(userId)` - Get user by ID
- `create(userData)` - Create user (admin)
- `update(userId, userData)` - Update user (admin)
- `deactivate(userId)` - Deactivate user (admin)
- `getByDepartment(deptId)` - Get users by department

### Departments (`departmentAPI`)
- `getAll()` - Get all departments
- `create(departmentData)` - Create department (admin)

### Attendance (`attendanceAPI`)
- `checkIn(latitude, longitude)` - Check in
- `checkOut()` - Check out
- `getToday()` - Get today's attendance
- `getMy(params)` - Get my attendance history
- `getAll(params)` - Get all attendance (admin)
- `getSummary(params)` - Get attendance summary
- `manualEntry(...)` - Manual entry (admin)
- `update(attendanceId, data)` - Update attendance (admin)
- `syncFromTMS(date)` - Sync from TMS (admin)
- `getHolidays()` - Get holidays
- `createHoliday(holidayData)` - Create holiday (admin)

### Leave (`leaveAPI`)
- `apply(leaveData)` - Apply for leave
- `getMy(params)` - Get my leaves
- `getPending()` - Get pending leaves (manager)
- `getAll(params)` - Get all leaves
- `getById(leaveId)` - Get leave by ID
- `approve(leaveId, note)` - Approve leave (manager)
- `reject(leaveId, note)` - Reject leave (manager)
- `cancel(leaveId)` - Cancel leave
- `getMyBalances()` - Get my leave balances
- `getUserBalances(userId)` - Get user balances
- `getPolicies()` - Get leave policies

### Analytics (`analyticsAPI`)
- `getDashboard()` - Get dashboard KPIs
- `getAttendanceTrends(params)` - Get attendance trends
- `getAttendanceHeatmap(params)` - Get attendance heatmap
- `getDepartmentAttendance(params)` - Get department attendance
- `getLeaveSummary(params)` - Get leave summary
- `getLeaveTrends(params)` - Get leave trends
- `getLeaveByType(params)` - Get leave by type
- `getHeadcount()` - Get headcount
- `getTurnover(params)` - Get turnover rate

### Performance (`performanceAPI`)
- `getMy(params)` - Get my performance
- `getUser(userId, params)` - Get user performance
- `getTeam(params)` - Get team performance
- `getLeaderboard(params)` - Get leaderboard

### Notifications (`notificationsAPI`)
- `getAll(params)` - Get all notifications
- `getUnreadCount()` - Get unread count
- `markAsRead(notificationId)` - Mark as read
- `markAllAsRead()` - Mark all as read
- `delete(notificationId)` - Delete notification
- `broadcast(notificationData)` - Broadcast (admin)

### ETL (`etlAPI`)
- `runETL(month, year)` - Run ETL manually (admin)
- `getLogs()` - Get ETL logs (admin)

### Billing (`billingAPI`)
- `getPlans()` - Get subscription plans
- `registerOrganization(orgData)` - Register organization
- `subscribe(subscriptionData)` - Subscribe to plan
- `upgrade(upgradeData)` - Upgrade plan
- `getSubscription(orgId)` - Get subscription
- `getInvoices(orgId)` - Get invoices
- `checkEmployeeLimit(orgId)` - Check employee limit
- `cancelSubscription(orgId)` - Cancel subscription

### AI (`aiAPI`)
- `chat(message)` - Chat with AI
- `leaveForecast(params)` - Predict leave forecast
- `attendanceAnomaly(params)` - Detect anomalies
- `attritionRisk()` - Predict attrition risk

---

## 🐛 TROUBLESHOOTING

### Issue: "Network Error" or "Failed to fetch"

**Solution:**
1. Check if backend is running: `http://localhost:5000/health`
2. Check CORS settings in backend `.env`:
   ```
   FRONTEND_URL=http://localhost:3000
   ```
3. Restart both servers

### Issue: "401 Unauthorized"

**Solution:**
1. Login again to get fresh token
2. Check if token is saved in localStorage
3. Check token expiration (default: 7 days)

### Issue: "403 Forbidden"

**Solution:**
- You don't have permission for this action
- Check your user role (EMPLOYEE, MANAGER, ADMIN, SUPER_ADMIN)
- Some endpoints require ADMIN or MANAGER role

### Issue: "404 Not Found"

**Solution:**
1. Check endpoint URL in browser console
2. Verify backend route exists
3. Check if `/api/v1` prefix is included

### Issue: "500 Internal Server Error"

**Solution:**
1. Check backend console for error details
2. Check database connection
3. Check if required data exists (departments, policies, etc.)

---

## ✅ TESTING CHECKLIST

### Backend Tests
- [ ] Backend starts without errors
- [ ] Database connection successful
- [ ] Health endpoint works: `http://localhost:5000/health`
- [ ] Register user works
- [ ] Login works and returns token
- [ ] Protected routes require authentication

### Frontend Tests
- [ ] Frontend starts without errors
- [ ] Login page loads
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Dashboard loads after login
- [ ] Can check in/out
- [ ] Can apply for leave
- [ ] Can view attendance history
- [ ] Can view analytics (if admin/manager)

### Integration Tests
- [ ] Frontend can connect to backend
- [ ] Authentication flow works end-to-end
- [ ] Attendance check-in/out works
- [ ] Leave application works
- [ ] Notifications appear
- [ ] Analytics data loads
- [ ] ETL can be triggered (admin)

---

## 📊 SAMPLE TEST DATA

### Test User Credentials

```json
{
  "email": "test.employee@worknex.com",
  "password": "Test@123456",
  "role": "EMPLOYEE"
}
```

### Test Admin Credentials (Create manually)

```json
{
  "email": "admin@worknex.com",
  "password": "Admin@123456",
  "role": "ADMIN"
}
```

### Sample Leave Application

```json
{
  "leaveType": "ANNUAL",
  "startDate": "2025-04-20",
  "endDate": "2025-04-22",
  "reason": "Family vacation"
}
```

### Sample Attendance Check-in

```json
{
  "latitude": 24.8607,
  "longitude": 67.0011
}
```

---

## 🎯 NEXT STEPS

1. **Test All Modules**: Use API_TESTER.html to test all endpoints
2. **Create Test Users**: Create users with different roles
3. **Test User Flows**: Test complete workflows (login → check-in → apply leave)
4. **Check Frontend Pages**: Visit all dashboard pages
5. **Test Admin Features**: Test user management, ETL, analytics
6. **Fix Any Issues**: Check console for errors and fix

---

## 📞 SUPPORT

If you encounter issues:

1. Check backend logs in terminal
2. Check frontend console in browser (F12)
3. Check network tab for failed requests
4. Verify database has required data
5. Check `.env` configuration

**Backend Health Check:** `http://localhost:5000/health`  
**API Base URL:** `http://localhost:5000/api/v1`  
**Frontend URL:** `http://localhost:3000`

---

## ✨ SUCCESS INDICATORS

You'll know everything is working when:

- ✅ Backend starts without errors
- ✅ Frontend starts without errors
- ✅ Can login successfully
- ✅ Dashboard loads with data
- ✅ Can check in/out
- ✅ Can apply for leave
- ✅ Notifications work
- ✅ Analytics show data
- ✅ No console errors

**Your system is now ready for development and testing!** 🎉

