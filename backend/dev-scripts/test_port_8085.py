import requests

print("Testing backend API on port 8085...")
print("=" * 80)

# Test lenders-management endpoint
print("\n1. Testing http://localhost:8085/lenders-management/")
try:
    response = requests.get('http://localhost:8085/lenders-management/', timeout=5)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Lenders count: {len(data)}")
        if len(data) > 0:
            print(f"   First lender: {data[0].get('name')}")
            print(f"   Products: {data[0].get('products')}")
    else:
        print(f"   Error: {response.text[:200]}")
except requests.exceptions.ConnectionError:
    print("   ERROR: Cannot connect to backend on port 8085")
    print("   Please ensure backend server is running on port 8085")
except Exception as e:
    print(f"   Error: {e}")

# Test root endpoint
print("\n2. Testing http://localhost:8085/")
try:
    response = requests.get('http://localhost:8085/', timeout=5)
    print(f"   Status: {response.status_code}")
except requests.exceptions.ConnectionError:
    print("   ERROR: Cannot connect to backend on port 8085")
except Exception as e:
    print(f"   Error: {e}")

print("=" * 80)
