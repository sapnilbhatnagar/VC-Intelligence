# AI VC Due Diligence — Version 2.0

An AI-powered investment analysis engine that researches any company and produces
a professional investor package — investor memo, formatted report, and visual one-pager
— in 5–15 minutes.

---

## What This Product Does

Enter a company name or URL. The system runs it through an 8-stage AI pipeline that
researches the company, models its financials, assesses risks, finds comparable deals,
and writes an IC-ready investment memo.

**Outputs:**

| Section | What you get |
|---------|-------------|
| **Analytics** | Live dashboards — financial projections, risk scoring, investment highlights, comparable deals |
| **Investor Report** | Full formatted investment document (HTML, printable) |
| **Visual One-Pager** | Executive summary infographic for presentations |
| **Pipeline** | Real-time stage progress with pause/resume support |

---

## The 8-Stage Pipeline

Each stage runs a specialist AI agent sequentially, passing findings to the next stage.

```
Stage 1 — Execute Company Research    → Founders, product, funding history, traction
Stage 2 — Perform Market Analysis     → TAM/SAM, competitive landscape, positioning
Stage 3 — Build Financial Model       → 5-year Bear/Base/Bull revenue projections
Stage 4 — Conduct Risk Assessment     → 5 risk categories, scored deal-killer analysis
Stage 5 — Research Comparable Deals   → Recent M&A/funding comps, valuation benchmarks
Stage 6 — Generate Investor Memo      → IC-ready memo with recommendation + risk score
Stage 7 — Render Investor Report      → Professional formatted HTML report
Stage 8 — Create Visual Summary       → One-page visual executive summary
```

**Provider-agnostic model routing:**

Every analysis runs on the user's own API key from one of four providers:
Claude (Anthropic), OpenAI (GPT), DeepSeek, or GLM (Zhipu AI). The user picks
an effort level (low / medium / high / max) and the pipeline routes each stage
tier to the right model for that provider (see `pipeline/providers.py`).

| Stage | Tier | Role |
|-------|------|------|
| 1, 2, 5 | fast | Web research |
| 3 | smart | Financial modeling |
| 4, 6 | smart + deep thinking | Risk scoring, memo writing |
| 7 | none | Python template only |
| 8 | fast | Metric extraction + Python charts |

Entering the passphrase `admin admin admin` as the API key routes runs to the
platform's own key for the chosen provider (credits apply).

---

## Setup — macOS

### Step 1 — Install Python 3.11+

```bash
# Using Homebrew (recommended)
brew install python@3.11

# Verify
python3 --version
```

Or download from: https://www.python.org/downloads/

### Step 2 — Install Node.js (for the frontend)

```bash
# Using Homebrew
brew install node

# Verify
node --version   # should be 18+
npm --version
```

Or download the LTS installer from: https://nodejs.org/

### Step 3 — Install Python dependencies

```bash
cd "AI VC Due Diligence V2"
pip3 install -r requirements.txt
```

### Step 4 — Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5 — Add your API keys

Open `.env` and fill in your keys:

```
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
TAVILY_API_KEY=tvly-dev-...your-key-here...
```

Get your Anthropic key from: https://console.anthropic.com/

### Step 6 — Build the frontend

```bash
cd frontend
npm run build
cd ..
```

### Step 7 — Start the server

```bash
python3 run.py
```

Open http://localhost:8000 in your browser.

---

## Setup — Windows

### Step 1 — Install Python 3.11+

Download the installer from: https://www.python.org/downloads/windows/

During installation, check **"Add Python to PATH"**.

Verify in Command Prompt:
```cmd
python --version
```

### Step 2 — Install Node.js (for the frontend)

Download the LTS installer from: https://nodejs.org/

Verify:
```cmd
node --version
npm --version
```

### Step 3 — Install Python dependencies

Open Command Prompt or PowerShell in the project folder:

```cmd
pip install -r requirements.txt
```

### Step 4 — Install frontend dependencies

```cmd
cd frontend
npm install
cd ..
```

### Step 5 — Add your API keys

Open `.env` in Notepad and fill in your keys:

```
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
TAVILY_API_KEY=tvly-dev-...your-key-here...
```

### Step 6 — Build the frontend

```cmd
cd frontend
npm run build
cd ..
```

### Step 7 — Start the server

```cmd
python run.py
```

Open http://localhost:8000 in your browser.

---

## Using the Web App

The web interface at http://localhost:8000 gives you:

1. **Dashboard** — Enter a company name, choose analysis depth (Full/Quick/Custom), start
2. **Pipeline tab** — Watch each stage run in real time, pause/resume as needed
3. **Analytics tab** — Financial projections chart, risk scores, comparable deals, highlights
4. **Downloads tab** — Get the Investor Report and Visual One-Pager when complete

---

## API Reference

All endpoints are under `/api/v1`. The interactive Swagger UI is at http://localhost:8000/docs.

### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/analyze` | Start a new due diligence analysis |
| `GET` | `/api/v1/status/{job_id}` | Get analysis pipeline status and stage progress |
| `GET` | `/api/v1/results/{job_id}` | Full analysis results — all stage outputs as JSON |
| `POST` | `/api/v1/stop/{job_id}` | Pause a running analysis and preserve progress |
| `POST` | `/api/v1/resume/{job_id}` | Resume from the last completed stage |
| `POST` | `/api/v1/complete/{job_id}` | Run remaining stages on a partial analysis |
| `GET` | `/api/v1/history` | List past analyses |
| `DELETE` | `/api/v1/analyses/{job_id}` | Delete an analysis |

### Downloads

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/results/{job_id}/report` | Download the investor report (HTML) |
| `GET` | `/api/v1/results/{job_id}/one-pager` | Download the visual one-pager executive summary (HTML) |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Create an account |
| `POST` | `/api/v1/auth/login` | Log in |
| `POST` | `/api/v1/auth/google` | Google OAuth login |
| `GET` | `/api/v1/auth/me` | Get current user profile and credit balance |

### Example: Start an analysis

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"company": "Stripe", "selected_stages": null}'
```

`selected_stages: null` runs all 8 stages. Pass an array like `[1,2,3,6]` for a custom run.

### Example: Check progress

```bash
curl http://localhost:8000/api/v1/status/{job_id}
```

Poll every 10–30 seconds until `status` is `"completed"`.

---

## Credit System

| Analysis type | Stages | Cost |
|--------------|--------|------|
| Full Analysis | All 8 | 5 credits |
| Quick Screen | 3 (Research + Market + Memo) | 1 credit |
| Custom | 4–7 stages | max(2, count−2) credits |

---

## Project Structure

```
AI VC Due Diligence V2/
├── app/
│   ├── config.py           ← Settings (API keys, models, ports)
│   ├── main.py             ← FastAPI app, CORS, route registration
│   ├── routes.py           ← All analysis API endpoints
│   ├── routes_auth.py      ← Auth endpoints (register, login, Google OAuth)
│   ├── routes_admin.py     ← Admin endpoints (users, credits, analytics)
│   └── schemas.py          ← Pydantic request/response models
├── pipeline/
│   ├── orchestrator.py     ← Runs all 8 stages in sequence
│   ├── state.py            ← Shared data passed between stages
│   ├── cancel.py           ← Pause/cancel support via asyncio
│   └── agents/
│       ├── base.py                     ← Base agent (Claude API + tool loop)
│       ├── stage1_company_researcher.py
│       ├── stage2_market_analyst.py
│       ├── stage3_financial_modeler.py
│       ├── stage4_risk_assessor.py
│       ├── stage5_comparable_deals.py
│       ├── stage6_memo_writer.py
│       ├── stage7_report_generator.py
│       └── stage8_infographic_creator.py
├── frontend/
│   ├── src/
│   │   ├── pages/          ← Dashboard, JobView, Auth, Admin, Credits, Profile
│   │   ├── components/
│   │   │   ├── analytics/  ← AnalyticsDashboard + 5 panel components
│   │   │   ├── job/        ← PipelineStepper, ExecutionLog, DownloadSection
│   │   │   └── analysis/   ← AnalysisForm (company input + mode selection)
│   │   ├── api/client.ts   ← Axios API client
│   │   ├── store/          ← Zustand state (jobStore, authStore)
│   │   └── types/index.ts  ← TypeScript types + stage metadata
│   └── dist/               ← Built frontend (served by FastAPI)
├── storage/
│   └── database.py         ← SQLite: stores all analyses and users
├── tools/
│   ├── web_search.py       ← Tavily search wrapper
│   ├── chart_generator.py  ← matplotlib revenue chart
│   ├── html_generator.py   ← HTML report template
│   └── infographic_generator.py ← Visual one-pager generator
├── outputs/                ← Generated HTML files saved here
├── .env                    ← Your API keys (keep private)
├── requirements.txt        ← Python dependencies
└── run.py                  ← Start the server
```

---

## System Architecture

```
Browser (React + MUI)
        │
        ▼
FastAPI REST API  (/api/v1/...)
        │
        ▼
Pipeline Orchestrator  (asyncio background task)
        │
   ┌────┴────┐
   │         │
Claude API  Tavily API   Python tools
(reasoning) (web search) (HTML, charts)
        │
        ▼
   SQLite DB  +  outputs/ folder
```

---

## Troubleshooting

**"ANTHROPIC_API_KEY missing"**
→ Edit `.env` and add your key from https://console.anthropic.com/

**Analysis stuck on a stage**
→ Check the terminal for errors. Most common cause: Anthropic API rate limit.
→ Click **Pause** then **Resume** to retry from the last completed stage.

**"Module not found" error**
→ Run `pip install -r requirements.txt` again inside the project folder.

**Frontend shows blank page**
→ Run `cd frontend && npm run build && cd ..` then restart the server.

**Port 8000 already in use**
→ Change `PORT=8001` in `.env`.

---

## Cost Estimate

A typical full analysis (all 8 stages) uses:
- 50,000–100,000 input tokens (prompt caching gives ~60–80% discount on repeats)
- 8,000–15,000 output tokens

**Estimated Anthropic API cost: $0.50–$2.00 per full analysis** depending on company complexity.

---

*Built with Claude API (Anthropic) · Tavily Search · FastAPI · React · MUI*
*Analysis is AI-generated and for informational purposes only. Not investment advice.*
