import requests

print("Testing available endpoints on port 8085...")
print("=" * 80)

endpoints = [
    '/api/lenders',
    '/lenders-management/',
    '/lenders',
    '/docs',
    '/openapi.json'
]

for endpoint in endpoints:
    print(f"\nTesting http://localhost:8085{endpoint}")
    try:
        response = requests.get(f'http://localhost:8085{endpoint}', timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Success!")
        elif response.status_code == 404:
            print(f"   Not Found")
        elif response.status_code == 405:
            print(f"   Method Not Allowed")
        else:
            print(f"   Response: {response.text[:100]}")
    except requests.exceptions.ConnectionError:
        print("   Connection Error")
    except Exception as e:
        print(f"   Error: {e}")

print("=" * 80)
