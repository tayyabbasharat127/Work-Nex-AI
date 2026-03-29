# Backend API Integration - Complete Setup

## Overview

The backend API has been successfully integrated with the Next.js frontend. This document provides a complete guide on the integration architecture and how to use it.

## 📁 Files Created

### Core API Files
- `frontend/lib/api.js` - Main API client with all endpoint methods
- `frontend/.env.local` - Environment configuration

### Custom Hooks
- `frontend/hooks/useAuth.js` - Authentication hook
- `frontend/hooks/useAttendance.js` - Attendance management hook
- `frontend/hooks/useLeaves.js` - Leave management hook
- `frontend/hooks/useUsers.js` - User management hook

### Context Providers
- `frontend/contexts/AuthContext.jsx` - Global auth state management

### Documentation
- `frontend/API_INTEGRATION_GUIDE.md` - Detailed API usage guide
- `frontend/INTEGRATION_README.md` - This file

### Example Implementations
- `frontend/app/login/page.jsx` - Updated with real API integration
- `frontend/app/register/page.jsx` - Updated with real API integration
- `frontend/app/dashboard/employee/attendance/page-with-api.jsx` - Complete example

## 🚀 Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm install
node Server.js
```

The backend should be running on `http://localhost:5000`

### 2. Configure Frontend Environment

The `.env.local` file has been created with:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Install Frontend Dependencies (if needed)

```bash
cd frontend
npm install
```

### 4. Start the Frontend

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🔧 Integration Architecture

### API Client (`lib/api.js`)

The API client provides:
- ✅ Centralized API configuration
- ✅ Automatic JWT token management
- ✅ Token refresh on 401 errors
- ✅ Consistent error handling
- ✅ Type-safe API methods organized by domain

### Custom Hooks Pattern

Each hook provides:
- State management (data, loading, error)
- CRUD operations
- Automatic data refresh
- Error handling

Example:
```jsx
const { users, loading, error, fetchUsers, createUser } = useUsers();
```

### Auth Context (Optional)

For global auth state:
```jsx
// In app/layout.jsx
import { AuthProvider } from '@/contexts/AuthContext';

<AuthProvider>
  {children}
</AuthProvider>

// In any component
import { useAuthContext } from '@/contexts/AuthContext';
const { user, logout } = useAuthContext();
```

## 📝 Usage Examples

### Login Page (Already Integrated)

```jsx
import { useAuth } from '@/hooks/useAuth';

const { login } = useAuth();

const handleLogin = async (email, password) => {
  try {
    const data = await login(email, password);
    // Redirect based on role
    router.push(`/dashboard/${getRolePath(data.user.role)}`);
  } catch (err) {
    setError(err.message);
  }
};
```

### Fetching Data

```jsx
import { useUsers } from '@/hooks/useUsers';

function UsersPage() {
  const { users, loading, fetchUsers } = useUsers();

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Creating Data

```jsx
const { createUser } = useUsers();

const handleSubmit = async (formData) => {
  try {
    await createUser(formData);
    toast.success('User created!');
  } catch (err) {
    toast.error(err.message);
  }
};
```

## 🔐 Authentication Flow

1. User logs in → Token stored in localStorage
2. All API requests include token in Authorization header
3. On 401 error → Attempt token refresh
4. If refresh fails → Redirect to login
5. On logout → Clear tokens and redirect

## 📊 Available API Endpoints

### Auth
- POST `/api/auth/signup` - Register
- POST `/api/auth/verify-otp` - Verify email
- POST `/api/auth/login` - Login
- POST `/api/auth/superadmin/login` - Super admin login
- POST `/api/auth/forgot-password` - Request reset
- POST `/api/auth/reset-password` - Reset password
- POST `/api/auth/changePassword` - Change password

### Attendance
- POST `/api/attendance/check-in` - Check in
- POST `/api/attendance/check-out` - Check out
- POST `/api/attendance/ping` - Activity ping
- GET `/api/attendance/today-status` - Today's status
- GET `/api/attendance/history` - Attendance history
- GET `/api/attendance/overview` - Overview stats
- POST `/api/attendance/manual-mark` - Manual attendance
- PUT `/api/attendance/adjust` - Adjust attendance

### Leaves
- POST `/api/leaves` - Apply leave
- GET `/api/leaves/my` - My leaves
- GET `/api/leaves` - All leaves (admin)
- PUT `/api/leaves/:id/status` - Update status
- DELETE `/api/leaves/:id` - Delete leave

### Users
- POST `/api/users/createuser` - Create user
- GET `/api/users/getuser` - Get users
- PUT `/api/users/users/:id` - Update user
- DELETE `/api/users/users/:id` - Delete user

### Departments
- GET `/api/departments` - Get all
- POST `/api/departments` - Create
- PUT `/api/departments/:id` - Update
- DELETE `/api/departments/:id` - Delete

### Analytics
- GET `/api/analytics/kpis` - Get KPIs
- GET `/api/analytics/trends` - Get trends
- GET `/api/analytics/departments` - Department analytics

### Reports
- POST `/api/reports/generate` - Generate report
- GET `/api/reports` - Get reports

### Organization Settings
- GET `/api/settings/organization` - Get settings
- PUT `/api/settings/organization` - Update settings

## 🎯 Next Steps to Complete Integration

### 1. Update Remaining Pages

Replace mock data in these pages with API calls:

- [ ] `frontend/app/dashboard/admin/users/page.jsx`
- [ ] `frontend/app/dashboard/admin/departments/page.jsx`
- [ ] `frontend/app/dashboard/admin/leaves/page.jsx`
- [ ] `frontend/app/dashboard/admin/attendance/page.jsx`
- [ ] `frontend/app/dashboard/admin/analytics/page.jsx`
- [ ] `frontend/app/dashboard/admin/reports/page.jsx`
- [ ] `frontend/app/dashboard/admin/settings/page.jsx`
- [ ] `frontend/app/dashboard/manager/*` pages
- [ ] `frontend/app/dashboard/employee/*` pages

### 2. Add Loading States

Use the `loading` state from hooks:
```jsx
{loading ? <Spinner /> : <Content />}
```

### 3. Add Error Handling

Use the `error` state from hooks:
```jsx
{error && <ErrorMessage message={error} />}
```

### 4. Add Toast Notifications

Install and configure Sonner (already in package.json):
```jsx
import { toast } from 'sonner';

toast.success('Operation successful!');
toast.error('Operation failed!');
```

### 5. Implement Protected Routes

Create a middleware or HOC to protect routes:
```jsx
// middleware.js or useProtectedRoute hook
const token = getAuthToken();
if (!token) {
  router.push('/login');
}
```

### 6. Add Real-time Features (Optional)

Consider adding WebSocket for:
- Real-time attendance updates
- Live notifications
- Activity tracking

## 🐛 Troubleshooting

### CORS Issues
If you get CORS errors, ensure backend has:
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Token Issues
- Check localStorage for `token` and `refreshToken`
- Verify JWT_SECRET in backend `.env`
- Check token expiration

### API Connection Issues
- Verify backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check network tab in browser DevTools

## 📚 Additional Resources

- See `API_INTEGRATION_GUIDE.md` for detailed API documentation
- See `page-with-api.jsx` files for complete examples
- Check backend routes in `backend/routes/` for endpoint details

## ✅ Testing the Integration

1. Start both servers (backend and frontend)
2. Navigate to `http://localhost:3000/login`
3. Try logging in with a valid user from your database
4. Check browser console for any errors
5. Verify API calls in Network tab

## 🎉 Integration Complete!

The foundation is set. Now you can:
1. Replace mock data in all pages
2. Add proper error handling
3. Implement loading states
4. Add form validation
5. Enhance user experience

Happy coding! 🚀
