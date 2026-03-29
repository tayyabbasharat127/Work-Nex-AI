# System Architecture

## Overview

WorkNex AI is a full-stack attendance management system with a clear separation between frontend and backend.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Pages      │  │  Components  │  │   Contexts   │          │
│  │              │  │              │  │              │          │
│  │ - Login      │  │ - Sidebar    │  │ - AuthContext│          │
│  │ - Dashboard  │  │ - Tables     │  │              │          │
│  │ - Users      │  │ - Forms      │  │              │          │
│  │ - Attendance │  │ - Modals     │  │              │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Custom Hooks Layer                   │          │
│  │                                                    │          │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │          │
│  │  │ useAuth  │ │ useUsers │ │useLeaves │  ...    │          │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘         │          │
│  └───────┼────────────┼────────────┼────────────────┘          │
│          │            │            │                            │
│          └────────────┼────────────┘                            │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────┐          │
│  │              API Client Layer                     │          │
│  │                                                    │          │
│  │  - Token Management                               │          │
│  │  - Request/Response Handling                      │          │
│  │  - Error Handling                                 │          │
│  │  - Token Refresh                                  │          │
│  └────────────────────┬─────────────────────────────┘          │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS
                        │ REST API
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────┐          │
│  │                  Routes Layer                     │          │
│  │                                                    │          │
│  │  /api/auth      /api/users      /api/attendance  │          │
│  │  /api/leaves    /api/departments /api/analytics  │          │
│  └────────────────────┬─────────────────────────────┘          │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Middleware Layer                     │          │
│  │                                                    │          │
│  │  - Authentication (JWT)                           │          │
│  │  - Authorization (Role-based)                     │          │
│  │  - Request Validation                             │          │
│  └────────────────────┬─────────────────────────────┘          │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Controller Layer                     │          │
│  │                                                    │          │
│  │  - Business Logic                                 │          │
│  │  - Data Processing                                │          │
│  │  - Response Formatting                            │          │
│  └────────────────────┬─────────────────────────────┘          │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────┐          │
│  │               Models Layer (Sequelize)            │          │
│  │                                                    │          │
│  │  - User Model                                     │          │
│  │  - Attendance Model                               │          │
│  │  - Leave Model                                    │          │
│  │  - Organization Model                             │          │
│  └────────────────────┬─────────────────────────────┘          │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   PostgreSQL     │
              │    Database      │
              └──────────────────┘
```

## Data Flow

### 1. Authentication Flow

```
User Login
    │
    ▼
Login Page (Frontend)
    │
    ▼
useAuth Hook
    │
    ▼
authAPI.login()
    │
    ▼
POST /api/auth/login (Backend)
    │
    ▼
Auth Controller
    │
    ▼
Validate Credentials
    │
    ▼
Generate JWT Tokens
    │
    ▼
Return { user, token, refreshToken }
    │
    ▼
Store in localStorage
    │
    ▼
Redirect to Dashboard
```

### 2. Data Fetching Flow

```
Component Mount
    │
    ▼
useEffect Hook
    │
    ▼
Custom Hook (e.g., useUsers)
    │
    ▼
API Client (userAPI.getUsers)
    │
    ▼
Add Authorization Header
    │
    ▼
GET /api/users/getuser (Backend)
    │
    ▼
Authenticate Token (Middleware)
    │
    ▼
Authorize Role (Middleware)
    │
    ▼
User Controller
    │
    ▼
Query Database
    │
    ▼
Return Data
    │
    ▼
Update Component State
    │
    ▼
Render UI
```

### 3. Token Refresh Flow

```
API Request
    │
    ▼
401 Unauthorized Response
    │
    ▼
API Client Intercepts
    │
    ▼
Get Refresh Token
    │
    ▼
POST /api/auth/refresh-token
    │
    ▼
Validate Refresh Token
    │
    ▼
Generate New Tokens
    │
    ▼
Store New Tokens
    │
    ▼
Retry Original Request
    │
    ▼
Return Data
```

## Component Architecture

### Frontend Component Hierarchy

```
App
├── Layout
│   ├── Header
│   └── Sidebar
│
├── Pages
│   ├── Public
│   │   ├── Login
│   │   ├── Register
│   │   └── ForgotPassword
│   │
│   └── Protected
│       ├── Admin Dashboard
│       │   ├── Users
│       │   ├── Departments
│       │   ├── Attendance
│       │   └── Analytics
│       │
│       ├── Manager Dashboard
│       │   ├── Team Attendance
│       │   └── Team Leaves
│       │
│       └── Employee Dashboard
│           ├── My Attendance
│           └── My Leaves
│
├── Components
│   ├── UI Components
│   │   ├── Button
│   │   ├── Input
│   │   ├── Modal
│   │   └── Table
│   │
│   └── Feature Components
│       ├── UserForm
│       ├── AttendanceCard
│       └── LeaveForm
│
├── Hooks
│   ├── useAuth
│   ├── useUsers
│   ├── useAttendance
│   └── useLeaves
│
├── Contexts
│   └── AuthContext
│
└── Utils
    ├── API Client
    └── Helpers
```

## Database Schema

```
┌─────────────────┐
│  organizations  │
├─────────────────┤
│ id              │
│ name            │
│ settings        │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│     users       │
├─────────────────┤
│ id              │
│ name            │
│ email           │
│ password        │
│ role            │
│ organization_id │◄────┐
│ department_id   │     │
└────────┬────────┘     │
         │              │
         │ 1:N          │
         │              │
┌────────▼────────┐     │
│   attendances   │     │
├─────────────────┤     │
│ id              │     │
│ user_id         │     │
│ check_in        │     │
│ check_out       │     │
│ date            │     │
│ status          │     │
└─────────────────┘     │
                        │
┌─────────────────┐     │
│     leaves      │     │
├─────────────────┤     │
│ id              │     │
│ user_id         │─────┘
│ start_date      │
│ end_date        │
│ type            │
│ status          │
│ reason          │
└─────────────────┘

┌─────────────────┐
│  departments    │
├─────────────────┤
│ id              │
│ name            │
│ organization_id │
└─────────────────┘
```

## Security Architecture

### Authentication & Authorization

```
Request
    │
    ▼
┌─────────────────────┐
│ JWT Token in Header │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Verify Token        │
│ (Middleware)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Check Role          │
│ (Authorization)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Execute Controller  │
└─────────────────────┘
```

### Token Structure

```
JWT Token
├── Header
│   ├── alg: "HS256"
│   └── typ: "JWT"
│
├── Payload
│   ├── userId
│   ├── email
│   ├── role
│   ├── organizationId
│   ├── iat (issued at)
│   └── exp (expiration)
│
└── Signature
    └── HMACSHA256(
          base64UrlEncode(header) + "." +
          base64UrlEncode(payload),
          JWT_SECRET
        )
```

## API Request/Response Flow

### Successful Request

```
Client Request
    │
    ▼
API Client adds token
    │
    ▼
Backend receives request
    │
    ▼
Middleware validates token
    │
    ▼
Controller processes request
    │
    ▼
Database query
    │
    ▼
Format response
    │
    ▼
Return 200 OK + data
    │
    ▼
Client updates state
    │
    ▼
UI re-renders
```

### Failed Request (Token Expired)

```
Client Request
    │
    ▼
API Client adds token
    │
    ▼
Backend receives request
    │
    ▼
Middleware validates token
    │
    ▼
Token expired!
    │
    ▼
Return 401 Unauthorized
    │
    ▼
API Client intercepts
    │
    ▼
Request token refresh
    │
    ▼
Get new tokens
    │
    ▼
Retry original request
    │
    ▼
Success!
```

## Deployment Architecture

### Development

```
┌──────────────┐         ┌──────────────┐
│   Frontend   │         │   Backend    │
│ localhost:   │◄───────►│ localhost:   │
│    3000      │         │    5000      │
└──────────────┘         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  PostgreSQL  │
                         │  localhost:  │
                         │    5432      │
                         └──────────────┘
```

### Production

```
┌──────────────┐         ┌──────────────┐
│   Vercel     │         │   Heroku/    │
│   (Frontend) │◄───────►│   AWS        │
│              │  HTTPS  │   (Backend)  │
└──────────────┘         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  PostgreSQL  │
                         │  (Managed)   │
                         └──────────────┘
```

## Technology Stack

### Frontend
- **Framework:** Next.js 16
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **Components:** Radix UI
- **State Management:** React Hooks + Context
- **HTTP Client:** Fetch API
- **Charts:** Recharts
- **Notifications:** Sonner

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Authentication:** JWT
- **Email:** Nodemailer
- **Scheduling:** Node-cron

### DevOps
- **Version Control:** Git
- **Package Manager:** npm
- **Deployment:** Vercel (Frontend), Heroku/AWS (Backend)
- **Database Hosting:** AWS RDS / Heroku Postgres

## Performance Considerations

### Frontend Optimization
- Code splitting with Next.js
- Image optimization
- Lazy loading components
- Memoization with useMemo/useCallback
- Debouncing search inputs

### Backend Optimization
- Database indexing
- Query optimization
- Connection pooling
- Caching strategies
- Rate limiting

### Network Optimization
- Compression (gzip)
- CDN for static assets
- HTTP/2
- Minimize API calls
- Batch requests where possible

## Scalability

### Horizontal Scaling
```
Load Balancer
    │
    ├──► Backend Instance 1
    ├──► Backend Instance 2
    └──► Backend Instance 3
         │
         ▼
    Database (Primary)
         │
         ├──► Read Replica 1
         └──► Read Replica 2
```

### Caching Strategy
```
Client Request
    │
    ▼
Check Redis Cache
    │
    ├──► Cache Hit ──► Return Data
    │
    └──► Cache Miss
         │
         ▼
    Query Database
         │
         ▼
    Store in Cache
         │
         ▼
    Return Data
```

## Monitoring & Logging

### Application Monitoring
- Error tracking (Sentry)
- Performance monitoring
- User analytics
- API usage metrics

### Infrastructure Monitoring
- Server health
- Database performance
- Network latency
- Resource utilization

---

This architecture provides a solid foundation for a scalable, maintainable, and secure attendance management system.
