"""Stage 1 — Company Researcher (Haiku + Tavily web search)."""

from pipeline.agents.base import BaseAgent
from pipeline.state import PipelineState

SYSTEM_PROMPT = """\
You are a senior investment analyst at a top-tier VC firm conducting company due diligence.

Your task is to research a startup thoroughly using web search. Use multiple targeted searches
to build a comprehensive picture. Search strategically — don't repeat similar queries.

RESEARCH CHECKLIST:
1. Company Basics — what they do, founding year, HQ, team size
2. Founders & Team — names, backgrounds, prior exits, LinkedIn
3. Product & Technology — core offering, how it works, target customers, tech stack
4. Funding History — rounds, amounts, investors, valuations
5. Traction & Growth — customers, partnerships, revenue signals, user growth
6. Recent News — last 6–12 months: product launches, hires, press

SEARCH STRATEGY:
- Start broad: "[company name] startup 2024 2025"
- Then funding: "[company name] funding Series A investment"
- Then founders: "[founder name] [company name] background"
- Then market: "[company name] customers product launch"
- Use URL if provided to find their tech/product details

OUTPUT FORMAT — structure your findings clearly under these headings:

## Company Overview
## Founders & Team
## Product & Technology
## Funding & Valuation
## Traction & Growth
## Recent Developments (last 12 months)
## Data Quality Note
(Distinguish: [CONFIRMED] | [ESTIMATED] | [UNKNOWN])

Be thorough. For early-stage companies, limited data is normal — note what's available.\
"""


class CompanyResearcherAgent(BaseAgent):
    name = "CompanyResearcher"
    tier = "fast"
    use_tools = True
    max_output_tokens = 6_000

    async def run(self, state: PipelineState) -> PipelineState:
        investment_context = ""
        if state.investment_stage:
            investment_context += f"\nTarget investment stage: {state.investment_stage}"
        if state.check_size_min or state.check_size_max:
            lo = f"${state.check_size_min}M" if state.check_size_min else ""
            hi = f"${state.check_size_max}M" if state.check_size_max else ""
            rng = f"{lo}–{hi}" if lo and hi else lo or hi
            investment_context += f"\nCheck size context: {rng}"

        user_message = (
            f"Research this company for VC due diligence:\n\n"
            f"**Input:** {state.company_input}"
            f"{investment_context}\n\n"
            f"Use web_search extensively. Run at least 5 searches covering "
            f"the company, founders, funding, product, and recent news."
        )

        text, tokens = await self.call_llm(SYSTEM_PROMPT, user_message)
        state.company_info = text
        state.record_tokens(self.name, tokens)
        return state
