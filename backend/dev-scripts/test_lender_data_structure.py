import requests
import json

print("Comparing lender data from both endpoints...")
print("=" * 80)

# Test 1: /api/lenders (lender_service.py)
print("\n1. /api/lenders (lender_service.py):")
try:
    response = requests.get('http://localhost:8000/api/lenders')
    if response.status_code == 200:
        data = response.json()
        if data.get('lenders'):
            print("   First lender keys:", list(data['lenders'][0].keys()))
            print("   First lender sample:")
            for key, value in list(data['lenders'][0].items())[:10]:
                print(f"     {key}: {value}")
except Exception as e:
    print(f"   Error: {e}")

# Test 2: /lenders-management/ (lenders.py router)
print("\n2. /lenders-management/ (lenders.py router):")
try:
    response = requests.get('http://localhost:8000/lenders-management/')
    if response.status_code == 200:
        data = response.json()
        if data:
            print("   First lender keys:", list(data[0].keys()))
            print("   First lender sample:")
            for key, value in list(data[0].items())[:15]:
                print(f"     {key}: {value}")
except Exception as e:
    print(f"   Error: {e}")

print("=" * 80)
