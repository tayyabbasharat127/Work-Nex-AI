<div align="center">

<img src="frontend/public/icon.svg" alt="WorkNex AI Logo" width="80" height="80" />

# WorkNex AI

### 🚀 AI-Powered Workforce Intelligence Platform

*Automate. Analyze. Optimize.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![GCP](https://img.shields.io/badge/Google_Cloud-Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com)

[![CI](https://img.shields.io/github/actions/workflow/status/tayyabbasharat127/Work-Nex-AI/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/tayyabbasharat127/Work-Nex-AI/actions)
[![Deploy](https://img.shields.io/github/actions/workflow/status/tayyabbasharat127/Work-Nex-AI/deploy.yml?branch=main&style=flat-square&label=Deploy&logo=google-cloud)](https://github.com/tayyabbasharat127/Work-Nex-AI/actions)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 🌍 The Problem

> Most workforce systems are **manual**, **fragmented**, **reactive**, and **analytics-poor**.

**WorkNex AI** transforms workforce management into a real-time, intelligent ecosystem — from attendance tracking to predictive attrition analysis.

---

## ✨ Platform Overview

<table>
<tr>
<td width="50%">

### 🔐 Auth & Access Control
- JWT Authentication
- Role-Based Access *(Admin / Manager / Employee)*
- OTP Email Verification
- Bcrypt Password Hashing
- Password Reset & 2FA

</td>
<td width="50%">

### 📍 Attendance Intelligence
- Manual & Auto Check-In/Out
- Office WiFi IP Validation
- Grace Period & Late Detection
- Real-time Notifications
- Background Ping System

</td>
</tr>
<tr>
<td width="50%">

### 📝 Leave Management
- Annual / Sick / Casual Leave
- Overlap Detection
- Multi-level Approval Flow
- Balance Validation
- Email Notifications

</td>
<td width="50%">

### 📊 Analytics & ETL
- Nightly ETL Pipeline
- KPI Dashboard (Live)
- Department Comparisons
- Trend Analysis
- Power BI Embedded Reports

</td>
</tr>
<tr>
<td width="50%">

### 🤖 AI & ML Engine
- Leave Forecast (ML Model)
- Attendance Anomaly Detection
- Attrition Risk Prediction
- Performance Prediction
- RAG-based HR Chatbot

</td>
<td width="50%">

### 🧠 Multi-Agent System
- LangGraph Supervisor Agent
- Attendance Sub-Agent
- Leave Sub-Agent
- Performance Sub-Agent
- Natural Language Queries

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      USERS                               │
│          Admin  ·  Manager  ·  Employee                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                  FRONTEND (Next.js 16)                    │
│          Dashboard · Auth · Analytics · Chat              │
│                    Port: 3000                             │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
       ┌───────────────┼───────────────┐
       │               │               │
┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼───────┐
│   BACKEND   │ │  AI SERVICE │ │ MULTI-AGENT │
│  (Express)  │ │  (FastAPI)  │ │ (LangGraph) │
│  Port: 5000 │ │  Port: 8000 │ │ Port: 8010  │
└──────┬──────┘ └──────┬──────┘ └─────────────┘
       │               │
┌──────▼───────────────▼──────────────────────────────────┐
│                   PostgreSQL (Neon)                       │
│         Main DB  ·  Agent Memory DB                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

<table>
<tr>
<th>Layer</th>
<th>Technologies</th>
</tr>
<tr>
<td><b>Frontend</b></td>
<td>

![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22C55E)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000)

</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens)

</td>
</tr>
<tr>
<td><b>AI Service</b></td>
<td>

![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikit-learn&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35)

</td>
</tr>
<tr>
<td><b>Multi-Agent</b></td>
<td>

![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain)
![LangGraph](https://img.shields.io/badge/LangGraph-FF6B6B)
![OpenRouter](https://img.shields.io/badge/OpenRouter-6E40C9)

</td>
</tr>
<tr>
<td><b>Database</b></td>
<td>

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-00E5CC?logo=neon&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?logo=prisma)

</td>
</tr>
<tr>
<td><b>DevOps</b></td>
<td>

![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Cloud_Run-4285F4?logo=google-cloud&logoColor=white)

</td>
</tr>
</table>

---

## 📁 Project Structure

```
Work-Nex-AI/
├── 🖥️  frontend/                 # Next.js 16 App Router
├── ⚙️  worknex-backend/          # Express + Prisma API
│   ├── src/modules/             # Feature modules
│   ├── prisma/                  # Schema & migrations
│   ├── scripts/                 # Seed, test, health check
│   └── docs/                    # API contracts, PowerBI, reports
├── 🤖  ai-service/              # Python FastAPI + ML models
├── 🧠  multi-agent-service/     # LangGraph multi-agent
├── 🐳  docker-compose.yml       # Production compose
├── 🐳  docker-compose.dev.yml   # Dev compose (hot reload)
└── 📄  .env.example             # Environment template
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+ (or [Neon](https://neon.tech) free)
- Docker (optional)

### 1. Clone & Setup
```bash
git clone https://github.com/tayyabbasharat127/Work-Nex-AI.git
cd Work-Nex-AI
cp .env.example .env
# Fill in your values in .env
```

### 2. Backend
```bash
cd worknex-backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev        # → http://localhost:5000
```

### 3. AI Service
```bash
cd ai-service
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
python run.py      # → http://localhost:8000
```

### 4. Multi-Agent Service
```bash
cd multi-agent-service
npm install
npm run dev        # → http://localhost:8010
```

### 5. Frontend
```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

### 🐳 Docker (All-in-one)
```bash
# Production
docker compose up --build

# Development (hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## 🚀 Deployment

Automated CI/CD via **GitHub Actions → Google Cloud Run**

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Cloud Run | Auto-deployed |
| Backend | Cloud Run | Auto-deployed |
| AI Service | Cloud Run | Auto-deployed |
| Multi-Agent | Cloud Run | Auto-deployed |
| Database | Neon PostgreSQL | Managed |

Push to `main` → GitHub Actions builds all Docker images → Deploys to Cloud Run automatically.

---

## 🔒 Security

| Feature | Status |
|---------|--------|
| JWT Auth + Refresh Tokens | ✅ |
| Role-Based Access Control | ✅ |
| IP-based Attendance Restriction | ✅ |
| Bcrypt Password Hashing | ✅ |
| OTP Verification | ✅ |
| 2FA Support | ✅ |
| Rate Limiting | ✅ |
| CORS Protection | ✅ |

---

## 👥 Team

Built with ❤️ for enterprise workforce intelligence.

---

<div align="center">

**WorkNex AI** — *Transforming workforce management from manual tracking to intelligent automation*

[![GitHub](https://img.shields.io/badge/GitHub-tayyabbasharat127-181717?style=flat-square&logo=github)](https://github.com/tayyabbasharat127/Work-Nex-AI)

</div>
