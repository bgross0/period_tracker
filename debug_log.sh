#!/bin/bash
API="https://period-tracker-api.ben-8b4.workers.dev"
EMAIL="log_test_$(date +%s)@example.com"

# Register
TOKEN=$(curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test\",\"name\":\"Test\"}" | jq -r '.token')

# Onboard
curl -s -X POST "$API/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"last_period_start":"2025-11-01","average_cycle_length":28}' > /dev/null

echo "Creating log..."
curl -i -X POST "$API/logs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"log_date":"2025-11-01","mood":3,"energy":4}'
