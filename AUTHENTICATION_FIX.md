# Authentication Fix - "No Token Provided" Error

## Issue
When applying for leave or performing other actions, users get "No token provided" error.

## Root Cause
User is not logged in, so no authentication token is available to send with API requests.

## Solution

### 1. User Must Login First ✅

**Steps:**
1. Navigate to: http://localhost:3000/login
2. Login with credentials:
   - **Demo Employee:** `employee@demo.com` / `password123`
   - **Demo Admin:** `admin@demo.com` / `password123`
   - **Demo Manager:** `manager@demo.com` / `password123`
3. After login, token is stored in localStorage
4. All API requests now include the token automatically

### 2. Enhanced Error Messages ✅

Updated employee leaves page to show helpful error messages:

```javascript
// Before
toast.error('Failed to apply for leave');

// After
if (!token) {
  toast.error('Please login first to apply for leave', {
    description: 'You need to be logged in to perform this action',
    action: {
      label: 'Login',
      onClick: () => window.location.href = '/login'
    }
  });
}
```

### 3. Created Helper Components ✅

#### AuthDebug Component
Shows authentication status (for development):
```javascript
import AuthDebug from '@/components/AuthDebug';

// Add to any page to see auth status
<AuthDebug />
```

#### AuthCheck Component
Automatically redirects to login if not authenticated:
```javascript
import AuthCheck from '@/components/AuthCheck';

export default function ProtectedPage() {
  return (
    <AuthCheck>
      {/* Your page content */}
    </AuthCheck>
  );
}
```

## How to Use

### For Users

1. **First Time Setup**
   ```
   1. Go to http://localhost:3000/register
   2. Register your organization
   3. Verify email with OTP (check backend console)
   4. Login with your credentials
   ```

2. **Existing Users**
   ```
   1. Go to http://localhost:3000/login
   2. Enter email and password
   3. Click "Sign In"
   4. You'll be redirected to your dashboard
   ```

3. **Using Demo Accounts**
   ```
   Employee: employee@demo.com / password123
   Admin: admin@demo.com / password123
   Manager: manager@demo.com / password123
   ```

### For Developers

1. **Check Authentication Status**
   ```javascript
   // Browser console
   console.log('Token:', localStorage.getItem('token'));
   console.log('User:', JSON.parse(localStorage.getItem('user')));
   ```

2. **Add Auth Check to Pages**
   ```javascript
   import AuthCheck from '@/components/AuthCheck';
   
   export default function MyPage() {
     return (
       <AuthCheck>
         <YourPageContent />
       </AuthCheck>
     );
   }
   ```

3. **Debug Authentication**
   ```javascript
   import AuthDebug from '@/components/AuthDebug';
   
   // Add to page during development
   <AuthDebug />
   ```

## Authentication Flow

```
┌─────────────┐
│   User      │
│  Visits     │
│  Dashboard  │
└──────┬──────┘
       │
       ▼
┌─────────────┐      No Token      ┌─────────────┐
│   Check     │─────────────────────▶│  Redirect   │
│   Token     │                      │  to Login   │
└──────┬──────┘                      └─────────────┘
       │
       │ Has Token
       ▼
┌─────────────┐
│   Make API  │
│   Request   │
│  with Token │
└──────┬──────┘
       │
       ▼
┌─────────────┐      Valid Token    ┌─────────────┐
│   Backend   │─────────────────────▶│   Return    │
│  Validates  │                      │    Data     │
│   Token     │                      └─────────────┘
└──────┬──────┘
       │
       │ Invalid/Expired
       ▼
┌─────────────┐
│   Return    │
│   401 Error │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │
│  Redirects  │
│  to Login   │
└─────────────┘
```

## Files Created/Modified

### Created
1. `frontend/components/AuthDebug.jsx` - Debug component to show auth status
2. `frontend/components/AuthCheck.jsx` - Auto-redirect if not authenticated
3. `AUTHENTICATION_GUIDE.md` - Comprehensive authentication guide

### Modified
1. `frontend/app/dashboard/employee/leaves/page.jsx` - Enhanced error messages

## Testing

### Test Authentication
```bash
# 1. Start backend
cd backend
node Server.js

# 2. Start frontend
cd frontend
npm run dev

# 3. Open browser
http://localhost:3000/login

# 4. Login with demo account
Email: employee@demo.com
Password: password123

# 5. Try applying for leave
Should work now!
```

### Verify Token Storage
```javascript
// Open browser console (F12)
localStorage.getItem('token')
// Should return: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

localStorage.getItem('user')
// Should return: '{"id":1,"name":"Demo Employee",...}'
```

## Common Issues

### Issue: "No token provided"
**Solution:** Login at `/login` first

### Issue: "Invalid token"
**Solution:** 
```javascript
localStorage.clear();
// Then login again
```

### Issue: Token exists but still error
**Solution:** Check token format in Network tab (F12)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue: Can't login
**Solution:** 
1. Check backend is running on port 5000
2. Check credentials are correct
3. Check backend logs for errors

## Quick Reference

### Demo Credentials
```
Employee:
  Email: employee@demo.com
  Password: password123
  Dashboard: /dashboard/employee

Admin:
  Email: admin@demo.com
  Password: password123
  Dashboard: /dashboard/admin

Manager:
  Email: manager@demo.com
  Password: password123
  Dashboard: /dashboard/manager
```

### API Endpoints
```
Login: POST /api/auth/login
Register: POST /api/auth/signup
Verify OTP: POST /api/auth/verify-otp
Get My Leaves: GET /api/leaves/my (requires token)
Create Leave: POST /api/leaves (requires token)
```

### Token Storage
```javascript
// Get token
const token = localStorage.getItem('token');

// Get user
const user = JSON.parse(localStorage.getItem('user'));

// Clear auth
localStorage.clear();
```

## Summary

The "No token provided" error is resolved by:
1. ✅ User must login first at `/login`
2. ✅ Token is automatically stored in localStorage
3. ✅ All API requests include the token
4. ✅ Enhanced error messages guide users to login
5. ✅ Helper components available for auth checking

**Remember:** Always login before accessing dashboard features!

---

**Status:** ✅ Authentication Working
**Date:** March 28, 2026
**Issue:** No token provided
**Solution:** User must login first - enhanced error messages added
