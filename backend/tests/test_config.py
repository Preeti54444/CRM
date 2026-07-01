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


def test_root_env_preferred_over_backend_env(monkeypatch, tmp_path):
    root_env = tmp_path / '.env'
    backend_env = tmp_path / 'backend' / '.env'
    backend_env.parent.mkdir()

    root_env.write_text('ENVIRONMENT=production\n')
    backend_env.write_text('ENVIRONMENT=development\n')

    monkeypatch.setenv('ENV_FILE', '')
    monkeypatch.setattr('app.config.CLEAN_PROJECT_DIR', tmp_path)
    monkeypatch.setattr('app.config.BACKEND_DIR', tmp_path / 'backend')
    monkeypatch.setattr('app.config.WORKSPACE_ROOT', tmp_path.parent)

    selected = config_module.find_env_file()
    assert selected == root_env
