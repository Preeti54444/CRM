import requests

print("Testing lenders-management endpoint on port 8085...")
print("=" * 80)

try:
    response = requests.get('http://localhost:8085/lenders-management/', timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Lenders count: {len(data)}")
        if len(data) > 0:
            print(f"First lender: {data[0].get('name')}")
            print(f"Products: {data[0].get('products')}")
            print(f"Eligible types: {data[0].get('eligible_types')}")
            print("\n✓ Endpoint working correctly!")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")

print("=" * 80)
