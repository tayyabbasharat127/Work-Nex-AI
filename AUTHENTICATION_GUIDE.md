# Authentication Guide - "No Token Provided" Error

## Issue: "No token provided" when applying for leave or performing actions

This error occurs when you're not logged in or your session has expired.

## Quick Fix

### Option 1: Login with Demo Account

1. **Navigate to Login Page**
   ```
   http://localhost:3000/login
   ```

2. **Use Demo Credentials**
   
   **Employee Account:**
   - Email: `employee@demo.com`
   - Password: `password123`
   - Access: Employee dashboard
   
   **Admin Account:**
   - Email: `admin@demo.com`
   - Password: `password123`
   - Access: Admin dashboard
   
   **Manager Account:**
   - Email: `manager@demo.com`
   - Password: `password123`
   - Access: Manager dashboard

### Option 2: Register New Account

1. **Navigate to Register Page**
   ```
   http://localhost:3000/register
   ```

2. **Fill in Organization Details**
   - Organization Name
   - Admin Name
   - Admin Email
   - Password

3. **Verify Email with OTP**
   - Check backend console for OTP code
   - Enter OTP to complete registration

4. **Login with New Account**
   - Use the email and password you registered with

## How Authentication Works

### 1. Login Process
```
User enters credentials → Backend validates → Returns JWT token → 
Frontend stores in localStorage → Token sent with every API request
```

### 2. Token Storage
Tokens are stored in browser's localStorage:
- `token` - JWT access token
- `refreshToken` - Refresh token for renewing access
- `user` - User information (name, email, role)

### 3. Token Usage
Every API request includes the token in the Authorization header:
```javascript
Authorization: Bearer <your-token-here>
```

## Checking Your Authentication Status

### Method 1: Browser Console
Open browser console (F12) and run:
```javascript
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('user'));
```

### Method 2: Add Debug Component (Development Only)
Add to your dashboard page:
```javascript
import AuthDebug from '@/components/AuthDebug';

// In your component
<AuthDebug />
```

## Common Issues & Solutions

### Issue 1: "No token provided"
**Cause:** Not logged in or token expired
**Solution:** 
1. Go to `/login`
2. Login with credentials
3. Try the action again

### Issue 2: "Invalid token" or "Token expired"
**Cause:** Token has expired (usually after 24 hours)
**Solution:**
1. Logout (clears old token)
2. Login again (gets new token)

### Issue 3: Token exists but still getting error
**Cause:** Token might be corrupted or invalid
**Solution:**
```javascript
// Clear all auth data
localStorage.clear();
// Then login again
```

### Issue 4: Can't login - "Invalid credentials"
**Cause:** Wrong email/password or user doesn't exist
**Solution:**
1. Check if you're using the correct demo credentials
2. Or register a new account
3. Check backend is running on port 5000

## Creating Demo Users (Backend)

If demo users don't exist, create them:

### Method 1: Use Test Script
```bash
cd backend
node test_demo_flow.js
```

### Method 2: Create Manually via API
```bash
# Create employee
curl -X POST http://localhost:5000/api/users/createuser \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name": "Demo Employee",
    "email": "employee@demo.com",
    "password": "password123",
    "role_id": 3,
    "department_id": 1
  }'
```

### Method 3: Use Super Admin Script
```bash
cd backend
node create_super_admin.js
```

## Testing Authentication Flow

### 1. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@demo.com",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": {
    "id": 1,
    "name": "Demo Employee",
    "email": "employee@demo.com",
    "role": 3
  }
}
```

### 2. Test Protected Endpoint
```bash
curl -X GET http://localhost:5000/api/leaves/my \
  -H "Authorization: Bearer <your-token-here>"
```

## Frontend Authentication Flow

### Login Component
```javascript
// frontend/app/login/page.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const data = await login(email, password);
    // Token is automatically stored in localStorage
    // Redirect to dashboard based on role
    router.push('/dashboard/employee');
  } catch (err) {
    setError(err.message);
  }
};
```

### API Calls with Token
```javascript
// frontend/lib/api.js
async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken(); // Gets from localStorage
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  // ... handle response
}
```

## Troubleshooting Steps

1. **Check Backend is Running**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Check Frontend Environment**
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. **Clear Browser Data**
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data
   - Refresh page
   - Login again

4. **Check Network Tab**
   - Open DevTools (F12)
   - Network tab
   - Try the action that fails
   - Look for the API request
   - Check if Authorization header is present
   - Check response status and message

5. **Check Backend Logs**
   ```bash
   cd backend
   tail -f server.log
   ```

## Security Best Practices

1. **Never commit tokens** to version control
2. **Use HTTPS** in production
3. **Set token expiration** (currently 24 hours)
4. **Implement refresh token rotation**
5. **Clear tokens on logout**
6. **Validate tokens on backend** for every protected route

## Quick Reference

### Login Endpoints
- Login: `POST /api/auth/login`
- Register: `POST /api/auth/signup`
- Verify OTP: `POST /api/auth/verify-otp`
- Refresh Token: `POST /api/auth/refresh-token`

### Protected Endpoints (Require Token)
- Get My Leaves: `GET /api/leaves/my`
- Create Leave: `POST /api/leaves`
- Get Users: `GET /api/users/getuser`
- Check In: `POST /api/attendance/check-in`
- And all other dashboard endpoints...

### Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTYxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

## Summary

The "No token provided" error means you need to login first. Simply:
1. Go to http://localhost:3000/login
2. Login with demo credentials or register
3. Your token will be stored automatically
4. All API calls will now include the token
5. You can now apply for leaves and perform other actions

---

**Remember:** Always login before accessing dashboard features!
