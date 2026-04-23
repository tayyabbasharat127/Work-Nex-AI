# 📋 API DATA CONTRACT - Single Source of Truth

## Base URL
```
http://localhost:5000/api/v1
```

## Response Format (ALL APIs)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* actual data */ },
  "meta": { /* pagination, etc */ }
}
```

---

## 🔐 AUTHENTICATION MODULE

### 1. Register User
**Endpoint:** `POST /auth/register`
**Auth Required:** No
**Description:** Register a new employee/user

**Request Body:**
```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "employeeId": "EMP-001",
  "role": "EMPLOYEE",
  "departmentId": "uuid-dept-id",
  "managerId": "uuid-manager-id",
  "designation": "Software Engineer",
  "joiningDate": "2024-01-15",
  "phone": "+1234567890"
}
```

**Required Fields:**
- `email` (string, valid email)
- `password` (string, min 8 chars)
- `firstName` (string)
- `lastName` (string)
- `employeeId` (string, unique)

**Optional Fields:**
- `role` (enum: SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE) - defaults to EMPLOYEE
- `departmentId` (uuid)
- `managerId` (uuid)
- `designation` (string)
- `joiningDate` (ISO date)
- `phone` (string)

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "email": "john.doe@company.com",
    "role": "EMPLOYEE",
    "firstName": "John",
    "lastName": "Doe",
    "employeeId": "EMP-001"
  }
}
```

**Errors:**
- 409: Email already registered
- 409: Employee ID already exists
- 400: Validation errors

---

### 2. Login
**Endpoint:** `POST /auth/login`
**Auth Required:** No

**Request Body:**
```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass123!"
}
```

**Response (No 2FA):**
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
      "lastName": "Doe"
    }
  }
}
```

**Response (2FA Enabled):**
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

**Errors:**
- 401: Invalid credentials
- 401: User inactive

---

### 3. Refresh Token
**Endpoint:** `POST /auth/refresh-token`
**Auth Required:** No

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
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

### 4. Forgot Password
**Endpoint:** `POST /auth/forgot-password`
**Auth Required:** No

**Request Body:**
```json
{
  "email": "john.doe@company.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent"
}
```

---

### 5. Reset Password
**Endpoint:** `POST /auth/reset-password`
**Auth Required:** No

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### 6. Change Password
**Endpoint:** `POST /auth/change-password`
**Auth Required:** Yes
**Headers:** `Authorization: Bearer {accessToken}`

**Request Body:**
```json
{
  "oldPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 💼 BILLING/ORGANIZATION MODULE

### 7. Register Organization
**Endpoint:** `POST /billing/register`
**Auth Required:** No

**Request Body:**
```json
{
  "orgName": "TechCorp Inc",
  "ownerEmail": "admin@techcorp.com",
  "ownerFirstName": "Jane",
  "ownerLastName": "Smith",
  "industry": "Technology",
  "country": "United States",
  "phone": "+1234567890",
  "website": "https://techcorp.com"
}
```

**Required Fields:**
- `orgName` (string)
- `ownerEmail` (string, valid email)
- `ownerFirstName` (string)
- `ownerLastName` (string)
- `industry` (string)
- `country` (string)

**Response:**
```json
{
  "success": true,
  "message": "Organization registered successfully",
  "data": {
    "organization": {
      "id": "uuid",
      "name": "TechCorp Inc",
      "slug": "techcorp-inc",
      "industry": "Technology",
      "country": "United States"
    },
    "licenseKey": "WNX-ABC123-DEF456-GHI789",
    "trialEndsAt": "2024-02-15T00:00:00.000Z"
  }
}
```

**Errors:**
- 409: Organization name already taken

---

### 8. Get Subscription Plans
**Endpoint:** `GET /billing/plans`
**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "message": "Plans fetched",
  "data": [
    {
      "type": "TRIAL",
      "name": "Trial",
      "maxEmployees": 25,
      "pricing": {
        "monthly": 0,
        "annual": 0,
        "annualTotal": 0,
        "annualSavings": null
      },
      "features": ["Basic features", "25 employees", "14-day trial"]
    },
    {
      "type": "STARTER",
      "name": "Starter",
      "maxEmployees": 50,
      "pricing": {
        "monthly": 49,
        "annual": 470,
        "annualTotal": 470,
        "annualSavings": 118
      },
      "features": ["All basic features", "50 employees", "Email support"]
    }
  ]
}
```
