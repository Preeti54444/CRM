import requests

print("Testing all lender endpoints...")
print("=" * 60)

# Test 1: /api/lenders (from lender_service.py)
print("\n1. Testing /api/lenders (lender_service.py):")
try:
    response = requests.get('http://localhost:8000/api/lenders')
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Response type: {type(data)}")
        print(f"   Keys: {data.keys() if isinstance(data, dict) else 'N/A'}")
        print(f"   Number of lenders: {len(data.get('lenders', [])) if isinstance(data, dict) else len(data)}")
    else:
        print(f"   Error: {response.text[:200]}")
except Exception as e:
    print(f"   Exception: {e}")

# Test 2: /lenders-management/ (from lenders.py router)
print("\n2. Testing /lenders-management/ (lenders.py router):")
try:
    response = requests.get('http://localhost:8000/lenders-management/')
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Response type: {type(data)}")
        print(f"   Number of lenders: {len(data)}")
        if data:
            print(f"   First lender name: {data[0].get('name')}")
    else:
        print(f"   Error: {response.text[:200]}")
except Exception as e:
    print(f"   Exception: {e}")

print("\n" + "=" * 60)
print("Analysis complete.")
