"""Stage 7 — HTML Report Generator (Python only, no Claude call)."""

import re
from pipeline.agents.base import BaseAgent
from pipeline.state import PipelineState
from tools.html_generator import generate_html_report


def _extract_company_name(state: PipelineState) -> str:
    """Extract a clean company name from the state."""
    # Try to pull from company_input
    raw = state.company_input

    # Strip URL if present
    name = re.sub(r"https?://\S+", "", raw).strip()
    # Strip common filler words
    name = re.sub(r"\b(at|for|the|a|an)\b", "", name, flags=re.IGNORECASE).strip()
    # Remove extra whitespace
    name = re.sub(r"\s+", " ", name).strip()

    if not name:
        name = "Company"
    return name


class ReportGeneratorAgent(BaseAgent):
    name = "ReportGenerator"

    async def run(self, state: PipelineState) -> PipelineState:
        company_name = _extract_company_name(state)

        # generate_html_report converts the markdown memo → styled HTML file
        html_path = generate_html_report(
            company_name=company_name,
            memo_text=state.investor_memo or "",
            job_id=state.job_id,
        )

        state.html_report_path = html_path
        return state
