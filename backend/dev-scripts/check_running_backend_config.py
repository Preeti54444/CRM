import requests
import json

print("Checking backend configuration on port 8085...")
print("=" * 80)

# Try to get the OpenAPI schema which shows all available endpoints
try:
    response = requests.get('http://localhost:8085/api/openapi.json', timeout=5)
    if response.status_code == 200:
        openapi = response.json()
        print("Available endpoints:")
        
        # Check if lenders-management is in the paths
        if '/lenders-management/' in openapi.get('paths', {}):
            print("✓ /lenders-management/ endpoint is registered")
            methods = list(openapi['paths']['/lenders-management/'].keys())
            print(f"  Available methods: {methods}")
        else:
            print("✗ /lenders-management/ endpoint NOT found in OpenAPI schema")
        
        # List all lender-related endpoints
        print("\nLender-related endpoints:")
        for path in openapi.get('paths', {}):
            if 'lender' in path.lower():
                methods = list(openapi['paths'][path].keys())
                print(f"  {path}: {methods}")
    else:
        print(f"Failed to get OpenAPI schema: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")

print("=" * 80)
