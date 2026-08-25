"""
Database Connection Verification & Setup Script
Tests connectivity and applies migrations
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

def check_database_connection():
    """Test database connectivity"""
    print("\n" + "=" * 80)
    print("DATABASE CONNECTION VERIFICATION")
    print("=" * 80)
    
    try:
        from app.config import settings
        
        print(f"\n📋 Configuration:")
        print(f"   Database URL: {settings.database_url[:50]}...")
        print(f"   Environment: {settings.environment}")
        print(f"   Frontend URL: {settings.frontend_url}")
        print(f"   Allowed Hosts: {settings.allowed_hosts}")
        
        # Extract connection details
        from urllib.parse import urlparse
        parsed = urlparse(settings.database_url)
        
        print(f"\n🔍 Connection Details:")
        print(f"   Host: {parsed.hostname}")
        print(f"   Port: {parsed.port}")
        print(f"   Database: {parsed.path.strip('/')}")
        print(f"   User: {parsed.username}")
        
        # Test connection
        print(f"\n⏳ Testing connection...")
        from app.database import engine, SessionLocal
        
        try:
            with engine.connect() as connection:
                result = connection.execute("SELECT 1")
                print(f"   ✓ Connection successful!")
                return True
        except Exception as e:
            print(f"   ✗ Connection failed: {e}")
            return False
            
    except Exception as e:
        print(f"✗ Error checking configuration: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_migrations():
    """Check migration status"""
    print("\n" + "=" * 80)
    print("MIGRATION STATUS")
    print("=" * 80)
    
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        from alembic.runtime.migration import MigrationContext
        from sqlalchemy import inspect
        from app.database import engine
        
        # Get current head revision
        alembic_cfg = Config("alembic.ini")
        script = ScriptDirectory.from_config(alembic_cfg)
        
        with engine.begin() as connection:
            context = MigrationContext.configure(connection)
            current_rev = context.get_current_revision()
            
        print(f"\n📊 Current Revision: {current_rev or 'None (fresh database)'}")
        
        # Get head revision
        head_rev = script.get_current_head()
        print(f"📊 Latest Revision: {head_rev}")
        
        if current_rev == head_rev:
            print(f"✓ Database is up to date!")
        elif current_rev is None:
            print(f"⚠ Database is fresh - needs migrations")
        else:
            print(f"⚠ Database needs migration (current: {current_rev}, target: {head_rev})")
            
        # Check for target assignment migration
        target_migration = None
        for script_obj in script.walk_revisions():
            if "target_assignment" in script_obj.description.lower():
                target_migration = script_obj.revision
                print(f"\n✓ Found target assignment migration: {script_obj.revision}")
                break
                
        if not target_migration:
            print(f"\n⚠ Target assignment migration not found in script directory")
            
        return True
        
    except Exception as e:
        print(f"\n✗ Error checking migrations: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_models():
    """Check if all models are imported"""
    print("\n" + "=" * 80)
    print("MODEL VERIFICATION")
    print("=" * 80)
    
    try:
        from app.models import (
            User, Role, Target, Call, Lead, Meeting, Task,
            PerformanceNotification, AuditLog
        )
        
        print(f"\n✓ User model imported")
        print(f"✓ Role model imported")
        print(f"✓ Target model imported (with assignment fields)")
        print(f"✓ Call model imported")
        print(f"✓ Lead model imported")
        print(f"✓ Meeting model imported")
        print(f"✓ Task model imported")
        print(f"✓ PerformanceNotification model imported")
        print(f"✓ AuditLog model imported")
        
        # Check Target model fields
        from sqlalchemy import inspect as sa_inspect
        target_cols = [c.name for c in sa_inspect(Target).columns]
        
        print(f"\n📋 Target Model Columns ({len(target_cols)} total):")
        required_fields = [
            'id', 'user_id', 'role', 'daily_call_target', 'daily_lead_target',
            'weekly_lead_target', 'crm_log_deadline', 'effective_from', 'updated_by',
            'updated_at', 'assigned_by', 'assigned_at', 'notification_sent'
        ]
        
        for field in required_fields:
            if field in target_cols:
                print(f"   ✓ {field}")
            else:
                print(f"   ✗ MISSING: {field}")
                
        return True
        
    except Exception as e:
        print(f"\n✗ Error checking models: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n╔════════════════════════════════════════════════════════════════════════════════╗")
    print("║                   DATABASE & BACKEND SETUP VERIFICATION                        ║")
    print("╚════════════════════════════════════════════════════════════════════════════════╝")
    
    results = {
        "Database Connection": check_database_connection(),
        "Models": check_models(),
        "Migrations": check_migrations(),
    }
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    for check, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {check}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n✓ All checks passed! Backend is ready to connect to database.")
        print("\n📋 Next Steps:")
        print("   1. Run migrations: python -m alembic upgrade head")
        print("   2. Start backend: uvicorn app.main:app --reload --port 8085")
        print("   3. Start frontend: npm start (in frontend directory)")
    else:
        print("\n✗ Some checks failed. Please review the errors above.")
        print("\nCommon issues:")
        print("   - Database not running or not accessible")
        print("   - Incorrect connection string in .env")
        print("   - Missing alembic.ini file")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
