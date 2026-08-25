import requests

try:
    response = requests.get('http://localhost:8000/lenders-management')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    if response.status_code == 200:
        data = response.json()
        print(f"Number of lenders returned: {len(data)}")
        if data:
            print(f"First lender: {data[0]}")
except Exception as e:
    print(f"Error: {e}")
