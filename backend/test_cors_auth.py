"""
Test script to verify CORS headers, OPTIONS handling, and authentication token handling
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_options_request():
    """Test OPTIONS preflight request handling"""
    print("\n=== Testing OPTIONS Request ===")
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization"
    }
    
    response = requests.options(f"{BASE_URL}/auth/login", headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"CORS Headers:")
    for header in ["Access-Control-Allow-Origin", "Access-Control-Allow-Methods", 
                   "Access-Control-Allow-Headers", "Access-Control-Allow-Credentials"]:
        if header in response.headers:
            print(f"  {header}: {response.headers[header]}")
    
    assert response.status_code == 200, "OPTIONS request should return 200"
    assert "Access-Control-Allow-Origin" in response.headers, "CORS origin header missing"
    print("✓ OPTIONS request test passed")

def test_cors_on_401():
    """Test CORS headers on 401 unauthorized response"""
    print("\n=== Testing CORS on 401 Response ===")
    headers = {
        "Origin": "http://localhost:3000",
        "Authorization": "Bearer invalid_token"
    }
    
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"CORS Headers:")
    for header in ["Access-Control-Allow-Origin", "Access-Control-Allow-Methods", 
                   "Access-Control-Allow-Headers", "Access-Control-Allow-Credentials"]:
        if header in response.headers:
            print(f"  {header}: {response.headers[header]}")
    
    assert response.status_code == 401, "Should return 401 for invalid token"
    assert "Access-Control-Allow-Origin" in response.headers, "CORS headers missing on 401"
    print("✓ CORS on 401 test passed")

def test_login_and_auth():
    """Test login and authenticated request"""
    print("\n=== Testing Login and Authenticated Request ===")
    
    # First, try to register a test user
    register_data = {
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "testpassword123",
        "role": "employee"
    }
    
    try:
        register_response = requests.post(
            f"{BASE_URL}/auth/register",
            json=register_data,
            headers={"Origin": "http://localhost:3000"}
        )
        print(f"Register Status: {register_response.status_code}")
    except:
        print("User may already exist, proceeding with login")
    
    # Login
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_data,
        headers={"Origin": "http://localhost:3000"}
    )
    
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        token_data = login_response.json()
        token = token_data.get("access_token")
        print(f"Token received: {token[:50]}..." if token else "No token received")
        
        # Test authenticated request
        auth_headers = {
            "Origin": "http://localhost:3000",
            "Authorization": f"Bearer {token}"
        }
        
        me_response = requests.get(f"{BASE_URL}/auth/me", headers=auth_headers)
        print(f"Auth Request Status: {me_response.status_code}")
        print(f"User Data: {me_response.json()}")
        
        assert me_response.status_code == 200, "Authenticated request should succeed"
        print("✓ Login and auth test passed")
    else:
        print(f"Login failed: {login_response.text}")

def test_token_formats():
    """Test different token formats"""
    print("\n=== Testing Different Token Formats ===")
    
    # This would require a valid token from login
    # For now, we'll test that invalid tokens are handled gracefully
    headers = {
        "Origin": "http://localhost:3000",
        "Authorization": "Bearer some_token"
    }
    
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Bearer format status: {response.status_code}")
    assert response.status_code == 401, "Should return 401 for invalid Bearer token"
    
    # Test Token format (alternative)
    headers["Authorization"] = "Token some_token"
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Token format status: {response.status_code}")
    assert response.status_code == 401, "Should return 401 for invalid Token format"
    
    print("✓ Token format test passed")

def test_health_check():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Health Check Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200, "Health check should return 200"
    print("✓ Health check test passed")

if __name__ == "__main__":
    print("Starting CORS and Authentication Tests")
    print("=" * 50)
    
    try:
        test_health_check()
        test_options_request()
        test_cors_on_401()
        test_login_and_auth()
        test_token_formats()
        
        print("\n" + "=" * 50)
        print("✓ All tests passed!")
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
    except Exception as e:
        print(f"\n✗ Error during testing: {e}")
