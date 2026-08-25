"""Test script to verify target assignment endpoints are working"""

def test_app_loading():
    """Test if app loads with all endpoints"""
    try:
        from app.main import app
        print("✓ FastAPI app loaded successfully")
        return app
    except Exception as e:
        print(f"✗ Error loading app: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_endpoints(app):
    """Test if target assignment endpoints are registered"""
    routes = app.routes
    print(f"✓ Total routes in app: {len(routes)}")
    
    target_routes = []
    for route in routes:
        if hasattr(route, 'path'):
            if 'assign-targets' in route.path or 'assigned-targets' in route.path:
                target_routes.append({
                    'path': route.path,
                    'methods': getattr(route, 'methods', [])
                })
    
    print(f"\n✓ Found {len(target_routes)} target assignment routes:")
    for route in target_routes:
        print(f"  - {route['path']} {list(route['methods'])}")
    
    if len(target_routes) < 3:
        print("✗ WARNING: Expected at least 3 target assignment routes!")
        return False
    
    return True

def test_schemas():
    """Test if schemas are valid"""
    try:
        from datetime import datetime, date
        from uuid import uuid4
        from app.schemas.targets import (
            AdminTargetAssignmentRequest,
            AdminTargetAssignmentResponse,
            EmployeeAssignedTargets
        )
        
        emp_id = uuid4()
        
        # Test request schema
        req = AdminTargetAssignmentRequest(
            employee_id=emp_id,
            daily_call_target=35,
            daily_lead_target=3,
            weekly_call_target=160,
            weekly_lead_target=15,
            morning_call_target=25,
            morning_lead_target=2,
            effective_from=date.today()
        )
        print("✓ AdminTargetAssignmentRequest schema valid")
        
        # Test response schema
        resp = AdminTargetAssignmentResponse(
            id=1,
            employee_id=emp_id,
            employee_name='Test Employee',
            daily_call_target=35,
            daily_lead_target=3,
            weekly_call_target=160,
            weekly_lead_target=15,
            morning_call_target=25,
            morning_lead_target=2,
            assigned_by=emp_id,
            assigned_at=datetime.now(),
            effective_from=date.today(),
            notification_sent=True
        )
        print("✓ AdminTargetAssignmentResponse schema valid")
        
        # Test employee schema
        emp_targets = EmployeeAssignedTargets(
            daily_calls=35,
            daily_leads=3,
            weekly_calls=160,
            weekly_leads=15,
            morning_calls=25,
            morning_leads=2,
            assigned_at=datetime.now(),
            assigned_by_name='Admin User'
        )
        print("✓ EmployeeAssignedTargets schema valid")
        
        return True
    except Exception as e:
        print(f"✗ Schema test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_models():
    """Test if Target model has all required fields"""
    try:
        from app.models.targets import Target
        
        expected_fields = [
            'id', 'user_id', 'role', 'daily_call_target', 'daily_lead_target',
            'weekly_lead_target', 'crm_log_deadline', 'effective_from', 'updated_by',
            'updated_at', 'assigned_by', 'assigned_at', 'notification_sent'
        ]
        
        actual_fields = [c.name for c in Target.__table__.columns]
        
        print(f"✓ Target model has {len(actual_fields)} fields")
        
        missing = set(expected_fields) - set(actual_fields)
        if missing:
            print(f"✗ Missing fields: {missing}")
            return False
        
        extra = set(actual_fields) - set(expected_fields)
        if extra:
            print(f"⚠ Extra fields: {extra}")
        
        # Verify assignment tracking fields exist
        if 'assigned_by' in actual_fields and 'assigned_at' in actual_fields and 'notification_sent' in actual_fields:
            print("✓ Assignment tracking fields present: assigned_by, assigned_at, notification_sent")
        else:
            print("✗ Missing assignment tracking fields")
            return False
        
        return True
    except Exception as e:
        print(f"✗ Model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_services():
    """Test if services work correctly"""
    try:
        from app.services.target_configuration_service import TargetConfigurationService
        
        # Test getting targets for known employee
        daily = TargetConfigurationService.get_daily_targets('Vaibhav Borge')
        if daily and daily.get('daily_calls') == 35:
            print("✓ TargetConfigurationService returns correct daily targets")
        else:
            print(f"✗ TargetConfigurationService returned unexpected: {daily}")
            return False
        
        # Test getting targets for unknown employee
        daily_unknown = TargetConfigurationService.get_daily_targets('Unknown')
        if daily_unknown == {'daily_calls': 0, 'daily_leads': 0}:
            print("✓ TargetConfigurationService handles unknown employees")
        else:
            print(f"✗ Unexpected response for unknown employee: {daily_unknown}")
            return False
        
        return True
    except Exception as e:
        print(f"✗ Service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("TARGET ASSIGNMENT FEATURE - COMPREHENSIVE TEST SUITE")
    print("=" * 60)
    
    print("\n1. Testing Models...")
    models_ok = test_models()
    
    print("\n2. Testing Schemas...")
    schemas_ok = test_schemas()
    
    print("\n3. Testing Services...")
    services_ok = test_services()
    
    print("\n4. Testing App Loading...")
    app = test_app_loading()
    
    if app:
        print("\n5. Testing Endpoints...")
        endpoints_ok = test_endpoints(app)
    else:
        endpoints_ok = False
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"✓ Models:        {'PASS' if models_ok else 'FAIL'}")
    print(f"✓ Schemas:       {'PASS' if schemas_ok else 'FAIL'}")
    print(f"✓ Services:      {'PASS' if services_ok else 'FAIL'}")
    print(f"✓ App Loading:   {'PASS' if app else 'FAIL'}")
    print(f"✓ Endpoints:     {'PASS' if endpoints_ok else 'FAIL'}")
    
    all_pass = models_ok and schemas_ok and services_ok and app and endpoints_ok
    print("\n" + ("=" * 60))
    print(f"OVERALL: {'✓ ALL TESTS PASSED!' if all_pass else '✗ SOME TESTS FAILED'}")
    print("=" * 60)
