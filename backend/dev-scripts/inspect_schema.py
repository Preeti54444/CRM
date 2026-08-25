import os
import dotenv
from sqlalchemy import create_engine, text

dotenv.load_dotenv('.env')
url = os.getenv('DATABASE_URL')
print('DATABASE_URL', url)
engine = create_engine(url)
with engine.connect() as conn:
    for table in ['leads', 'call_data', 'followups', 'users']:
        print(f'--- {table} ---')
        rows = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' ORDER BY ordinal_position")).fetchall()
        print([r[0] for r in rows])
