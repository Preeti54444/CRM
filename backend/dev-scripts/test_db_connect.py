import sys
sys.path.insert(0, '.')
from app.config import settings
from app.database import engine
from sqlalchemy import text

print('DATABASE_URL=', settings.database_url)
try:
    with engine.connect() as conn:
        r = conn.execute(text('SELECT version()')).fetchone()
        print('POSTGRES_VERSION=', r[0])
except Exception as e:
    print('CONNECT_ERROR:', type(e).__name__, e)
    import traceback
    traceback.print_exc()
