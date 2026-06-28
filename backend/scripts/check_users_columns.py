from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
cols = inspector.get_columns('users')
print('users columns:')
for c in cols:
    print('-', c['name'], c.get('type'))
