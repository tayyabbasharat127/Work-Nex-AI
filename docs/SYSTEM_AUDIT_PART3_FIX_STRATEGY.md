# 🛠️ FIX STRATEGY (NO CODE CHANGES YET)

## Priority Levels
- 🔴 CRITICAL - System broken, must fix immediately
- 🟡 HIGH - Causes issues, fix soon
- 🟢 LOW - Nice to have, fix later

---

## 🔴 CRITICAL FIX #1: Role-Based Routing

### Frontend Fix Required
**File:** `frontend/app/login/page.jsx`

**Current Code (BROKEN):**
```javascript
const roleMap = {
  0: '/dashboard/admin',
  1: '/dashboard/admin',
  2: '/dashboard/manager',
  3: '/dashboard/employee',
};
```

**Fixed Code:**
```javascript
const roleMap = {
  'SUPER_ADMIN': '/dashboard/admin',
  'ADMIN': '/dashboard/admin',
  'MANAGER': '/dashboard/manager',
  'EMPLOYEE': '/dashboard/employee',
};
```

**Impact:** Fixes dashboard routing for all roles

---

## 🔴 CRITICAL FIX #2: Registration Flow

### Option A: Frontend Handles Both Steps (RECOMMENDED)
**File:** `frontend/lib/api.js` - `signup` function

**Current Implementation:**
```javascript
// Already tries to do 2-step process
// Step 1: POST /billing/register
// Step 2: POST /auth/register
```

**Issue:** Step 2 fails because missing fields

**Fix:** Add proper field mapping
```javascript
signup: async function(userData) {
  if (userData.organization_name) {
    // Split admin_name into firstName and lastName
    const [firstName, ...lastNameParts] = userData.admin_name.split(' ');
    const lastName = lastNameParts.join(' ') || 'User';
    
    // Step 1: Register organization
    const orgResponse = await apiFetch('/billing/register', {
      method: 'POST',
      body: JSON.stringify({
        orgName: userData.organization_name,
        ownerEmail: userData.admin_email,
        ownerFirstName: firstName,
        ownerLastName: lastName,
        industry: userData.industry,
        country: userData.country,
        phone: userData.phone,
        website: userData.company_domain ? `https://${userData.company_domain}` : undefined
      }),
    });
    
    // Step 2: Register admin user
    const userResponse = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.admin_email,
        password: userData.password,
        firstName: firstName,
        lastName: lastName,
        employeeId: 'ADMIN-001',  // Auto-generate
        role: 'SUPER_ADMIN'
      }),
    });
    
    return { organization: orgResponse.data, user: userResponse.data };
  }
}
```

### Option B: Backend Creates User (NOT RECOMMENDED - violates "no backend changes" rule)

---

## 🔴 CRITICAL FIX #3: Missing employeeId

### Frontend Fix Required
**File:** `frontend/app/register/page.jsx`

**Add employeeId generation:**
```javascript
// In handleSubmit, before calling signup:
const employeeId = `EMP-${Date.now().toString().slice(-6)}`;
// Or let user input it
```

**OR** Auto-generate in API layer (already done in Option A above)

---

## 🟡 HIGH FIX #4: Token Storage

### Frontend Fix Required
**File:** `frontend/lib/api.js` - `login` function

**Current Code:**
```javascript
if (data.data && data.data.accessToken) {
  setTokens(data.data.accessToken, data.data.refreshToken);
}
```

**Issue:** Works correctly, but needs verification

**Verification Needed:**
- Check if localStorage.getItem('token') returns correct value
- Check if Authorization header is sent correctly

---

## 🟡 HIGH FIX #5: Auth Middleware Consistency

### Frontend Fix Required
**File:** Multiple dashboard pages

**Add AuthCheck component:**
```javascript
// In each dashboard page
import AuthCheck from '@/components/AuthCheck';

export default function DashboardPage() {
  return (
    <AuthCheck requiredRole="ADMIN">
      {/* Page content */}
    </AuthCheck>
  );
}
```

---

## 🟢 LOW FIX #6: Error Handling

### Frontend Fix Required
**File:** `frontend/lib/api.js`

**Improve error messages:**
```javascript
catch (error) {
  console.error('API Error:', error);
  // Add more specific error handling
  if (error.message.includes('Organization name already taken')) {
    throw new Error('This company name is already registered');
  }
  throw error;
}
```

---

## SUMMARY OF FIXES

### Frontend Changes Required (3 files)
1. ✅ `frontend/app/login/page.jsx` - Fix role mapping
2. ✅ `frontend/lib/api.js` - Fix signup field mapping
3. ✅ `frontend/app/register/page.jsx` - Add employeeId handling

### Backend Changes Required
❌ NONE - Backend is working correctly

### Testing Required After Fixes
1. Registration flow (org + user creation)
2. Login with each role (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE)
3. Dashboard routing for each role
4. Token refresh flow
5. Logout and re-login
