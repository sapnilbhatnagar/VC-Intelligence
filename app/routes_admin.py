"""Admin-only routes: user management, credit assignment, stats."""

import uuid
from fastapi import APIRouter, HTTPException, Depends

from app.auth import require_admin, hash_password
from app.schemas import (
    AssignCreditsRequest, AddCreditsRequest, UserResponse,
    AdminCreateUserRequest, AdminUpdateUserRequest,
)
from storage.database import (
    list_users, get_user_by_id, get_user_by_email,
    create_user, update_user, update_user_credits, add_credits,
    list_analyses, get_admin_stats, delete_analysis, list_credit_transactions, log_credit_transaction,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def admin_stats(admin=Depends(require_admin)):
    return await get_admin_stats()


@router.get("/users")
async def get_users(admin=Depends(require_admin)):
    return await list_users()


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_admin_user(req: AdminCreateUserRequest, admin=Depends(require_admin)):
    """Create a new user (with any role including admin) from the admin panel."""
    if await get_user_by_email(req.email):
        raise HTTPException(status_code=409, detail="Email already registered.")
    uid = str(uuid.uuid4())
    await create_user(uid, req.email, hash_password(req.password), role=req.role, credits=req.credits)
    user = await get_user_by_id(uid)
    return UserResponse(**{k: user[k] for k in ("id", "email", "role", "credits", "created_at")})


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, admin=Depends(require_admin)):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserResponse(**{k: user[k] for k in ("id", "email", "role", "credits", "created_at")})


@router.patch("/users/{user_id}")
async def update_user_details(user_id: str, req: AdminUpdateUserRequest, admin=Depends(require_admin)):
    """Update email, role, or credits for a user."""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    changes = req.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No fields to update.")
    await update_user(user_id, changes)
    updated = await get_user_by_id(user_id)
    return UserResponse(**{k: updated[k] for k in ("id", "email", "role", "credits", "created_at")})


@router.put("/users/{user_id}/credits")
async def set_credits(user_id: str, req: AssignCreditsRequest, admin=Depends(require_admin)):
    """Set a user's credit balance to an exact value."""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await update_user_credits(user_id, req.credits)
    await log_credit_transaction(user_id, req.credits, "admin_set", f"Admin set credits to {req.credits}")
    return {"message": f"Credits set to {req.credits} for {user['email']}."}


@router.post("/users/{user_id}/credits/add")
async def grant_credits(user_id: str, req: AddCreditsRequest, admin=Depends(require_admin)):
    """Add credits to a user's balance."""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await add_credits(user_id, req.amount)
    await log_credit_transaction(user_id, req.amount, "admin_grant", f"Admin granted {req.amount} credits")
    updated = await get_user_by_id(user_id)
    return {"message": f"Granted {req.amount} credits to {user['email']}.", "new_balance": updated["credits"]}


@router.delete("/users/{user_id}", status_code=204)
async def delete_user_account(user_id: str, admin=Depends(require_admin)):
    """Remove a user account (does not delete their analyses)."""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    import aiosqlite
    from storage.database import DATABASE_PATH
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        await db.commit()


@router.get("/credit-transactions")
async def get_credit_transactions(admin=Depends(require_admin)):
    return await list_credit_transactions(100)


@router.get("/analyses")
async def all_analyses(admin=Depends(require_admin)):
    return await list_analyses()


@router.delete("/analyses/{job_id}", status_code=204)
async def admin_delete_analysis(job_id: str, admin=Depends(require_admin)):
    await delete_analysis(job_id)
