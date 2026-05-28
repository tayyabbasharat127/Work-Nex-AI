# WorkNex AI Service

## Setup & Run

### 1. Install Python (if not installed)
Download from https://python.org (Python 3.10+)

### 2. Install dependencies
```bash
cd ai-service
pip install -r requirements.txt
```

### 3. Start the service
```bash
python main.py
```
Service runs at: http://localhost:8000

### 4. Test it's working
Open browser: http://localhost:8000/health
Should return: {"status": "ok", "service": "WorkNex AI", "mode": "free-statistical"}

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /health | GET | Health check |
| /chat | POST | AI HR assistant chat |
| /predict/leave-forecast | GET | 30-day leave demand forecast |
| /predict/attendance-anomaly | GET | Detect unusual attendance patterns |
| /predict/attrition-risk | GET | Employee attrition risk scoring |
| /workflow/auto-approve | POST | AI leave auto-approval decision |

## Upgrade to Real AI (Later)

When you're ready to use OpenAI:
1. Add to .env: `OPENAI_API_KEY=sk-...`
2. Install: `pip install langchain openai`
3. Replace rule-based responses with LangChain chains

## Current Mode: Free Statistical AI
- No API key required
- Uses statistical algorithms and rule-based logic
- Works with your existing database data
- Provides: forecasts, anomaly detection, attrition risk, chat
