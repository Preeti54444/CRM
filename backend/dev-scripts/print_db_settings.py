import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.config import settings
print('ENV file used:', settings.model_config['env_file'])
print('DATABASE_URL:', settings.database_url)
print('FRONTEND_URL:', settings.frontend_url)
print('ENVIRONMENT:', settings.environment)
