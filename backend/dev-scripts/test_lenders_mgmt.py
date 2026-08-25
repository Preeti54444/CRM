import requests

try:
    response = requests.get('http://localhost:8000/lenders-management/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response type: {type(data)}")
        print(f"Number of lenders: {len(data)}")
        if data:
            print(f"First lender: {data[0]}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")
