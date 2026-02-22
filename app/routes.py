"""API route handlers."""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.schemas import AnalyzeRequest, CompleteRemainingRequest, JobResponse, StatusResponse
from app.auth import get_current_user
from storage.database import (
    create_analysis, get_analysis, list_analyses, list_analyses_by_user,
    update_analysis, get_user_by_id, deduct_credits, credit_cost, delete_analysis,
    get_completed_stages,
)
from pipeline.orchestrator import start_pipeline, resume_pipeline, complete_remaining_pipeline, get_last_completed_stage
from pipeline.cancel import request_cancel, is_running

router = APIRouter()

STAGE_NAMES = {
    0: "Initialising",
    1: "Execute Company Research",
    2: "Perform Market Analysis",
    3: "Build Financial Model",
    4: "Conduct Risk Assessment",
    5: "Research Comparable Deals",
    6: "Generate Investor Memo",
    7: "Render Investor Report",
    8: "Create Visual Summary",
}


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/analyze", response_model=JobResponse, summary="Start a new due diligence analysis")
async def start_analysis(
    request: AnalyzeRequest,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Submit a company for due diligence analysis. Deducts credits if authenticated."""
    cost = credit_cost(request.selected_stages)

    if current_user:
        user = await get_user_by_id(current_user["id"])
        if user and user["role"] != "admin" and user["credits"] < cost:
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient credits. Need {cost}, have {user['credits']}.",
            )

    job_id = str(uuid.uuid4())
    await create_analysis(job_id, request.company, user_id=current_user["id"] if current_user else None)

    if current_user:
        user = await get_user_by_id(current_user["id"])
        if user and user["role"] != "admin":
            await deduct_credits(current_user["id"], cost)

    await start_pipeline(
        job_id,
        request.company,
        check_size_min=request.check_size_min,
        check_size_max=request.check_size_max,
        selected_stages=request.selected_stages,
    )

    return JobResponse(
        job_id=job_id,
        status="started",
        message=f"Analysis started for '{request.company}'. {cost} credit(s) deducted." if current_user else f"Analysis started for '{request.company}'.",
    )


@router.post("/stop/{job_id}", response_model=JobResponse, summary="Pause a running analysis and preserve progress")
async def pause_analysis(job_id: str):
    """
    Immediately cancel a running pipeline.

    The current Claude API call is interrupted. Progress up to the last
    fully completed stage is preserved. The job moves to 'paused' status
    and can be resumed later.
    """
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    status = analysis["status"]

    if status == "paused":
        return JobResponse(job_id=job_id, status="paused", message="Already paused.")

    if status in ("completed", "failed"):
        raise HTTPException(status_code=409, detail=f"Job is already {status}.")

    if status != "running":
        raise HTTPException(status_code=409, detail=f"Job status is '{status}'.")

    cancelled = request_cancel(job_id)

    if cancelled:
        # Task.cancel() was sent. The CancelledError handler in the orchestrator
        # will write "paused" to the DB. But we also write it here as a safety net
        # in case the handler doesn't run (e.g., task was between awaits).
        # The orchestrator's handler will overwrite this if it runs.
        await update_analysis(job_id, {
            "status": "paused",
            "paused_at": datetime.now(timezone.utc).isoformat(),
        })
        return JobResponse(
            job_id=job_id,
            status="paused",
            message="Analysis stopped. Progress has been saved.",
        )
    else:
        # Task not in registry — might have already finished
        analysis = await get_analysis(job_id)
        if analysis["status"] == "running":
            # Orphaned — force pause
            await update_analysis(job_id, {
                "status": "paused",
                "paused_at": datetime.now(timezone.utc).isoformat(),
            })
        return JobResponse(
            job_id=job_id,
            status=analysis.get("status", "paused"),
            message="Job stopped.",
        )


@router.post("/resume/{job_id}", response_model=JobResponse, summary="Resume a paused or failed analysis from the last completed stage")
async def resume_analysis(job_id: str):
    """
    Resume a paused or failed pipeline from the last completed stage.
    Completed stages are not re-run. Token usage is preserved.
    """
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    status = analysis["status"]

    if status == "running" or is_running(job_id):
        raise HTTPException(status_code=409, detail="Job is already running.")

    if status == "completed":
        raise HTTPException(status_code=409, detail="Job is already completed.")

    if status not in ("paused", "failed"):
        raise HTTPException(status_code=409, detail=f"Cannot resume job with status '{status}'.")

    # Mark running before launching task (prevents duplicate resume)
    await update_analysis(job_id, {"status": "running", "paused_at": None})

    await resume_pipeline(job_id)

    return JobResponse(
        job_id=job_id,
        status="resuming",
        message="Pipeline resuming from the last completed stage.",
    )


@router.post("/complete/{job_id}", response_model=JobResponse, summary="Run remaining pipeline stages on a partial analysis")
async def complete_remaining_stages(
    job_id: str,
    request: CompleteRemainingRequest,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Run only the missing stages of a previously completed partial analysis."""
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    status = analysis["status"]
    if status not in ("completed", "paused"):
        raise HTTPException(status_code=409, detail=f"Cannot complete remaining for job with status '{status}'.")

    if is_running(job_id):
        raise HTTPException(status_code=409, detail="Job is already running.")

    # Determine new full stage set
    new_stages = sorted(set(request.selected_stages)) if request.selected_stages else list(range(1, 9))
    # Always include stage 1
    if 1 not in new_stages:
        new_stages = sorted(set(new_stages) | {1})

    # Figure out what's already done
    already_done = get_completed_stages(analysis)
    delta_stages = set(new_stages) - already_done
    if not delta_stages:
        raise HTTPException(status_code=409, detail="All requested stages are already complete.")

    # Calculate delta credit cost
    original_stages = analysis.get("selected_stages")
    original_cost = credit_cost(original_stages)
    new_cost = credit_cost(new_stages)
    delta_cost = max(0, new_cost - original_cost)

    # Check and deduct credits
    if delta_cost > 0 and current_user:
        user = await get_user_by_id(current_user["id"])
        if user and user["role"] != "admin":
            if user["credits"] < delta_cost:
                raise HTTPException(
                    status_code=402,
                    detail=f"Insufficient credits. Need {delta_cost} more, have {user['credits']}.",
                )
            await deduct_credits(current_user["id"], delta_cost)

    await complete_remaining_pipeline(job_id, new_stages)

    return JobResponse(
        job_id=job_id,
        status="running",
        message=f"Completing {len(delta_stages)} remaining stage(s). {delta_cost} additional credit(s) deducted.",
    )


@router.get("/status/{job_id}", response_model=StatusResponse, summary="Get analysis pipeline status and stage progress")
async def get_analysis_status(job_id: str, current_user: Optional[dict] = Depends(get_current_user)):
    """Returns which stage is currently running and overall progress percentage."""
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    # Ownership check: non-admin users can only see their own jobs
    if (
        current_user
        and current_user.get("role") != "admin"
        and analysis.get("user_id")
        and analysis["user_id"] != current_user["id"]
    ):
        raise HTTPException(status_code=403, detail="Not authorised to view this analysis.")

    stage = analysis.get("current_stage", 0)
    status = analysis["status"]
    selected = analysis.get("selected_stages")
    total = len(selected) if selected else 8

    if status == "completed":
        progress = 100.0
    elif status == "paused":
        last_done = get_last_completed_stage(analysis)
        if selected:
            done_count = len([s for s in selected if s <= last_done])
            progress = round((done_count / total) * 100, 1)
        else:
            progress = round((last_done / 8) * 100, 1)
    else:
        if selected:
            done_count = len([s for s in selected if s < stage])
            progress = round((done_count / total) * 100, 1)
        else:
            progress = round((stage / 8) * 100, 1)

    return StatusResponse(
        job_id=job_id,
        status=status,
        current_stage=stage,
        stage_name=STAGE_NAMES.get(stage, "Unknown"),
        total_stages=total,
        progress_pct=progress,
        error=analysis.get("error"),
        resumable=status in ("paused", "failed"),
        paused_at=analysis.get("paused_at"),
        selected_stages=selected,
        created_at=analysis.get("created_at"),
    )


@router.get("/results/{job_id}", summary="Get full analysis results — all stage outputs as JSON")
async def get_analysis_results(job_id: str, current_user: Optional[dict] = Depends(get_current_user)):
    """Returns the full analysis state including all stage outputs."""
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    # Ownership check
    if (
        current_user
        and current_user.get("role") != "admin"
        and analysis.get("user_id")
        and analysis["user_id"] != current_user["id"]
    ):
        raise HTTPException(status_code=403, detail="Not authorised to view this analysis.")

    # Return full partial results even during running state (for progressive loading)
    return analysis


@router.get("/results/{job_id}/report", summary="Download the investor report (HTML)")
async def download_investor_report(job_id: str):
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    path = analysis.get("html_report_path")
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="HTML report not yet generated.")
    return FileResponse(path, media_type="text/html", filename=f"due_diligence_{job_id[:8]}.html")


@router.get("/results/{job_id}/chart", summary="Download revenue projection chart (PNG) — internal use only")
async def download_revenue_chart(job_id: str):
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    path = analysis.get("chart_path")
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Revenue chart not yet generated.")
    return FileResponse(path, media_type="image/png", filename=f"revenue_chart_{job_id[:8]}.png")


@router.get("/results/{job_id}/one-pager", summary="Download the visual one-pager executive summary (HTML)")
async def download_one_pager(job_id: str):
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    path = analysis.get("infographic_path")
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Visual one-pager not yet generated.")
    media_type = "text/html" if path.endswith(".html") else "image/png"
    ext = "html" if path.endswith(".html") else "png"
    return FileResponse(path, media_type=media_type, filename=f"one_pager_{job_id[:8]}.{ext}")


@router.delete("/analyses/{job_id}", status_code=204, summary="Delete an analysis")
async def delete_job(
    job_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Delete an analysis. Owner or any authenticated user (admin checked server-side)."""
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    # Only owner or admin may delete
    if current_user:
        if analysis.get("user_id") and analysis["user_id"] != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorised to delete this analysis.")
    await delete_analysis(job_id)


@router.get("/history", summary="List past analyses for the authenticated user")
async def list_analysis_history(current_user: Optional[dict] = Depends(get_current_user)):
    if current_user and current_user.get("role") == "admin":
        return await list_analyses()
    elif current_user:
        return await list_analyses_by_user(current_user["id"])
    else:
        return []
