"""Stage 8 — Infographic Creator (Haiku extraction + HTML/CSS infographic)."""

import re
import json
from app.config import settings
from pipeline.agents.base import BaseAgent
from pipeline.state import PipelineState
from tools.infographic_html_generator import generate_html_infographic

EXTRACTION_SYSTEM = """\
You extract structured data from investment memos for infographic generation.
Return ONLY a valid JSON object — no other text, no markdown fences, no explanation.
If a field is unavailable, use null.
""".strip()


class InfographicCreatorAgent(BaseAgent):
    name = "InfographicCreator"
    model = settings.model_fast
    use_tools = False
    max_output_tokens = 800

    async def run(self, state: PipelineState) -> PipelineState:
        # Try lightweight Claude extraction for structured metrics
        metrics = await self._extract_metrics(state)

        # Fall back to regex extraction if Claude extraction fails
        if not metrics:
            metrics = _regex_extract(state)

        try:
            infographic_path = generate_html_infographic(
                company_name=metrics.get("company_name") or state.company_input,
                recommendation=metrics.get("recommendation") or state.recommendation or "UNDER REVIEW",
                risk_score=metrics.get("risk_score") or state.risk_score or 5.0,
                tam=metrics.get("tam") or "N/A",
                funding=metrics.get("funding") or "N/A",
                stage=metrics.get("stage") or state.investment_stage or "N/A",
                top_highlights=metrics.get("top_highlights") or [],
                top_risks=metrics.get("top_risks") or [],
                financial_projections=state.financial_projections,
                job_id=state.job_id,
            )
            state.infographic_path = infographic_path
        except Exception:
            # Infographic failure is non-fatal
            state.infographic_path = None

        return state

    async def _extract_metrics(self, state: PipelineState) -> dict | None:
        """Ask Claude Haiku to extract key metrics as JSON."""
        memo = state.investor_memo or ""
        if not memo:
            return None

        user_message = (
            f"Extract these fields from the investment memo below and return as JSON:\n"
            f"- company_name (string)\n"
            f"- recommendation (one of: STRONG BUY, BUY, HOLD, PASS)\n"
            f"- risk_score (number 1-10)\n"
            f"- tam (string, e.g. '$45B')\n"
            f"- funding (string, e.g. '$87.5M')\n"
            f"- stage (string, e.g. 'Series A')\n"
            f"- top_highlights (list of 3 strings — key investment highlights)\n"
            f"- top_risks (list of 3 strings — top deal-killer risks)\n\n"
            f"MEMO:\n{memo[:3000]}"
        )

        try:
            text, tokens = await self.call_claude(EXTRACTION_SYSTEM, user_message)
            state.record_tokens(self.name, tokens)
            # Clean and parse
            clean = text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            return json.loads(clean)
        except Exception:
            return None


def _regex_extract(state: PipelineState) -> dict:
    """Regex fallback — pulls key metrics from memo text."""
    memo = state.investor_memo or ""
    result: dict = {}

    # Recommendation
    for label in ("STRONG BUY", "BUY", "HOLD", "PASS"):
        if label in memo.upper():
            result["recommendation"] = label
            break

    # Risk score
    m = re.search(r"Overall Risk Score[:\s]+(\d+(?:\.\d+)?)\s*/\s*10", memo, re.IGNORECASE)
    if m:
        result["risk_score"] = float(m.group(1))

    # TAM
    m = re.search(r"TAM[:\s]+\$?([\d.]+\s*[BMbm](?:illion)?)", memo)
    if m:
        result["tam"] = "$" + m.group(1)

    # Funding
    m = re.search(r"(?:Total raised|Funding)[:\s]+\$?([\d.]+\s*[BMbm])", memo, re.IGNORECASE)
    if m:
        result["funding"] = "$" + m.group(1)

    return result
