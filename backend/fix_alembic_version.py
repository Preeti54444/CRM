from app.database import engine
from sqlalchemy import text

# Fix alembic version table - stamp to merge_all_heads since all tables exist
with engine.connect() as conn:
    conn.execute(text("UPDATE alembic_version SET version_num = 'merge_all_heads'"))
    conn.commit()
    print("Alembic version stamped to merge_all_heads")
