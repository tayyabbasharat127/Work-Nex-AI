# WorkNex Express Backend

The backend is an Express/Prisma service for the WorkNex multi-tenant workforce platform. PostgreSQL is the source of truth. Every organization-owned model carries `organizationId`; service-layer scope checks and composite database foreign keys enforce tenant boundaries.

## Architecture

```text
HTTP request
  -> security/rate-limit/request-context middleware
  -> authentication + RBAC/capability middleware
  -> module controller (transport only)
  -> module service (business rules + tenant scope)
  -> Prisma
  -> PostgreSQL

EventBridge schedule
  -> one-shot scheduled worker
  -> PostgreSQL advisory lock
  -> attendance / leave / ETL / alert task
```

Key directories:

- `src/modules`: domain routes, controllers, and services.
- `src/middleware`: authentication, validation, audit, error, and request-context middleware.
- `src/services/storage`: local development and S3 production storage adapters.
- `src/jobs` and `src/workers`: one-shot scheduler tasks for EventBridge/ECS.
- `prisma/migrations`: forward-only PostgreSQL migrations.
- `src/__tests__`: unit, security, tenant-boundary, and opt-in database tests.

## Local setup

1. Copy `.env.example` to `.env` and replace all secret placeholders.
2. Install dependencies with `npm ci`.
3. Validate and generate Prisma with `npm run db:validate` and `npm run db:generate`.
4. Apply migrations with `npm run db:deploy`.
5. Start the API with `npm run dev`.

The web process never applies migrations or starts cron jobs. `/health/live` checks the process; `/health/ready` verifies PostgreSQL. `/health` remains as a backward-compatible readiness endpoint.

## Security configuration

Production startup fails when database, JWT, encryption, frontend, AI, SMTP, or S3 configuration is missing. JWT access and refresh secrets must be different and at least 32 characters. Use AWS Secrets Manager for secrets; do not bake `.env` into an image.

Set `BOOTSTRAP_SUPER_ADMIN=true` only for the first controlled provisioning run and provide a strong `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`. Disable it immediately afterward. Credentials are never logged.

For biometric database/API integrations, set `BIOMETRIC_ALLOWED_HOSTS` to an exact comma-separated host allowlist. ADMS integrations require a communication key in production.

## Migrations

Migrations are a separate deployment step:

```bash
npm run db:validate
npm run db:status
npm run db:deploy
```

Run the migration ECS task once before updating the web service. Never run `prisma migrate dev` or `prisma migrate reset` against production.

## Scheduled workers

EventBridge should invoke the worker image with one of these commands:

- `node src/workers/scheduled.worker.js tms-sync`
- `node src/workers/scheduled.worker.js generate-absences`
- `node src/workers/scheduled.worker.js leave-balance-reset`
- `node src/workers/scheduled.worker.js etl-nightly`
- `node src/workers/scheduled.worker.js etl-monthly`
- `node src/workers/scheduled.worker.js scan-alerts`
- `node src/workers/scheduled.worker.js cleanup-auth-tokens`

Workers exit after one run. PostgreSQL advisory locks prevent overlapping duplicate execution.

## Verification

```bash
npm run lint
npm test -- --runInBand
npm audit --audit-level=low
```

Database constraint tests are read-only and opt-in:

```bash
RUN_DB_TESTS=true npm test -- --runInBand
```

See [AWS deployment](docs/AWS_DEPLOYMENT.md), [API contract](docs/API_CONTRACT.md), and [migration runbook](docs/MIGRATION_AND_RUNBOOK.md).
