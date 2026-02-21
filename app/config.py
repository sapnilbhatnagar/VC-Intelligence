"""Application configuration — reads from .env file."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: str = Field(..., env="ANTHROPIC_API_KEY")
    tavily_api_key: str = Field(..., env="TAVILY_API_KEY")

    # Model selection
    model_fast: str = Field("claude-haiku-4-5-20251001", env="MODEL_FAST")
    model_smart: str = Field("claude-sonnet-4-6", env="MODEL_SMART")

    # Storage
    outputs_dir: str = Field("./outputs", env="OUTPUTS_DIR")
    database_path: str = Field("./vc_due_diligence.db", env="DATABASE_PATH")

    # Auth
    jwt_secret_key: str = Field("dev-secret-change-in-production", env="JWT_SECRET_KEY")
    admin_email: str = Field("Admin", env="ADMIN_EMAIL")
    admin_password: str = Field("Password", env="ADMIN_PASSWORD")
    google_client_id: str = Field("", env="GOOGLE_CLIENT_ID")

    # Server
    host: str = Field("0.0.0.0", env="HOST")
    port: int = Field(8000, env="PORT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        protected_namespaces = ()


settings = Settings()
