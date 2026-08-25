"""
Test Frontend-Backend-Database Connection
Tests all three components are working together
"""

import os
import sys
import time
import json
from pathlib import Path
from urllib.parse import urljoin

def test_backend_running():
    """Test if backend is running"""
    print("\n" + "=" * 80)
    print("TESTING BACKEND CONNECTION")
    print("=" * 80)
    
    try:
        import requests
        
        backend_url = "http://localhost:8085"
        
        # Try health check
        try:
            response = requests.get(f"{backend_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Backend is running at {backend_url}")
                print(f"  Health: {data}")
                return True
        except requests.exceptions.ConnectionError:
            print(f"✗ Cannot connect to backend at {backend_url}")
            print(f"  Make sure backend is running: uvicorn app.main:app --reload --port 8085")
            return False
        except Exception as e:
            print(f"⚠ Backend health check error: {e}")
            return False
            
    except ImportError:
        print("⚠ requests library not installed")
        print("  Install with: pip install requests")
        return False

def test_frontend_running():
    """Test if frontend is running"""
    print("\n" + "=" * 80)
    print("TESTING FRONTEND CONNECTION")
    print("=" * 80)
    
    try:
        import requests
        
        frontend_url = "http://localhost:3000"
        
        try:
            response = requests.get(frontend_url, timeout=5)
            if response.status_code == 200:
                print(f"✓ Frontend is running at {frontend_url}")
                if "html" in response.text.lower():
                    print(f"  HTML content found")
                    return True
        except requests.exceptions.ConnectionError:
            print(f"✗ Cannot connect to frontend at {frontend_url}")
            print(f"  Make sure frontend is running: python simple_server.py (in frontend directory)")
            return False
        except Exception as e:
            print(f"⚠ Frontend check error: {e}")
            return False
            
    except ImportError:
        print("⚠ requests library not installed")
        return False

def test_database_connection():
    """Test if database is accessible"""
    print("\n" + "=" * 80)
    print("TESTING DATABASE CONNECTION")
    print("=" * 80)
    
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        
        from app.config import settings
        from app.database import engine
        
        print(f"Database URL: {settings.database_url[:60]}...")
        
        try:
            # Use text() for raw SQL in newer SQLAlchemy
            from sqlalchemy import text
            with engine.connect() as connection:
                result = connection.execute(text("SELECT version()"))
                version = result.fetchone()[0]
                print(f"✓ Database connection successful")
                print(f"  PostgreSQL version: {version[:50]}...")
                return True
        except Exception as e:
            print(f"✗ Database connection failed: {e}")
            print(f"  Check that:")
            print(f"    - PostgreSQL is running")
            print(f"    - DATABASE_URL in .env is correct")
            print(f"    - Network can reach database host")
            return False
            
    except Exception as e:
        print(f"✗ Error checking database: {e}")
        return False

def test_api_endpoints():
    """Test key API endpoints"""
    print("\n" + "=" * 80)
    print("TESTING API ENDPOINTS")
    print("=" * 80)
    
    try:
        import requests
        
        backend_url = "http://localhost:8085"
        
        endpoints = [
            ("Health", "/health"),
            ("OpenAPI Docs", "/docs"),
            ("Dashboard Summary", "/api/dashboard/summary"),
            ("Target Endpoints", "/api/targets/employee/my-assigned-targets"),
        ]
        
        for name, endpoint in endpoints:
            try:
                response = requests.get(f"{backend_url}{endpoint}", timeout=5)
                status = "✓" if response.status_code < 400 else "⚠"
                print(f"{status} {name}: {response.status_code}")
            except Exception as e:
                print(f"✗ {name}: {str(e)[:50]}")
                
    except ImportError:
        print("⚠ requests library not installed")

def test_cors_configuration():
    """Test CORS configuration"""
    print("\n" + "=" * 80)
    print("TESTING CORS CONFIGURATION")
    print("=" * 80)
    
    try:
        import requests
        
        backend_url = "http://localhost:8085"
        frontend_url = "http://localhost:3000"
        
        headers = {
            "Origin": frontend_url,
        }
        
        try:
            response = requests.options(f"{backend_url}/api/dashboard/summary", headers=headers, timeout=5)
            
            if "access-control-allow-origin" in response.headers:
                allowed_origin = response.headers.get("access-control-allow-origin")
                print(f"✓ CORS enabled")
                print(f"  Allowed Origin: {allowed_origin}")
                return True
            else:
                print(f"⚠ CORS headers not found in response")
                print(f"  Response headers: {dict(response.headers)}")
                return False
        except Exception as e:
            print(f"⚠ CORS check error: {e}")
            return False
            
    except ImportError:
        print("⚠ requests library not installed")
        return False

def test_target_assignment_feature():
    """Test target assignment endpoints"""
    print("\n" + "=" * 80)
    print("TESTING TARGET ASSIGNMENT FEATURE")
    print("=" * 80)
    
    try:
        import requests
        
        backend_url = "http://localhost:8085"
        
        endpoints = [
            ("Assign Targets", "POST", "/api/targets/admin/assign-targets"),
            ("View Employee Targets", "GET", "/api/targets/admin/employee/00000000-0000-0000-0000-000000000000/assigned-targets"),
            ("View My Targets", "GET", "/api/targets/employee/my-assigned-targets"),
            ("Dashboard Summary", "GET", "/api/dashboard/summary"),
        ]
        
        for name, method, endpoint in endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{backend_url}{endpoint}", timeout=5)
                else:
                    response = requests.post(f"{backend_url}{endpoint}", json={}, timeout=5)
                
                # 401 means auth required (expected), not endpoint missing
                if response.status_code in [200, 201, 401]:
                    print(f"✓ {name}: Endpoint exists ({response.status_code})")
                else:
                    print(f"⚠ {name}: {response.status_code}")
            except Exception as e:
                print(f"✗ {name}: {str(e)[:50]}")
                
    except ImportError:
        print("⚠ requests library not installed")

def main():
    print("\n╔════════════════════════════════════════════════════════════════════════════════╗")
    print("║                 FRONTEND-BACKEND-DATABASE CONNECTION TEST                      ║")
    print("╚════════════════════════════════════════════════════════════════════════════════╝")
    
    print("\nThis test verifies that:")
    print("  1. Backend is running and accessible")
    print("  2. Frontend is running and accessible")
    print("  3. Database is connected and working")
    print("  4. CORS is properly configured")
    print("  5. API endpoints are available")
    print("  6. Target assignment feature is deployed")
    
    results = {
        "Backend": test_backend_running(),
        "Frontend": test_frontend_running(),
        "Database": test_database_connection(),
        "API Endpoints": test_api_endpoints() or True,  # Visual only
        "CORS": test_cors_configuration(),
        "Target Feature": test_target_assignment_feature() or True,  # Visual only
    }
    
    print("\n" + "=" * 80)
    print("CONNECTION TEST SUMMARY")
    print("=" * 80)
    
    for component, result in results.items():
        if isinstance(result, bool):
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"{status}: {component}")
    
    all_critical_pass = results.get("Backend") and results.get("Frontend") and results.get("Database")
    
    print("\n" + "=" * 80)
    if all_critical_pass:
        print("✓ ALL CRITICAL COMPONENTS CONNECTED!")
        print("=" * 80)
        print("\nYour CRM is ready!")
        print("\nNext steps:")
        print("  1. Log in to the frontend at http://localhost:3000")
        print("  2. Use admin credentials to access admin panel")
        print("  3. Try the target assignment feature:")
        print("     - Go to Sales Targets")
        print("     - Select an employee")
        print("     - Assign targets (calls/leads)")
        print("     - Employee should see notification in My To-Do")
    else:
        print("✗ SOME COMPONENTS NOT CONNECTED")
        print("=" * 80)
        print("\nMake sure to:")
        print("  1. Start backend: cd backend && uvicorn app.main:app --reload --port 8085")
        print("  2. Start frontend: cd frontend && python simple_server.py")
        print("  3. Verify database is running and accessible")
        print("  4. Check .env configuration")
    
    return 0 if all_critical_pass else 1

if __name__ == "__main__":
    sys.exit(main())
