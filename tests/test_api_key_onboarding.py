"""Own-API-key onboarding: registering with a Claude API key, and the
unlimited (self-billed) analysis path that key enables."""

import uuid

from tests.conftest import API, auth_header


def _register(client, payload_extra: dict | None = None):
    email = f"user_{uuid.uuid4().hex[:10]}@test.local"
    payload = {"email": email, "password": "password123", **(payload_extra or {})}
    return client.post(f"{API}/auth/register", json=payload)


def test_register_without_key_has_no_api_key(client):
    r = _register(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["has_api_key"] is False
    assert body["api_key_last4"] is None


def test_register_with_key_stores_it_encrypted(client):
    key = "sk-ant-test-key-abcdefgh1234"
    r = _register(client, {"api_key": key})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["has_api_key"] is True
    assert body["api_key_last4"] == key[-4:]

    # /auth/me reflects the stored key without ever exposing it.
    me = client.get(f"{API}/auth/me", headers=auth_header(body["access_token"]))
    assert me.status_code == 200
    me_body = me.json()
    assert me_body["has_api_key"] is True
    assert me_body["api_key_last4"] == key[-4:]
    assert key not in me.text  # full key never leaves the server


def test_register_rejects_malformed_key(client):
    r = _register(client, {"api_key": "not-a-real-claude-key-123456"})
    assert r.status_code == 400
    assert "sk-ant-" in r.json()["detail"]


def test_register_ignores_blank_key(client):
    r = _register(client, {"api_key": "   "})
    assert r.status_code == 200, r.text
    assert r.json()["has_api_key"] is False


def test_own_key_analysis_does_not_consume_credits(client):
    key = "sk-ant-test-key-abcdefgh1234"
    r = _register(client, {"api_key": key})
    token = r.json()["access_token"]

    start = client.post(
        f"{API}/analyze",
        json={"company": "Northbeam Robotics", "selected_stages": None},
        headers=auth_header(token),
    )
    assert start.status_code == 200, start.text

    me = client.get(f"{API}/auth/me", headers=auth_header(token))
    assert me.json()["credits"] == 5  # signup credits untouched


def test_credit_user_is_charged_for_analysis(client):
    r = _register(client)
    token = r.json()["access_token"]

    start = client.post(
        f"{API}/analyze",
        json={"company": "Northbeam Robotics", "selected_stages": None},
        headers=auth_header(token),
    )
    assert start.status_code == 200, start.text

    me = client.get(f"{API}/auth/me", headers=auth_header(token))
    assert me.json()["credits"] == 0  # full run costs the 5 signup credits
