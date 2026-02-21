"""
Process-global cancellation registry for pipeline jobs.

Uses asyncio.Task.cancel() for IMMEDIATE mid-stage cancellation.
The previous approach (asyncio.Event checked between stages) could not
interrupt a running Claude API call, so the user had to wait 30–120 seconds.
Now, task.cancel() raises CancelledError inside the awaiting coroutine,
killing the API call instantly and saving token cost.
"""

import asyncio
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

_tasks: Dict[str, asyncio.Task] = {}


def register_job(job_id: str, task: asyncio.Task):
    """Store the asyncio.Task reference for a running pipeline."""
    _tasks[job_id] = task


def request_cancel(job_id: str) -> bool:
    """Cancel a running pipeline task immediately.

    Returns True if a running task was found and cancel was requested.
    """
    task = _tasks.get(job_id)
    if task and not task.done():
        task.cancel()
        logger.info(f"[{job_id[:8]}] Task.cancel() sent — pipeline will halt immediately")
        return True
    return False


def is_running(job_id: str) -> bool:
    """Check whether the pipeline task is still running."""
    task = _tasks.get(job_id)
    return task is not None and not task.done()


def unregister_job(job_id: str):
    """Remove the task reference (cleanup after job finishes or pauses)."""
    _tasks.pop(job_id, None)
