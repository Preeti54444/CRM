from typing import Optional
from urllib.parse import urlparse
from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str
    
    # Security
    secret_key: str
    access_token_expire_minutes: int = 60
    
    # CORS
    allowed_hosts: str = "*"
    
    # Email Configuration
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    email_from: Optional[str] = None
    
    # Scheduling
    scheduler_enabled: bool = True
    scheduler_interval_minutes: int = 60
    sod_autocreate_roles: str = "Employee,Manager"
    
    # Environment & Logging
    environment: str = "development"
    log_level: str = "INFO"
    
    # Frontend Configuration
    frontend_url: str = "http://localhost:3000"
    api_base: Optional[str] = None

    def _normalize_origin(self, origin: str) -> Optional[str]:
        value = (origin or "").strip()
        if not value:
            return None
        if value == "*":
            return "*"

        parsed = urlparse(value)
        if not parsed.scheme or not parsed.netloc:
            if self.environment.lower() != "production":
                value = f"http://{value}"
                parsed = urlparse(value)

        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError(f"Invalid ALLOWED_HOSTS origin: '{origin}'. Use full origins like 'https://example.com'.")

        return f"{parsed.scheme}://{parsed.netloc}"

    @property
    def allowed_origins(self) -> list[str]:
        raw_hosts = (self.allowed_hosts or "").strip()
        if raw_hosts == "*":
            if self.environment.lower() == "production":
                raise ValueError("ALLOWED_HOSTS must be explicitly set in production.")
            return ["*"]

        origins = []
        for host in raw_hosts.split(","):
            normalized = self._normalize_origin(host)
            if normalized:
                origins.append(normalized)

        if self.environment.lower() != "production" and ("http://localhost:3000" in origins or "http://127.0.0.1:3000" in origins):
            if "null" not in origins:
                origins.append("null")

        return origins

    @model_validator(mode="after")
    def validate_production_settings(self):
        environment = self.environment.lower()
        allowed_hosts = (self.allowed_hosts or "").strip()
        secret_key = self.secret_key or ""

        if environment == "production":
            if not allowed_hosts or allowed_hosts == "*":
                raise ValueError("ALLOWED_HOSTS must be explicitly configured for production environments.")
            if len(secret_key) < 32 or secret_key.startswith("your-") or secret_key.startswith("please-"):
                raise ValueError("SECRET_KEY must be a securely generated random value in production.")
        return self
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
