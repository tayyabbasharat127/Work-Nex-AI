# WorkNex pre-deployment security remediation

Date: 2026-07-12

No commit, push, pull request, history rewrite, database migration, or production secret rotation was performed.

| Issue # | Status | Files changed | Manual action still required |
|---|---|---|---|
| 1 | Fixed | `ai-service/app/core/auth.py`, `main.py`, `config.py`, `docker-compose.yml` | Set the same strong `JWT_SECRET` for backend, AI, and multi-agent through the production secret manager. Rebuild containers. |
| 2 | Fixed | `chat_controller.py`, `models/schemas.py` | None after deployment; old clients sending identity fields will receive validation errors. |
| 3 | Fixed | `langchain_agent.py`, AI prediction services, backend AI/ETL/alert callers, `aiServiceAuth.js` | Remove obsolete `BACKEND_TOKEN`/`AI_SERVICE_SECRET` values from deployed secret stores after confirming no older deployment uses them. |
| 4 | Fixed | biometric schema/service/UI, attendance webhook route/controller/provider, webhook migration | Generate and provision a unique 32+ character secret per physical device/middleware. Configure it to send `X-WorkNex-Timestamp` (Unix ms), `X-WorkNex-Nonce`, and `X-WorkNex-Signature` (`HMAC-SHA256(timestamp.nonce.rawBody)`). Check existing device serials for duplicates before migration. |
| 5 | Fixed in code; deployment pending | `schema.prisma`, tenant FK migration, `tenantPrisma.js`, scoped services | Back up DB, check existing cross-org inconsistencies, run `prisma migrate deploy`, then regenerate Prisma client/restart backend. Local generation was blocked by a running process locking the Windows query-engine DLL. |
| 6 | Fixed going forward | `.gitignore`, Git index removals | Local files remain. Purge Git history separately with `git filter-repo` after coordinated backup/approval, then invalidate old clones/caches. |
| 7 | Fixed | `ChatbotWidget.jsx`, `multiAgentChat.js`, `lib/api.js`, backend AI proxy | Longer-term improvement: move browser access tokens to HttpOnly cookies/BFF; current bearer-token pattern remains because that is the existing application architecture. |
| 8 | Fixed | `leave_policy_service.py`, `rag_service.py`, `langchain_agent.py`, leave automation caller | Run adversarial prompt-injection acceptance tests with representative university policy documents before launch. |
| 9 | Fixed | `multi-agent-service/agents/supervisor.js`, `server.js`, Compose limits | Tune timeout/token/tool limits under load and configure provider-side hard spend quotas. |
| 10 | Fixed | `multi-agent-service/security/auth.js`, `server.js`, ownership tests | Existing unsigned legacy thread IDs intentionally become inaccessible; start new threads after deployment. |
| 11 | Fixed | `scheduler.js`, `etl.scheduler.js`, `etl.orchestrator.js`, ETL callers | Monitor the first per-org scheduled run; it produces one pipeline execution/log per organization. |
| 12 | Fixed | prediction schemas/controllers and workflow controller; backend fallback | University HR must approve a human-review SOP. Do not use risk/performance results for adverse action without review. |
| 13 | Fixed going forward | `.gitignore`, Git index removals | Rotate every item listed below and purge history with issue 6. Do not reuse old values. |
| 14 | Fixed | `.github/workflows/ci.yml`, Node ESLint configs/scripts, lockfiles, auth tests | Configure branch protection to require all CI jobs. Review reported dependency vulnerabilities before release. |
| 15 | Fixed baseline | user purge endpoint/service, audit middleware/routes, `DATA_RETENTION.md`, audit enum migration | University/legal owner must approve or revise the documented 7-year period and legal-hold process before enabling scheduled age-based deletion. |

## Credential and secret rotation inventory

Values were deliberately not copied into this report. Rotate all current or historical values for:

- `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY`.
- PostgreSQL application credentials in `DATABASE_URL`, Compose, and agent-memory database URLs.
- SMTP username/password and any Gmail/app password.
- ZKTeco/TMS API key, API user/password, SFTP password, ADMS communication keys, and newly provisioned per-device HMAC secrets.
- Power BI client secret and associated application credentials.
- OpenAI, Anthropic, Gemini, Groq/GROK, OpenRouter, and LangSmith API keys.
- Any historical `BACKEND_TOKEN`, `AI_SERVICE_SECRET`, and service bearer tokens.
- All usernames/passwords previously listed in `worknex-backend/docs/DEV_CREDENTIALS.md` or seed/demo documentation.
- Any database/API credentials saved through biometric integration settings if the Git-tracked DB/logs/documents ever contained their plaintext or derived content.

## Verification

- Prisma schema validation: passed.
- Backend ESLint: passed.
- Backend Jest: 21/21 passed (the existing suite still uses `--forceExit` and should later remove its open handle).
- AI pytest: 37/37 passed, including new JWT tests.
- Multi-agent ESLint: passed.
- Multi-agent tests: 2/2 passed, covering JWT identity and user+org thread ownership.
- Frontend ESLint: zero errors (46 pre-existing warnings remain).
- Next.js production build: passed, 40 static routes generated.
- Prisma client generation: not completed locally because a running backend process holds `query_engine-windows.dll.node`; container/CI generation remains configured.

## Database deployment sequence

1. Take and verify a PostgreSQL backup.
2. Query for duplicate non-null biometric serials and cross-organization FK mismatches; resolve them explicitly.
3. Stop the backend briefly so Prisma client binaries are not locked.
4. Run `npm run db:deploy` and `npm run db:generate` from `worknex-backend`.
5. Configure per-device HMAC secrets and update the ZKTeco middleware signer.
6. Restart services and run health, auth, two-tenant isolation, replay, and attendance-punch smoke tests.
