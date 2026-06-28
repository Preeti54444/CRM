#!/usr/bin/env python
"""Test API endpoint directly."""
import requests
import json

# Get admin token
login_response = requests.post(
    'http://localhost:8085/auth/login',
    json={'email': 'shree.rathod@fundingsathi.in', 'password': 'shree.admin@2026'}
)
token = login_response.json()['access_token']
print(f'Token obtained: {token[:20]}...\n')

# Fetch leads
headers = {'Authorization': f'Bearer {token}'}
leads_response = requests.get('http://localhost:8085/leads?limit=5', headers=headers)
leads = leads_response.json()

print(f'API Response: Total leads returned = {len(leads)}\n')
print('First 5 leads:')
for i, lead in enumerate(leads[:5], 1):
    print(f'{i}. Name: {lead.get("lead_name")}, Company: {lead.get("company_name")}, Email: {lead.get("email")}')

if not leads:
    print('No leads returned from API!')
