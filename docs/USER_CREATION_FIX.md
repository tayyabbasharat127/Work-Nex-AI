# 🔧 USER CREATION FIX - Field Mapping

## Issue
When creating a user, got validation error:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Employee ID required",
    "First name required",
    "Last name required",
    "Invalid role"
  ]
}
```

## Root Cause
Frontend was sending wrong field names to backend:

### Frontend Sent:
```javascript
{
  name: "John Doe",           // ❌ Backend expects firstName + lastName
  email: "john@test.com",
  password: "Test123!",
  role_id: 3,                 // ❌ Backend expects role: "EMPLOYEE"
  department_id: "",          // ❌ Backend expects departmentId
  status: "Active"            // ❌ Backend doesn't use this field
}
```

### Backend Expected:
```javascript
{
  firstName: "John",          // ✅ Required
  lastName: "Doe",            // ✅ Required
  email: "john@test.com",
  password: "Test123!",
  employeeId: "EMP-001",      // ✅ Required
  role: "EMPLOYEE",           // ✅ String enum, not number
  departmentId: null,         // ✅ camelCase
  phone: null
}
```

---

## Fixes Applied

### Fix #1: userAPI.create() - Data Transformation
**File:** `frontend/lib/api.js`

**Added:**
- Split `name` into `firstName` and `lastName`
- Map `role_id` (number) to `role` (string enum)
- Auto-generate `employeeId` if not provided
- Convert `department_id` to `departmentId`

**Role Mapping:**
```javascript
{
  0: 'SUPER_ADMIN',
  1: 'ADMIN',
  2: 'MANAGER',
  3: 'EMPLOYEE'
}
```

---

### Fix #2: userAPI.update() - Data Transformation
**File:** `frontend/lib/api.js`

**Added:**
- Same transformations as create
- Only send fields that are provided
- Handle both old and new field names

---

### Fix #3: useUsers Hook - Response Mapping
**File:** `frontend/hooks/useUsers.js`

**Added:**
- Map backend response to frontend format
- Combine `firstName` + `lastName` into `name`
- Convert `role` string to `role_id` number
- Convert `isActive` to `status` string
- Map `departmentId` to `department_id`

**Reverse Role Mapping:**
```javascript
{
  'SUPER_ADMIN': 0,
  'ADMIN': 1,
  'MANAGER': 2,
  'EMPLOYEE': 3
}
```

---

## Data Flow

### Creating a User

**Step 1: User fills form**
```
Name: "John Doe"
Email: "john@test.com"
Password: "Test123!"
Role: Employee (dropdown shows "Employee", value is 3)
```

**Step 2: Frontend transforms data**
```javascript
{
  firstName: "John",
  lastName: "Doe",
  email: "john@test.com",
  password: "Test123!",
  employeeId: "EMP-123456",  // Auto-generated
  role: "EMPLOYEE",           // Mapped from role_id: 3
  departmentId: null
}
```

**Step 3: Backend creates user**
```javascript
{
  id: "uuid",
  firstName: "John",
  lastName: "Doe",
  email: "john@test.com",
  role: "EMPLOYEE",
  employeeId: "EMP-123456",
  isActive: true
}
```

**Step 4: Frontend receives and transforms**
```javascript
{
  id: "uuid",
  user_id: "uuid",
  name: "John Doe",           // Combined from firstName + lastName
  email: "john@test.com",
  role: "EMPLOYEE",
  role_id: 3,                 // Mapped from role: "EMPLOYEE"
  status: "Active",           // Mapped from isActive: true
  employeeId: "EMP-123456"
}
```

---

## About the Owner Showing as User

**Question:** "Why do I see the owner of the organization as a user?"

**Answer:** This is CORRECT behavior! ✅

When you registered the organization, the system created:
1. **Organization** - Your company
2. **Admin User** - The owner account (you)

The admin user SHOULD appear in the users list because:
- They are a user in the system
- They have role: SUPER_ADMIN
- They can manage other users
- They can perform all admin functions

**This is the expected behavior in any multi-user system.**

---

## Testing the Fix

### Test 1: Create Employee
1. Login as admin
2. Go to Users page
3. Click "Add User"
4. Fill in:
   - Full Name: `Jane Employee`
   - Email: `jane@test.com`
   - Password: `Test123!`
   - Role: `Employee`
5. Click "Add User"
6. ✅ Should succeed without validation errors
7. ✅ User appears in list

### Test 2: Create Manager
1. Click "Add User"
2. Fill in:
   - Full Name: `Bob Manager`
   - Email: `bob@test.com`
   - Password: `Test123!`
   - Role: `Manager`
3. Click "Add User"
4. ✅ Should succeed
5. ✅ User appears with "Manager" badge

### Test 3: Verify User List
1. Check users list
2. ✅ Should see:
   - Your admin account (owner)
   - Jane Employee
   - Bob Manager
3. ✅ Each shows correct role badge
4. ✅ Each shows correct status

---

## Field Mapping Reference

### Frontend → Backend (Create/Update)

| Frontend Field | Backend Field | Type | Required | Notes |
|---|---|---|---|---|
| `name` | `firstName` + `lastName` | string | Yes | Split on space |
| `email` | `email` | string | Yes | Must be unique |
| `password` | `password` | string | Yes (create) | Hashed by backend |
| `role_id` | `role` | number → enum | Yes | 0=SUPER_ADMIN, 1=ADMIN, 2=MANAGER, 3=EMPLOYEE |
| `department_id` | `departmentId` | string | No | UUID |
| N/A | `employeeId` | string | Yes | Auto-generated if not provided |
| `status` | N/A | string | No | Not used by backend |

### Backend → Frontend (Response)

| Backend Field | Frontend Field | Type | Notes |
|---|---|---|---|
| `id` | `id`, `user_id` | string | UUID |
| `firstName` + `lastName` | `name` | string | Combined with space |
| `email` | `email` | string | |
| `role` | `role`, `role_id` | enum → number | EMPLOYEE=3, MANAGER=2, etc. |
| `departmentId` | `department_id` | string | UUID |
| `department` | `department` | object | Includes department details |
| `isActive` | `status` | boolean → string | true="Active", false="Inactive" |
| `employeeId` | `employeeId` | string | |

---

## Files Modified

1. ✅ `frontend/lib/api.js` - Added data transformation in create/update
2. ✅ `frontend/hooks/useUsers.js` - Added response mapping

---

## Status

✅ **FIXED** - User creation now works correctly with proper field mapping

You can now:
- Create users without validation errors
- See all users including the admin/owner
- Edit users
- Delete users
- Assign roles correctly
