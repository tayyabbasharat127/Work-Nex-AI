# WorkNex AI — Smart Workforce Management Platform

## Project Structure

```
worknex-ai/
├── worknex-backend/          # Node.js + Express + Prisma (MVC)
│   ├── src/
│   │   ├── config/           # DB, logger, app config
│   │   ├── middleware/        # Auth, validation, audit
│   │   ├── modules/           # Feature modules (MVC per module)
│   │   │   ├── auth/          # controller, service, routes
│   │   │   ├── users/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── analytics/
│   │   │   ├── performance/
│   │   │   ├── ai/            # Proxy to Python AI service
│   │   │   ├── etl/           # ETL pipeline + scheduler
│   │   │   ├── notifications/
│   │   │   └── billing/
│   │   ├── routes/            # Central route registry
│   │   └── utils/             # Helpers, validators
│   ├── prisma/                # Schema + migrations
│   └── scripts/               # Seed, backfill scripts
│
├── frontend/                  # Next.js 14 App Router
│   ├── app/
│   │   └── dashboard/
│   │       ├── admin/         # Admin pages
│   │       ├── manager/       # Manager pages
│   │       └── employee/      # Employee pages
│   ├── components/            # Shared UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # API client, helpers
│   └── services/              # Background services (ping, etc.)
│
├── ai-service/                # Python FastAPI (MVC)
│   ├── app/
│   │   ├── controllers/       # Route handlers
│   │   │   ├── chat_controller.py
│   │   │   ├── predict_controller.py
│   │   │   └── workflow_controller.py
│   │   ├── services/          # Business logic
│   │   │   ├── chat_service.py
│   │   │   ├── forecast_service.py
│   │   │   ├── anomaly_service.py
│   │   │   └── attrition_service.py
│   │   ├── models/            # Pydantic schemas
│   │   │   └── schemas.py
│   │   ├── core/              # Config, settings
│   │   │   └── config.py
│   │   └── main.py            # FastAPI app + router registration
│   ├── run.py                 # Entry point
│   ├── requirements.txt
│   └── .env.example
│
└── docs/                      # All documentation
    ├── ARCHITECTURE.md
    ├── API_DOCUMENTATION.md
    └── ...
```

## Quick Start

### 1. Backend (Node.js)
```bash
cd worknex-backend
npm install
npx prisma migrate dev
npm run dev
```

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### 3. AI Service (Python) — Optional
```bash
cd ai-service
pip install -r requirements.txt
python run.py
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js, Express, Prisma, PostgreSQL |
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| AI Service | Python, FastAPI, Statistical ML |
| Auth | JWT + Refresh Tokens |
| ETL | Custom pipeline with node-cron |

## Environment Variables

- `worknex-backend/.env` — Backend config
- `ai-service/.env` — AI service config (copy from `.env.example`)
- `frontend/.env.local` — Frontend config (NEXT_PUBLIC_API_URL)
