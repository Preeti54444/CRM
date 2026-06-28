from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
print('Tables:')
for t in inspector.get_table_names():
    print('-', t)
