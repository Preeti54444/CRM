from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='calls'"))
    print('Calls table exists:', result.fetchone() is not None)
    
    if result.fetchone() is not None:
        result = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='calls' ORDER BY ordinal_position"))
        print('\nCalls table schema:')
        for row in result:
            print(f'  {row[0]}: {row[1]}')
