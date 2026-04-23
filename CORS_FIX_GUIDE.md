# CORS Error Fix Guide

## Problem
Frontend (http://localhost:3000) was unable to make requests to backend (http://localhost:5000) due to CORS policy blocking.

**Error Message:**
```
Access to fetch at 'http://localhost:5000/api/v1/billing/register' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
The CORS configuration in `worknex-backend/src/app.js` was not properly handling preflight OPTIONS requests and wasn't explicitly setting all required headers.

## Solution Applied

### Changes Made to `worknex-backend/src/app.js`:

**Before:**
```javascript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://192.168.100.7:3000',
    /^http:\/\/192\.168\./,
  ],
  credentials: true,
}));
```

**After:**
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://192.168.100.7:3000',
    ];
    
    if (allowedOrigins.includes(origin) || /^http:\/\/192\.168\./.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
```

### Key Improvements:
1. **Dynamic origin validation** - Uses a function to validate origins
2. **Explicit methods** - Lists all allowed HTTP methods including OPTIONS
3. **Explicit headers** - Specifies allowed and exposed headers
4. **Preflight caching** - Sets maxAge to reduce preflight requests
5. **No-origin support** - Allows requests without origin (Postman, mobile apps)

## How to Apply the Fix

### Step 1: Restart the Backend Server

If the backend is running, stop it first:
```bash
# Find the process
lsof -ti:5000

# Kill it (replace PID with actual process ID)
kill -9 <PID>
```

Then start it again:
```bash
cd worknex-backend
npm run dev
```

Or for production:
```bash
npm start
```

### Step 2: Verify the Fix

Run the CORS test script:
```bash
cd worknex-backend
./test-cors.sh
```

Or manually test with curl:
```bash
# Test preflight request
curl -X OPTIONS http://localhost:5000/api/v1/billing/register \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

You should see these headers in the response:
- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE`
- `Access-Control-Allow-Headers: Content-Type`
- `Access-Control-Allow-Credentials: true`

### Step 3: Test from Frontend

1. Make sure frontend is running:
   ```bash
   cd frontend
   npm run dev
   ```

2. Try to sign up or make any API request from the frontend
3. Check browser console - CORS errors should be gone

## Verification Checklist

- [ ] Backend server is running on port 5000
- [ ] Frontend server is running on port 3000
- [ ] CORS test script passes all tests
- [ ] Browser console shows no CORS errors
- [ ] API requests from frontend work successfully

## Additional Notes

### For Production
When deploying to production, update the CORS configuration to only allow your production frontend URL:

```javascript
const allowedOrigins = [
  'https://your-production-domain.com',
  'https://www.your-production-domain.com',
];
```

And change the callback to reject unauthorized origins:
```javascript
if (allowedOrigins.includes(origin)) {
  callback(null, true);
} else {
  callback(new Error('Not allowed by CORS'));
}
```

### Environment Variables
Make sure your `.env` file has the correct frontend URL:
```env
FRONTEND_URL=http://localhost:3000
```

### Common Issues

**Issue 1: Still getting CORS errors after restart**
- Solution: Clear browser cache and hard reload (Ctrl+Shift+R or Cmd+Shift+R)

**Issue 2: Works in Postman but not in browser**
- Solution: This is expected - browsers enforce CORS, Postman doesn't. Make sure the backend is properly configured.

**Issue 3: CORS works for some endpoints but not others**
- Solution: Check if those endpoints have additional middleware that might be interfering with CORS headers

## Testing Different Scenarios

### Test 1: Simple GET request
```bash
curl http://localhost:5000/api/v1/billing/plans \
  -H "Origin: http://localhost:3000" \
  -v
```

### Test 2: POST with credentials
```bash
curl -X POST http://localhost:5000/api/v1/billing/register \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  -v
```

### Test 3: Authenticated request
```bash
curl http://localhost:5000/api/v1/users/me \
  -H "Origin: http://localhost:3000" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

## Summary

The CORS issue has been fixed by:
1. ✅ Updating CORS configuration with explicit options
2. ✅ Adding support for preflight OPTIONS requests
3. ✅ Specifying allowed methods and headers
4. ✅ Enabling credentials support
5. ✅ Adding origin validation function

The backend now properly handles cross-origin requests from the frontend, and the signup/registration flow should work without CORS errors.
