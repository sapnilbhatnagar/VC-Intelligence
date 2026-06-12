"""Provider-agnostic onboarding: every account registers with a provider and
an API key (or the admin passphrase), and runs are billed accordingly."""

import uuid

from tests.conftest import API, auth_header

VALID_KEYS = {
    "anthropic": "sk-ant-test-key-abcdefgh1234",
    "openai": "sk-proj-test-key-abcdefgh1234",
    "deepseek": "sk-test-key-abcdefgh1234567",
    "glm": "a1b2c3d4e5f6g7h8.i9j0k1l2",
}


def _register(client, provider="anthropic", api_key=None, effort="medium", **extra):
    email = f"user_{uuid.uuid4().hex[:10]}@test.local"
    payload = {
        "email": email,
        "password": "password123",
        "llm_provider": provider,
        "llm_effort": effort,
        "api_key": api_key if api_key is not None else VALID_KEYS[provider],
        **extra,
    }
    return client.post(f"{API}/auth/register", json=payload)


def test_register_requires_an_api_key_and_provider(client):
    email = f"user_{uuid.uuid4().hex[:10]}@test.local"
    r = client.post(f"{API}/auth/register", json={"email": email, "password": "password123"})
    assert r.status_code == 422  # api_key and llm_provider are mandatory


def test_register_stores_provider_key_and_effort(client):
    r = _register(client, provider="openai", effort="high")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["llm_provider"] == "openai"
    assert body["llm_effort"] == "high"
    assert body["has_api_key"] is True
    assert body["api_key_last4"] == VALID_KEYS["openai"][-4:]
    assert body["uses_platform_key"] is False

    me = client.get(f"{API}/auth/me", headers=auth_header(body["access_token"])).json()
    assert me["llm_provider"] == "openai"
    assert me["llm_effort"] == "high"


def test_every_provider_can_register(client):
    for provider in VALID_KEYS:
        r = _register(client, provider=provider)
        assert r.status_code == 200, f"{provider}: {r.text}"
        assert r.json()["llm_provider"] == provider


def test_register_rejects_key_that_does_not_match_provider(client):
    # An Anthropic key pasted under the OpenAI provider is a paste mistake.
    r = _register(client, provider="openai", api_key=VALID_KEYS["anthropic"])
    assert r.status_code == 400


def test_register_rejects_invalid_effort(client):
    r = _register(client, effort="ultra")
    assert r.status_code == 422


def test_admin_phrase_routes_to_platform_key(client):
    r = _register(client, provider="anthropic", api_key="admin, admin, admin")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["uses_platform_key"] is True
    assert body["has_api_key"] is True
    assert body["api_key_last4"] is None


def test_own_key_analysis_is_unlimited(client):
    r = _register(client, provider="deepseek")
    token = r.json()["access_token"]

    start = client.post(
        f"{API}/analyze",
        json={"company": "Northbeam Robotics", "selected_stages": None},
        headers=auth_header(token),
    )
    assert start.status_code == 200, start.text

    me = client.get(f"{API}/auth/me", headers=auth_header(token))
    assert me.json()["credits"] == 5  # signup credits untouched


def test_admin_phrase_analysis_consumes_credits(client):
    r = _register(client, provider="anthropic", api_key="admin admin admin")
    token = r.json()["access_token"]

    start = client.post(
        f"{API}/analyze",
        json={"company": "Northbeam Robotics", "selected_stages": None},
        headers=auth_header(token),
    )
    assert start.status_code == 200, start.text

    me = client.get(f"{API}/auth/me", headers=auth_header(token))
    assert me.json()["credits"] == 0  # full run costs the 5 signup credits


def test_admin_phrase_fails_when_platform_has_no_key_for_provider(client):
    # The hermetic test env has no OpenAI platform key configured.
    r = _register(client, provider="openai", api_key="admin admin admin")
    token = r.json()["access_token"]

    start = client.post(
        f"{API}/analyze",
        json={"company": "Northbeam Robotics", "selected_stages": None},
        headers=auth_header(token),
    )
    assert start.status_code == 400
    assert "no" in start.json()["detail"].lower()
