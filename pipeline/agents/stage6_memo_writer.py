"""Stage 6 — Investor Memo Writer (Sonnet + extended thinking, no tools)."""

import re
from pipeline.agents.base import BaseAgent
from pipeline.state import PipelineState


def _post_process_memo(text: str) -> str:
    """Clean up memo text for cross-platform consistency."""
    # Replace emoji data quality markers with text markers
    text = text.replace('\u2705', '[CONFIRMED]')   # ✅
    text = text.replace('\u274c', '[UNCONFIRMED]')  # ❌
    text = text.replace('\u2753', '[UNKNOWN]')       # ❓
    text = text.replace('\u2754', '[UNKNOWN]')       # ❔
    text = text.replace('\ud83d\udcca', '[ESTIMATED]')  # 📊
    text = text.replace('\ud83d\udcc8', '[ESTIMATED]')  # 📈
    text = text.replace('\ud83d\udcc9', '[ESTIMATED]')  # 📉
    # Also handle the actual Unicode chars directly
    text = re.sub(r'[\U0001F4CA\U0001F4C8\U0001F4C9]', '[ESTIMATED]', text)
    text = re.sub(r'[\u2705]', '[CONFIRMED]', text)
    text = re.sub(r'[\u2753\u2754]', '[UNKNOWN]', text)
    # Normalize header levels: ensure ## not # for top-level sections
    text = re.sub(r'^# (?!#)', '## ', text, flags=re.MULTILINE)
    # Strip stray code fences that sometimes wrap the entire output
    text = re.sub(r'^```(?:markdown)?\s*\n', '', text)
    text = re.sub(r'\n```\s*$', '', text)
    return text

SYSTEM_PROMPT = """\
You are a senior investment partner writing the Investment Committee (IC) memo.

This memo is the primary document for the IC's go/no-go decision. It must be:
- Balanced: acknowledge both upside and risks honestly
- Data-driven: cite numbers, distinguish confirmed vs estimated
- Actionable: clear recommendation with next steps
- Professional: IC-quality writing, not marketing language

You have extended thinking enabled — use it to weigh the evidence carefully before writing.

DATA QUALITY LEGEND (use throughout):
[CONFIRMED] Confirmed from public sources
[ESTIMATED] Estimated / modelled
[UNKNOWN] Unknown / not publicly available

MEMO STRUCTURE:

## Executive Summary
- **Company:** [Name — one-line description]
- **Recommendation:** **STRONG BUY** / **BUY** / **HOLD** / **PASS**
- **Key Investment Highlights:** (3–4 bullets — the most compelling reasons)
- **Primary Concerns:** (2–3 bullets — the main risks)

## Company Overview

### What They Do
[Clear 2–3 paragraph product/service description]

### Founding Team
[Founders: names, backgrounds, relevant prior experience, pattern-matching for success]
[Assessment: why this team can/cannot execute]

### Product & Technology
[Core offering, how it works, what makes it defensible, tech differentiation]

## Market Opportunity

### Market Size
- TAM: $X | SAM: $X | CAGR: X%

### Competitive Landscape
[Key competitors: funding, positioning, differentiation]

### Why Now
[Market timing catalysts — what's changed that makes this the right moment]

## Business Model & Traction

### Funding History
[Rounds, amounts, investors — or "Bootstrapped/Pre-seed"]

### Current Metrics
[ARR, customers, growth rate — clearly marked [CONFIRMED] / [ESTIMATED] / [UNKNOWN]]

### Go-to-Market
[How they acquire customers, channel strategy, unit economics]

## Financial Analysis

### Revenue Projections (Summary)
| Scenario | Year 3 | Year 5 |
|----------|--------|--------|
| Bear     | $X.XM  | $X.XM  |
| Base     | $X.XM  | $X.XM  |
| Bull     | $X.XM  | $X.XM  |

### Unit Economics
[CAC, LTV, payback period — estimated where unknown]

### Capital Requirements
[Burn estimate, runway, when next raise needed]

## Comparable Transactions
[2–3 most relevant comps from the comp analysis, with valuation implications]

## Risk Analysis

**Overall Risk Score: X/10**

| Risk | Severity | Key Concern |
|------|----------|-------------|
[Top 4–5 risks in table]

## Investment Thesis

### Bull Case
[3–4 specific reasons to invest]

### Bear Case
[3–4 specific concerns that could kill returns]

### Return Scenarios
| Scenario | Entry Val. | Exit Val. (Yr 5) | MOIC | IRR |
|----------|-----------|------------------|------|-----|
| Base | $X | $Y | Xx | X% |
| Bull | $X | $Z | Xx | X% |

## Recommendation

**Decision: [STRONG BUY / BUY / HOLD / PASS]**

[2–3 paragraphs: synthesis of the thesis, the key bet, and why now]

**Suggested Terms:**
- Investment amount: $X
- Target valuation: $Y
- Board seat: Yes / No / Observer
- Protective provisions: [list]
- Key milestones for follow-on: [list]

**Next Steps:**
1. [Most critical due diligence item]
2. [Second item]
3. [Reference checks / meetings needed]

---
For early-stage companies: note what data is estimated. That honesty builds IC trust.\
"""


_REC_PATTERN = re.compile(
    r"\*\*(STRONG BUY|BUY|HOLD|PASS)\*\*", re.IGNORECASE
)
_SCORE_PATTERN = re.compile(
    r"Overall Risk Score[:\s]+(\d+(?:\.\d+)?)\s*/\s*10", re.IGNORECASE
)


class MemoWriterAgent(BaseAgent):
    name = "MemoWriter"
    tier = "smart"
    use_tools = False
    use_extended_thinking = True
    thinking_budget = 12_000
    max_output_tokens = 9_000

    async def run(self, state: PipelineState) -> PipelineState:
        investment_context = ""
        if state.investment_stage:
            investment_context += f"\n**Target stage:** {state.investment_stage}"
        if state.check_size_min or state.check_size_max:
            lo = f"${state.check_size_min}M" if state.check_size_min else ""
            hi = f"${state.check_size_max}M" if state.check_size_max else ""
            investment_context += f"\n**Check size:** {lo}–{hi}" if lo and hi else f"\n**Check size:** {lo or hi}"

        user_message = (
            f"Write the full IC investment memo for this company.{investment_context}\n\n"
            f"---\n**COMPANY RESEARCH:**\n{state.company_info}\n---\n\n"
            f"---\n**MARKET ANALYSIS:**\n{state.market_analysis}\n---\n\n"
            f"---\n**FINANCIAL MODEL:**\n{state.financial_model_text}\n---\n\n"
            f"---\n**RISK ASSESSMENT:**\n{state.risk_assessment}\n---\n\n"
            f"---\n**COMPARABLE DEALS:**\n{state.comparable_deals}\n---\n\n"
            f"Use your extended thinking to synthesise all five inputs before writing. "
            f"The memo must be IC-ready: balanced, data-driven, and actionable."
        )

        text, tokens = await self.call_llm(SYSTEM_PROMPT, user_message)
        text = _post_process_memo(text)
        state.investor_memo = text
        state.record_tokens(self.name, tokens)

        # Extract summary fields
        rec_match = _REC_PATTERN.search(text)
        if rec_match:
            state.recommendation = rec_match.group(1).upper()

        score_match = _SCORE_PATTERN.search(text)
        if score_match:
            state.risk_score = float(score_match.group(1))

        return state
