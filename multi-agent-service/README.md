# WorkNex Multi-Agent Service

This is a separate Node.js service for WorkNex agentic chat.

The first implementation includes:

- Supervisor agent
- Attendance sub-agent
- Leave sub-agent
- Performance sub-agent
- Read-only WorkNex backend API tools
- Authorization token passthrough from frontend to backend

## Why this is a separate service

The existing WorkNex backend already owns authentication, RBAC, tenant scoping, and attendance business rules. This service does not duplicate those rules. It calls the backend API using the user's bearer token, so backend permissions remain authoritative.

## Architecture

The multi-agent service is a dedicated orchestration layer between the WorkNex frontend and the main WorkNex backend API. It does not own HR business rules or tenant security. It routes natural-language requests to domain agents, executes read-only backend tools, and stores conversation memory in a separate Postgres database.

```mermaid
flowchart LR
  U[User] --> F[WorkNex Frontend<br/>Chat Widget]
  F -->|POST /api/chat<br/>Bearer access token + threadId| MAS[Multi-Agent Service<br/>Express API]

  MAS --> S[Supervisor Agent<br/>LangGraph]
  S --> AR[Attendance Router]
  S --> LR[Leave Router]
  S --> PR[Performance Router]

  AR --> AH[Attendance Handler]
  LR --> LH[Leave Handler]
  PR --> PH[Performance Handler]

  AH --> AT[Attendance Tools]
  LH --> LT[Leave Tools]
  PH --> PT[Performance Tools]

  AT --> B[WorkNex Backend API<br/>/api/v1]
  LT --> B
  PT --> B

  B --> DB[(Main WorkNex PostgreSQL<br/>HR data)]
  S <--> MEM[(Agent Memory PostgreSQL<br/>LangGraph checkpoints)]
  S --> LLM[LLM Provider<br/>OpenRouter / OpenAI / Anthropic / Ollama]
  S --> LS[LangSmith Tracing]
```

### Request lifecycle

```mermaid
sequenceDiagram
  participant User
  participant UI as Frontend Chat Widget
  participant API as Multi-Agent API
  participant Sup as Supervisor
  participant Router as Domain Router
  participant Handler as Domain Handler
  participant Tool as Read-only Tool
  participant Backend as WorkNex Backend
  participant Memory as Postgres Memory

  User->>UI: Ask a question
  UI->>API: message + threadId + bearer token
  API->>Sup: invoke LangGraph with thread_id
  Sup->>Memory: load previous thread state
  Sup->>Router: classify domain intent
  Router->>Handler: selected intent + filters
  Handler->>Tool: exact tool call
  Tool->>Backend: GET request with user bearer token
  Backend-->>Tool: RBAC/tenant-scoped data
  Tool-->>Handler: normalized JSON
  Handler-->>Sup: deterministic markdown answer
  Sup->>Memory: save updated thread state
  Sup-->>API: final answer
  API-->>UI: response + threadId
  UI-->>User: render markdown
```

### Core design

- `server.js` exposes the HTTP API and initializes LangSmith plus Postgres memory.
- `agents/supervisor.js` is the top-level LangGraph supervisor. It chooses the right domain agent/tool and returns the final answer.
- `routing/*-router.js` classifies high-confidence attendance/leave intents into structured routes.
- `handlers/*-handler.js` executes exact read-only tools and formats deterministic markdown responses.
- `tools/*-tools.js` calls the main WorkNex backend API with the user's bearer token.
- `config/memory.js` configures LangGraph Postgres checkpoint memory.
- `config/llm.js` configures the active LLM provider.
- `config/langsmith.js` configures tracing metadata.

### Domain flow

```text
Supervisor
  -> Domain router
  -> Domain handler
  -> Exact backend read-only tool
  -> Deterministic formatter
  -> Supervisor final answer
```

LLM domain agents still exist as fallbacks for wording that does not match the deterministic MVP intents, but common attendance, leave, and performance questions use routers and handlers for reliability.

### Service boundaries

```mermaid
flowchart TB
  subgraph AgentService[Multi-Agent Service]
    Supervisor[Supervisor]
    Routers[Routers]
    Handlers[Handlers]
    Tools[Read-only Tools]
    Memory[Postgres Checkpointer]
  end

  subgraph MainBackend[WorkNex Backend]
    Auth[JWT Auth]
    RBAC[RBAC + Tenant Scoping]
    HRRules[Attendance / Leave Rules]
    Prisma[Prisma ORM]
  end

  Tools -->|Bearer token passthrough| Auth
  Auth --> RBAC
  RBAC --> HRRules
  HRRules --> Prisma
```

The agent service does not bypass permissions. If the backend denies an action or query, the agent surfaces that role-scoped result.

## Start

```bash
cd multi-agent-service
cp .env.example .env
npm install
npm run memory:setup
npm run dev
```

Default URL:

```text
http://localhost:8010
```

Health check:

```bash
curl http://localhost:8010/health
```

## Chat API

```http
POST /api/chat
Authorization: Bearer <WorkNex access token>
Content-Type: application/json

{
  "message": "What is my attendance today?",
  "threadId": "optional-thread-id",
  "userContext": {
    "id": "user-id",
    "role": "EMPLOYEE"
  }
}
```

Response:

```json
{
  "success": true,
  "answer": "...",
  "response": "...",
  "threadId": "thread_...",
  "agent": "supervisor",
  "implementedAgents": ["attendance_agent", "leave_agent", "performance_agent"]
}
```

## Attendance agent scope

The attendance agent can read:

- Today's attendance
- Current user's monthly attendance
- Manager/admin attendance summaries
- Specific user attendance when backend allows it
- Attendance rows with filters when backend allows it
- Holidays

It cannot mutate data. It will not check users in, check users out, create manual records, sync TMS, or generate absences.

The attendance flow uses the same router-style path as leave for common MVP intents:

```text
Supervisor
  -> Attendance router
  -> Attendance handler
  -> Exact backend read-only tool
  -> Deterministic formatter
  -> Supervisor final answer
```

The LLM attendance agent remains as a fallback for attendance-related wording that does not match the core deterministic intents.

## Leave agent scope

The leave agent can read:

- Current user's leave balances
- Current user's leave history
- Pending leave approvals for manager/admin roles
- Leave request details
- Leave policies

It cannot mutate data. It will not apply, approve, reject, cancel, evaluate, upload, parse, or update leave records in this first version.

The leave flow uses a router-style path for common MVP intents:

```text
Supervisor
  -> Leave router
  -> Leave handler
  -> Exact backend read-only tool
  -> Deterministic formatter
  -> Supervisor final answer
```

The LLM leave agent remains as a fallback for leave-related wording that does not match the core deterministic intents.

## Performance agent scope

The performance agent can read:

- Current user's monthly performance records
- Overall, attendance, and leave scores
- Present, absent, late, leave-day, and average working-hour signals
- Manager/admin scoped team performance
- Manager/admin scoped performance leaderboard
- Specific employee performance when backend permissions allow it

It cannot mutate data. It will not edit scores, run ETL, generate records, or update performance data in this first version.

The performance flow uses the same router-style path:

```text
Supervisor
  -> Performance router
  -> Performance handler
  -> Exact backend read-only tool
  -> Deterministic formatter
  -> Supervisor final answer
```

The LLM performance agent remains as a fallback for performance-related wording that does not match the core deterministic intents.

## Environment

```env
PORT=8010
WORKNEX_BACKEND_API_URL=http://localhost:5000/api/v1
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
AGENT_MEMORY_PROVIDER=postgres
AGENT_MEMORY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/worknex_agent_memory?sslmode=disable
AGENT_MEMORY_SCHEMA=public
AGENT_MEMORY_ALLOW_IN_MEMORY_FALLBACK=false
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:9b
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_APP_NAME=WorkNex Multi-Agent Service
OPENROUTER_MAX_TOKENS=800
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-haiku-latest
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=worknex-multi-agent-dev
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

## Postgres conversation memory

The service uses LangGraph short-term memory with a Postgres checkpointer. This stores thread-scoped conversation state so follow-up questions can use previous messages and survive service restarts.

Use a separate database from the main WorkNex backend database:

```env
AGENT_MEMORY_PROVIDER=postgres
AGENT_MEMORY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/worknex_agent_memory?sslmode=disable
AGENT_MEMORY_SCHEMA=public
```

Create the memory database and checkpoint tables:

```bash
cd multi-agent-service
npm run memory:setup
```

From the workspace root:

```bash
npm run agents:memory:setup
```

The health endpoint should show:

```json
{
  "memory": {
    "shortTerm": "enabled",
    "checkpointer": "PostgresSaver",
    "persistence": "postgres"
  }
}
```

To use OpenRouter:

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_MAX_TOKENS=800
```

## LangSmith tracing

LangSmith tracing can record the supervisor graph, attendance agent calls, LLM calls, tool calls, inputs, outputs, timing, and errors.

Privacy note: traces can include user prompts and backend tool outputs, including attendance and leave data. Use a development LangSmith project for local testing and avoid sending production-sensitive data until your retention/access rules are decided.

Add these values to `.env`:

```env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_langsmith_api_key
LANGSMITH_PROJECT=worknex-multi-agent-dev
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

For EU/APAC/AWS LangSmith accounts, use the region endpoint shown in LangSmith settings.

Then restart the service:

```bash
npm run dev
```

Check status:

```bash
curl http://localhost:8010/health
```

The response should include:

```json
{
  "langsmith": {
    "tracingEnabled": true,
    "project": "worknex-multi-agent-dev",
    "apiKeyConfigured": true
  }
}
```

## Pattern

This follows the same high-level pattern as `charlie_supervisor`:

```text
Client
  -> Express API
  -> Supervisor agent
  -> Attendance, leave, or performance agent as tool
  -> Domain read-only tools
  -> WorkNex backend API
```

The implementation is intentionally scoped, so future agents can be added cleanly:

- Analytics agent
- Policy/RAG agent
- Reports agent
