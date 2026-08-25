from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text('SELECT count(*) FROM users'))
    print('count:', res.scalar())
