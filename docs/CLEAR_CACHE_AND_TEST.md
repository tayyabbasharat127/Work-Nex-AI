# Clear Browser Cache and Test Registration

## The Issue You're Seeing
The OTP modal in your screenshot is from the OLD cached version of the registration page. The code has been fixed, but your browser is showing the old version.

## Solution: Clear Browser Cache

### Method 1: Hard Refresh (Quick)
1. Open http://localhost:3000/register
2. Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
3. This forces the browser to reload without cache

### Method 2: Clear Cache Completely (Recommended)
1. Press `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete` on Mac)
2. Select "Cached images and files"
3. Select "All time" for time range
4. Click "Clear data"
5. Close and reopen the browser
6. Navigate to http://localhost:3000/register

### Method 3: Use Incognito/Private Window
1. Open a new Incognito/Private window
2. Navigate to http://localhost:3000/register
3. Test registration there (no cache)

## What You Should See After Clearing Cache

### Registration Page Should Have:
✅ Full Name field
✅ Email Address field
✅ Company Name field
✅ Industry field
✅ Company Domain field
✅ City field
✅ Country field
✅ Subscription Plan dropdown
✅ Password field
✅ Confirm Password field
✅ Terms checkbox
✅ "Create Account" button

### What Should NOT Appear:
❌ OTP verification modal
❌ "Verify Your Email" popup
❌ "Enter 6-digit code" input

## Test Registration Flow

1. Fill in the form:
   ```
   Full Name: John Doe
   Email: admin@test.com
   Company Name: Test Company
   Industry: Technology
   Company Domain: test.com
   City: New York
   Country: United States
   Subscription Plan: Pro
   Password: Test1234
   Confirm Password: Test1234
   ```

2. Click "Create Account"

3. You should see:
   - Alert: "Registration successful! You can now login with your credentials."
   - Automatic redirect to /login page

4. No OTP modal should appear!

## If You Still See the OTP Modal

If you still see the OTP modal after clearing cache:

1. Check if the frontend dev server is running:
   ```bash
   cd frontend
   npm run dev
   ```

2. Make sure you're accessing the correct URL:
   - Should be: http://localhost:3000/register
   - NOT: http://localhost:3000/verify-otp

3. Check browser console for errors (F12 → Console tab)

4. Try a different browser

## Backend Requirements

Make sure the backend is running:
```bash
cd worknex-backend
npm start
```

Backend should be accessible at: http://localhost:5000

## Files That Were Fixed
- ✅ `frontend/app/register/page.jsx` - Removed OTP modal code
- ✅ `frontend/lib/api.js` - Has correct signup function
- ✅ `frontend/hooks/useAuth.js` - Has correct signup hook

## Next Steps After Registration Works

1. Test login with the created account
2. Verify dashboard access based on role
3. Test other features (attendance, leave, etc.)
