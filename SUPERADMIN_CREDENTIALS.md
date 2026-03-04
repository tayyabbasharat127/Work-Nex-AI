# SuperAdmin Login Credentials

## Current Credentials

**Email:** `admin@worknex.com`  
**Password:** `Admin@123`

## Login Instructions

1. Go to the login page: `/auth/login` or `/login`
2. Enter the credentials above
3. The system will automatically detect it's a superadmin login
4. You'll be redirected to `/dashboard/superAdmin`

## Important Notes

⚠️ **SECURITY:** Change the password after first login!

The superadmin account has:
- Full system access
- No organization restrictions  
- Role ID: 0
- NULL organization_id

## API Endpoint

```bash
POST http://localhost:5000/api/auth/superadmin/login
Content-Type: application/json

{
  "email": "admin@worknex.com",
  "password": "Admin@123"
}
```

## Testing

Run these commands to verify the setup:

```bash
# Test database and password
node backend/test_superadmin_direct.js

# Test API endpoint (requires backend server running)
node backend/test_super_admin_login.js

# Test via curl
curl -X POST http://localhost:5000/api/auth/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@worknex.com","password":"Admin@123"}'
```

## Troubleshooting

If login fails:

1. **Restart the backend server** - Code changes require server restart
2. **Check database** - Run `node backend/test_superadmin_direct.js`
3. **Verify route** - Make sure you're on `/auth/login` (not `/login`)
4. **Check console** - Look for debug logs in browser console
5. **Clear cache** - Clear browser cache and localStorage

## Files Modified

- `backend/create_super_admin.js` - Updated credentials
- `backend/test_super_admin_login.js` - Updated test credentials
- `backend/test_superadmin_direct.js` - Updated test credentials
- `frontend/src/app/auth/login/page.tsx` - Updated email detection
- `frontend/src/app/(auth)/login/page.tsx` - Updated email detection
- Database - Updated user email and password

## Role Routing

The login system now correctly routes based on role_id:

- **role_id = 0** → `/dashboard/superAdmin` (Super Admin)
- **role_id = 1** → `/dashboard/admin/main` (Admin)
- **role_id = 2** → `/dashboard/manager/main` (Manager)
- **role_id = 3** → `/dashboard/employee/main` (Employee)

## Previous Issue

The superadmin was being redirected to the employee dashboard because:
1. The `/auth/login` page was using string comparison (`case "0"`) instead of numeric comparison
2. The email detection wasn't working properly
3. Both issues have been fixed

## Next Steps

1. Restart your backend server
2. Clear browser cache
3. Login with the new credentials
4. Change the password after first login
