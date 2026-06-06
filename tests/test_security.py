"""Security tests: authentication and per-job ownership (IDOR protection).

Each analysis belongs to the user who started it. These tests assert that:
  - anonymous callers cannot read, download, mutate, or delete any job;
  - a logged-in user cannot touch a job owned by someone else;
  - the legitimate owner and an admin still can.

Written before the fix (red), then the routes are hardened to make them pass.
"""

from conftest import API, auth_header, register, admin_token, create_job, set_job_state


# ── Reading analysis state ────────────────────────────────────────────────────

def test_anonymous_cannot_read_results(client):
    owner = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.get(f"{API}/results/{job_id}")  # no Authorization header
    assert r.status_code == 401, "anonymous read of a job's results must be rejected"


def test_other_user_cannot_read_results(client):
    owner = register(client)
    intruder = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.get(f"{API}/results/{job_id}", headers=auth_header(intruder["access_token"]))
    assert r.status_code == 403, "a different user must not read someone else's results"


def test_owner_can_read_own_results(client):
    owner = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.get(f"{API}/results/{job_id}", headers=auth_header(owner["access_token"]))
    assert r.status_code == 200


def test_admin_can_read_any_results(client):
    owner = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.get(f"{API}/results/{job_id}", headers=auth_header(admin_token(client)))
    assert r.status_code == 200


def test_anonymous_cannot_read_status(client):
    owner = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.get(f"{API}/status/{job_id}")
    assert r.status_code == 401


# ── Downloading deliverables (the actual memo/report files) ───────────────────

def test_report_download_requires_ownership(client, tmp_path):
    owner = register(client)
    intruder = register(client)
    job_id = create_job(client, owner["access_token"])

    # Pretend the report has been generated.
    report = tmp_path / "report.html"
    report.write_text("<h1>Confidential investor memo</h1>")
    set_job_state(job_id, html_report_path=str(report))

    assert client.get(f"{API}/results/{job_id}/report").status_code == 401
    assert client.get(
        f"{API}/results/{job_id}/report", headers=auth_header(intruder["access_token"])
    ).status_code == 403
    assert client.get(
        f"{API}/results/{job_id}/report", headers=auth_header(owner["access_token"])
    ).status_code == 200


# ── Deleting analyses ─────────────────────────────────────────────────────────

def test_anonymous_cannot_delete_analysis(client):
    owner = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.delete(f"{API}/analyses/{job_id}")
    assert r.status_code == 401

    # The job must still exist for its owner.
    still_there = client.get(
        f"{API}/results/{job_id}", headers=auth_header(owner["access_token"])
    )
    assert still_there.status_code == 200


def test_other_user_cannot_delete_analysis(client):
    owner = register(client)
    intruder = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.delete(
        f"{API}/analyses/{job_id}", headers=auth_header(intruder["access_token"])
    )
    assert r.status_code == 403


# ── Mutating the pipeline (stop / resume) ─────────────────────────────────────

def test_anonymous_cannot_stop_job(client):
    owner = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.post(f"{API}/stop/{job_id}")
    assert r.status_code == 401


def test_anonymous_cannot_resume_job(client):
    owner = register(client)
    job_id = create_job(client, owner["access_token"])

    r = client.post(f"{API}/resume/{job_id}")
    assert r.status_code == 401


# ── Starting an analysis (compute/credit abuse) ───────────────────────────────

def test_anonymous_cannot_start_analysis(client):
    r = client.post(f"{API}/analyze", json={"company": "Anonymous Abuse Inc"})
    assert r.status_code == 401
