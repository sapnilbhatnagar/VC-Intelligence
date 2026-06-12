"""
Sequential pipeline orchestrator.

Runs stages in order, updating the database after each stage completes.
Supports:
  - Immediate mid-stage cancellation via asyncio.Task.cancel()
  - Resume from last completed stage
  - Selective stage execution (run only user-chosen stages)
"""

import asyncio
import logging
from datetime import datetime, timezone

from pipeline.state import PipelineState
from pipeline.providers import resolve_models
from pipeline.cancel import register_job, unregister_job
from pipeline.agents.stage1_company_researcher import CompanyResearcherAgent
from pipeline.agents.stage2_market_analyst import MarketAnalystAgent
from pipeline.agents.stage3_financial_modeler import FinancialModelerAgent
from pipeline.agents.stage4_risk_assessor import RiskAssessorAgent
from pipeline.agents.stage5_comparable_deals import ComparableDealsAgent
from pipeline.agents.stage6_memo_writer import MemoWriterAgent
from pipeline.agents.stage7_report_generator import ReportGeneratorAgent
from pipeline.agents.stage8_infographic_creator import InfographicCreatorAgent
from storage.database import update_analysis, get_analysis, get_completed_stages

logger = logging.getLogger(__name__)

# Ordered pipeline: (display_name, agent_class)
PIPELINE = [
    ("Execute Company Research",   CompanyResearcherAgent),
    ("Perform Market Analysis",    MarketAnalystAgent),
    ("Build Financial Model",      FinancialModelerAgent),
    ("Conduct Risk Assessment",    RiskAssessorAgent),
    ("Research Comparable Deals",  ComparableDealsAgent),
    ("Generate Investor Memo",     MemoWriterAgent),
    ("Render Investor Report",     ReportGeneratorAgent),
    ("Create Visual Summary",      InfographicCreatorAgent),
]

# Maps stage number -> output keys that prove the stage completed
STAGE_OUTPUT_KEYS = {
    1: ["company_info"],
    2: ["market_analysis"],
    3: ["financial_model_text"],
    4: ["risk_assessment"],
    5: ["comparable_deals"],
    6: ["investor_memo"],
    7: ["html_report_path"],
    8: ["infographic_path"],
}

# All 8 stage numbers
ALL_STAGES = [1, 2, 3, 4, 5, 6, 7, 8]


def get_last_completed_stage(state_dict: dict) -> int:
    """Returns the number of the last fully completed stage (0 if none)."""
    for stage_num in range(8, 0, -1):
        keys = STAGE_OUTPUT_KEYS[stage_num]
        if all(state_dict.get(k) is not None for k in keys):
            return stage_num
    return 0


def _get_stages_to_run(selected_stages: list[int] | None) -> list[int]:
    """Resolve which stages to run. None means all."""
    if not selected_stages:
        return ALL_STAGES
    # Always include stage 1 (required for everything)
    stages = set(selected_stages)
    stages.add(1)
    return sorted(stages)


async def start_pipeline(
    job_id: str,
    company_input: str,
    investment_stage: str | None = None,
    check_size_min: float | None = None,
    check_size_max: float | None = None,
    selected_stages: list[int] | None = None,
    api_key: str | None = None,
    provider: str = "anthropic",
    effort: str = "medium",
):
    """
    Create and launch the pipeline as an asyncio.Task.
    Returns immediately. The task runs in the background.
    """
    stages_to_run = _get_stages_to_run(selected_stages)

    async def _run():
        state = PipelineState(
            job_id=job_id,
            company_input=company_input,
            investment_stage=investment_stage,
            check_size_min=check_size_min,
            check_size_max=check_size_max,
            status="running",
        )

        logger.info(
            f"[{job_id[:8]}] Pipeline started for: {company_input} "
            f"(stages: {stages_to_run})"
        )

        await update_analysis(job_id, {
            "status": "running",
            "current_stage": 0,
            "investment_stage": investment_stage,
            "check_size_min": check_size_min,
            "check_size_max": check_size_max,
            "selected_stages": stages_to_run,
            "llm_provider": provider,
            "llm_effort": effort,
        })

        try:
            await _execute_stages(
                job_id, state, stages_to_run, start_from=1,
                api_key=api_key, provider=provider, effort=effort,
            )
        finally:
            unregister_job(job_id)

    task = asyncio.create_task(_run())
    register_job(job_id, task)


async def resume_pipeline(
    job_id: str,
    api_key: str | None = None,
    provider: str | None = None,
    effort: str | None = None,
):
    """
    Resume a paused or failed pipeline from the last completed stage.
    Provider and effort default to what the run started with.
    """
    analysis = await get_analysis(job_id)
    state = _reconstruct_state(analysis)
    provider = provider or analysis.get("llm_provider") or "anthropic"
    effort = effort or analysis.get("llm_effort") or "medium"

    last_completed = get_last_completed_stage(analysis)
    start_from = last_completed + 1
    stages_to_run = analysis.get("selected_stages") or ALL_STAGES

    logger.info(
        f"[{job_id[:8]}] Pipeline resuming from stage {start_from} "
        f"(last completed: {last_completed}, stages: {stages_to_run})"
    )

    # Filter out stages already done
    remaining = [s for s in stages_to_run if s >= start_from]
    if not remaining:
        await update_analysis(job_id, {
            "status": "completed",
            "current_stage": max(stages_to_run),
            "stage_name": "Complete",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
        return

    await update_analysis(job_id, {"status": "running", "paused_at": None})

    async def _run():
        try:
            await _execute_stages(
                job_id, state, stages_to_run, start_from=start_from,
                api_key=api_key, provider=provider, effort=effort,
            )
        finally:
            unregister_job(job_id)

    task = asyncio.create_task(_run())
    register_job(job_id, task)


async def complete_remaining_pipeline(
    job_id: str,
    new_stages: list[int],
    api_key: str | None = None,
    provider: str | None = None,
    effort: str | None = None,
):
    """
    Run only the stages that haven't been completed yet.
    Reuses existing outputs from previously completed stages.
    """
    analysis = await get_analysis(job_id)
    state = _reconstruct_state(analysis)
    provider = provider or analysis.get("llm_provider") or "anthropic"
    effort = effort or analysis.get("llm_effort") or "medium"

    already_done = get_completed_stages(analysis)
    stages_to_run = sorted(set(new_stages) - already_done)

    if not stages_to_run:
        await update_analysis(job_id, {
            "status": "completed",
            "stage_name": "Complete",
            "selected_stages": new_stages,
        })
        return

    logger.info(
        f"[{job_id[:8]}] Complete-remaining: already done={sorted(already_done)}, "
        f"will run={stages_to_run}"
    )

    await update_analysis(job_id, {
        "status": "running",
        "selected_stages": sorted(set(new_stages)),
        "paused_at": None,
    })

    async def _run():
        try:
            # Pass only the delta stages so already-completed ones are not re-run
            await _execute_stages(
                job_id, state, stages_to_run, start_from=min(stages_to_run),
                api_key=api_key, provider=provider, effort=effort,
            )
        finally:
            unregister_job(job_id)

    task = asyncio.create_task(_run())
    register_job(job_id, task)


async def _execute_stages(
    job_id, state, stages_to_run, start_from=1,
    api_key=None, provider="anthropic", effort="medium",
):
    """
    Shared execution loop. Runs selected stages from start_from onward.
    Catches asyncio.CancelledError for immediate mid-stage cancellation.

    api_key: the key the run is billed to. It is intentionally passed as a
    parameter (never stored on PipelineState) so it is not serialised into
    the DB. provider + effort resolve each agent tier to a concrete model.
    """
    total_selected = len(stages_to_run)
    models = resolve_models(provider, effort)

    for stage_num, (stage_name, AgentClass) in enumerate(PIPELINE, start=1):
        if stage_num < start_from:
            continue
        if stage_num not in stages_to_run:
            continue

        state.current_stage = stage_num
        state.stage_name = stage_name

        # Calculate progress based on selected stages only
        done_count = len([s for s in stages_to_run if s < stage_num])
        progress = round((done_count / total_selected) * 100, 1)

        logger.info(f"[{job_id[:8]}] Stage {stage_num}/8 — {stage_name}")

        await update_analysis(job_id, {
            "status": "running",
            "current_stage": stage_num,
            "stage_name": stage_name,
        })

        try:
            agent = AgentClass(
                api_key=api_key,
                provider=provider,
                model=getattr(models, AgentClass.tier),
            )
            state = await agent.run(state)

        except asyncio.CancelledError:
            # ── IMMEDIATE CANCELLATION ──
            # Task.cancel() was called — the Claude API call was interrupted.
            # Mark as paused. The user saves money by not completing this stage.
            logger.info(f"[{job_id[:8]}] CANCELLED during stage {stage_num} ({stage_name})")
            try:
                await update_analysis(job_id, {
                    "status": "paused",
                    "paused_at": datetime.now(timezone.utc).isoformat(),
                    "current_stage": stage_num,
                    "stage_name": stage_name,
                })
            except Exception:
                logger.exception(f"[{job_id[:8]}] Failed to save paused state to DB")
            return  # Do NOT re-raise — we handled it

        except Exception as e:
            error_msg = f"Stage {stage_num} ({stage_name}) failed: {e}"
            logger.exception(f"[{job_id[:8]}] {error_msg}")

            await update_analysis(job_id, {
                "status": "failed",
                "current_stage": stage_num,
                "error": error_msg,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
            return

        # Persist stage output incrementally
        await _save_stage_output(job_id, stage_num, stage_name, state)
        logger.info(
            f"[{job_id[:8]}] Stage {stage_num} complete — "
            f"{state.tokens_used.get(AgentClass.name, 0):,} tokens"
        )

    # ── All selected stages complete ─────────────────────────────────────────
    state.status = "completed"
    state.completed_at = datetime.now(timezone.utc).isoformat()

    await update_analysis(job_id, {
        "status": "completed",
        "current_stage": max(stages_to_run),
        "stage_name": "Complete",
        "completed_at": state.completed_at,
        "recommendation": state.recommendation,
        "risk_score": state.risk_score,
        "total_tokens": state.total_tokens,
        "tokens_used": state.tokens_used,
        "company_info": state.company_info,
        "market_analysis": state.market_analysis,
        "financial_model_text": state.financial_model_text,
        "financial_projections": state.financial_projections,
        "risk_assessment": state.risk_assessment,
        "comparable_deals": state.comparable_deals,
        "investor_memo": state.investor_memo,
        "html_report_path": state.html_report_path,
        "chart_path": state.chart_path,
        "infographic_path": state.infographic_path,
    })

    logger.info(
        f"[{job_id[:8]}] Pipeline COMPLETE — "
        f"recommendation: {state.recommendation}, "
        f"risk: {state.risk_score}/10, "
        f"total tokens: {state.total_tokens:,}"
    )


def _reconstruct_state(analysis: dict) -> PipelineState:
    """Rebuild PipelineState from a database record for resume."""
    return PipelineState(
        job_id=analysis["job_id"],
        company_input=analysis["company_input"],
        investment_stage=analysis.get("investment_stage"),
        check_size_min=analysis.get("check_size_min"),
        check_size_max=analysis.get("check_size_max"),
        status="running",
        current_stage=analysis.get("current_stage", 0),
        stage_name=analysis.get("stage_name", "Resuming"),
        company_info=analysis.get("company_info"),
        market_analysis=analysis.get("market_analysis"),
        financial_model_text=analysis.get("financial_model_text"),
        financial_projections=analysis.get("financial_projections"),
        risk_assessment=analysis.get("risk_assessment"),
        comparable_deals=analysis.get("comparable_deals"),
        investor_memo=analysis.get("investor_memo"),
        html_report_path=analysis.get("html_report_path"),
        chart_path=analysis.get("chart_path"),
        infographic_path=analysis.get("infographic_path"),
        recommendation=analysis.get("recommendation"),
        risk_score=analysis.get("risk_score"),
        tokens_used=analysis.get("tokens_used") or {},
        total_tokens=analysis.get("total_tokens") or 0,
        created_at=analysis.get("created_at", ""),
    )


async def _save_stage_output(
    job_id: str, stage_num: int, stage_name: str, state: PipelineState
):
    """Persist the output of the most recently completed stage."""
    output_map = {
        1: {"company_info": state.company_info},
        2: {"market_analysis": state.market_analysis},
        3: {
            "financial_model_text": state.financial_model_text,
            "financial_projections": state.financial_projections,
            "chart_path": state.chart_path,
        },
        4: {"risk_assessment": state.risk_assessment},
        5: {"comparable_deals": state.comparable_deals},
        6: {
            "investor_memo": state.investor_memo,
            "recommendation": state.recommendation,
            "risk_score": state.risk_score,
        },
        7: {"html_report_path": state.html_report_path},
        8: {"infographic_path": state.infographic_path},
    }

    updates = output_map.get(stage_num, {})
    updates["tokens_used"] = state.tokens_used
    updates["total_tokens"] = state.total_tokens
    await update_analysis(job_id, updates)
