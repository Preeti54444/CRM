import requests
import json

print("Testing Lender CRUD endpoints...")
print("=" * 80)

base_url = 'http://localhost:8000/lenders-management'

# Test GET (already working)
print("\n1. GET /lenders-management/ (List all):")
try:
    response = requests.get(base_url + '/')
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Count: {len(data)}")
except Exception as e:
    print(f"   Error: {e}")

# Test GET by ID
print("\n2. GET /lenders-management/1 (Get by ID):")
try:
    response = requests.get(base_url + '/1')
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Name: {data.get('name')}")
    else:
        print(f"   Error: {response.text[:200]}")
except Exception as e:
    print(f"   Error: {e}")

# Test POST (Create)
print("\n3. POST /lenders-management (Create):")
test_lender = {
    "name": "Test Lender API",
    "slug": "test-lender-api",
    "roi": "12-15% p.a.",
    "min_turnover": 50000000.0,
    "max_loan": 10000000.0,
    "products": ["Test Product"],
    "eligible_types": ["Test Type"],
    "active_status": True
}
try:
    response = requests.post(base_url + '/', json=test_lender)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Created ID: {data.get('id')}")
        test_id = data.get('id')
    else:
        print(f"   Error: {response.text[:200]}")
        test_id = None
except Exception as e:
    print(f"   Error: {e}")
    test_id = None

# Test PUT (Update)
if test_id:
    print(f"\n4. PUT /lenders-management/{test_id} (Update):")
    update_data = test_lender.copy()
    update_data["roi"] = "15-18% p.a."
    try:
        response = requests.put(base_url + f'/{test_id}', json=update_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Updated ROI: {data.get('roi')}")
        else:
            print(f"   Error: {response.text[:200]}")
    except Exception as e:
        print(f"   Error: {e}")

    # Test DELETE
    print(f"\n5. DELETE /lenders-management/{test_id} (Delete):")
    try:
        response = requests.delete(base_url + f'/{test_id}')
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Message: {response.json()}")
        else:
            print(f"   Error: {response.text[:200]}")
    except Exception as e:
        print(f"   Error: {e}")

print("=" * 80)
