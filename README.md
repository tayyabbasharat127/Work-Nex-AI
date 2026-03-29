<<<<<<< HEAD
# WorkNex AI - Attendance Management System

Full-stack attendance management system with Next.js frontend and Node.js backend.

## 🎉 API Integration Status: COMPLETE ✅

The backend API has been fully integrated with the frontend. See [API_INTEGRATION_COMPLETE.md](./API_INTEGRATION_COMPLETE.md) for details.

## 📁 Project Structure

```
.
├── backend/                 # Node.js + Express + PostgreSQL
│   ├── config/             # Database and email configuration
│   ├── controller/         # Business logic
│   ├── middleware/         # Authentication & authorization
│   ├── models/             # Sequelize models
│   ├── routes/             # API routes
│   └── Server.js           # Entry point
│
├── frontend/               # Next.js + React + Tailwind CSS
│   ├── app/               # Next.js app directory
│   ├── components/        # Reusable components
│   ├── hooks/             # Custom React hooks ✨
│   ├── lib/               # API client & utilities ✨
│   ├── contexts/          # React contexts ✨
│   └── public/            # Static assets
│
└── Documentation/          # Integration docs ✨
    ├── API_INTEGRATION_GUIDE.md
    ├── INTEGRATION_README.md
    ├── QUICK_REFERENCE.md
    ├── INTEGRATION_CHECKLIST.md
    └── BEST_PRACTICES.md
```

✨ = Newly created for API integration

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

4. Run migrations:
```bash
npx sequelize-cli db:migrate
```

5. Start the server:
```bash
node Server.js
```

Backend runs on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## 📚 Documentation

### Integration Documentation
- **[API_INTEGRATION_COMPLETE.md](./API_INTEGRATION_COMPLETE.md)** - Complete integration summary
- **[API_INTEGRATION_GUIDE.md](./frontend/API_INTEGRATION_GUIDE.md)** - Detailed API usage guide
- **[INTEGRATION_README.md](./frontend/INTEGRATION_README.md)** - Setup and architecture
- **[QUICK_REFERENCE.md](./frontend/QUICK_REFERENCE.md)** - Quick reference guide
- **[BEST_PRACTICES.md](./frontend/BEST_PRACTICES.md)** - Coding best practices
- **[INTEGRATION_CHECKLIST.md](./frontend/INTEGRATION_CHECKLIST.md)** - Progress tracker

### Project Documentation
- **[PROJECT_README.md](./frontend/PROJECT_README.md)** - Frontend project details

## 🔌 API Integration

### Features
✅ Complete REST API client  
✅ JWT authentication with auto-refresh  
✅ Custom React hooks for data management  
✅ Helper utilities for common operations  
✅ Comprehensive error handling  
✅ Loading states management  
✅ Production-ready code  

### Quick Example

```javascript
// Authentication
import { useAuth } from '@/hooks/useAuth';

const { login } = useAuth();
await login(email, password);

// Fetch Data
import { useUsers } from '@/hooks/useUsers';

const { users, loading, fetchUsers } = useUsers();
useEffect(() => {
  fetchUsers();
}, []);

// Direct API Call
import { attendanceAPI } from '@/lib/api';

const status = await attendanceAPI.getTodayStatus();
```

## 🎯 Features

### Authentication
- User registration with email verification
- Login with JWT tokens
- Password reset functionality
- Role-based access control (Super Admin, Admin, Manager, Employee)

### Attendance Management
- Check-in/Check-out
- Activity tracking
- Attendance history
- Manual attendance marking (Admin)
- Auto-checkout for stale sessions

### Leave Management
- Apply for leaves
- Leave approval workflow
- Leave balance tracking
- Leave history

### User Management
- Create/Edit/Delete users
- Department assignment
- Role management
- User profiles

### Analytics & Reports
- KPI dashboards
- Attendance trends
- Department analytics
- Custom reports

### Organization Settings
- Work hours configuration
- Leave policies
- Department management
- System settings

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- PostgreSQL
- Sequelize ORM
- JWT Authentication
- Nodemailer
- Node-cron

### Frontend
- Next.js 16
- React 19
- Tailwind CSS 4
- Radix UI Components
- Recharts
- Sonner (Toast notifications)

## 📊 API Endpoints

### Authentication (8 endpoints)
- POST `/api/auth/signup`
- POST `/api/auth/verify-otp`
- POST `/api/auth/login`
- POST `/api/auth/superadmin/login`
- POST `/api/auth/forgot-password`
- POST `/api/auth/reset-password`
- POST `/api/auth/changePassword`
- POST `/api/auth/refresh-token`

### Attendance (9 endpoints)
- POST `/api/attendance/check-in`
- POST `/api/attendance/check-out`
- POST `/api/attendance/ping`
- GET `/api/attendance/today-status`
- GET `/api/attendance/history`
- GET `/api/attendance/overview`
- POST `/api/attendance/manual-mark`
- PUT `/api/attendance/adjust`
- POST `/api/attendance/trigger-auto-checkout`

### Leaves (5 endpoints)
- POST `/api/leaves`
- GET `/api/leaves/my`
- GET `/api/leaves`
- PUT `/api/leaves/:id/status`
- DELETE `/api/leaves/:id`

### Users (4 endpoints)
- POST `/api/users/createuser`
- GET `/api/users/getuser`
- PUT `/api/users/users/:id`
- DELETE `/api/users/users/:id`

### Departments (4 endpoints)
- GET `/api/departments`
- POST `/api/departments`
- PUT `/api/departments/:id`
- DELETE `/api/departments/:id`

### Analytics (3 endpoints)
- GET `/api/analytics/kpis`
- GET `/api/analytics/trends`
- GET `/api/analytics/departments`

### Reports (2 endpoints)
- POST `/api/reports/generate`
- GET `/api/reports`

### Settings (2 endpoints)
- GET `/api/settings/organization`
- PUT `/api/settings/organization`

**Total: 38 API endpoints**

## 🔐 User Roles

- **Super Admin (0)** - Full system access
- **Admin (1)** - Organization management
- **Manager (2)** - Team management
- **Employee (3)** - Self-service features

## 🧪 Testing

### Backend
```bash
cd backend
# Run test files
node test_login.js
node test_user_creation.js
```

### Frontend
```bash
cd frontend
npm run test
```

## 📱 Pages

### Public Pages
- `/login` - User login ✅ API Integrated
- `/register` - User registration ✅ API Integrated
- `/forgot-password` - Password reset
- `/reset-password` - Password reset confirmation
- `/verify-otp` - Email verification

### Admin Dashboard
- `/dashboard/admin` - Admin home
- `/dashboard/admin/users` - User management
- `/dashboard/admin/departments` - Department management
- `/dashboard/admin/attendance` - Attendance overview
- `/dashboard/admin/leaves` - Leave management
- `/dashboard/admin/analytics` - Analytics dashboard
- `/dashboard/admin/reports` - Reports
- `/dashboard/admin/settings` - System settings

### Manager Dashboard
- `/dashboard/manager` - Manager home
- `/dashboard/manager/attendance` - Team attendance
- `/dashboard/manager/leaves` - Team leaves
- `/dashboard/manager/performance` - Team performance

### Employee Dashboard
- `/dashboard/employee` - Employee home
- `/dashboard/employee/attendance` - My attendance ✅ Example Created
- `/dashboard/employee/leaves` - My leaves
- `/dashboard/employee/analytics` - My analytics
- `/dashboard/employee/settings` - My settings

## 🚀 Deployment

### Backend Deployment
1. Set production environment variables
2. Run migrations on production database
3. Deploy to your hosting service (Heroku, AWS, etc.)

### Frontend Deployment
1. Update `NEXT_PUBLIC_API_URL` to production URL
2. Build the application:
```bash
npm run build
```
3. Deploy to Vercel, Netlify, or your hosting service

## 🐛 Troubleshooting

### CORS Issues
Ensure backend CORS is configured for your frontend URL:
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Database Connection
Check PostgreSQL is running and credentials are correct in `.env`

### Token Issues
- Clear localStorage and login again
- Verify JWT_SECRET matches between frontend and backend

## 📈 Roadmap

- [x] Backend API development
- [x] Frontend UI development
- [x] API integration
- [ ] Complete all page integrations
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Export functionality
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Development Team

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Radix UI for accessible components
- Tailwind CSS for utility-first styling

---

**Status:** ✅ API Integration Complete  
**Version:** 1.0.0  
**Last Updated:** March 2024

For detailed API integration information, see [API_INTEGRATION_COMPLETE.md](./API_INTEGRATION_COMPLETE.md)
# WorkNex-AI---Latest
=======
🚀 WorkNex AI

AI-Powered Workforce Intelligence Platform
Automate. Analyze. Optimize.

<p align="center"> <b>Attendance • Leave • Analytics • Automation • Predictive AI</b> </p>
🌍 The Problem

Most workforce systems are:

Manual

Fragmented

Reactive

Analytics-poor

WorkNex AI transforms workforce management into a real-time, intelligent ecosystem.

✨ Core Platform
🔐 Authentication & Access Control

Secure multi-level access architecture.

JWT Authentication

Role-Based Access Control (Admin / Manager / Employee)

OTP Email Verification

Bcrypt Password Hashing

Account Activation Flow

Password Reset (OTP-based)

Secure Token Expiry

📍 Attendance Intelligence Engine (AISE)

Smart attendance with location-based validation.

Manual Check-In

Office WiFi IP validation

Grace period logic

Late detection

Duplicate prevention

Real-time notifications

Auto Check-In (Ping System)

Background ping every 60 seconds

Automatic attendance marking

Zero manual dependency

Check-Out

Working hours calculation

Attendance record update

Admin Dashboard

Live Present / Late / Absent status

Department breakdown

Real-time tracking

📝 Leave Management Engine

Fully automated leave lifecycle.

Flow:
Apply → Validate → Pending → Approve/Reject → Notify

Features:

Annual / Sick / Casual leave

Overlap detection

Multi-level approval

Leave balance validation

Leave history tracking

Email notifications

👥 Organization Management
User Management

Create employees

Assign roles

Link departments

Welcome email automation

Department Management

Create / Edit / Delete

Assign managers

Track employee count

⚙️ Organization Settings

Fully configurable attendance rules.

Allowed IP ranges

Shift timings

Grace period

Organization-wide enforcement

📊 Enterprise Analytics Layer
🔄 ETL Pipeline

Nightly data transformation process:

Extract operational data

Clean & normalize

Generate KPI metrics

Load into analytics database

Generated Metrics

Attendance Rate

Late Arrival Count

Leave Utilization %

Avg Check-In Time

📈 Power BI Integration

Embedded analytics with:

Interactive dashboards

KPI cards

Heatmaps

Department comparisons

Trend analysis

Row-Level Security (RLS)

🤖 AI & Predictive Intelligence (Future Expansion)

Absenteeism forecasting

Pattern detection

Anomaly alerts

Agentic AI chatbot (LangChain)

Natural language workforce queries

Example:

“You’ve been present 18/20 days (90%).”

🏗 Architecture
Frontend (React / Next.js)
        ↓
Backend API (Node.js / Express)
        ↓
PostgreSQL
        ↓
ETL Pipeline
        ↓
Analytics Database
        ↓
Power BI Dashboards
        ↓
AI Engine (Python + ML)
🛠 Tech Stack
Frontend

React.js • Next.js • Tailwind CSS • Chart.js

Backend

Node.js • Express.js • JWT • Bcrypt

Database

PostgreSQL

AI & Analytics

Python (FastAPI / Scikit-learn) • LangChain • ETL • Power BI

DevOps

Git • GitHub • Google Cloud • CI/CD

🔒 Security Highlights

JWT-secured APIs

RBAC enforcement

IP-based attendance restriction

Encrypted password storage

OTP verification

Activity logging

🚫 Scope Limitations

No payroll module

No standalone mobile app

No offline attendance

No behavioral/emotion AI

🚀 Quick Start
git clone https://github.com/your-username/worknex-ai.git
cd worknex-ai

Backend:

cd backend
npm install
npm run dev

Frontend:

cd frontend
npm install
npm run dev
🌟 Vision

To build an enterprise-ready workforce intelligence platform that moves organizations from manual tracking → intelligent automation → predictive decision-making.
>>>>>>> 0544562a1075bdc98c91d928eccf30541806636d
