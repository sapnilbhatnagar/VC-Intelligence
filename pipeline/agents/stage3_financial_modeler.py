"""Stage 3 — Financial Modeler (Sonnet, no tools, outputs JSON + narrative)."""

import re
import json
from pipeline.agents.base import BaseAgent
from pipeline.state import PipelineState
from tools.chart_generator import generate_revenue_chart

SYSTEM_PROMPT = """\
You are a financial analyst at a top-tier VC firm building investment-grade revenue models.

Given company and market research, build realistic 5-year financial projections.

STAGE BENCHMARKS:
- Pre-seed / Seed:  ARR $0.1–0.5M,  growth multipliers 3–5× per year
- Series A:         ARR $1–3M,       growth multipliers 2–3× per year
- Series B:         ARR $5–15M,      growth multipliers 1.5–2× per year
- Series C+:        ARR $20M+,       growth multipliers 1.3–1.8× per year

YOUR OUTPUT MUST INCLUDE two parts:

--- PART 1: ANALYSIS NARRATIVE ---

## Financial Model

### Current State Assessment
- Estimated ARR: $X.XM
- Stage: [Seed / Series A / B / C]
- Rationale: [justify estimate from evidence]

### Growth Scenarios (5-Year YoY Multipliers)

**Bear Case:** [1.X, 1.X, 1.X, 1.X, 1.X]
- Assumptions: [conservative scenario logic]

**Base Case:** [X.X, X.X, X.X, X.X, X.X]
- Assumptions: [realistic scenario logic]

**Bull Case:** [X.X, X.X, X.X, X.X, X.X]
- Assumptions: [optimistic scenario logic]

### Revenue Projections Table
| Year | Bear Case | Base Case | Bull Case |
|------|-----------|-----------|-----------|
[fill in 6 rows: current year + 5 years]

### Exit Valuation Analysis (Year 5, Base Case)
- At 10× ARR: $XXM
- At 15× ARR: $XXM
- At 25× ARR: $XXM

### Return Analysis
- Entry valuation assumption: $X
- Base MOIC: X.Xx  |  IRR: XX%
- Bull MOIC: X.Xx  |  IRR: XX%

--- PART 2: MACHINE-READABLE JSON (REQUIRED) ---

After your narrative, output EXACTLY this JSON block (no extra text around it):

```json
{
  "company_name": "...",
  "current_arr": <float, USD millions>,
  "stage": "...",
  "year_start": <int, e.g. 2025>,
  "bear_rates": [<5 floats>],
  "base_rates": [<5 floats>],
  "bull_rates": [<5 floats>]
}
```

The JSON will be used to generate a professional revenue chart. Be precise with numbers.\
"""


class FinancialModelerAgent(BaseAgent):
    name = "FinancialModeler"
    tier = "smart"
    use_tools = False
    max_output_tokens = 5_000

    async def run(self, state: PipelineState) -> PipelineState:
        investment_context = ""
        if state.investment_stage:
            investment_context = f"\nFocus investment stage: {state.investment_stage}"

        user_message = (
            f"Build a financial model for this company.{investment_context}\n\n"
            f"---\n**COMPANY RESEARCH:**\n{state.company_info}\n---\n\n"
            f"---\n**MARKET ANALYSIS:**\n{state.market_analysis}\n---\n\n"
            f"Remember to include the ```json block at the end with the projection data."
        )

        text, tokens = await self.call_llm(SYSTEM_PROMPT, user_message)
        state.financial_model_text = text
        state.record_tokens(self.name, tokens)

        # Parse JSON projection data for chart generation
        projections = _extract_json(text)
        if projections:
            state.financial_projections = projections
            try:
                chart_path = generate_revenue_chart(
                    company_name=projections.get("company_name", state.company_input),
                    current_arr=projections["current_arr"],
                    bear_rates=projections["bear_rates"],
                    base_rates=projections["base_rates"],
                    bull_rates=projections["bull_rates"],
                    year_start=projections.get("year_start", 2025),
                )
                state.chart_path = chart_path
            except Exception as e:
                # Chart failure is non-fatal
                state.chart_path = None

        return state


def _extract_json(text: str) -> dict | None:
    """Extract the first ```json ... ``` block from Claude's response."""
    match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return None
