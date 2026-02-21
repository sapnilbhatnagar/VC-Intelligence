# AI VC Due Diligence — Version 2.0

An AI-powered due diligence engine that analyses any startup in minutes and delivers
a professional investor memo, revenue charts, and a visual infographic — all through
a simple web API.

---

## What This System Does

You give it a company name or website. It returns:

| Output | What it is |
|--------|------------|
| **Investor Memo** | Full IC-ready investment memo with recommendation |
| **HTML Report** | Professional, printable investment document |
| **Revenue Chart** | Bear / Base / Bull 5-year projection chart (PNG) |
| **Infographic** | One-page visual summary (PNG) |

All analysis runs automatically across **8 specialist AI stages**:

```
Stage 1 — Company Research     → Who they are, founders, funding, traction
Stage 2 — Market Analysis      → TAM/SAM, competitors, positioning
Stage 3 — Financial Modeling   → Revenue projections + chart
Stage 4 — Risk Assessment      → Deep risk analysis (5 categories, scored)
Stage 5 — Comparable Deals     → Recent deals in same space, valuation benchmarks  ← NEW
Stage 6 — Investor Memo        → Full IC memo with recommendation
Stage 7 — HTML Report          → Professional formatted report
Stage 8 — Infographic          → Visual one-pager
```

---

## How It Works (Plain English)

1. You send a request to the API: *"Analyse Agno AI"*
2. The system starts 8 AI agents running one after another (sequential pipeline)
3. Each agent does its job and passes its findings to the next
4. You can check progress at any time
5. When complete, you download the memo, report, chart, and infographic

It takes **5–15 minutes** depending on how much information is publicly available.

---

## Setup (One-Time)

### Step 1 — Install Python

You need Python 3.11 or newer.
Download from: https://www.python.org/downloads/

### Step 2 — Install dependencies

Open a terminal in this folder and run:

```bash
pip install -r requirements.txt
```

### Step 3 — Add your Anthropic API key

Open the `.env` file and replace `your_anthropic_api_key_here` with your real key.

Get your Anthropic API key from: https://console.anthropic.com/

The Tavily key is already pre-filled in `.env`.

```
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
TAVILY_API_KEY=tvly-dev-...already-filled...
```

### Step 4 — Start the server

```bash
python run.py
```

You should see:
```
✅ Database initialised
✅ Outputs directory: ./outputs
✅ Server ready — visit http://localhost:8000/docs
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Leave this terminal window open while you use the system.

---

## Using the API

### Option A — Interactive Web Interface (Recommended for beginners)

Open your browser and go to: **http://localhost:8000/docs**

This shows you a visual interface where you can click buttons and fill in forms
to try all the API endpoints without writing any code.

### Option B — Direct API calls

Use a tool like Postman, Insomnia, or `curl` in your terminal.

---

## Step-by-Step: Running Your First Analysis

### 1. Start an analysis

**POST** `http://localhost:8000/api/v1/analyze`

Send this JSON:
```json
{
  "company": "Agno AI",
  "investment_stage": "Series A",
  "check_size_min": 5,
  "check_size_max": 20
}
```

You'll get back a `job_id` like: `"a1b2c3d4-..."`

You can also include a URL:
```json
{
  "company": "Agno AI at https://agno.com"
}
```

### 2. Check progress

**GET** `http://localhost:8000/api/v1/status/{job_id}`

Response example:
```json
{
  "status": "running",
  "current_stage": 3,
  "stage_name": "Financial Modeling",
  "progress_pct": 37.5
}
```

Keep checking every 30–60 seconds until `"status": "completed"`.

### 3. Get your results

**GET** `http://localhost:8000/api/v1/results/{job_id}`

Returns the full analysis as JSON including the investor memo text.

### 4. Download the files

| File | URL |
|------|-----|
| HTML Report | `GET /api/v1/results/{job_id}/report` |
| Revenue Chart | `GET /api/v1/results/{job_id}/chart` |
| Infographic | `GET /api/v1/results/{job_id}/infographic` |

Open the HTML report in any web browser. Save/print the PNGs.

### 5. See past analyses

**GET** `http://localhost:8000/api/v1/history`

Shows all previous analyses with their recommendation and status.

---

## All API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| GET | `/` | API info |
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/analyze` | Start a new analysis |
| GET | `/api/v1/status/{job_id}` | Check pipeline progress |
| GET | `/api/v1/results/{job_id}` | Full results as JSON |
| GET | `/api/v1/results/{job_id}/report` | Download HTML report |
| GET | `/api/v1/results/{job_id}/chart` | Download revenue chart (PNG) |
| GET | `/api/v1/results/{job_id}/infographic` | Download infographic (PNG) |
| GET | `/api/v1/history` | List all past analyses |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI REST API                        │
│          (receives requests, runs pipeline in background)   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Sequential Pipeline Orchestrator               │
│                                                             │
│  Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5          │
│                                    ↓                        │
│             Stage 8 ← Stage 7 ← Stage 6                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    Claude API         Tavily API      Python Tools
  (AI reasoning)    (web search)  (charts, HTML, infographic)
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                    SQLite Database
                (persists all results)
                           │
                           ▼
                  outputs/ folder
           (HTML, PNG files saved here)
```

### Models Used

| Stage | Model | Why |
|-------|-------|-----|
| Company Research (1) | claude-haiku-4-5 | Fast web research |
| Market Analysis (2) | claude-haiku-4-5 | Fast web research |
| Financial Modeling (3) | claude-sonnet-4-6 | Precise calculations |
| Risk Assessment (4) | claude-sonnet-4-6 + **extended thinking** | Deep reasoning |
| Comparable Deals (5) | claude-haiku-4-5 | Fast web research |
| Investor Memo (6) | claude-sonnet-4-6 + **extended thinking** | Highest quality output |
| HTML Report (7) | Python only | Template rendering |
| Infographic (8) | claude-haiku-4-5 + Python | Metric extraction + matplotlib |

**Extended thinking** means Claude spends extra computation reasoning through the problem
before writing its answer — like a human analyst who thinks carefully before concluding.
This is enabled for the two most important stages: Risk Assessment and Memo Writing.

---

## Output Files

All generated files are saved in the `outputs/` folder:

```
outputs/
├── revenue_chart_AgnoAI_20260218_143052.png    ← Bear/Base/Bull chart
├── report_AgnoAI_20260218_143105.html          ← Open in browser
└── infographic_AgnoAI_20260218_143120.png      ← Visual summary
```

The investor memo text is stored in the database and returned via the API.

---

## Troubleshooting

**"ANTHROPIC_API_KEY missing"**
→ Edit `.env` and add your key from https://console.anthropic.com/

**Analysis stuck on a stage**
→ Check the terminal for error messages. The most common cause is an Anthropic API rate limit.
→ Wait a minute and try again.

**"Module not found" error**
→ Run `pip install -r requirements.txt` again.

**Chart not generating**
→ Install matplotlib: `pip install matplotlib`
→ Check the `outputs/` folder exists.

**Port 8000 already in use**
→ Change the port in `.env`: `PORT=8001`

---

## Cost Estimate

A typical analysis uses approximately:
- 50,000–100,000 input tokens (cached, so ~80% cheaper on repeat analyses)
- 8,000–15,000 output tokens

At standard Anthropic API pricing, **one full analysis costs roughly $0.50–$2.00 USD**
depending on the company's complexity and how much web research is needed.

---

## Project Structure

```
AI VC Due Diligence V2/
├── app/
│   ├── config.py          ← Settings (API keys, models, paths)
│   ├── main.py            ← FastAPI app
│   ├── routes.py          ← All API endpoints
│   └── schemas.py         ← Request/response data shapes
├── pipeline/
│   ├── orchestrator.py    ← Runs all 8 stages in sequence
│   ├── state.py           ← Shared data passed between stages
│   └── agents/
│       ├── base.py        ← Base agent (Claude API + tool loop)
│       ├── stage1_*.py    ← Company Researcher
│       ├── stage2_*.py    ← Market Analyst
│       ├── stage3_*.py    ← Financial Modeler
│       ├── stage4_*.py    ← Risk Assessor
│       ├── stage5_*.py    ← Comparable Deals  ← NEW in V2
│       ├── stage6_*.py    ← Memo Writer
│       ├── stage7_*.py    ← Report Generator
│       └── stage8_*.py    ← Infographic Creator
├── tools/
│   ├── web_search.py      ← Tavily search wrapper
│   ├── chart_generator.py ← matplotlib revenue chart
│   ├── html_generator.py  ← HTML report template
│   └── infographic_generator.py ← matplotlib infographic
├── storage/
│   └── database.py        ← SQLite: stores all analyses
├── outputs/               ← Generated PNGs and HTML files saved here
├── .env                   ← Your API keys (keep private)
├── .env.example           ← Template showing what keys are needed
├── requirements.txt       ← Python dependencies
├── run.py                 ← Start the server
└── README.md              ← This file
```

---

## V2 Improvements Over V1

| Feature | V1 (Claude Code) | V2 (This version) |
|---------|------------------|-------------------|
| Access | CLI only | REST API — call from anywhere |
| Comparable deals | Not included | New Stage 5 |
| History | None | SQLite — all past analyses stored |
| Progress tracking | Visual in terminal | API endpoint, pollable |
| Structured outputs | Markdown files | JSON + files via API |
| Cost tracking | None | Tokens per stage, total cost |
| Extended thinking | Risk + Memo | Risk + Memo (same) |
| Prompt caching | Not applicable | Yes — ~60-80% cheaper |
| Web search | Claude Code built-in | Tavily (more reliable) |
| Infographic | Gemini image API | matplotlib (always works) |
| Multi-user | No | Yes — parallel jobs supported |

---

*Built with Claude API (Anthropic) · Tavily Search · FastAPI · matplotlib*
*Analysis is AI-generated and for informational purposes only. Not investment advice.*
