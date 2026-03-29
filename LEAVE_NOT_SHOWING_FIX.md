# Fix: Leave Request Not Showing After Submission

## Issue
You submit a leave request, see "Leave application submitted successfully", but the leave doesn't appear in the list.

## Debug Steps

### Step 1: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Submit a leave request
4. Look for these log messages:

```
Submitting leave: {startDate: "...", endDate: "...", ...}
Creating leave with data: {...}
Leave created, response: {...}
Refreshing leaves list...
Fetching my leaves...
Raw API response: {...}
Processed leaves data: [...]
Number of leaves: X
Leaves refreshed
```

**What to look for:**
- ✅ All messages appear → Good, continue to Step 2
- ❌ Error messages → Check the error, likely auth or validation issue
- ❌ "Number of leaves: 0" → Backend not returning leaves, go to Step 3

### Step 2: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Submit a leave request
4. Look for these requests:

**Request 1: Create Leave**
```
POST /api/leaves
Status: 200 or 201
Response: {success: true, leave: {...}}
```

**Request 2: Get My Leaves**
```
GET /api/leaves/my
Status: 200
Response: {success: true, leaves: [...]}
```

**What to check:**
- ✅ Both requests succeed (200/201) → Good
- ❌ POST fails → Check request body and auth token
- ❌ GET returns empty array → Backend issue, go to Step 3

### Step 3: Check Backend

Check backend console/logs for:

```bash
cd backend
tail -f server.log
```

**Look for:**
- SQL errors
- "Leave application submitted successfully"
- "getMyLeaves - Found X leaves"

**Common issues:**
- Wrong employee_id
- Wrong organization_id
- Database constraint errors

### Step 4: Check Database Directly

```bash
psql -U postgres -d your_database

-- Check if leave was created
SELECT * FROM "Leaves" ORDER BY "createdAt" DESC LIMIT 5;

-- Check employee_id matches your user
SELECT id, name, email FROM "Users" WHERE email = 'your@email.com';

-- Verify the leave belongs to you
SELECT * FROM "Leaves" WHERE employee_id = YOUR_USER_ID;
```

---

## Common Causes & Solutions

### Cause 1: Leave Created But Wrong employee_id ❌

**Symptom:** Leave created in database but not showing for your user

**Check:**
```sql
-- Your user ID
SELECT id FROM "Users" WHERE email = 'your@email.com';

-- Leaves for your user
SELECT * FROM "Leaves" WHERE employee_id = YOUR_ID;
```

**Solution:** Backend might be using wrong user ID from token. Check `backend/controller/leave.js`:

```javascript
exports.createLeave = async (req, res) => {
  const userId = req.user.userId; // Make sure this is correct
  console.log('Creating leave for user:', userId);
  // ...
}
```

### Cause 2: Response Format Mismatch ❌

**Symptom:** Console shows "Number of leaves: 0" even though backend returns data

**Check console for:**
```
Raw API response: {success: true, leaves: [...]}
Processed leaves data: []  // ← Empty!
```

**Solution:** Already fixed in the code, but verify `frontend/lib/api.js`:

```javascript
getMyLeaves: async () => {
  const response = await apiFetch('/leaves/my');
  return response.leaves || response.data || response;
}
```

### Cause 3: Token Has Wrong User Info ❌

**Symptom:** Creating leave for different user than logged in

**Check:**
```javascript
// Browser console
const user = JSON.parse(localStorage.getItem('user'));
console.log('Logged in user:', user);
```

**Solution:** Logout and login again to get fresh token:
```javascript
localStorage.clear();
// Then login again
```

### Cause 4: Organization Mismatch ❌

**Symptom:** Leave created but filtered out by organization

**Check backend logs:**
```
getMyLeaves - User ID: 123
getMyLeaves - Found 0 leaves
```

**Solution:** Check if user has correct organization_id:
```sql
SELECT id, name, email, organization_id FROM "Users" WHERE id = 123;
SELECT * FROM "Leaves" WHERE employee_id = 123;
```

### Cause 5: Table Name Case Sensitivity ❌

**Symptom:** Backend error about table not found

**Check:**
- PostgreSQL is case-sensitive with quotes
- `"Leaves"` vs `leaves` are different tables

**Solution:** Verify table name in backend:
```javascript
// Should be:
FROM "Leaves"  // With capital L and quotes

// Not:
FROM leaves    // lowercase without quotes
```

---

## Quick Fixes

### Fix 1: Force Refresh After Create

Already added in the code:
```javascript
await createLeave({...});
await loadLeaves(); // Force refresh
```

### Fix 2: Add Delay Before Refresh

If database is slow:
```javascript
await createLeave({...});
await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
await loadLeaves();
```

### Fix 3: Manual Refresh Button

Add a refresh button:
```javascript
<button onClick={loadLeaves}>
  Refresh Leaves
</button>
```

---

## Testing

### Test 1: Create and Verify

```bash
# 1. Create leave via UI
# 2. Check database
psql -U postgres -d your_database
SELECT * FROM "Leaves" ORDER BY "createdAt" DESC LIMIT 1;

# 3. Check API
curl -X GET http://localhost:5000/api/leaves/my \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Check User ID

```javascript
// Browser console after login
const user = JSON.parse(localStorage.getItem('user'));
console.log('User ID:', user.id);

// Then check database
// SELECT * FROM "Leaves" WHERE employee_id = <user.id>;
```

### Test 3: Check Response Format

```javascript
// Add to frontend/lib/api.js temporarily
getMyLeaves: async () => {
  const response = await apiFetch('/leaves/my');
  console.log('Full response:', response);
  console.log('response.leaves:', response.leaves);
  console.log('response.data:', response.data);
  return response.leaves || response.data || response;
}
```

---

## Expected Flow

### 1. Submit Leave
```
User fills form → Click Submit → POST /api/leaves
```

### 2. Backend Creates Leave
```
Backend receives request
→ Validates data
→ Inserts into "Leaves" table
→ Returns: {success: true, leave: {...}}
```

### 3. Frontend Refreshes
```
createLeave() completes
→ Calls fetchMyLeaves()
→ GET /api/leaves/my
→ Backend returns: {success: true, leaves: [...]}
→ Frontend updates state
→ UI shows new leave
```

---

## Debugging Checklist

Run through this checklist:

- [ ] Backend running on port 5000
- [ ] Logged in (token in localStorage)
- [ ] Submit leave shows success toast
- [ ] Console shows "Leave created" message
- [ ] Console shows "Fetching my leaves" message
- [ ] Console shows "Number of leaves: X" (X > 0)
- [ ] Network tab shows POST /api/leaves (200)
- [ ] Network tab shows GET /api/leaves/my (200)
- [ ] Backend logs show "Leave application submitted"
- [ ] Backend logs show "getMyLeaves - Found X leaves"
- [ ] Database has the leave record
- [ ] Leave employee_id matches your user ID

---

## Still Not Working?

### Collect This Info:

1. **Browser Console Output:**
   - Copy all logs after submitting leave

2. **Network Tab:**
   - POST /api/leaves request and response
   - GET /api/leaves/my request and response

3. **Backend Logs:**
   ```bash
   cd backend
   tail -20 server.log
   ```

4. **Database Check:**
   ```sql
   SELECT * FROM "Leaves" ORDER BY "createdAt" DESC LIMIT 5;
   ```

5. **Your User Info:**
   ```javascript
   // Browser console
   JSON.parse(localStorage.getItem('user'))
   ```

---

## Summary

The issue is usually one of:
1. ✅ **Fixed:** Response format mismatch (already handled)
2. ✅ **Fixed:** Not refreshing after create (already added)
3. ❓ **Check:** Wrong employee_id in token
4. ❓ **Check:** Organization mismatch
5. ❓ **Check:** Database/backend error

**Next step:** Open browser console (F12), submit a leave, and check the logs!
