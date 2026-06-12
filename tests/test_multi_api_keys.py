"""Multiple API keys per account: list, add, activate, delete, and per-run
key selection on /analyze."""

import uuid

from tests.conftest import API, auth_header

ANTHROPIC_KEY = "sk-ant-test-key-abcdefgh1234"
NVIDIA_KEY = "nvapi-test-key-abcdefgh1234"


def _register(client):
    email = f"user_{uuid.uuid4().hex[:10]}@test.local"
    r = client.post(f"{API}/auth/register", json={
        "email": email,
        "password": "password123",
        "llm_provider": "anthropic",
        "api_key": ANTHROPIC_KEY,
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_registration_creates_the_first_active_key(client):
    token = _register(client)["access_token"]
    keys = client.get(f"{API}/auth/me/api-keys", headers=auth_header(token)).json()
    assert len(keys) == 1
    assert keys[0]["llm_provider"] == "anthropic"
    assert keys[0]["api_key_last4"] == ANTHROPIC_KEY[-4:]
    assert keys[0]["is_active"] is True


def test_user_can_hold_keys_for_several_providers(client):
    token = _register(client)["access_token"]
    r = client.post(
        f"{API}/auth/me/api-keys",
        json={"api_key": NVIDIA_KEY, "llm_provider": "nvidia", "label": "NVIDIA free tier"},
        headers=auth_header(token),
    )
    assert r.status_code == 200, r.text

    keys = client.get(f"{API}/auth/me/api-keys", headers=auth_header(token)).json()
    assert len(keys) == 2
    providers = {k["llm_provider"] for k in keys}
    assert providers == {"anthropic", "nvidia"}
    # The first key stays the active default until the user switches.
    active = [k for k in keys if k["is_active"]]
    assert len(active) == 1
    assert active[0]["llm_provider"] == "anthropic"


def test_activating_a_key_switches_the_default_provider(client):
    token = _register(client)["access_token"]
    add = client.post(
        f"{API}/auth/me/api-keys",
        json={"api_key": NVIDIA_KEY, "llm_provider": "nvidia"},
        headers=auth_header(token),
    ).json()

    r = client.put(f"{API}/auth/me/api-keys/{add['id']}/activate", headers=auth_header(token))
    assert r.status_code == 200

    me = client.get(f"{API}/auth/me", headers=auth_header(token)).json()
    assert me["llm_provider"] == "nvidia"
    assert me["api_key_last4"] == NVIDIA_KEY[-4:]


def test_deleting_the_active_key_falls_back_to_another(client):
    token = _register(client)["access_token"]
    client.post(
        f"{API}/auth/me/api-keys",
        json={"api_key": NVIDIA_KEY, "llm_provider": "nvidia"},
        headers=auth_header(token),
    )
    keys = client.get(f"{API}/auth/me/api-keys", headers=auth_header(token)).json()
    active_id = next(k["id"] for k in keys if k["is_active"])

    r = client.delete(f"{API}/auth/me/api-keys/{active_id}", headers=auth_header(token))
    assert r.status_code == 200

    keys = client.get(f"{API}/auth/me/api-keys", headers=auth_header(token)).json()
    assert len(keys) == 1
    assert keys[0]["is_active"] is True
    assert keys[0]["llm_provider"] == "nvidia"


def test_analyze_can_pin_a_specific_key_for_the_run(client):
    token = _register(client)["access_token"]
    # Second key is the platform passphrase: runs on it consume credits,
    # which makes the key selection observable.
    phrase = client.post(
        f"{API}/auth/me/api-keys",
        json={"api_key": "Elephant", "llm_provider": "anthropic"},
        headers=auth_header(token),
    ).json()

    # Run pinned to the own (non-phrase) key: no credits consumed.
    start = client.post(
        f"{API}/analyze",
        json={"company": "Northbeam Robotics", "selected_stages": None},
        headers=auth_header(token),
    )
    assert start.status_code == 200, start.text
    assert client.get(f"{API}/auth/me", headers=auth_header(token)).json()["credits"] == 5

    # Run pinned to the passphrase key: credits consumed.
    start = client.post(
        f"{API}/analyze",
        json={"company": "Northbeam Robotics", "selected_stages": None, "api_key_id": phrase["id"]},
        headers=auth_header(token),
    )
    assert start.status_code == 200, start.text
    assert client.get(f"{API}/auth/me", headers=auth_header(token)).json()["credits"] == 0


def test_analyze_rejects_another_users_key_id(client):
    owner_token = _register(client)["access_token"]
    other_token = _register(client)["access_token"]
    owner_keys = client.get(f"{API}/auth/me/api-keys", headers=auth_header(owner_token)).json()

    r = client.post(
        f"{API}/analyze",
        json={"company": "Northbeam Robotics", "selected_stages": None, "api_key_id": owner_keys[0]["id"]},
        headers=auth_header(other_token),
    )
    assert r.status_code == 403
