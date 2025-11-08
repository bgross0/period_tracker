#!/bin/bash

API="https://period-tracker-api.ben-8b4.workers.dev"
EMAIL="debug_$(date +%s)@example.com"

# Register
echo "1. Registering..."
curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123\",\"name\":\"Debug\"}" > /tmp/reg.json

cat /tmp/reg.json
TOKEN=$(cat /tmp/reg.json | jq -r '.token')
echo ""
echo "Token: $TOKEN"

# Onboarding
echo ""
echo "2. Onboarding..."
curl -s -X POST "$API/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"last_period_start":"2025-11-01","average_cycle_length":28,"regularity":"regular"}' > /tmp/onboard.json

cat /tmp/onboard.json | jq '.'

# Try logging
echo ""
echo "3. Creating log..."
curl -s -X POST "$API/logs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"log_date":"2025-11-01","mood":3,"energy":4}' | jq '.'
