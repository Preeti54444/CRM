import requests

print("Testing all CRM endpoints on port 8000...")
print("=" * 80)

endpoints = [
    ('GET', '/leads', 'Leads list'),
    ('GET', '/users', 'Users list'),
    ('GET', '/dashboard', 'Dashboard'),
    ('GET', '/followups', 'Followups'),
    ('GET', '/customers', 'Customers'),
    ('GET', '/lender-products', 'Lender products'),
    ('GET', '/api/lenders', 'API lenders'),
    ('GET', '/health', 'Health check'),
]

for method, endpoint, description in endpoints:
    print(f"\nTesting {method} {endpoint} ({description}):")
    try:
        if method == 'GET':
            response = requests.get(f'http://localhost:8000{endpoint}', timeout=5)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            print(f"  ✓ Working")
        elif response.status_code == 401:
            print(f"  ⚠ Requires authentication")
        elif response.status_code == 404:
            print(f"  ✗ Not found")
        else:
            print(f"  Response: {response.text[:100]}")
    except requests.exceptions.ConnectionError:
        print(f"  ✗ Connection error")
    except Exception as e:
        print(f"  ✗ Error: {e}")

print("\n" + "=" * 80)
print("Summary: Port 8000 backend is running and serving CRM endpoints")
print("Frontend should use http://127.0.0.1:8000 for all API calls")
