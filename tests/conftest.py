"""Shared pytest fixtures and a hermetic test environment.

The environment variables below are forced BEFORE the application is imported so
that `app.config.Settings` (and everything it touches) builds against throwaway
values and a temporary database, never the developer's real keys or DB.
"""

import os
import tempfile
import uuid

# ── Force a hermetic environment before importing the app ─────────────────────
os.environ["ANTHROPIC_API_KEY"] = "test-anthropic-key"
os.environ["TAVILY_API_KEY"] = "test-tavily-key"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-not-for-production"
os.environ["ADMIN_EMAIL"] = "admin@test.local"
os.environ["ADMIN_PASSWORD"] = "admin-test-password"
os.environ["DATABASE_PATH"] = os.path.join(
    tempfile.gettempdir(), f"vc_test_{uuid.uuid4().hex}.db"
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.routes as routes_module  # noqa: E402
from app.main import app  # noqa: E402

API = "/api/v1"
ADMIN_IDENTIFIER = "admin@test.local"
ADMIN_PASSWORD = "admin-test-password"


async def _noop_pipeline(*args, **kwargs):
    """Stand-in for pipeline launches so no test ever calls Claude or Tavily."""
    return None


@pytest.fixture
def client(monkeypatch):
    """A TestClient with the pipeline neutralised and the DB initialised."""
    monkeypatch.setattr(routes_module, "start_pipeline", _noop_pipeline)
    monkeypatch.setattr(routes_module, "resume_pipeline", _noop_pipeline)
    monkeypatch.setattr(routes_module, "complete_remaining_pipeline", _noop_pipeline)
    with TestClient(app) as c:
        yield c


# ── Helpers ───────────────────────────────────────────────────────────────────

def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register(client, password: str = "password123") -> dict:
    """Register a fresh user with a unique email. Returns the token payload."""
    email = f"user_{uuid.uuid4().hex[:10]}@test.local"
    r = client.post(f"{API}/auth/register", json={
        "email": email,
        "password": password,
        "llm_provider": "anthropic",
        "api_key": "sk-ant-test-key-abcdefgh1234",
    })
    assert r.status_code == 200, r.text
    return r.json()


def admin_token(client) -> str:
    r = client.post(
        f"{API}/auth/login",
        json={"identifier": ADMIN_IDENTIFIER, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def create_job(client, token: str, company: str = "Acme Corp") -> str:
    r = client.post(
        f"{API}/analyze", json={"company": company}, headers=auth_header(token)
    )
    assert r.status_code == 200, r.text
    return r.json()["job_id"]


def set_job_state(job_id: str, **fields) -> None:
    """Write fields directly into an analysis row (e.g. a report path)."""
    import asyncio
    from storage.database import update_analysis

    asyncio.run(update_analysis(job_id, fields))
