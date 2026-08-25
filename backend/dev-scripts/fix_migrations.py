from app.database import engine
import sqlalchemy as sa

with engine.connect() as conn:
    # Check what tables exist
    try:
        result = conn.execute(sa.text("SELECT tablename FROM pg_tables WHERE schemaname='public'"))
        tables = [row[0] for row in result.fetchall()]
        print(f"Existing tables: {tables}")
    except Exception as e:
        print(f"Error checking tables: {e}")
    
    # Stamp with the latest migration that seems to be applied
    try:
        conn.execute(sa.text("DROP TABLE IF EXISTS alembic_version"))
        conn.execute(sa.text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
        conn.execute(sa.text("INSERT INTO alembic_version (version_num) VALUES ('20260712_forecast_module')"))
        conn.commit()
        print("Stamped alembic_version with 20260712_forecast_module")
    except Exception as e:
        print(f"Error stamping: {e}")
        conn.rollback()
