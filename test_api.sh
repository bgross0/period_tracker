#!/bin/bash

# V2 API Testing Script
API_URL="https://period-tracker-api.ben-8b4.workers.dev"

echo "=========================================="
echo "Period Tracker V2 API Test Suite"
echo "=========================================="

RANDOM_EMAIL="test_v2_$(date +%s)@example.com"
echo -e "\n📧 Test User: $RANDOM_EMAIL"

# 1. Register User
echo -e "\n1️⃣  Testing Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$RANDOM_EMAIL\",
    \"password\": \"testpass123\",
    \"name\": \"Test User V2\"
  }")

echo "$REGISTER_RESPONSE" | jq '.'
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo "✅ Registration successful!"
else
  echo "❌ Registration failed!"
  exit 1
fi

# 2. Complete Onboarding
echo -e "\n2️⃣  Testing Onboarding..."
ONBOARDING_RESPONSE=$(curl -s -X POST "$API_URL/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "last_period_start": "2025-11-01",
    "average_cycle_length": 28,
    "average_period_length": 5,
    "regularity": "regular",
    "track_mood": true,
    "track_energy": true,
    "track_sleep": true,
    "track_symptoms": true,
    "track_flow": true,
    "track_remedies": true
  }')

echo "$ONBOARDING_RESPONSE" | jq '.'

# 3. Get Context-Aware Daily Questions
echo -e "\n3️⃣  Testing Context-Aware Questions..."
echo "Day 1 (Menstrual - should ask about flow):"
QUESTIONS=$(curl -s -X GET "$API_URL/daily/questions?date=2025-11-01" \
  -H "Authorization: Bearer $TOKEN")
echo "$QUESTIONS" | jq '.questions[] | {id, label}'

echo -e "\nDay 15 (Ovulation - should NOT ask about flow):"
QUESTIONS15=$(curl -s -X GET "$API_URL/daily/questions?date=2025-11-15" \
  -H "Authorization: Bearer $TOKEN")
echo "$QUESTIONS15" | jq '.questions[] | {id, label}'

# 4. Log Daily Entry
echo -e "\n4️⃣  Testing Daily Log..."
LOG_RESPONSE=$(curl -s -X POST "$API_URL/logs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "log_date": "2025-11-01",
    "mood": 3,
    "energy": 2,
    "flow_level": 4,
    "symptoms": ["cramps", "bloating"],
    "sleep_quality": 4,
    "sleep_hours": 7.5
  }')

echo "$LOG_RESPONSE" | jq '.'
LOG_ID=$(echo "$LOG_RESPONSE" | jq -r '.log_id')

# 5. Test Remedy Suggestions
echo -e "\n5️⃣  Testing Remedy Suggestions..."
REMEDIES=$(curl -s -X GET "$API_URL/remedies/suggestions?symptom=cramps" \
  -H "Authorization: Bearer $TOKEN")
echo "Top 3 remedies for cramps:"
echo "$REMEDIES" | jq '.available_remedies[0:3] | .[] | {name, description}'

# 6. Track Remedy Effectiveness
echo -e "\n6️⃣  Testing Remedy Tracking..."
curl -s -X POST "$API_URL/remedies/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"remedy_id\": \"rem_heating_pad\",
    \"symptom\": \"cramps\",
    \"log_id\": \"$LOG_ID\",
    \"effectiveness\": 5
  }" | jq '.'

# 7. Check Streaks
echo -e "\n7️⃣  Testing Streaks..."
curl -s -X GET "$API_URL/streaks" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 8. Dashboard
echo -e "\n8️⃣  Testing Dashboard..."
curl -s -X GET "$API_URL/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq '{cycle_day, phase, next_period, streak, total_logs}'

# 9. Test Chat
echo -e "\n9️⃣  Testing RAG Chat (No Diagnoses)..."
CHAT=$(curl -s -X POST "$API_URL/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "I have cramps, what should I try?"
  }')
echo "$CHAT" | jq -r '.response' | head -c 300
echo "..."

echo -e "\n=========================================="
echo "✅ V2 Test Complete!"
echo "=========================================="
