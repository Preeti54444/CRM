import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.config as config_module


def test_database_url_rewrites_localhost_to_postgres_in_docker(monkeypatch):
    monkeypatch.setenv("POSTGRES_HOST", "postgres")
    monkeypatch.setattr(config_module.os.path, "exists", lambda path: path == "/.dockerenv")

    settings = config_module.Settings(
        database_url="postgresql://postgres:secret@localhost:5432/fundingsathicrm",
        secret_key="a" * 32,
        allowed_hosts="http://localhost:3000",
        environment="development",
    )

    assert settings.database_url == "postgresql://postgres:secret@postgres:5432/fundingsathicrm"
