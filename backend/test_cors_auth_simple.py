"""
Simple test script to verify CORS and authentication using urllib (no external dependencies)
"""
import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    try:
        req = urllib.request.Request(f"{BASE_URL}/health")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Health Check Status: {response.status}")
            print(f"Response: {data}")
            return True
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_options_request():
    """Test OPTIONS preflight request handling"""
    print("\n=== Testing OPTIONS Request ===")
    try:
        req = urllib.request.Request(f"{BASE_URL}/auth/login", method="OPTIONS")
        req.add_header("Origin", "http://localhost:3000")
        req.add_header("Access-Control-Request-Method", "POST")
        req.add_header("Access-Control-Request-Headers", "Content-Type, Authorization")
        
        with urllib.request.urlopen(req) as response:
            print(f"Status Code: {response.status}")
            print(f"CORS Headers:")
            for header in ["Access-Control-Allow-Origin", "Access-Control-Allow-Methods", 
                           "Access-Control-Allow-Headers", "Access-Control-Allow-Credentials"]:
                if header in response.headers:
                    print(f"  {header}: {response.headers[header]}")
            return response.status == 200
    except Exception as e:
        print(f"OPTIONS request failed: {e}")
        return False

def test_cors_on_401():
    """Test CORS headers on 401 unauthorized response"""
    print("\n=== Testing CORS on 401 Response ===")
    try:
        req = urllib.request.Request(f"{BASE_URL}/auth/me")
        req.add_header("Origin", "http://localhost:3000")
        req.add_header("Authorization", "Bearer invalid_token")
        
        try:
            with urllib.request.urlopen(req) as response:
                print(f"Unexpected success: {response.status}")
                return False
        except urllib.error.HTTPError as e:
            print(f"Status Code: {e.code}")
            print(f"CORS Headers:")
            for header in ["Access-Control-Allow-Origin", "Access-Control-Allow-Methods", 
                           "Access-Control-Allow-Headers", "Access-Control-Allow-Credentials"]:
                if header in e.headers:
                    print(f"  {header}: {e.headers[header]}")
            return e.code == 401 and "Access-Control-Allow-Origin" in e.headers
    except Exception as e:
        print(f"CORS on 401 test failed: {e}")
        return False

def test_login():
    """Test login endpoint"""
    print("\n=== Testing Login ===")
    try:
        data = json.dumps({
            "email": "test@example.com",
            "password": "testpassword123"
        }).encode('utf-8')
        
        req = urllib.request.Request(
            f"{BASE_URL}/auth/login",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Origin": "http://localhost:3000"
            }
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"Login Status: {response.status}")
            token = result.get("access_token")
            if token:
                print(f"Token received: {token[:50]}...")
                return token
            else:
                print("No token received")
                return None
    except urllib.error.HTTPError as e:
        print(f"Login failed with status {e.code}: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def test_authenticated_request(token):
    """Test authenticated request with token"""
    print("\n=== Testing Authenticated Request ===")
    try:
        req = urllib.request.Request(f"{BASE_URL}/auth/me")
        req.add_header("Origin", "http://localhost:3000")
        req.add_header("Authorization", f"Bearer {token}")
        
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Auth Request Status: {response.status}")
            print(f"User Data: {data}")
            return response.status == 200
    except Exception as e:
        print(f"Authenticated request failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting CORS and Authentication Tests")
    print("=" * 50)
    
    results = []
    
    results.append(("Health Check", test_health_check()))
    results.append(("OPTIONS Request", test_options_request()))
    results.append(("CORS on 401", test_cors_on_401()))
    
    token = test_login()
    if token:
        results.append(("Authenticated Request", test_authenticated_request(token)))
    else:
        results.append(("Login", False))
    
    print("\n" + "=" * 50)
    print("Test Results:")
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"  {test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    print("\n" + ("✓ All tests passed!" if all_passed else "✗ Some tests failed"))
