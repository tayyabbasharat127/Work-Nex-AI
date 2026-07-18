# WorkNex AI — Modules Explanation Guide

---

## What is the AI doing in WorkNex?

WorkNex AI has **4 AI-powered modules** built on top of real employee data. Every score, risk, and forecast you see is calculated from actual attendance records, leave history, and working hours — not guessed or hardcoded.

---

## Module 1 — ETL Pipeline (The Foundation)

### What is it?
ETL stands for **Extract, Transform, Load**. Think of it as a data cleaning machine.

### What it does
Every night at **12:00 AM** (or manually from Admin → ETL Pipeline):
1. Picks up all raw attendance records (check-in, check-out, late, absent)
2. Picks up all leave records (approved, rejected, pending)
3. Calculates per employee per month:
   - How many days they were present
   - How many times they were late
   - Average hours worked per day
   - Leave days taken
   - Overall performance score
4. Saves this as a clean monthly report card for every employee

### Real Example
> Ahmed worked 22 days in June. He was late 3 times, absent 2 days, took 1 leave.
> ETL calculates: attendance rate = 88%, avg hours = 8.2/day, late count = 3.
> This becomes Ahmed's June Performance Record — used by all AI models.

### Why it matters
Without ETL running, all AI scores will be empty. Always run ETL after adding new data.

---

## Module 2 — Performance Score

### What is it?
A score from **0 to 100** that tells you how well an employee performed this month.

### How it is calculated
The system looks at 9 things and gives each a weight:

| Factor | Impact |
|--------|--------|
| Attendance % | Very high positive |
| Last month's score | High positive (consistency matters) |
| Department average | Medium positive (team context) |
| Average working hours/day | High positive |
| Overtime hours | Small positive (extra effort) |
| Times came late | Negative penalty |
| Days fully absent | Highest negative penalty |
| Leave days taken | Small negative |
| Half-day count | Negative penalty |

### Score Meaning

| Score | Risk Level | What it means |
|-------|-----------|---------------|
| 80 – 100 | LOW | Top performer, stable |
| 72 – 79 | LOW | Good, on track |
| 55 – 71 | MEDIUM | Needs attention, coach them |
| 0 – 54 | HIGH | Struggling, intervention needed |

### Real Example
> Sara has 92% attendance, comes on time, works 8.5 hours/day, took 2 leaves.
> Her score = 84 → Risk Level: LOW → "Stable performer"

> Bilal has 71% attendance, was late 6 times, absent 5 days, works 6.5 hours/day.
> His score = 52 → Risk Level: HIGH → "Needs immediate support"

### How the AI model works
The system first tries to use a trained **Random Forest model** (learns from historical patterns of all employees).
If the model file is not found, it falls back to a math formula with the same weights.
Either way, the score range is the same: 0–100.

---

## Module 3 — Attrition Risk

### What is it?
Attrition means employees **leaving the company** (resigning). This module predicts:
- Who is likely to quit soon
- How likely (as a probability %)
- What is causing the risk
- What HR should do about it

### How it works — 2 AI Models run together

**Model 1 — Classifier**
Answers: "Will this employee leave?" with a YES/NO + probability
> Example: "73% chance Waqar will leave in the next 90 days"

**Model 2 — Regressor**
Answers: "How high is the risk?" as a number 0–100
> Example: Risk Score = 68 → MEDIUM risk

### Risk Levels

| Score | Level | Action |
|-------|-------|--------|
| 65 – 100 | HIGH | Act now — HR intervention |
| 75+ | CRITICAL | Urgent escalation |
| 35 – 64 | MEDIUM | Monitor closely, monthly check-in |
| 0 – 34 | LOW | Stable, no action needed |

### 8 Warning Signals the System Detects

| Signal | Threshold | What it means |
|--------|-----------|---------------|
| High Absenteeism | Attendance < 78% | Disengaged from work |
| Low Performance | Score < 70 | Struggling, may give up |
| Excessive Leave | > 8 days taken | Possible burnout |
| Late Pattern | > 4 late arrivals/month | Morale or motivation issue |
| Short Tenure | < 6 months | New hires are high flight risk |
| Long Tenure No Growth | > 4 years | Career stagnation |
| Multiple Manager Changes | > 1 change | Team instability |
| Disciplinary Actions | Any warning | HR red flag |

### Real Example
> Nadia has been at the company 3 months (new hire).
> Attendance: 74%, Late: 5 times, Score dropped from 78 to 62.
>
> Signals detected: High Absenteeism, Late Pattern, Short Tenure, Declining Performance
> Risk Score: 71 → HIGH
> Recommendation: "Schedule structured PIP with clear KPI targets and support"

### Data flow
```
ETL processes attendance → Performance Records created
        ↓
Attrition AI fetches Performance Records from backend
        ↓
Builds 13-feature profile per employee
        ↓
Classifier → "Will they leave?" (probability)
Regressor  → Risk Score 0–100
        ↓
Sorted by highest risk first on the dashboard
```

---

## Module 4 — Leave Forecast

### What is it?
A **30-day prediction** of how many employees will apply for leave on each future date.

### How it knows when more leaves happen
The AI has learned these patterns from historical data:

| Pattern | Effect on Leave Volume |
|---------|----------------------|
| Monday | Higher (long weekend extensions) |
| Friday | Higher (bridge leaves) |
| Tuesday–Thursday | Lower |
| July / August | Higher (summer vacations) |
| December | Higher (year-end holidays) |
| Eid season (April/June) | Much higher spike |
| Ramadan (March–April) | Higher |
| Public holidays | Spike before and after |
| Weekend | Near zero |

### Output — each day shows
- Predicted number of employees on leave
- Risk level:
  - HIGH → more than 4 people on leave (staffing concern)
  - MEDIUM → 2–4 people
  - LOW → less than 2 people

### Real Example
> Forecast for July 4 (Friday before a public holiday):
> Predicted: 6 employees on leave → Risk: HIGH
> "Plan for reduced staffing — consider staggering approvals"

> Forecast for July 8 (Wednesday, normal week):
> Predicted: 1.8 employees on leave → Risk: LOW

### AI Model used
Gradient Boosting model trained on historical leave patterns.
If model is not available, falls back to a day-weight × month-weight formula that still captures the major patterns.

---

## Module 5 — Employee Prediction (On-Demand)

### What is it?
An on-demand button on the Performance page. Pick any employee → click **Run Prediction** → instant AI analysis.

### What it returns
- **Predicted Score** (e.g. 74.94)
- **Risk Level** (LOW / MEDIUM / HIGH)
- **Why** — 2–3 bullet points explaining what's driving the score
- **Model version** used (e.g. `performance-rf-v2`)
- **Confidence** — 82% if trained model used, 62% if formula fallback

### Real Example
> You select "Zara Malik" and click Run Prediction.
>
> Result:
> - Predicted Score: 68.3
> - Risk Level: MEDIUM
> - Reasons:
>   - "Average working hours are below the expected daily baseline (6.1 hrs)"
>   - "Repeated late arrivals are reducing the projected score (5 times)"
>   - "Projected score falls in the medium risk band"

---

## Module 6 — IP-Based Attendance Verification

### What is it?
A security layer that makes sure employees can **only check in from the office network**. If someone tries to check in from home or a coffee shop, the system blocks it.

### How it works

When an employee clicks Check In, the system captures their **IP address** (the unique address of the network they are connected to). It then checks:
- Is this IP inside the office network range the admin configured?
- If YES → check-in allowed ✔
- If NO → check-in blocked with "Not on office network" error ✘

### Two modes

| Mode | How to enable | Behaviour |
|------|--------------|-----------|
| **Demo / Off** | `WIFI_VERIFICATION_ENABLED=false` in .env | Everyone can check in from anywhere — IP is still recorded but not verified |
| **Enforced / On** | `WIFI_VERIFICATION_ENABLED=true` + IP ranges set | Only office network IPs allowed |

### How to configure (Admin)
1. Go to **Admin → Settings**
2. Enable "Wi-Fi Verification"
3. Add office IP range — example:
   - Single IP: `192.168.100.7`
   - Range (CIDR): `192.168.100.0/24` (covers 192.168.100.1 to 192.168.100.254)
   - Multiple offices: `192.168.100.0/24, 10.0.0.0/8`

### How to find your office IP
On Windows: Open Command Prompt → type `ipconfig` → look for **IPv4 Address** under your Wi-Fi adapter.
Example: `192.168.100.7` — enter `192.168.100.0/24` to cover the whole office network.

### What the IP in attendance records means

| IP shown | Meaning |
|----------|---------|
| `127.0.0.1` | Localhost — employee is on the same machine as the server (development only) |
| `192.168.x.x` | Local office Wi-Fi network |
| `10.x.x.x` | Internal corporate network |
| Public IP | Employee checked in remotely (flag if enforcement is on) |

### Real Example
> Office router gives IPs in range 192.168.100.x.
> Admin sets office range: `192.168.100.0/24`
> Verification: ON
>
> Sara checks in from office (IP: 192.168.100.45) → Allowed ✔
> Bilal tries to check in from home (IP: 39.57.102.8) → Blocked ✘ "Not on office network"
> Admin can still manually mark Bilal present if he has a valid reason.

### Warning banner
If IP verification is enabled but no IP range is configured, the Attendance page shows an amber warning:
> "IP-based attendance is not configured. Go to Settings → Configure Now"

---

## Module 7 — Leave Management

### What is it?
A full leave lifecycle system — employees apply, managers review, admin controls policy, and balances update automatically.

### Leave Types

| Type | Default Balance | When used |
|------|----------------|-----------|
| **Annual** | 18 days/year | Planned vacations, personal time |
| **Sick** | 10 days/year | Medical reasons, illness |
| **Casual** | 8 days/year | Short notice, personal errands |

These defaults come from `leave.defaults.js` and are automatically seeded when a new organization is created. Admin can change the policy from Settings.

### Leave Lifecycle — step by step

```
Employee applies for leave
         ↓
Status: PENDING
         ↓
Manager or Admin reviews
         ↓
    ┌────┴────┐
 APPROVED   REJECTED
    ↓           ↓
Balance      Balance
deducted     unchanged
```

### Who can do what

| Role | Can do |
|------|--------|
| **Employee** | Apply leave, see own balance, see own history |
| **Manager** | Approve/reject leaves for their team only |
| **Admin** | Approve/reject anyone, set leave policy, view org-wide leave calendar |

### Leave Balance — how it works

Each employee starts with:
- Annual: 18 days
- Sick: 10 days
- Casual: 8 days

When a leave is **approved**, the days are deducted from that type's balance.
When a leave is **rejected** or **cancelled**, the balance is restored.

### Real Example
> Zara has 8 casual leaves remaining.
> She applies for 2 casual days (Monday–Tuesday).
> Manager approves it.
> Her balance updates to: 6 casual days remaining.

> If the manager rejects it → balance stays at 8.

### Leave + Attrition connection
If an employee takes more than **8 leave days** in a period, the Attrition Risk module flags it as "Excessive Leave" — a possible sign of burnout. HR is shown a recommendation to investigate.

### Leave + Forecast connection
All approved leave records feed into the Leave Forecast model. When the AI sees that many employees took leave in July historically, it predicts higher leave volume next July automatically.

### Leave in Analytics
Admin Dashboard shows:
- Total leaves pending org-wide
- Department with highest leave rate
- Monthly leave trend chart (from ETL data)
- Individual leave history per employee

---

## Module 8 — WorkNex AI Chatbot

### What is it?
A conversational assistant (the chat bubble at the bottom-right of every page). Employees, managers, and admins can ask questions in plain English and get instant answers about attendance, leaves, performance, forecasts, and HR policy — without navigating through pages.

### How it works — 3 layers

```
User types a message
        ↓
Layer 1 — Intent Detection
(What is the user asking about?)
        ↓
Layer 2 — RAG (Knowledge Base Search)
(Find the most relevant HR policy or info)
        ↓
Layer 3 — LangChain LLM (if configured)
(Generate a human-like answer using GPT-4o-mini via OpenRouter)
```

### Layer 1 — Intent Detection (What did you mean?)

The chatbot first reads your message and maps it to one of these 11 intents:

| Intent | Triggered by keywords |
|--------|----------------------|
| `greeting` | hello, hi, hey, good morning |
| `leave_balance` | leave balance, how many leaves, days left |
| `leave_apply` | apply leave, request leave, take leave |
| `attendance` | attendance, check in, check out, present, absent |
| `performance` | performance, score, rating, kpi |
| `forecast` | forecast, predict, next month, upcoming |
| `team` | team, my team, employees, staff |
| `policy` | policy, rules, allowed, maximum |
| `attrition` | attrition, risk, turnover, resign |
| `anomaly` | anomaly, pattern, unusual, irregular |
| `powerbi` | power bi, dashboard, report |

### Layer 2 — RAG (Reading HR Knowledge Base)

RAG stands for **Retrieve and Generate**. When you ask a policy question (e.g. "How many sick leaves am I allowed?"), the chatbot:
1. Searches a **knowledge base** of HR policy documents (stored as markdown files)
2. Finds the most relevant paragraphs using **ChromaDB** (semantic similarity search)
3. If ChromaDB is not available, falls back to **BM25** (keyword matching)
4. Builds the answer from the matched text

**Real Example**
> User asks: "What is the maximum casual leave allowed?"
>
> ChromaDB finds the leave policy document.
> Extracts: "Casual leave: 8 days per year. Cannot be carried forward."
> Returns this as the answer with confidence score: 0.82

### Layer 3 — LangChain + GPT-4o-mini (Smart Answers)

When the AI service is connected to OpenRouter (the LLM provider):
- The chatbot sends your question + context to **GPT-4o-mini**
- GPT generates a natural, conversational answer
- The answer is returned with sources cited

When LLM is not configured, the chatbot uses pre-written response templates (still useful, just less conversational).

### Role-based responses

The chatbot knows who you are and responds accordingly:

| Role | What it can answer |
|------|--------------------|
| **Employee** | Own leave balance, own attendance, own performance, policy questions |
| **Manager** | Team attendance, team leaves, team performance + everything above |
| **Admin** | Org-wide analytics, attrition, forecasts, Power BI + everything above |

**Example of role restriction:**
> Employee asks: "Show me all employees' attendance"
> Chatbot replies: "Employee access is self-scoped — team/org-wide data requires manager or admin access."

### What you can ask the chatbot

| Question | What happens |
|----------|-------------|
| "How many casual leaves do I have left?" | Redirects to My Leaves page + shows balance |
| "What is the leave policy?" | RAG searches knowledge base, returns policy text |
| "Show me team attendance this week" | Redirects manager to team attendance page |
| "Who is at high attrition risk?" | Redirects admin to Attrition Risk page |
| "What is my performance score?" | Redirects to Performance page |
| "How does the forecast work?" | Redirects to Forecast page |
| "Are there any attendance anomalies?" | Redirects to Analytics page |

### Real Example Conversation
> **Employee:** Hi, how many leaves do I have?
> **Bot:** Hello! I'm your WorkNex AI assistant. I can help with leave balances, attendance insights, performance analytics, forecasts, and workforce data. What do you need?
>
> **Employee:** Leave balance
> **Bot:** Check your leave balance on the **My Leaves** page — remaining days are shown at the top. [Opens leave page]
>
> **Employee:** What is the policy for sick leave?
> **Bot:** Sick leave entitlement is 10 days per year. Medical certificate required for absences exceeding 2 consecutive days. Unused sick leave cannot be carried forward to the next year. *(Source: leave-policy.md, Confidence: 84%)*

### Confidence Score
Every policy answer comes with a confidence percentage:
- **80–90%** → Direct match found in knowledge base
- **50–79%** → Partial match, answer may need verification
- **Below 50%** → No match, chatbot says "Contact HR admin"

---

## How All Modules Connect

```
EMPLOYEE ARRIVES AT OFFICE
     ↓
IP Check (is this the office network?)
     ↓ YES                   ↓ NO
Check-In recorded        Blocked (if enforcement ON)
     ↓                   Admin can manually mark present
Attendance Record saved in DB
     ↓
EMPLOYEE APPLIES FOR LEAVE
     ↓
Manager / Admin approves or rejects
     ↓
Leave Balance updated → Leave Record saved
     ↓
ETL Pipeline runs (nightly or manual)
     ↓
Performance Records generated per employee per month
(attendance rate, late count, leave days, hours, score)
     ↓
┌─────────────────────────────────────────────────┐
│                                                 │
▼                    ▼                    ▼        ▼
Performance Score  Attrition Risk  Leave Forecast  Employee Prediction
(How good?)        (Will they      (How many on    (On-demand single
                    quit?)          leave next      employee analysis)
     ↓                  ↓           30 days?)
Leaderboard       HR Action List  30-Day Calendar
```

---

## Quick Reference — Risk Levels

| Module | LOW | MEDIUM | HIGH |
|--------|-----|--------|------|
| Performance Score | ≥ 72 | 55–71 | < 55 |
| Attrition Risk | < 35 | 35–64 | ≥ 65 |
| Leave Forecast (per day) | < 2 people | 2–4 people | > 4 people |

## Quick Reference — Leave Balances

| Leave Type | Default Days | Refills |
|------------|-------------|---------|
| Annual | 18 days | Yearly |
| Sick | 10 days | Yearly |
| Casual | 8 days | Yearly |

## Quick Reference — IP Attendance

| Setting | Value | Effect |
|---------|-------|--------|
| `WIFI_VERIFICATION_ENABLED` | `false` | Anyone checks in from anywhere (demo mode) |
| `WIFI_VERIFICATION_ENABLED` | `true` | Only office IP range allowed |
| `OFFICE_IP_RANGES` | e.g. `192.168.100.0/24` | Define which IPs are "office" |

---

## Frequently Asked Questions

**Q: Where does the AI get its data?**
From your PostgreSQL database — real attendance, leave requests, and work hours your employees generate daily.

**Q: What if ETL has not run yet?**
All AI scores will be missing or show zeros. Always run ETL after importing or seeding data.

**Q: Are scores hardcoded or guessed?**
No. Every score is calculated from real employee records through trained ML models.

**Q: What are the ML models trained on?**
The models were trained on patterns from HR data. They learn which combinations of attendance, leave, and hours typically lead to resignation or poor performance.

**Q: What if a model file is missing?**
The system automatically falls back to a math formula. The UI still works — you may see lower confidence (62% vs 82%).

**Q: Can the system predict resignations before they happen?**
Yes. Attrition Risk shows employees with HIGH risk up to 90 days before a likely resignation, giving HR time to intervene.

---

*WorkNex AI — Built for HR teams who want data-driven decisions, not guesswork.*
