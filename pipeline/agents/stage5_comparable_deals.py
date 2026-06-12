"""Stage 5 — Comparable Deals Analyst (Haiku + Tavily web search). NEW in V2."""

from pipeline.agents.base import BaseAgent
from pipeline.state import PipelineState

SYSTEM_PROMPT = """\
You are a VC analyst specialising in comparable transaction analysis (comps).

Your job is to find recent funding rounds, acquisitions, and valuations in the same
market/category as the target company. This benchmarks whether the valuation is fair.

WHAT TO RESEARCH:
1. Recent Funding Rounds — same category, last 18 months
   - Round stage, amount, valuation, lead investor, ARR multiple at entry
2. Comparable Acquisitions — M&A deals in this space
   - Acquirer, price, revenue multiple, strategic rationale
3. Valuation Benchmarks — typical revenue multiples for this category
   - Pre-money valuation ranges by stage (Seed / A / B)
4. Investor Activity — which top VCs are active in this space
   - Who has invested, at what stages, return expectations

SEARCH STRATEGY:
- "[category] startup funding 2024 2025 Series A million"
- "[competitor A] valuation funding round 2025"
- "[industry] M&A acquisition 2024 2025"
- "[category] VC investment thesis 2025"
- "[competitor B] ARR revenue valuation multiple"

OUTPUT FORMAT:

## Comparable Transactions Analysis

### Recent Funding Rounds (Comps)
| Company | Stage | Amount | Valuation | ARR Est. | Multiple | Date | Lead Investor |
|---------|-------|--------|-----------|----------|----------|------|---------------|
[At least 4–6 rows]

### Acquisition Comps
| Acquirer | Target | Price | Revenue Multiple | Date | Notes |
[If available]

### Valuation Benchmarks for This Category
- Seed: typical $X–$Y pre-money
- Series A: typical $X–$Y post-money at $X ARR
- Revenue multiples: X–Xx ARR at entry

### Active Investors in This Space
[Which top VCs are active, their thesis, recent portfolio additions]

### Valuation Assessment for Target Company
- Implied valuation range based on comps: $X–$Y
- Key drivers of premium/discount vs comps: [...]
- Fair entry valuation recommendation: [...]

Be specific with numbers. Cite sources.\
"""


class ComparableDealsAgent(BaseAgent):
    name = "ComparableDeals"
    tier = "fast"
    use_tools = True
    max_output_tokens = 5_000

    async def run(self, state: PipelineState) -> PipelineState:
        # Extract market category from Stage 2 for better search context
        category_hint = ""
        if state.market_analysis:
            # Use first 500 chars of market analysis to give context
            category_hint = state.market_analysis[:500]

        user_message = (
            f"Research comparable funding deals and valuations for this company's category.\n\n"
            f"**Target Company:** {state.company_input}\n\n"
            f"**Market Context (from Stage 2):**\n{category_hint}\n\n"
            f"**Company Overview:**\n{state.company_info[:800] if state.company_info else 'N/A'}\n\n"
            f"Search for at least 5 comparable funding rounds in the same market/category. "
            f"Find actual deal data: amounts, valuations, ARR multiples."
        )

        text, tokens = await self.call_llm(SYSTEM_PROMPT, user_message)
        state.comparable_deals = text
        state.record_tokens(self.name, tokens)
        return state
