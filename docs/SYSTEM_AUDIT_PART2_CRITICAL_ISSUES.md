# 🚨 CRITICAL ISSUES - ROOT CAUSES

## ❌ ISSUE #1: Role Mismatch in Login Flow

### Problem
Frontend uses numeric role mapping, backend uses string enums.

### Backend Reality
```javascript
// Prisma Schema
enum Role {
  SUPER_ADMIN
  ADMIN
  MANAGER
  EMPLOYEE
}

// JWT Payload
{ userId: "uuid", role: "SUPER_ADMIN" }

// Login Response
{
  success: true,
  data: {
    accessToken: "jwt...",
    refreshToken: "jwt...",
    user: {
      id: "uuid",
      email: "admin@test.com",
      role: "SUPER_ADMIN",  // ← STRING, not number
      firstName: "John",
      lastName: "Doe"
    }
  }
}
```

### Frontend Bug
```javascript
// frontend/app/login/page.jsx - LINE 38-43
const roleMap = {
  0: '/dashboard/admin',      // ❌ WRONG - Backend never sends 0
  1: '/dashboard/admin',       // ❌ WRONG - Backend never sends 1
  2: '/dashboard/manager',     // ❌ WRONG - Backend never sends 2
  3: '/dashboard/employee',    // ❌ WRONG - Backend never sends 3
};

const redirectPath = roleMap[data.user.role] || '/dashboard/admin';
// data.user.role = "SUPER_ADMIN" (string)
// roleMap["SUPER_ADMIN"] = undefined
// Falls back to '/dashboard/admin' (works by accident!)
```

### Impact
- ✅ SUPER_ADMIN accidentally works (fallback)
- ❌ ADMIN, MANAGER, EMPLOYEE all go to wrong dashboard
- ❌ Role-based routing completely broken

### Fix Required
```javascript
const roleMap = {
  'SUPER_ADMIN': '/dashboard/admin',
  'ADMIN': '/dashboard/admin',
  'MANAGER': '/dashboard/manager',
  'EMPLOYEE': '/dashboard/employee',
};
```

---

## ❌ ISSUE #2: Registration Flow Mismatch

### Problem
Frontend expects organization + user creation, backend only creates organization.

### Backend Reality
```javascript
// POST /api/v1/billing/register
// Creates: Organization + Subscription
// Does NOT create: User account
```

### Frontend Expectation
```javascript
// frontend/lib/api.js - signup function
// Step 1: POST /billing/register (organization)
// Step 2: POST /auth/register (admin user)
// Frontend tries to do 2-step process
```

### Impact
- ❌ Organization created but no admin user
- ❌ User cannot login after registration
- ❌ Database has orphaned organizations

### Fix Required
Backend needs to create admin user OR frontend needs to handle it properly.

---

## ❌ ISSUE #3: Null Values in Database

### Root Causes

#### Cause 3A: Optional Fields Not Provided
```javascript
// Backend: auth.service.js - register function
const user = await prisma.user.create({
  data: {
    employeeId:   data.employeeId,
    firstName:    data.firstName,
    lastName:     data.lastName,
    email:        data.email,
    passwordHash,
    role:         data.role || 'EMPLOYEE',
    departmentId: data.departmentId || null,  // ← NULL if not provided
    managerId:    data.managerId    || null,  // ← NULL if not provided
    designation:  data.designation  || null,  // ← NULL if not provided
    joiningDate:  data.joiningDate  ? new Date(data.joiningDate) : null,
    phone:        data.phone        || null,  // ← NULL if not provided
  }
});
```

**This is CORRECT behavior** - These fields are optional in schema.

#### Cause 3B: Frontend Not Sending Required Fields
```javascript
// Frontend registration sends:
{
  organization_name: "Test Co",
  admin_name: "John Doe",
  admin_email: "admin@test.com",
  password: "Test1234",
  // ❌ MISSING: employeeId (REQUIRED by backend)
  // ❌ MISSING: firstName, lastName (backend expects these)
}
```

### Impact
- ❌ Backend validation fails
- ❌ User creation fails
- ❌ Registration incomplete

---

## ❌ ISSUE #4: Field Name Mismatches

### Registration Fields

| Frontend Field | Backend Expects | Status |
|---|---|---|
| `admin_name` | `firstName`, `lastName` | ❌ MISMATCH |
| `admin_email` | `email` | ✅ OK (mapped) |
| `organization_name` | `orgName` | ✅ OK (mapped) |
| `company_domain` | `website` | ✅ OK (mapped) |
| `subscription_plan` | N/A | ⚠️ IGNORED |
| N/A | `employeeId` | ❌ MISSING |

### Fix Required
Frontend needs to split `admin_name` into `firstName` and `lastName`.
Frontend needs to generate or collect `employeeId`.
