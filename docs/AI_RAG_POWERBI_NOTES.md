# AI, RAG, and Power BI Notes

## Performance Model

- Training entrypoint: `ai-service/training/train_performance_model.py`.
- Preferred model: `RandomForestRegressor` from scikit-learn.
- Model artifact: `ai-service/models/performance_model.pkl`.
- Metadata artifact: `ai-service/models/performance_model_metadata.json`.
- Features used: `attendanceRate`, `lateCount`, `absenceCount`, `leaveCount`, `averageWorkingHours`, `previousPerformanceScore`, `departmentAverage`, `overtimeHours`, and `halfDayCount`.
- Data source: `PERFORMANCE_TRAINING_CSV` when provided; otherwise a clearly marked synthetic demo dataset is generated for local training.
- If scikit-learn is unavailable, the script writes a deterministic fallback artifact so the demo remains runnable and the API reports fallback behavior.

## Prediction Flow

- Backend endpoint: `POST /api/v1/ai/predict-performance`.
- Backend gathers scoped employee features from Attendance, LeaveRequest, PerformanceRecord, and department peers.
- RBAC is enforced with `assertCanAccessUser`; managers can request predictions only for direct subordinates, employees only for self.
- Backend calls the Python AI service endpoint `POST /predict/performance` when available.
- If the AI service is unavailable, backend returns a deterministic prediction with `fallback: true`.
- Local verification on May 23, 2026 confirmed backend fallback prediction responses while the Python service runtime dependencies were missing.

## RAG Knowledge Base

Knowledge documents:

- `ai-service/knowledge/leave_policy.md`
- `ai-service/knowledge/attendance_policy.md`
- `ai-service/knowledge/system_help.md`
- `ai-service/knowledge/roles_permissions.md`
- `ai-service/knowledge/faq.md`

Ingestion script:

- `ai-service/scripts/ingest_knowledge.py`
- Reads markdown, chunks text, and always writes a JSON fallback index first at `ai-service/vector_store/knowledge_index.json`.
- ChromaDB is optional. When available, ingestion also writes a Chroma vector store after the JSON index is generated.
- JSON fallback is a valid local RAG mode and is what the deterministic retrieval service uses directly.
- Set `RAG_VECTOR_BACKEND=json` or `USE_CHROMA=false` to force JSON-only ingestion.
- ChromaDB may download an ONNX embedding model such as `all-MiniLM-L6-v2`; weak or interrupted networks can fail that download, so ingestion logs a warning and keeps the JSON fallback.
- The JSON fallback index is a regenerable AI retrieval artifact, not core backend production persistence.
- Safe to rerun.

## Chatbot Behavior

- Python endpoint: `POST /chat`.
- Backend endpoint: `POST /api/v1/ai/chat`.
- Response includes `answer`, `message`, `sources`, `confidence`, `actions`, `intent`, and `fallback`.
- Without an external LLM key, the chatbot retrieves relevant chunks and gives deterministic grounded answers from local knowledge.
- Unsupported questions return a cautious answer instead of inventing policy.
- Safe actions are navigation or draft-only hints. The chatbot does not submit leave or bypass RBAC.

## Power BI

- Backend endpoint: `GET /api/v1/analytics/powerbi/token`.
- Frontend helper: `analyticsAPI.getPowerBIToken`.
- Frontend page: `/dashboard/admin/powerbi`.
- Required backend environment variables:
  - `POWERBI_CLIENT_ID`
  - `POWERBI_CLIENT_SECRET`
  - `POWERBI_TENANT_ID`
  - `POWERBI_WORKSPACE_ID`
  - `POWERBI_REPORT_ID`
  - `POWERBI_DATASET_ID`
  - `POWERBI_EMBED_URL`
- Missing credentials show a setup message instead of a fake report.
- The current backend token route is restricted to `ADMIN` and `SUPER_ADMIN`.
- Full Power BI row-level-security identities for manager/team and employee/self views are not implemented yet; this is documented in the page and should be added with the final Power BI workspace/report design.
