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
