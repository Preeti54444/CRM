from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.config import settings
print('DATABASE_URL=', settings.database_url)
print('ENVIRONMENT=', settings.environment)
print('ALLOWED_HOSTS=', settings.allowed_hosts)
print('FRONTEND_URL=', settings.frontend_url)
