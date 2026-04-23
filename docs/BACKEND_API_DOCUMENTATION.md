# WorkNex AI Backend - Complete API Documentation
# Production-Grade API Analysis & Testing Guide

**Base URL:** `http://localhost:5000/api/v1`  
**Authentication:** JWT Bearer Token  
**Response Format:** Standardized JSON

---

## 📋 TABLE OF CONTENTS

1. [Module Overview](#module-overview)
2. [Authentication & IAM](#authentication--iam)
3. [User & Role Management](#user--role-management)
4. [Attendance System (AISE)](#attendance-system-aise)
5. [Leave Management Engine](#leave-management-engine)
6. [Analytics & Reports](#analytics--reports)
7. [Performance Tracking](#performance-tracking)
8. [Notifications](#notifications)
9. [AI & Predictive Analytics](#ai--predictive-analytics)
10. [Billing & Subscriptions](#billing--subscriptions)
11. [ETL Pipeline](#etl-pipeline)
12. [Testing Workflows](#testing-workflows)
13. [Backend Health Report](#backend-health-report)

---

## 🎯 STANDARD RESPONSE FORMAT

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "meta": { /* pagination/metadata (optional) */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## 📊 MODULE OVERVIEW

| Module | Completeness | Endpoints | Key Features |
|--------|--------------|-----------|--------------|
| **Authentication & IAM** | 95% | 11 | JWT, 2FA, Password Reset |
| **User Management** | 90% | 10 | CRUD, Departments, RBAC |
| **Attendance System** | 95% | 12 | Check-in/out, TMS Sync, Holidays |
| **Leave Management** | 95% | 12 | Apply, Approve, Balances, Policies |
| **Analytics** | 90% | 11 | KPIs, Trends, Heatmaps, ETL |
| **Performance** | 85% | 4 | Scores, Leaderboard, Team View |
| **Notifications** | 90% | 6 | In-app, Broadcast, Read Status |
| **AI Services** | 70% | 4 | Chatbot, Predictions (External) |
| **Billing** | 85% | 9 | Plans, Subscriptions, Invoices |
| **ETL Pipeline** | 90% | 2 | Manual Trigger, Logs |

**Overall Backend Completeness: 88%**

---


## 🔐 AUTHENTICATION & IAM

**Module Status:** ✅ 95% Complete  
**Base Path:** `/api/v1/auth`  
**Files:** `auth.routes.js`, `auth.controller.js`, `auth.service.js`

### Endpoints

#### 1. Register User
```
POST /api/v1/auth/register
Auth: No
Role: Public
```

**Request Body:**
```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "employeeId": "EMP-001",
  "role": "EMPLOYEE",
  "departmentId": "uuid-of-department",
  "managerId": "uuid-of-manager",
  "designation": "Software Engineer",
  "joiningDate": "2025-01-15",
  "phone": "+92-300-1234567"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "employeeId": "EMP-001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "role": "EMPLOYEE"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "employeeId": "EMP-001",
    "role": "EMPLOYEE"
  }'
```

**Axios:**
```javascript
const response = await axios.post('/api/v1/auth/register', {
  email: 'john.doe@company.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  employeeId: 'EMP-001',
  role: 'EMPLOYEE'
});
```

---

#### 2. Login
```
POST /api/v1/auth/login
Auth: No
Role: Public
```

**Request Body:**
```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass123!"
}
```

**Response (200) - Normal Login:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "john.doe@company.com",
      "role": "EMPLOYEE",
      "firstName": "John",
      "lastName": "Doe",
      "employeeId": "EMP-001"
    }
  }
}
```

**Response (200) - 2FA Required:**
```json
{
  "success": true,
  "message": "2FA required",
  "data": {
    "requires2FA": true,
    "userId": "uuid"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@company.com", "password": "SecurePass123!"}'
```

---

#### 3. Refresh Token
```
POST /api/v1/auth/refresh-token
Auth: No
Role: Public
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

---

#### 4. Logout
```
POST /api/v1/auth/logout
Auth: Yes (Bearer Token)
Role: All
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### 5. Setup 2FA
```
POST /api/v1/auth/2fa/setup
Auth: Yes
Role: All
```

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "2FA setup initiated",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP"
  }
}
```

---

#### 6. Verify 2FA
```
POST /api/v1/auth/2fa/verify
Auth: Yes
Role: All
```

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA enabled",
  "data": {
    "twoFAEnabled": true
  }
}
```

---

#### 7. Disable 2FA
```
POST /api/v1/auth/2fa/disable
Auth: Yes
Role: All
```

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA disabled"
}
```

---

#### 8. Validate 2FA (After Login)
```
POST /api/v1/auth/2fa/validate
Auth: No
Role: Public
```

**Request Body:**
```json
{
  "userId": "uuid",
  "token": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "user": { /* user object */ }
  }
}
```

---

#### 9. Forgot Password
```
POST /api/v1/auth/forgot-password
Auth: No
Role: Public
```

**Request Body:**
```json
{
  "email": "john.doe@company.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent"
}
```

---

#### 10. Reset Password
```
POST /api/v1/auth/reset-password
Auth: No
Role: Public
```

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

#### 11. Change Password
```
POST /api/v1/auth/change-password
Auth: Yes
Role: All
```

**Request Body:**
```json
{
  "oldPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Authentication Module Summary

**✅ What Works:**
- Complete JWT authentication flow
- Refresh token mechanism
- 2FA setup and validation
- Password reset via email
- Role-based access control (RBAC)

**⚠️ Potential Issues:**
- Email service must be configured (SMTP settings in .env)
- 2FA requires authenticator app (Google Authenticator, Authy)
- Password validation rules enforced (min 8 chars)

**🔒 Security Features:**
- Passwords hashed with bcrypt
- JWT tokens with expiration
- Refresh tokens stored in database
- 2FA using TOTP (Time-based One-Time Password)

---


## 👥 USER & ROLE MANAGEMENT

**Module Status:** ✅ 90% Complete  
**Base Path:** `/api/v1/users`  
**Files:** `users.routes.js`, `users.controller.js`, `users.service.js`

### Endpoints

#### 1. Get My Profile
```
GET /api/v1/users/me
Auth: Yes
Role: All
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile fetched",
  "data": {
    "id": "uuid",
    "employeeId": "EMP-001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "role": "EMPLOYEE",
    "departmentId": "dept-uuid",
    "managerId": "manager-uuid",
    "designation": "Software Engineer",
    "joiningDate": "2025-01-15T00:00:00.000Z",
    "isActive": true,
    "twoFAEnabled": false,
    "phone": "+92-300-1234567",
    "department": {
      "id": "dept-uuid",
      "name": "Engineering"
    },
    "manager": {
      "id": "manager-uuid",
      "firstName": "Jane",
      "lastName": "Smith"
    }
  }
}
```

**cURL:**
```bash
curl -X GET http://localhost:5000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### 2. Update My Profile
```
PUT /api/v1/users/me
Auth: Yes
Role: All
```

**Request Body:**
```json
{
  "phone": "+92-300-9999999",
  "designation": "Senior Software Engineer",
  "profilePicture": "https://example.com/photo.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": { /* updated user object */ }
}
```

---

#### 3. Get All Users
```
GET /api/v1/users?page=1&limit=10&role=EMPLOYEE&search=john
Auth: Yes
Role: SUPER_ADMIN, ADMIN, MANAGER
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role
- `search` (optional): Search by name or email
- `departmentId` (optional): Filter by department
- `isActive` (optional): Filter by active status

**Response (200):**
```json
{
  "success": true,
  "message": "Users fetched",
  "data": [
    {
      "id": "uuid",
      "employeeId": "EMP-001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@company.com",
      "role": "EMPLOYEE",
      "department": { "name": "Engineering" },
      "isActive": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

#### 4. Get User By ID
```
GET /api/v1/users/:id
Auth: Yes
Role: SUPER_ADMIN, ADMIN, MANAGER
```

**Response (200):**
```json
{
  "success": true,
  "message": "User fetched",
  "data": { /* full user object */ }
}
```

---

#### 5. Create User
```
POST /api/v1/users
Auth: Yes
Role: SUPER_ADMIN, ADMIN
```

**Request Body:**
```json
{
  "email": "new.employee@company.com",
  "employeeId": "EMP-002",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "EMPLOYEE",
  "departmentId": "dept-uuid",
  "managerId": "manager-uuid",
  "designation": "Junior Developer",
  "joiningDate": "2025-04-15",
  "phone": "+92-300-1111111",
  "password": "TempPass123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created",
  "data": {
    "id": "new-uuid",
    "employeeId": "EMP-002",
    "email": "new.employee@company.com",
    "tempPassword": "TempPass123!"
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.employee@company.com",
    "employeeId": "EMP-002",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "EMPLOYEE"
  }'
```

---

#### 6. Update User
```
PUT /api/v1/users/:id
Auth: Yes
Role: SUPER_ADMIN, ADMIN
```

**Request Body:**
```json
{
  "designation": "Senior Developer",
  "departmentId": "new-dept-uuid",
  "role": "MANAGER"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated",
  "data": { /* updated user */ }
}
```

---

#### 7. Deactivate User
```
DELETE /api/v1/users/:id
Auth: Yes
Role: SUPER_ADMIN, ADMIN
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deactivated"
}
```

**Note:** This sets `isActive = false`, doesn't delete the record.

---

#### 8. Get All Departments
```
GET /api/v1/users/departments/all
Auth: Yes
Role: All
```

**Response (200):**
```json
{
  "success": true,
  "message": "Departments fetched",
  "data": [
    {
      "id": "uuid",
      "name": "Engineering",
      "description": "Software development team",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "name": "HR",
      "description": "Human Resources",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### 9. Create Department
```
POST /api/v1/users/departments
Auth: Yes
Role: SUPER_ADMIN, ADMIN
```

**Request Body:**
```json
{
  "name": "Marketing",
  "description": "Marketing and sales team"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Department created",
  "data": {
    "id": "new-uuid",
    "name": "Marketing",
    "description": "Marketing and sales team"
  }
}
```

---

#### 10. Get Users By Department
```
GET /api/v1/users/department/:deptId
Auth: Yes
Role: SUPER_ADMIN, ADMIN, MANAGER
```

**Response (200):**
```json
{
  "success": true,
  "message": "Users fetched",
  "data": [
    { /* user 1 */ },
    { /* user 2 */ }
  ]
}
```

---

### User Management Summary

**✅ What Works:**
- Complete CRUD operations for users
- Department management
- Role-based access control
- Pagination and filtering
- Search functionality
- Audit logging for user actions

**⚠️ Potential Issues:**
- No bulk user import (CSV upload)
- No user profile picture upload endpoint
- Password reset for users must be done via forgot-password flow

**🔒 RBAC Roles:**
- `SUPER_ADMIN`: Full system access
- `ADMIN`: Manage users, departments, attendance, leaves
- `MANAGER`: View team data, approve leaves
- `EMPLOYEE`: Self-service only

---

