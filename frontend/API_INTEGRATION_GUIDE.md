# API Integration Guide

This guide explains how the backend API is integrated with the Next.js frontend.

## Setup

### 1. Environment Configuration

Create a `.env.local` file in the frontend root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

For production, update this to your production API URL.

### 2. API Client (`lib/api.js`)

The API client provides:
- Centralized API configuration
- Automatic token management
- Token refresh on 401 errors
- Error handling
- Type-safe API methods

### 3. Custom Hooks

Located in `hooks/` directory:
- `useAuth.js` - Authentication operations
- `useAttendance.js` - Attendance tracking
- `useLeaves.js` - Leave management
- `useUsers.js` - User management

## Usage Examples

### Authentication

```jsx
import { useAuth } from '@/hooks/useAuth';

function LoginComponent() {
  const { login, loading, error } = useAuth();

  const handleLogin = async (email, password) => {
    try {
      const data = await login(email, password);
      // Redirect based on user role
      router.push(`/dashboard/${data.user.role}`);
    } catch (err) {
      console.error('Login failed:', err.message);
    }
  };
}
```

### Attendance Tracking

```jsx
import { useAttendance } from '@/hooks/useAttendance';

function AttendanceComponent() {
  const { todayStatus, checkIn, checkOut, fetchHistory } = useAttendance();

  useEffect(() => {
    fetchTodayStatus();
    fetchHistory({ limit: 30 });
  }, []);

  return (
    <div>
      <button onClick={checkIn}>Check In</button>
      <button onClick={checkOut}>Check Out</button>
    </div>
  );
}
```

### User Management

```jsx
import { useUsers } from '@/hooks/useUsers';

function UsersComponent() {
  const { users, fetchUsers, createUser, updateUser, deleteUser } = useUsers();

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (userData) => {
    try {
      await createUser(userData);
      toast.success('User created successfully');
    } catch (err) {
      toast.error(err.message);
    }
  };
}
```

### Leave Management

```jsx
import { useLeaves } from '@/hooks/useLeaves';

function LeavesComponent() {
  const { leaves, fetchMyLeaves, createLeave, updateLeaveStatus } = useLeaves();

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const handleApplyLeave = async (leaveData) => {
    try {
      await createLeave(leaveData);
      toast.success('Leave applied successfully');
    } catch (err) {
      toast.error(err.message);
    }
  };
}
```

## Direct API Calls

If you need to make direct API calls without hooks:

```jsx
import { authAPI, attendanceAPI, userAPI, leaveAPI } from '@/lib/api';

// Login
const data = await authAPI.login(email, password);

// Check in
const result = await attendanceAPI.checkIn();

// Get users
const users = await userAPI.getUsers({ role: 'employee' });

// Create leave
const leave = await leaveAPI.create({
  startDate: '2024-03-20',
  endDate: '2024-03-22',
  reason: 'Vacation',
  type: 'Annual'
});
```

## Available API Modules

### authAPI
- `signup(userData)` - Register new user
- `verifyOTP(email, otp)` - Verify OTP
- `login(email, password)` - User login
- `superAdminLogin(email, password)` - Super admin login
- `forgotPassword(email)` - Request password reset
- `resetPassword(token, newPassword)` - Reset password
- `changePassword(oldPassword, newPassword)` - Change password
- `logout()` - Logout user

### attendanceAPI
- `checkIn()` - Check in
- `checkOut()` - Check out
- `ping()` - Send activity ping
- `getTodayStatus()` - Get today's attendance
- `getHistory(params)` - Get attendance history
- `getOverview(params)` - Get attendance overview
- `manualMark(userId, date, checkIn, checkOut, status)` - Manual attendance
- `adjust(attendanceId, checkIn, checkOut, status)` - Adjust attendance
- `triggerAutoCheckout()` - Trigger auto checkout (admin)

### leaveAPI
- `create(leaveData)` - Apply for leave
- `getMyLeaves()` - Get my leaves
- `getAllLeaves(params)` - Get all leaves (admin)
- `updateStatus(leaveId, status, remarks)` - Update leave status
- `delete(leaveId)` - Delete leave

### userAPI
- `create(userData)` - Create user
- `getUsers(params)` - Get users
- `update(userId, userData)` - Update user
- `delete(userId)` - Delete user

### departmentAPI
- `getAll()` - Get all departments
- `create(departmentData)` - Create department
- `update(departmentId, departmentData)` - Update department
- `delete(departmentId)` - Delete department

### analyticsAPI
- `getKPIs(params)` - Get KPIs
- `getTrends(params)` - Get trends
- `getDepartmentAnalytics(params)` - Get department analytics

### reportsAPI
- `generate(reportData)` - Generate report
- `getAll(params)` - Get all reports

### organizationSettingsAPI
- `get()` - Get organization settings
- `update(settings)` - Update organization settings

## Error Handling

All API calls throw errors that should be caught:

```jsx
try {
  await someAPI.method();
} catch (error) {
  // error.message contains the error message
  console.error(error.message);
  toast.error(error.message);
}
```

## Token Management

Tokens are automatically managed:
- Stored in localStorage
- Included in all authenticated requests
- Automatically refreshed on 401 errors
- Cleared on logout

## Role-Based Access

User roles from backend:
- `0` - Super Admin
- `1` - Admin
- `2` - Manager
- `3` - Employee

Check user role:

```jsx
const user = JSON.parse(localStorage.getItem('user'));
if (user.role === 1) {
  // Admin only features
}
```

## Next Steps

1. Replace mock data in all dashboard pages with API calls
2. Add loading states and error handling
3. Implement real-time updates where needed
4. Add proper form validation
5. Implement file uploads if needed
6. Add pagination for large datasets
7. Implement search and filtering on the backend

## Example: Complete Page Integration

See `frontend/app/dashboard/employee/attendance/page-with-api.jsx` for a complete example of a page integrated with the API.

To use it, rename it to `page.jsx`:
```bash
mv frontend/app/dashboard/employee/attendance/page-with-api.jsx frontend/app/dashboard/employee/attendance/page.jsx
```
