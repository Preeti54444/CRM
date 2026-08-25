import requests

print("Testing lender-products endpoint...")
print("=" * 60)

# Test lender-products endpoint
try:
    response = requests.get('http://localhost:8000/lender-products')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response type: {type(data)}")
        print(f"Number of products: {len(data) if isinstance(data, list) else len(data.get('data', []))}")
        if data:
            print(f"First item: {data[0] if isinstance(data, list) else data}")
    else:
        print(f"Error: {response.text[:500]}")
except Exception as e:
    print(f"Exception: {e}")

print("=" * 60)
