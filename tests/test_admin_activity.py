"""Admin visibility of account activity: registrations and sign-ins."""

import uuid

from tests.conftest import API, ADMIN_IDENTIFIER, ADMIN_PASSWORD, auth_header


def _admin_token(client) -> str:
    r = client.post(
        f"{API}/auth/login",
        json={"identifier": ADMIN_IDENTIFIER, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_registration_is_visible_as_a_sign_in(client):
    """Registering counts as the first sign-in, so a brand-new user appears
    in the admin activity views with both timestamps set."""
    email = f"user_{uuid.uuid4().hex[:10]}@test.local"
    r = client.post(f"{API}/auth/register", json={"email": email, "password": "password123", "llm_provider": "anthropic", "api_key": "sk-ant-test-key-abcdefgh1234"})
    assert r.status_code == 200, r.text

    users = client.get(f"{API}/admin/users", headers=auth_header(_admin_token(client))).json()
    me = next(u for u in users if u["email"] == email)
    assert me["created_at"]  # when they registered
    assert me["last_login_at"]  # registration counts as a sign-in


def test_login_updates_last_seen(client):
    email = f"user_{uuid.uuid4().hex[:10]}@test.local"
    client.post(f"{API}/auth/register", json={"email": email, "password": "password123", "llm_provider": "anthropic", "api_key": "sk-ant-test-key-abcdefgh1234"})
    r = client.post(f"{API}/auth/login", json={"identifier": email, "password": "password123"})
    assert r.status_code == 200

    users = client.get(f"{API}/admin/users", headers=auth_header(_admin_token(client))).json()
    me = next(u for u in users if u["email"] == email)
    assert me["last_login_at"] >= me["created_at"]


def test_stats_count_todays_sign_ins(client):
    email = f"user_{uuid.uuid4().hex[:10]}@test.local"
    client.post(f"{API}/auth/register", json={"email": email, "password": "password123", "llm_provider": "anthropic", "api_key": "sk-ant-test-key-abcdefgh1234"})

    stats = client.get(f"{API}/admin/stats", headers=auth_header(_admin_token(client))).json()
    assert stats["logins_today"] >= 1
