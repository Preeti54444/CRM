import os
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse, urlsplit, urlunsplit
from pydantic import ConfigDict, model_validator
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent
CLEAN_PROJECT_DIR = BACKEND_DIR.parent
WORKSPACE_ROOT = CLEAN_PROJECT_DIR.parent

ENV_FILE = os.getenv('ENV_FILE')


def find_env_file() -> Path:
    if ENV_FILE:
        return Path(ENV_FILE).expanduser().resolve()

    candidates = [
        BACKEND_DIR / '.env',
        CLEAN_PROJECT_DIR / '.env',
        WORKSPACE_ROOT / '.env',
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return BACKEND_DIR / '.env'


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

            local_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8085",
                "http://127.0.0.1:8085",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
                "http://localhost:8001",
                "http://127.0.0.1:8001",
                "http://192.168.1.8:3000",
                "http://192.168.1.8:8085",
                "http://192.168.1.13:3000",
                "http://192.168.1.13:8085",
                "http://127.0.0.1:54894",  # Browser preview proxy
                "http://localhost:54894",  # Browser preview proxy
                "http://127.0.0.1:62376",  # Browser preview proxy
                "http://localhost:62376",  # Browser preview proxy
                "null"  # Allow file:// and other null origins
            ]
            frontend_origin = self._normalize_origin(self.frontend_url or "")
            if frontend_origin and frontend_origin not in local_origins:
                local_origins.insert(0, frontend_origin)
            
            # Allow LAN IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            import socket
            try:
                hostname = socket.gethostname()
                local_ip = socket.gethostbyname(hostname)
                if local_ip and local_ip not in ["127.0.0.1", "localhost"]:
                    local_origins.extend([
                        f"http://{local_ip}:3000",
                        f"http://{local_ip}:8085",
                        f"http://{local_ip}:8000",
                        f"http://{local_ip}:8001"
                    ])
            except:
                pass
            
            return local_origins

        origins = []
        for host in raw_hosts.split(","):
            normalized = self._normalize_origin(host)
            if normalized:
                origins.append(normalized)

        if self.environment.lower() != "production" and ("http://localhost:3000" in origins or "http://127.0.0.1:3000" in origins):
            if "null" not in origins:
                origins.append("null")

        return origins

    def _resolve_database_url(self) -> str:
        database_url = (self.database_url or "").strip()
        if not database_url:
            return database_url

        if not self._is_running_in_docker():
            return database_url

        parsed = urlsplit(database_url)
        if parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
            host = os.getenv("POSTGRES_HOST", "postgres")
            parsed = parsed._replace(netloc=f"{parsed.username or ''}:{parsed.password or ''}@{host}:{parsed.port or 5432}" if parsed.username else f"{host}:{parsed.port or 5432}")
            return urlunsplit(parsed)

        return database_url

    def _is_running_in_docker(self) -> bool:
        return os.path.exists("/.dockerenv") or os.getenv("DOTENV") == "docker"

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

        self.database_url = self._resolve_database_url()
        return self
    
    model_config = ConfigDict(
        env_file=str(find_env_file()),
        case_sensitive=False,
        extra='ignore',
    )


settings = Settings()
