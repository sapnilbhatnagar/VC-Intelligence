"""API request and response schemas."""

from pydantic import BaseModel, Field
from typing import Optional


class AnalyzeRequest(BaseModel):
    company: str = Field(
        ...,
        description="Company name, URL, or both.",
        examples=["Agno AI", "https://agno.com", "Lovable at https://lovable.dev"],
    )
    check_size_min: Optional[float] = Field(
        None,
        description="Minimum check size in USD millions. E.g. 5.0 for $5M",
    )
    check_size_max: Optional[float] = Field(
        None,
        description="Maximum check size in USD millions. E.g. 20.0 for $20M",
    )
    selected_stages: Optional[list[int]] = Field(
        None,
        description=(
            "Which pipeline stages to run (1-8). "
            "null or empty = all stages. "
            "Stage 1 (Company Research) is always included. "
            "Stages 7-8 require stage 6 (Investor Memo)."
        ),
        examples=[[1, 2, 6], [1, 2, 3, 4, 5, 6]],
    )


class CompleteRemainingRequest(BaseModel):
    selected_stages: Optional[list[int]] = Field(
        None,
        description="New full stage set. null = all 8. Delta cost is charged.",
    )


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str


class StatusResponse(BaseModel):
    job_id: str
    status: str  # pending | running | paused | completed | failed
    current_stage: int
    stage_name: str
    total_stages: int = 8
    progress_pct: float
    error: Optional[str] = None
    resumable: bool = False
    paused_at: Optional[str] = None
    selected_stages: Optional[list[int]] = None
    created_at: Optional[str] = None


# ── Auth schemas ──────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    username: Optional[str] = None  # Optional display username
    name: Optional[str] = None      # Optional full name

class UserLoginRequest(BaseModel):
    identifier: str  # Can be email OR username
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    username: Optional[str] = None
    name: Optional[str] = None
    role: str
    credits: int

class UserResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    name: Optional[str] = None
    role: str
    credits: int
    created_at: str

class AssignCreditsRequest(BaseModel):
    credits: int = Field(..., ge=0)

class AddCreditsRequest(BaseModel):
    amount: int = Field(..., gt=0)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token

class AdminCreateUserRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    role: str = Field("user", pattern="^(user|admin)$")
    credits: int = Field(5, ge=0)

class AdminUpdateUserRequest(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(user|admin)$")
    credits: Optional[int] = Field(None, ge=0)


class HistoryItem(BaseModel):
    job_id: str
    company_input: str
    status: str
    current_stage: int
    recommendation: Optional[str] = None
    risk_score: Optional[float] = None
    created_at: str
    completed_at: Optional[str] = None
    paused_at: Optional[str] = None
