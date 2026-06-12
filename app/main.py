"""FastAPI application — entry point for the API server."""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from app.config import settings
from storage.database import init_db, recover_orphaned_jobs, ensure_admin_user

FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — the database may live on a mounted persistent disk
    # (e.g. /var/data on Render); create its directory if needed.
    db_dir = os.path.dirname(os.path.abspath(settings.database_path))
    os.makedirs(db_dir, exist_ok=True)
    await init_db()
    await ensure_admin_user()
    await recover_orphaned_jobs()
    os.makedirs(settings.outputs_dir, exist_ok=True)
    print(f"  Database initialised")
    print(f"  Outputs directory: {settings.outputs_dir}")
    if FRONTEND_DIR.exists():
        print(f"  Frontend: serving from {FRONTEND_DIR}")
    else:
        print(f"  Frontend: not built (run 'cd frontend && npm run build')")
    print(f"  Server ready — visit http://localhost:{settings.port}")
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(
    title="AI VC Due Diligence API",
    description=(
        "8-stage AI-powered due diligence pipeline for startup investment analysis. "
        "Built with Claude API sequential orchestration + Tavily web search."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes (must be before the SPA catch-all)
from app.routes import router          # noqa: E402
from app.routes_auth import router as auth_router  # noqa: E402
from app.routes_admin import router as admin_router  # noqa: E402
app.include_router(router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


# ── Unified frontend serving ──────────────────────────────────────────────────
# Serve the Vite-built React app under the same origin.
# In development, use `npm run dev` (Vite proxy handles /api).
# In production, `npm run build` then `python run.py` serves everything.

if FRONTEND_DIR.exists():
    # Serve static assets (JS, CSS, images, fonts)
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback: serve index.html for all non-API routes."""
        # Try to serve the exact file first (favicon.ico, etc.)
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Otherwise serve index.html for client-side routing
        return FileResponse(str(FRONTEND_DIR / "index.html"))
else:
    # No frontend build — show API info at root
    @app.get("/")
    async def root():
        return {
            "name": "AI VC Due Diligence API v2",
            "docs": "/docs",
            "health": "/api/v1/health",
            "analyze": "POST /api/v1/analyze",
            "note": "Build the frontend with 'cd frontend && npm run build' for the full UI.",
        }
