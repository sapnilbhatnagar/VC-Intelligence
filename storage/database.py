"""SQLite database — persists analysis state, results, and user accounts."""

import json
import logging
import aiosqlite
from datetime import datetime, timezone
from app.config import settings

DATABASE_PATH = settings.database_path
logger = logging.getLogger(__name__)

# Credit cost per research mode
CREDIT_COST_FULL = 5
CREDIT_COST_QUICK = 1


def credit_cost(selected_stages: list[int] | None) -> int:
    """Calculate credit cost based on selected stages."""
    if selected_stages is None:
        return CREDIT_COST_FULL
    if len(selected_stages) <= 3:
        return CREDIT_COST_QUICK
    return max(2, len(selected_stages) - 2)


# Stage number -> output keys that prove the stage completed (mirrors orchestrator.py)
_STAGE_OUTPUT_KEYS = {
    1: ["company_info"],
    2: ["market_analysis"],
    3: ["financial_model_text"],
    4: ["risk_assessment"],
    5: ["comparable_deals"],
    6: ["investor_memo"],
    7: ["html_report_path"],
    8: ["infographic_path"],
}


def get_completed_stages(analysis: dict) -> set[int]:
    """Return set of stage numbers that have outputs in the DB."""
    completed = set()
    for stage_num, keys in _STAGE_OUTPUT_KEYS.items():
        if all(analysis.get(k) is not None for k in keys):
            completed.add(stage_num)
    return completed


# ============================================================
# Schema init
# ============================================================

async def init_db():
    """Create all tables if they don't exist and run migrations."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Users table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            TEXT PRIMARY KEY,
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role          TEXT NOT NULL DEFAULT 'user',
                credits       INTEGER NOT NULL DEFAULT 5,
                created_at    TEXT NOT NULL
            )
        """)

        # Analyses table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                job_id          TEXT PRIMARY KEY,
                company_input   TEXT NOT NULL,
                status          TEXT NOT NULL DEFAULT 'pending',
                current_stage   INTEGER DEFAULT 0,
                stage_name      TEXT DEFAULT 'Initialising',
                state_json      TEXT DEFAULT '{}',
                created_at      TEXT,
                completed_at    TEXT,
                paused_at       TEXT,
                user_id         TEXT REFERENCES users(id)
            )
        """)

        # Migrations for existing databases
        for col, typedef in [
            ("paused_at", "TEXT"),
            ("user_id", "TEXT"),
        ]:
            try:
                await db.execute(f"ALTER TABLE analyses ADD COLUMN {col} {typedef}")
            except Exception:
                pass  # Column already exists

        # Add username column to users table if missing
        try:
            await db.execute("ALTER TABLE users ADD COLUMN username TEXT")
        except Exception:
            pass  # Column already exists

        # Add name column to users table if missing
        try:
            await db.execute("ALTER TABLE users ADD COLUMN name TEXT")
        except Exception:
            pass  # Column already exists

        # Add last_login_at to users
        try:
            await db.execute("ALTER TABLE users ADD COLUMN last_login_at TEXT")
        except Exception:
            pass

        # Credit transactions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS credit_transactions (
                id          TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL,
                amount      INTEGER NOT NULL,
                type        TEXT NOT NULL,
                description TEXT,
                created_at  TEXT NOT NULL
            )
        """)

        await db.commit()


# ============================================================
# Startup helpers
# ============================================================

async def ensure_admin_user():
    """Create the default admin account if it doesn't exist."""
    from app.auth import hash_password
    import uuid

    admin_email = settings.admin_email
    existing = await get_user_by_email(admin_email)
    if not existing:
        await create_user(
            user_id=str(uuid.uuid4()),
            email=admin_email,
            password_hash=hash_password(settings.admin_password),
            role="admin",
            credits=999999,
        )
        logger.info(f"Admin account created: {admin_email}")


async def recover_orphaned_jobs():
    """Mark any 'running' jobs as failed after server restart."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute(
            "SELECT job_id FROM analyses WHERE status = 'running'"
        )
        rows = await cursor.fetchall()
        if rows:
            for (job_id,) in rows:
                logger.warning(f"Recovering orphaned job: {job_id}")
            await db.execute(
                "UPDATE analyses SET status = 'failed' WHERE status = 'running'"
            )
            for (job_id,) in rows:
                cursor2 = await db.execute(
                    "SELECT state_json FROM analyses WHERE job_id = ?", (job_id,)
                )
                row = await cursor2.fetchone()
                current = json.loads(row[0] if row and row[0] else "{}")
                current["error"] = "Server restarted during execution. You can resume this analysis."
                await db.execute(
                    "UPDATE analyses SET state_json = ? WHERE job_id = ?",
                    (json.dumps(current, default=str), job_id),
                )
            await db.commit()
            logger.info(f"Recovered {len(rows)} orphaned job(s)")


# ============================================================
# User CRUD
# ============================================================

async def create_user(
    user_id: str,
    email: str,
    password_hash: str,
    role: str = "user",
    credits: int = 5,
    username: str | None = None,
    name: str | None = None,
):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """INSERT INTO users (id, email, password_hash, role, credits, created_at, username, name)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, email, password_hash, role, credits, datetime.now(timezone.utc).isoformat(), username, name),
        )
        await db.commit()


async def get_user_by_email(email: str) -> dict | None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_user_by_username(username: str) -> dict | None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_user_by_id(user_id: str) -> dict | None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def update_user_credits(user_id: str, credits: int):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("UPDATE users SET credits = ? WHERE id = ?", (credits, user_id))
        await db.commit()


async def deduct_credits(user_id: str, amount: int):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "UPDATE users SET credits = MAX(0, credits - ?) WHERE id = ?",
            (amount, user_id),
        )
        await db.commit()


async def add_credits(user_id: str, amount: int):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "UPDATE users SET credits = credits + ? WHERE id = ?",
            (amount, user_id),
        )
        await db.commit()


async def update_user(user_id: str, updates: dict):
    """Update arbitrary user fields (email, role, password_hash, username, name)."""
    allowed = {"email", "role", "password_hash", "credits", "username", "name"}
    cols = {k: v for k, v in updates.items() if k in allowed}
    if not cols:
        return
    async with aiosqlite.connect(DATABASE_PATH) as db:
        set_clause = ", ".join(f"{k} = ?" for k in cols)
        await db.execute(
            f"UPDATE users SET {set_clause} WHERE id = ?",
            list(cols.values()) + [user_id],
        )
        await db.commit()


async def list_users() -> list:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT id, email, username, name, role, credits, created_at, last_login_at FROM users ORDER BY created_at DESC"""
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


# ============================================================
# Analysis CRUD
# ============================================================

async def create_analysis(job_id: str, company_input: str, user_id: str | None = None):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """INSERT INTO analyses (job_id, company_input, status, created_at, user_id)
               VALUES (?, ?, 'pending', ?, ?)""",
            (job_id, company_input, datetime.now(timezone.utc).isoformat(), user_id),
        )
        await db.commit()


async def update_analysis(job_id: str, updates: dict):
    """Update column or state_json fields of an analysis."""
    if not updates:
        return

    COLUMN_KEYS = {"status", "current_stage", "stage_name", "completed_at", "paused_at"}
    col_updates = {k: v for k, v in updates.items() if k in COLUMN_KEYS}
    json_updates = {k: v for k, v in updates.items() if k not in COLUMN_KEYS}

    async with aiosqlite.connect(DATABASE_PATH) as db:
        if col_updates:
            set_clause = ", ".join(f"{k} = ?" for k in col_updates)
            values = list(col_updates.values()) + [job_id]
            await db.execute(f"UPDATE analyses SET {set_clause} WHERE job_id = ?", values)

        if json_updates:
            cursor = await db.execute(
                "SELECT state_json FROM analyses WHERE job_id = ?", (job_id,)
            )
            row = await cursor.fetchone()
            current = json.loads(row[0] if row and row[0] else "{}")
            current.update(json_updates)
            await db.execute(
                "UPDATE analyses SET state_json = ? WHERE job_id = ?",
                (json.dumps(current, default=str), job_id),
            )

        await db.commit()


async def get_analysis(job_id: str) -> dict | None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM analyses WHERE job_id = ?", (job_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        result = dict(row)
        state = json.loads(result.pop("state_json", "{}"))
        result.update(state)
        return result


async def list_analyses() -> list:
    """List all analyses ordered by most recent first (max 100)."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT job_id, company_input, status, current_stage,
                      created_at, completed_at, paused_at, state_json, user_id
               FROM analyses ORDER BY created_at DESC LIMIT 100"""
        )
        rows = await cursor.fetchall()
        results = []
        for row in rows:
            r = dict(row)
            state = json.loads(r.pop("state_json", "{}"))
            r["recommendation"] = state.get("recommendation")
            r["risk_score"] = state.get("risk_score")
            r["total_tokens"] = state.get("total_tokens", 0)
            results.append(r)
        return results


async def list_analyses_by_user(user_id: str) -> list:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT job_id, company_input, status, current_stage,
                      created_at, completed_at, paused_at, state_json
               FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 50""",
            (user_id,),
        )
        rows = await cursor.fetchall()
        results = []
        for row in rows:
            r = dict(row)
            state = json.loads(r.pop("state_json", "{}"))
            r["recommendation"] = state.get("recommendation")
            r["risk_score"] = state.get("risk_score")
            results.append(r)
        return results


async def delete_analysis(job_id: str):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("DELETE FROM analyses WHERE job_id = ?", (job_id,))
        await db.commit()


async def get_admin_stats() -> dict:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        total_users = (await (await db.execute("SELECT COUNT(*) FROM users WHERE role='user'")).fetchone())[0]
        total_analyses = (await (await db.execute("SELECT COUNT(*) FROM analyses")).fetchone())[0]
        completed = (await (await db.execute("SELECT COUNT(*) FROM analyses WHERE status='completed'")).fetchone())[0]
        running = (await (await db.execute("SELECT COUNT(*) FROM analyses WHERE status='running'")).fetchone())[0]
        failed = (await (await db.execute("SELECT COUNT(*) FROM analyses WHERE status='failed'")).fetchone())[0]
        paused = (await (await db.execute("SELECT COUNT(*) FROM analyses WHERE status='paused'")).fetchone())[0]
        total_credits = (await (await db.execute("SELECT COALESCE(SUM(credits), 0) FROM users WHERE role='user'")).fetchone())[0]
        low_credits = (await (await db.execute("SELECT COUNT(*) FROM users WHERE role='user' AND credits <= 2")).fetchone())[0]
        today = datetime.now(timezone.utc).date().isoformat()
        analyses_today = (await (await db.execute("SELECT COUNT(*) FROM analyses WHERE created_at LIKE ?", (f"{today}%",))).fetchone())[0]
        new_users_today = (await (await db.execute("SELECT COUNT(*) FROM users WHERE created_at LIKE ? AND role='user'", (f"{today}%",))).fetchone())[0]
        return {
            "total_users": total_users,
            "total_analyses": total_analyses,
            "completed_analyses": completed,
            "running_analyses": running,
            "failed_analyses": failed,
            "paused_analyses": paused,
            "total_credits_in_circulation": total_credits,
            "users_low_credits": low_credits,
            "analyses_today": analyses_today,
            "new_users_today": new_users_today,
        }


async def update_last_login(user_id: str):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "UPDATE users SET last_login_at = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), user_id),
        )
        await db.commit()


async def log_credit_transaction(user_id: str, amount: int, type_: str, description: str = ""):
    import uuid as _uuid
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (_uuid.uuid4().hex, user_id, amount, type_, description, datetime.now(timezone.utc).isoformat()),
        )
        await db.commit()


async def list_credit_transactions(limit: int = 100) -> list:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT ct.id, ct.user_id, ct.amount, ct.type, ct.description, ct.created_at,
                      u.email as user_email
               FROM credit_transactions ct
               LEFT JOIN users u ON ct.user_id = u.id
               ORDER BY ct.created_at DESC LIMIT ?""",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
