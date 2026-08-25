import requests

try:
    response = requests.get('http://localhost:8000/api/lenders')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response keys: {data.keys()}")
        print(f"Number of lenders: {len(data.get('lenders', []))}")
        if data.get('lenders'):
            print(f"First lender: {data['lenders'][0]}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")
