import urllib.request
resp = urllib.request.urlopen('http://127.0.0.1:3000/', timeout=5)
print('STATUS', resp.status)
print(resp.read())
