"""API route handlers."""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.schemas import AnalyzeRequest, JobResponse, StatusResponse
from app.auth import get_current_user
from storage.database import (
    create_analysis, get_analysis, list_analyses, list_analyses_by_user,
    update_analysis, get_user_by_id, deduct_credits, credit_cost, delete_analysis,
)
from pipeline.orchestrator import start_pipeline, resume_pipeline, get_last_completed_stage
from pipeline.cancel import request_cancel, is_running

router = APIRouter()

STAGE_NAMES = {
    0: "Initialising",
    1: "Company Research",
    2: "Market Analysis",
    3: "Financial Modeling",
    4: "Risk Assessment",
    5: "Comparable Deals",
    6: "Investor Memo",
    7: "HTML Report",
    8: "Infographic",
}


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/analyze", response_model=JobResponse, summary="Start a new analysis")
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


@router.post("/stop/{job_id}", response_model=JobResponse, summary="Stop a running analysis immediately")
async def stop_job(job_id: str):
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


@router.post("/resume/{job_id}", response_model=JobResponse, summary="Resume a paused or failed analysis")
async def resume_job(job_id: str):
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


@router.get("/status/{job_id}", response_model=StatusResponse, summary="Check pipeline progress")
async def get_status(job_id: str, current_user: Optional[dict] = Depends(get_current_user)):
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


@router.get("/results/{job_id}", summary="Get full analysis results as JSON")
async def get_results(job_id: str, current_user: Optional[dict] = Depends(get_current_user)):
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


@router.get("/results/{job_id}/report", summary="Download HTML investment report")
async def download_report(job_id: str):
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    path = analysis.get("html_report_path")
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="HTML report not yet generated.")
    return FileResponse(path, media_type="text/html", filename=f"due_diligence_{job_id[:8]}.html")


@router.get("/results/{job_id}/chart", summary="Download revenue projection chart (PNG)")
async def download_chart(job_id: str):
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    path = analysis.get("chart_path")
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Revenue chart not yet generated.")
    return FileResponse(path, media_type="image/png", filename=f"revenue_chart_{job_id[:8]}.png")


@router.get("/results/{job_id}/infographic", summary="Download infographic summary (HTML)")
async def download_infographic(job_id: str):
    analysis = await get_analysis(job_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    path = analysis.get("infographic_path")
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Infographic not yet generated.")
    # Infographics are now HTML (not PNG)
    media_type = "text/html" if path.endswith(".html") else "image/png"
    ext = "html" if path.endswith(".html") else "png"
    return FileResponse(path, media_type=media_type, filename=f"infographic_{job_id[:8]}.{ext}")


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


@router.get("/history", summary="List past analyses")
async def get_history(current_user: Optional[dict] = Depends(get_current_user)):
    if current_user and current_user.get("role") == "admin":
        return await list_analyses()
    elif current_user:
        return await list_analyses_by_user(current_user["id"])
    else:
        return []
