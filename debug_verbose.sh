#!/bin/bash
API="https://period-tracker-api.ben-8b4.workers.dev"
EMAIL="verbose_$(date +%s)@example.com"

TOKEN=$(curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test\",\"name\":\"Test\"}" | jq -r '.token')

echo "Token obtained"
echo ""
echo "Testing onboarding with verbose output..."
echo "==========================================="

curl -i -X POST "$API/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"last_period_start":"2025-11-01","average_cycle_length":28,"regularity":"regular"}'
