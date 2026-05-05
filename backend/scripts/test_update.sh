#!/bin/bash
# Test updating area for the property
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@goroomz.com","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

echo "Token: ${TOKEN:0:20}..."

curl -s -X PUT "http://localhost:5000/api/internal/platform/properties/23b31a7d-8b8f-4898-adb2-b79c9e979276" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"location":{"address":"Urban tech colive pg, BSR Paradise Rd, Kaverappa Layout, Kadubeesanahalli","area":"Kadubeesanahalli","city":"Bengaluru","state":"Karnataka","country":"India"}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:500])"
