#!/bin/bash

# API Test Script for Period Tracker
API_URL="https://period-tracker-api.ben-8b4.workers.dev"

echo "🧪 Testing Period Tracker API..."
echo "================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
curl -s "$API_URL/health" | jq '.'
echo ""

# Test 2: Register User
echo "2️⃣  Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "name": "Test User",
    "date_of_birth": "1995-05-15",
    "average_cycle_length": 28
  }')

echo "$REGISTER_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Registration failed or user already exists. Trying login..."

  # Try login instead
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "testpass123"
    }')

  echo "$LOGIN_RESPONSE" | jq '.'
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
fi

echo "🔑 Token: $TOKEN"
echo ""

# Test 3: Get User Info
echo "3️⃣  Getting user info..."
curl -s "$API_URL/users/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 4: Start a Cycle
echo "4️⃣  Starting a new cycle..."
curl -s -X POST "$API_URL/cycles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-01-01"
  }' | jq '.'
echo ""

# Test 5: Create Daily Logs
echo "5️⃣  Creating daily logs..."
for day in {1..5}; do
  DATE="2025-01-0${day}"
  echo "Creating log for $DATE..."
  curl -s -X POST "$API_URL/logs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"log_date\": \"$DATE\",
      \"cycle_phase\": \"menstrual\",
      \"flow_level\": 3,
      \"mood\": \"tired\",
      \"mood_intensity\": 2,
      \"energy_level\": 3,
      \"sleep_hours\": 7.5,
      \"sleep_quality\": 4,
      \"symptoms\": [\"cramps\", \"bloating\"],
      \"symptom_severity\": {\"cramps\": 3, \"bloating\": 2},
      \"notes\": \"Feeling okay, some cramping\"
    }" | jq -c '{log_id, log_date, mood, energy_level}'
done
echo ""

# Test 6: Get Logs
echo "6️⃣  Retrieving logs..."
curl -s "$API_URL/logs?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:3]'
echo ""

# Test 7: Get Cycles
echo "7️⃣  Getting cycles..."
curl -s "$API_URL/cycles" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 8: Start another cycle for predictions
echo "8️⃣  Creating second cycle for predictions..."
curl -s -X POST "$API_URL/cycles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-01-29"
  }' | jq '.'
echo ""

# Add logs for second cycle
for day in {29..31}; do
  DATE="2025-01-${day}"
  echo "Creating log for $DATE..."
  curl -s -X POST "$API_URL/logs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"log_date\": \"$DATE\",
      \"cycle_phase\": \"menstrual\",
      \"flow_level\": 2,
      \"mood\": \"good\",
      \"mood_intensity\": 4,
      \"energy_level\": 4,
      \"sleep_hours\": 8,
      \"sleep_quality\": 5,
      \"symptoms\": [\"mild_cramps\"],
      \"symptom_severity\": {\"mild_cramps\": 1},
      \"notes\": \"Feeling better\"
    }" | jq -c '{log_id, log_date, mood}'
done
echo ""

# Test 9: Get Analytics
echo "9️⃣  Getting analytics..."
curl -s "$API_URL/analytics" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 10: Predict Next Period
echo "🔟 Predicting next period..."
curl -s "$API_URL/predictions/next-period" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 11: Get Early Warnings
echo "1️⃣1️⃣  Getting early warnings..."
curl -s "$API_URL/warnings" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test 12: Get Insights
echo "1️⃣2️⃣  Getting insights..."
curl -s "$API_URL/insights" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "✅ All tests completed!"
echo ""
echo "📝 Note: Chat endpoint requires GROQ_API_KEY to be set in Cloudflare"
echo "   Test it manually with:"
echo "   curl -X POST $API_URL/chat \\"
echo "     -H 'Authorization: Bearer $TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"message\": \"How am I feeling this cycle?\"}'"
