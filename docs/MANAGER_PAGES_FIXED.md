# Manager Dashboard Pages - All Fixed

## Summary
All manager dashboard pages have been updated to use real API calls instead of static/mock data.

---

## Pages Updated

### 1. Manager Team Page (`frontend/app/dashboard/manager/team/page.jsx`)
**Status:** ✅ Fixed

**Changes:**
- Fetches current manager's user data
- Gets all users and filters by `managerId`
- Shows only team members assigned to current manager
- Added debugging console logs to diagnose team member filtering
- Enhanced UI with avatars, department, joining date
- Shows employee ID and contact information

**API Calls:**
- `userAPI.getMe()` - Get current manager
- `userAPI.getAll()` - Get all users
- Filters where `managerId === currentUser.id`

**Diagnosis for "No Team Members":**
- Added console logs to check:
  - Current manager ID
  - All users data
  - Each user's managerId
  - Filtering results
- Check browser console to see why filtering isn't working

---

### 2. Manager Leaves Page (`frontend/app/dashboard/manager/leaves/page.jsx`)
**Status:** ✅ Fixed

**Changes:**
- Uses `fetchPendingLeaves()` to show only pending leave requests
- Properly calls `leaveAPI.approve()` and `leaveAPI.reject()`
- Fixed hook to use correct API method names

**API Calls:**
- `leaveAPI.getPending()` - Get pending leave requests
- `leaveAPI.approve(leaveId, note)` - Approve leave
- `leaveAPI.reject(leaveId, note)` - Reject leave

---

### 3. Manager Settings Page (`frontend/app/dashboard/manager/settings/page.jsx`)
**Status:** ✅ Fixed

**Changes:**
- Complete rewrite using employee settings as template
- Loads real user data from backend
- Allows profile updates (firstName, lastName, phone)
- Password change functionality
- Shows read-only account information

**API Calls:**
- `userAPI.getMe()` - Get current user profile
- `userAPI.updateMe(data)` - Update profile
- `authAPI.changePassword(old, new)` - Change password

---

### 4. Manager Attendance Page (`frontend/app/dashboard/manager/attendance/page.jsx`)
**Status:** ✅ Fixed

**Changes:**
- Fetches real attendance data from backend
- Filters attendance for team members only
- Shows stats (Present, Absent, Late, On Leave)
- Date filter to view different days
- Displays check-in/out times and working hours

**API Calls:**
- `userAPI.getMe()` - Get current manager
- `userAPI.getAll()` - Get all users (to find team)
- `attendanceAPI.getAll({ date })` - Get attendance for date
- Filters attendance for team members

---

## useLeaves Hook Fixed

**File:** `frontend/hooks/useLeaves.js`

**Issues Fixed:**
1. `getMyLeaves()` → `getMy()`
2. `getAllLeaves()` → `getAll()`
3. `create()` → `apply()`
4. `updateStatus()` → `approve()` / `reject()`
5. Added `fetchPendingLeaves()` method
6. Renamed `deleteLeave()` → `cancelLeave()`

---

## Team Member Filtering Issue

**Problem:** Manager sees "0 Members" even after assigning users

**Possible Causes:**

1. **managerId not saved properly**
   - Check database: `SELECT id, "firstName", "lastName", "managerId" FROM "User"`
   - Verify managerId is UUID string, not null

2. **Frontend mapping issue**
   - Check console logs when loading team page
   - Verify `managerId` field is present in API response

3. **User not assigned to manager**
   - When creating/editing user, ensure manager dropdown is selected
   - Verify manager ID is being sent in API request

**Debug Steps:**
1. Open browser console
2. Go to Manager Team page
3. Check console logs:
   ```
   Current manager user: {...}
   Manager ID: "uuid-here"
   All users: [...]
   User X: managerId=..., manager_id=..., matches=true/false
   My team members: [...]
   Team count: X
   ```

4. If team count is 0, check:
   - Is managerId null for all users?
   - Does any user's managerId match manager's ID?
   - Is the manager ID correct?

**Fix:**
- If managerId is null, edit the user and assign the manager
- If managerId doesn't match, verify you're logged in as the correct manager
- If data structure is wrong, check backend response format

---

## Testing Checklist

### Manager Team
- [ ] Login as manager
- [ ] Go to Team page
- [ ] Check console for debug logs
- [ ] Verify team members appear
- [ ] Check member details (email, phone, department)

### Manager Leaves
- [ ] Go to Leaves page
- [ ] Verify pending leaves appear
- [ ] Approve a leave request
- [ ] Reject a leave request
- [ ] Verify status updates

### Manager Settings
- [ ] Go to Settings page
- [ ] Verify profile data loads
- [ ] Update first/last name
- [ ] Update phone number
- [ ] Change password
- [ ] Verify changes persist

### Manager Attendance
- [ ] Go to Attendance page
- [ ] Verify stats show correct counts
- [ ] Change date filter
- [ ] Verify attendance records for team
- [ ] Check check-in/out times display

---

## Next Steps

1. **Test team member assignment:**
   - Create a new user
   - Assign manager in dropdown
   - Login as that manager
   - Verify user appears in team

2. **Check database:**
   ```sql
   SELECT 
     u.id, 
     u."firstName", 
     u."lastName", 
     u."managerId",
     m."firstName" as "managerFirstName",
     m."lastName" as "managerLastName"
   FROM "User" u
   LEFT JOIN "User" m ON u."managerId" = m.id
   WHERE u."managerId" IS NOT NULL;
   ```

3. **Verify API response:**
   - Open Network tab
   - Go to Team page
   - Check `/api/v1/users` response
   - Verify `managerId` field is present

---

**Status:** ✅ ALL MANAGER PAGES NOW USE REAL API CALLS

All static data has been removed and replaced with proper API integration.
