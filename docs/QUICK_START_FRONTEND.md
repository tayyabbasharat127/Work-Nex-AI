# Quick Start Guide - Frontend & Backend

## Start Backend Server

```bash
cd worknex-backend
npm start
```

Backend will run on: http://localhost:5000

## Start Frontend Server

```bash
cd frontend
npm run dev
```

Frontend will run on: http://localhost:3000

## Clear Browser Cache (IMPORTANT!)

Before testing, clear your browser cache:
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Select "All time"
4. Click "Clear data"

OR use Incognito/Private window

## Test Registration

1. Navigate to: http://localhost:3000/register
2. Fill in all fields
3. Click "Create Account"
4. Should see success alert
5. Should redirect to login page
6. NO OTP modal should appear!

## Test Login

1. Navigate to: http://localhost:3000/login
2. Enter credentials from registration
3. Click "Sign In"
4. Should redirect to dashboard

## Common Issues

### Issue: OTP Modal Still Appears
**Solution:** Clear browser cache completely or use Incognito window

### Issue: "Organization table doesn't exist"
**Solution:** Run migrations
```bash
cd worknex-backend
npx prisma migrate deploy
```

### Issue: "Cannot connect to database"
**Solution:** Check PostgreSQL is running and DATABASE_URL in .env is correct

### Issue: Frontend shows old version
**Solution:** 
1. Stop frontend server (Ctrl+C)
2. Delete .next folder: `rm -rf frontend/.next`
3. Restart: `npm run dev`

## API Endpoints Being Used

### Registration
- POST http://localhost:5000/api/v1/billing/register (organization)
- POST http://localhost:5000/api/v1/auth/register (admin user)

### Login
- POST http://localhost:5000/api/v1/auth/login

## Environment Variables

### Backend (.env)
```
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/DEMO"
JWT_SECRET=worknex_jwt_secret_change_in_production_2025
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

## Verification Checklist

- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] PostgreSQL database running
- [ ] Browser cache cleared
- [ ] Can access registration page
- [ ] No OTP modal appears
- [ ] Registration completes successfully
- [ ] Redirects to login page
- [ ] Can login with created account
- [ ] Dashboard loads correctly

## Files Modified in This Session

1. `frontend/app/register/page.jsx` - Removed OTP verification code
2. `frontend/lib/api.js` - Already has correct signup function
3. `frontend/hooks/useAuth.js` - Already has correct signup hook

## Documentation Created

1. `REGISTRATION_FIX_COMPLETE.md` - Details of the fix
2. `CLEAR_CACHE_AND_TEST.md` - How to clear cache and test
3. `QUICK_START_FRONTEND.md` - This file

## Need Help?

Check the console logs:
- Browser Console: F12 → Console tab
- Backend Logs: Terminal where backend is running
- Frontend Logs: Terminal where frontend is running
