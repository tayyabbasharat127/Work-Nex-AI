# Debug "Failed to Load Data" Error

## Quick Diagnosis

### Step 1: Check Backend Status

```bash
# Terminal 1 - Check if backend is running
cd backend
node Server.js
```

**Expected output:**
```
Server running on port 5000
Database connected successfully
```

**If you see errors:**
- Database connection error → Check PostgreSQL is running
- Port already in use → Kill the process or use different port
- Module not found → Run `npm install`

### Step 2: Check Frontend Status

```bash
# Terminal 2 - Check if frontend is running
cd frontend
npm run dev
```

**Expected output:**
```
- ready started server on 0.0.0.0:3000
- Local: http://localhost:3000
```

### Step 3: Check Browser Console

1. Open browser (Chrome/Firefox)
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for errors (red text)

**Common errors:**
- `Failed to fetch` → Backend not running
- `401 Unauthorized` → Not logged in
- `404 Not Found` → Wrong API endpoint
- `500 Internal Server Error` → Backend error

### Step 4: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for failed requests (red)
5. Click on the failed request
6. Check Response tab for error message

---

## Common Causes & Solutions

### Cause 1: Backend Not Running ❌

**Symptoms:**
- "Failed to fetch"
- "Network error"
- "ERR_CONNECTION_REFUSED"

**Solution:**
```bash
cd backend
node Server.js
```

**Verify:**
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}
```

### Cause 2: Not Logged In ❌

**Symptoms:**
- "401 Unauthorized"
- "No token provided"
- "Authentication required"

**Solution:**
1. Go to http://localhost:3000/login
2. Login with credentials
3. Try again

**Verify:**
```javascript
// Browser console
localStorage.getItem('token')
// Should return a long string starting with "eyJ..."
```

### Cause 3: Wrong API URL ❌

**Symptoms:**
- "404 Not Found"
- "Cannot GET /api/..."

**Check:**
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Solution:**
Create or update `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Then restart frontend:
```bash
cd frontend
npm run dev
```

### Cause 4: Database Not Connected ❌

**Symptoms:**
- "500 Internal Server Error"
- Backend logs show database errors

**Check backend logs:**
```bash
cd backend
tail -f server.log
```

**Solution:**
1. Make sure PostgreSQL is running
2. Check database credentials in `backend/config/db.js`
3. Run migrations:
   ```bash
   cd backend
   npx sequelize-cli db:migrate
   ```

### Cause 5: CORS Error ❌

**Symptoms:**
- "CORS policy blocked"
- "Access-Control-Allow-Origin"

**Solution:**
Check `backend/Server.js` has CORS enabled:
```javascript
const cors = require('cors');
app.use(cors());
```

### Cause 6: Wrong Endpoint ❌

**Symptoms:**
- "404 Not Found"
- Specific endpoint not working

**Check:**
Which page is showing the error?
- Admin Users → `/api/users/getuser`
- Admin Departments → `/api/departments`
- Employee Leaves → `/api/leaves/my`
- Admin Leaves → `/api/leaves`

**Verify endpoint exists:**
```bash
# Check backend routes
cd backend
grep -r "router.get" routes/
```

---

## Debugging by Page

### Admin Users Page

**API Call:** `GET /api/users/getuser`

**Debug:**
```bash
# Test API directly
curl -X GET http://localhost:5000/api/users/getuser \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Common issues:**
- No token → Login first
- No users → Create users first
- Wrong organization → Check organization_id

### Admin Departments Page

**API Call:** `GET /api/departments`

**Debug:**
```bash
curl -X GET http://localhost:5000/api/departments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Common issues:**
- No departments → Create departments first
- Wrong organization → Check organization_id

### Employee Leaves Page

**API Call:** `GET /api/leaves/my`

**Debug:**
```bash
curl -X GET http://localhost:5000/api/leaves/my \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Common issues:**
- No token → Login first
- No leaves → Apply for leave first

### Admin Leaves Page

**API Call:** `GET /api/leaves`

**Debug:**
```bash
curl -X GET http://localhost:5000/api/leaves \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Common issues:**
- No token → Login first
- No leaves → No employees have applied for leave

---

## Step-by-Step Debugging

### 1. Get Your Token

```javascript
// Browser console (F12)
const token = localStorage.getItem('token');
console.log('Token:', token);
```

### 2. Test API Manually

```bash
# Replace YOUR_TOKEN with actual token from step 1
curl -X GET http://localhost:5000/api/users/getuser \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Check Response

**Success (200):**
```json
{
  "success": true,
  "data": [...]
}
```

**Error (401):**
```json
{
  "success": false,
  "message": "No token provided"
}
```
→ Login again

**Error (500):**
```json
{
  "success": false,
  "error": "Database error"
}
```
→ Check backend logs

### 4. Check Backend Logs

```bash
cd backend
tail -f server.log
```

Look for:
- SQL errors
- Authentication errors
- Route errors

---

## Advanced Debugging

### Enable Detailed Logging

Add to `frontend/lib/api.js`:
```javascript
async function apiFetch(endpoint, options = {}) {
  console.log('🔵 API Request:', endpoint, options);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    console.log('🟢 API Response:', endpoint, data);
    return data;
  } catch (error) {
    console.error('🔴 API Error:', endpoint, error);
    throw error;
  }
}
```

### Check API Response Format

Add to component:
```javascript
const loadData = async () => {
  try {
    const data = await fetchUsers();
    console.log('Raw API response:', data);
    console.log('Is array?', Array.isArray(data));
    console.log('Data type:', typeof data);
  } catch (err) {
    console.error('Load error:', err);
  }
};
```

---

## Quick Fixes

### Fix 1: Restart Everything

```bash
# Kill all processes
# Ctrl+C in all terminals

# Start backend
cd backend
node Server.js

# Start frontend (new terminal)
cd frontend
npm run dev

# Clear browser cache
# F12 → Application → Clear storage → Clear site data
```

### Fix 2: Reset Authentication

```javascript
// Browser console
localStorage.clear();
// Then login again
```

### Fix 3: Check Environment

```bash
# Backend
cd backend
cat .env

# Frontend
cd frontend
cat .env.local
```

Should have:
```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Still Not Working?

### Collect Debug Info

1. **Backend logs:**
   ```bash
   cd backend
   tail -20 server.log
   ```

2. **Browser console errors:**
   - F12 → Console → Copy all red errors

3. **Network tab:**
   - F12 → Network → Find failed request
   - Copy Request URL, Status, Response

4. **Your setup:**
   - Which page shows the error?
   - Are you logged in?
   - What role (admin/employee/manager)?

### Test Basic Connectivity

```bash
# Test backend health
curl http://localhost:5000/api/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@worknex.com","password":"SuperAdmin@123"}'
```

---

## Summary Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] PostgreSQL running
- [ ] Logged in (token in localStorage)
- [ ] Correct API URL in .env.local
- [ ] No CORS errors
- [ ] No 401/404/500 errors in Network tab
- [ ] Backend logs show no errors

If all checked and still failing, share:
1. Which specific page?
2. Browser console errors
3. Network tab errors
4. Backend logs
