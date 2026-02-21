"""Pipeline state — shared data object passed through all 8 stages."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import uuid


@dataclass
class PipelineState:
    # Identity
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    company_input: str = ""

    # Optional investment parameters from the request
    investment_stage: Optional[str] = None   # e.g. "Series A"
    check_size_min: Optional[float] = None   # USD millions
    check_size_max: Optional[float] = None   # USD millions

    # Pipeline status
    status: str = "pending"          # pending | running | paused | completed | failed
    current_stage: int = 0
    stage_name: str = "Initialising"
    error: Optional[str] = None
    paused_at: Optional[str] = None

    # ── Stage outputs ─────────────────────────────────────────────────────────
    company_info: Optional[str] = None           # Stage 1
    market_analysis: Optional[str] = None        # Stage 2
    financial_model_text: Optional[str] = None   # Stage 3 narrative
    financial_projections: Optional[dict] = None # Stage 3 JSON (for chart)
    risk_assessment: Optional[str] = None        # Stage 4
    comparable_deals: Optional[str] = None       # Stage 5
    investor_memo: Optional[str] = None          # Stage 6
    html_report_path: Optional[str] = None       # Stage 7
    chart_path: Optional[str] = None             # Stage 3 (generated during Stage 3)
    infographic_path: Optional[str] = None       # Stage 8

    # Extracted summary fields (populated after Stage 6)
    recommendation: Optional[str] = None   # STRONG BUY | BUY | HOLD | PASS
    risk_score: Optional[float] = None     # 0–10

    # Token tracking
    tokens_used: dict = field(default_factory=dict)   # {stage_name: token_count}
    total_tokens: int = 0

    # Timestamps
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    completed_at: Optional[str] = None

    def record_tokens(self, stage: str, count: int):
        self.tokens_used[stage] = self.tokens_used.get(stage, 0) + count
        self.total_tokens += count

    def to_dict(self) -> dict:
        """Serialise to plain dict (for database storage)."""
        import dataclasses
        return dataclasses.asdict(self)
