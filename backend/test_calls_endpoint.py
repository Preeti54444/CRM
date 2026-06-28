import requests
import json
from datetime import date

# Test the POST /calls endpoint
url = "http://192.168.1.8:8085/calls"

# First, login to get a token
login_url = "http://192.168.1.8:8085/auth/login"
login_data = {
    "email": "shree.rathod@fundingsathi.in",
    "password": "shree.admin@2026"
}

print("Logging in to get token...")
login_response = requests.post(login_url, json=login_data)
print(f"Login status: {login_response.status_code}")

if login_response.status_code == 200:
    token = login_response.json().get("access_token")
    print(f"Token obtained: {token[:20]}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test POST /calls
    call_data = {
        "call_id": "TEST-001",
        "call_type": "Inbound",
        "call_date": "2026-06-27",
        "call_time": "10:30:00",
        "duration_seconds": 300,
        "caller_name": "Test Caller",
        "caller_phone": "1234567890",
        "receiver_name": "Test Receiver",
        "receiver_phone": "0987654321",
        "receiver_email": "test@example.com",
        "purpose": "Test call",
        "description": "This is a test call",
        "status": "Completed",
        "priority": "Normal"
    }
    
    print("\nTesting POST /calls...")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(call_data, indent=2)}")
    
    response = requests.post(url, json=call_data, headers=headers)
    print(f"\nResponse status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    print(f"Response body: {response.text}")
    
    # Test GET /calls
    print("\nTesting GET /calls...")
    get_response = requests.get(url, headers=headers)
    print(f"GET status: {get_response.status_code}")
    print(f"GET response: {get_response.text[:500]}")
else:
    print(f"Login failed: {login_response.text}")
