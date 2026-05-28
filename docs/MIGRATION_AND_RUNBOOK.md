# Migration And Runbook

## Migration Audit

| Feature | Current storage | Needs DB table? | Existing Prisma model? | Migration needed? | Risk |
|---|---|---:|---:|---:|---|
| Organization settings | `OrganizationSettings` table | Yes | Yes | Added in `20260517130000_add_durable_settings_leave_automation` | Production deploy requires tenant backfill if legacy sidecar settings must be preserved. |
| Attendance policy/settings | `OrganizationSettings.attendancePolicyJson` | Yes | Yes | Added | Validate policy JSON before expanding into typed columns later. |
| Leave policy documents | `PolicyDocument` table plus local uploaded file | Yes | Yes | Added | File bytes remain on disk/local storage; metadata and extracted text are durable in DB. |
| Extracted leave policy rules | `ExtractedPolicyRule` table | Yes | Yes | Added | Rules are drafts until admin approval. |
| Leave policy versions | `LeavePolicyVersion` table | Yes | Yes | Added | Only approved versions become `ACTIVE`; older versions are archived. |
| Leave decision logs | `LeaveDecisionLog` table | Yes | Yes | Added | Automated and human decisions persist in DB. |
| Audit logs | `AuditLog` table | Yes | Yes | Existing | Optional `organizationId` supports platform events. |
| ETL logs | `EtlSyncLog` table | Yes | Yes | Existing | Optional `organizationId` supports global sync events. |
| Notifications | `Notification` table | Yes | Yes | Existing | Tenant-owned. |
| Tenant-owned data | Required `organizationId` fields | Yes | Yes | Existing tenant migration | Production data needs backfill before required constraints are enforced. |
| Power BI config | Environment variables | No core table yet | No | No | Credentials are external secret/config values. |
| AI/RAG metadata | Regenerable model/vector files | No core backend table | No | No | Vector/model artifacts can be rebuilt; prediction logging can be added later if required. |

## Fresh Database Setup

Every new or empty database must have migrations applied before the backend will start. The startup guard checks for required tables and exits with a clear error message if they are missing.

### For local / dev (new or existing empty database)

```powershell
cd worknex-backend
npm.cmd run db:setup
npm.cmd run db:seed
npm.cmd run dev
```

`db:setup` runs `prisma validate && prisma generate && prisma migrate deploy`. It is safe to run on an already-migrated database — Prisma will apply only pending migrations.

### For production

```powershell
cd worknex-backend
npm.cmd run db:deploy
npm.cmd start
```

`db:deploy` runs `prisma migrate deploy` and never prompts or resets data. Use this in CI/CD pipelines and container entrypoints.

### For a fully disposable local database (destructive reset)

```powershell
cd worknex-backend
npm.cmd run db:reset
```

`db:reset` drops and recreates all tables, replays every migration, and runs the seed. Use only on throwaway local databases. **Never run on shared, staging, or production databases.**

### Preflight check (verify a database is ready without starting the app)

```powershell
cd worknex-backend
node scripts/db-preflight.js
```

Or via npm:

```powershell
npm.cmd run db:preflight
```

If required tables are missing, the script exits with a non-zero code and prints:

```
[db-preflight] FAIL — Database is not migrated.
[db-preflight] Run: cd worknex-backend && npm run db:setup
```

### Root shortcuts

```powershell
npm.cmd run db:setup     # validate + generate + deploy migrations
npm.cmd run db:status    # show pending migrations
npm.cmd run db:reset     # destructive reset (local only)
npm.cmd run db:seed      # seed demo data
npm.cmd run db:preflight # check required tables exist
```

### Key rules

- A new database requires migrations before the app starts. The startup guard enforces this.
- The app never auto-resets the database on startup.
- `/register` requires the `Organization` table. If the database is not migrated, the endpoint returns HTTP 503 with `"Database is not migrated. Run database setup."` and no stack trace or file paths are exposed to the caller.
- Always run `db:deploy` (not `db:dev`) in production. `db:dev` may generate new migration files, which is not appropriate in production.

## One-Command Project Checks

Recommended local order:

1. Run the non-destructive health check.
2. Start the services.
3. Smoke test the running services.
4. Run the full module E2E suite when you need deeper functional confidence.

Health check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/health-check.ps1
```

Start project:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1
```

Smoke test running project:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
```

Full module E2E test:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/full-module-test.ps1
```

Root npm shortcuts:

```powershell
npm.cmd run health
npm.cmd run start:dev
npm.cmd run smoke
npm.cmd run test:full
```

Notes:

- `health-check.ps1` does not run `prisma migrate reset`, `prisma migrate dev`, or any destructive database action.
- `health` runs static and non-destructive project checks.
- `start:dev` starts the backend, frontend, and AI service for local verification.
- `smoke-test.ps1` assumes backend, frontend, and AI services are already running.
- `smoke` is the basic live test for service health, login, and representative protected APIs.
- `test:full` creates temporary test records with a unique `worknex_e2e_<timestamp>` prefix and validates auth, RBAC, tenant safety, users, departments, attendance, leave automation, reports, settings, analytics, notifications, performance, AI, Power BI setup behavior, frontend routes, and cleanup.
- `test:full` also validates security-sensitive registration behavior: `/auth/register` requires admin authentication, cannot create `SUPER_ADMIN`, billing signup creates the tenant `ADMIN` owner atomically, public billing payloads cannot request `SUPER_ADMIN`, and refresh token rotation works through an httpOnly cookie.
- `test:full` is designed to be safe for local or staging-like environments, but it still creates temporary records. Cleanup is attempted and reported; seeded users and seeded organizations are not deleted.
- Full module reports are saved to `reports/full-module-test-report.json` and `reports/full-module-test-report.md`.
- The AI service can fail to start when Python dependencies are missing. Install them with:

```powershell
cd ai-service
python -m pip install -r requirements.txt
```

Then start the AI service:

```powershell
cd ai-service
python -m compileall .
python training/train_performance_model.py
python scripts/ingest_knowledge.py
python run.py
```

If the Python environment is empty, install dependencies first:

```powershell
python -m pip install -r ai-service\requirements.txt
```

Then start the frontend:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

## Production Migration Path

Use `npx.cmd prisma migrate deploy` for production-like environments after backups and review.

If a production or important database has legacy rows from before tenant isolation, do not deploy required `organizationId` constraints until tenant data is explicitly backfilled. Do not silently assign rows in multi-organization databases. Preserve or import any legacy sidecar settings/policy documents manually into `OrganizationSettings`, `PolicyDocument`, `ExtractedPolicyRule`, `LeavePolicyVersion`, and `LeaveDecisionLog` before retiring sidecar files.

## Seed Credentials

See `docs/DEV_CREDENTIALS.md`.

## Health And URLs

- Backend: `http://localhost:5000/health`
- Frontend: `http://localhost:3000`
- AI service: `http://localhost:8000/health`

## Known Fallback Modes

- AI prediction training can create a deterministic fallback artifact when scikit-learn is unavailable.
- RAG ingestion always creates `ai-service/vector_store/knowledge_index.json` first; this JSON fallback is a valid local mode.
- ChromaDB is optional for RAG. Set `RAG_VECTOR_BACKEND=json` or `USE_CHROMA=false` before running `python scripts/ingest_knowledge.py` to force JSON-only indexing.
- ChromaDB may download an ONNX embedding model such as `all-MiniLM-L6-v2`; weak or interrupted networks can fail that download, and ingestion should continue with a warning because the JSON fallback remains available.
- Backend AI endpoints return deterministic fallback payloads with `fallback: true` when the Python FastAPI service is unavailable.
- Power BI pages show setup guidance when credentials are missing.
- TMS sync uses demo fallback when no TMS URL/key is configured.
- GPS attendance verification is implemented as an opt-in organization policy in `attendancePolicyJson`. Set `locationVerificationEnabled`, `officeLatitude`, `officeLongitude`, and `officeRadiusMeters` to enforce check-in radius validation. When disabled, latitude/longitude are stored when supplied but not enforced.

## External Integration Setup Boundaries

The codebase intentionally does not fake paid or hardware-backed integrations.

Power BI requires a real Azure tenant, application credentials, workspace, report, embed URL, dataset/report design, DAX measures, and final Row-Level Security roles. Without those values, `/api/v1/analytics/powerbi/token` returns an honest setup error and the frontend renders setup guidance instead of a fake embed.

TMS/biometric sync requires `TMS_API_URL` and `TMS_API_KEY` for a real attendance device/API. Without them, development sync uses the explicitly labeled demo fallback.

The AI chatbot uses the FastAPI RAG service when available and deterministic grounded fallback when no LLM/LangChain path is configured. Do not describe it as LangChain or live LLM behavior unless those dependencies, keys, and code paths are added.

Google Cloud deployment and CI/CD require project-specific credentials, registry, runtime targets, and secret management. Keep deployment secrets outside git and use `.env.example` files as configuration references only.

## Priority 13A Verification Notes

- Fresh local migration reset applied `20260407071533_init`, `20260510080657_add_attendance_location_fields`, `20260517090000_add_tenant_isolation`, and `20260517130000_add_durable_settings_leave_automation`.
- Seed ran successfully during `prisma migrate reset` and created the NovaPay demo organization with durable `OrganizationSettings`, `LeavePolicyVersion`, and `LeaveDecisionLog` records.
- Backend runtime smoke checks passed for health, login, user scoping, attendance duplicate blocking, leave application, decision-log persistence, reports, settings persistence, dashboards, and backend AI fallback responses.
- Frontend lint/build passed; `next dev` served `/` with HTTP 200 after initial Turbopack warmup.
- AI compile, training, and ingestion scripts passed. `python run.py` is blocked in this environment until `fastapi` and `uvicorn` are installed; the attempted `pip install -r ai-service\requirements.txt` was blocked by sandbox networking and then timed out under approved network execution.

## Troubleshooting

- If `migrate reset` cannot connect, verify `DATABASE_URL` and that PostgreSQL is running.
- If migration deploy fails on existing data, stop and create an explicit tenant backfill plan before retrying.
- If frontend build fails on API URLs, verify `NEXT_PUBLIC_API_URL`.
- If AI service fails on optional dependencies, install `ai-service/requirements.txt` in the active Python environment. ChromaDB is optional for local RAG and can be bypassed with `RAG_VECTOR_BACKEND=json` or `USE_CHROMA=false`.
- If `python run.py` fails with `ModuleNotFoundError: No module named 'uvicorn'`, install the AI requirements and rerun the AI service command.
