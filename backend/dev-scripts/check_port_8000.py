import requests

print("Checking backend on port 8000...")
print("=" * 80)

# Try to get the OpenAPI schema
try:
    response = requests.get('http://localhost:8000/api/openapi.json', timeout=5)
    if response.status_code == 200:
        openapi = response.json()
        print("✓ Backend running on port 8000")
        
        # Check if lenders-management is in the paths
        if '/lenders-management/' in openapi.get('paths', {}):
            print("✓ /lenders-management/ endpoint is registered")
            methods = list(openapi['paths']['/lenders-management/'].keys())
            print(f"  Available methods: {methods}")
        else:
            print("✗ /lenders-management/ endpoint NOT found")
            
        # Test the endpoint directly
        print("\nTesting /lenders-management/ endpoint:")
        response = requests.get('http://localhost:8000/lenders-management/', timeout=5)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Lenders count: {len(data)}")
    else:
        print(f"Failed to get OpenAPI schema: {response.status_code}")
except requests.exceptions.ConnectionError:
    print("✗ No backend running on port 8000")
except Exception as e:
    print(f"Error: {e}")

print("=" * 80)
