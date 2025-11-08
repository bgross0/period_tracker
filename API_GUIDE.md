# API Usage Guide

Complete guide for testing and using the Period Tracker API endpoints.

## Base URL

```
Development: http://localhost:8000
Production: https://your-domain.com/api
```

## Authentication

Currently, the API uses user_id-based authentication (simplified for MVP).
For production, implement JWT tokens.

---

## User Management

### Create User

```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "average_cycle_length": 28
  }'
```

**Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jane@example.com",
  "average_cycle_length": 28,
  "created_at": "2024-11-06T10:00:00"
}
```

### Get User

```bash
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000
```

---

## Daily Logs

### Create Daily Log

```bash
curl -X POST http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/logs \
  -H "Content-Type: application/json" \
  -d '{
    "log_date": "2024-11-06",
    "flow_level": "medium",
    "mood": "happy",
    "mood_intensity": 7,
    "energy_level": 8,
    "sleep_hours": 7.5,
    "sleep_quality": 8,
    "sleep_disruptions": 1,
    "symptoms": ["cramps", "bloating"],
    "symptom_severity": {
      "cramps": 5,
      "bloating": 3
    },
    "cramps_severity": 5,
    "notes": "Feeling good overall, mild cramping in the morning"
  }'
```

**Response:**
```json
{
  "log_id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "log_date": "2024-11-06",
  "flow_level": "medium",
  "mood": "happy",
  "mood_intensity": 7,
  "energy_level": 8,
  "sleep_hours": 7.5,
  "sleep_quality": 8,
  "symptoms": ["cramps", "bloating"],
  "cycle_phase": "menstrual",
  "cycle_day": 2,
  "created_at": "2024-11-06T10:05:00",
  "updated_at": "2024-11-06T10:05:00"
}
```

### Get Daily Logs

```bash
# Get all logs
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/logs

# Filter by date range
curl "http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/logs?start_date=2024-10-01&end_date=2024-11-06&limit=50"
```

### Update Daily Log

```bash
curl -X PUT http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/logs/2024-11-06 \
  -H "Content-Type: application/json" \
  -d '{
    "energy_level": 9,
    "notes": "Energy improved throughout the day"
  }'
```

---

## Cycle Management

### Start New Cycle

```bash
curl -X POST http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/cycles \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-11-05"
  }'
```

**Response:**
```json
{
  "cycle_id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "cycle_number": 3,
  "start_date": "2024-11-05",
  "end_date": null,
  "cycle_length": null,
  "period_length": null,
  "is_predicted": false,
  "created_at": "2024-11-05T08:00:00"
}
```

### Get Cycle History

```bash
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/cycles?limit=12
```

---

## Predictions

### Predict Next Period

```bash
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/predictions/next-period
```

**Response:**
```json
{
  "predicted_start_date": "2024-12-03",
  "predicted_cycle_length": 28,
  "confidence_score": 0.85,
  "method": "prophet_time_series",
  "regularity_score": 0.92
}
```

### Predict Symptoms

```bash
# Predict for today
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/predictions/symptoms

# Predict for specific date
curl "http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/predictions/symptoms?target_date=2024-11-15"
```

**Response:**
```json
{
  "predictions": {
    "cramps": {
      "probability": 0.75,
      "severity_estimate": 6.5
    },
    "bloating": {
      "probability": 0.65,
      "severity_estimate": 5.2
    },
    "fatigue": {
      "probability": 0.55,
      "severity_estimate": 6.0
    }
  },
  "confidence_score": 0.65,
  "target_date": "2024-11-15"
}
```

### Get Early Warnings

```bash
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/warnings
```

**Response:**
```json
{
  "warnings": [
    {
      "type": "period_warning",
      "severity": "medium",
      "title": "Period Expected Soon",
      "description": "Your period is likely to start in the next 1-3 days based on your cycle pattern.",
      "recommendations": [
        "Keep supplies handy",
        "Consider lighter exercise if you typically experience fatigue",
        "Stay hydrated"
      ],
      "estimated_date": "2024-12-03"
    },
    {
      "type": "symptom_warning",
      "severity": "low",
      "title": "PMS Symptoms May Occur",
      "description": "Based on your history, you may experience cramps, mood_swings during this luteal phase.",
      "recommendations": [
        "Monitor your symptoms",
        "Practice stress-reduction techniques",
        "Maintain regular sleep schedule"
      ]
    }
  ]
}
```

---

## Analytics

### Get Comprehensive Analytics

```bash
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/analytics
```

**Response:**
```json
{
  "cycle_stats": {
    "average_cycle_length": 28.5,
    "average_period_length": 4.8,
    "shortest_cycle": 26,
    "longest_cycle": 31,
    "total_cycles": 12,
    "regularity_score": 92.5
  },
  "top_symptoms": [
    {
      "symptom": "cramps",
      "frequency": 45,
      "average_severity": 6.2,
      "most_common_phase": "menstrual",
      "phase_breakdown": {
        "menstrual": 40,
        "luteal": 5
      }
    },
    {
      "symptom": "bloating",
      "frequency": 38,
      "average_severity": 5.5,
      "most_common_phase": "luteal",
      "phase_breakdown": {
        "luteal": 30,
        "menstrual": 8
      }
    }
  ],
  "mood_patterns": [],
  "sleep_trends": {},
  "energy_trends": {}
}
```

### Get AI Insights

```bash
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/insights
```

**Response:**
```json
[
  {
    "insight_id": "880e8400-e29b-41d4-a716-446655440003",
    "insight_type": "correlation",
    "title": "Sleep Quality & Mood Connection",
    "description": "Your sleep quality positively correlates with your mood (r=0.72). Better sleep tends to mean better mood.",
    "confidence_score": 0.72,
    "data_points": {
      "correlation": 0.72
    },
    "date_identified": "2024-11-06T10:00:00",
    "is_active": true
  },
  {
    "insight_id": "990e8400-e29b-41d4-a716-446655440004",
    "insight_type": "pattern",
    "title": "Cramps Pattern Detected",
    "description": "You experience cramps primarily during the menstrual phase (89% of the time).",
    "confidence_score": 0.89,
    "data_points": {
      "phase": "menstrual",
      "concentration": 0.89
    },
    "date_identified": "2024-11-06T10:00:00",
    "is_active": true
  }
]
```

---

## Chat with AI Assistant

### Send Message

```bash
curl -X POST http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Why do I always get headaches before my period?",
    "include_context": true
  }'
```

**Response:**
```json
{
  "response": "Based on your tracking history, I can see you've experienced headaches primarily during the luteal phase of your cycle, about 1-3 days before your period starts. This is a common symptom called menstrual migraines or premenstrual headaches.\n\nLooking at your data, you've logged headaches on:\n- October 28 (2 days before period)\n- September 24 (3 days before period)\n- August 26 (1 day before period)\n\nThese headaches are typically caused by the drop in estrogen levels that happens right before menstruation. Some things that might help:\n\n1. Stay well hydrated during this time\n2. Maintain regular sleep schedules (I notice your sleep quality tends to drop during this phase)\n3. Consider keeping track of what triggers make them worse\n4. Discuss with your doctor about preventive options if they're severe\n\nI also notice your headaches seem to correlate with lower sleep quality. Improving your sleep during the luteal phase might help reduce their intensity.",
  "relevant_context": [
    {
      "log_id": "...",
      "embedding_text": "October 28: Luteal phase, headache severity 7...",
      "similarity": 0.89
    }
  ],
  "tokens_used": 456
}
```

### Get Chat History

```bash
curl http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/chat/history?limit=20
```

---

## Batch Operations

### Bulk Log Creation

```bash
# Create logs for the past week
for i in {1..7}; do
  date=$(date -d "$i days ago" +%Y-%m-%d)
  curl -X POST http://localhost:8000/users/550e8400-e29b-41d4-a716-446655440000/logs \
    -H "Content-Type: application/json" \
    -d "{
      \"log_date\": \"$date\",
      \"mood\": \"happy\",
      \"energy_level\": 7,
      \"sleep_hours\": 7.5
    }" &
done
wait
```

---

## Testing Scenarios

### Scenario 1: New User Onboarding

```bash
# 1. Create user
USER_ID=$(curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' | jq -r '.user_id')

echo "Created user: $USER_ID"

# 2. Start first cycle
curl -X POST http://localhost:8000/users/$USER_ID/cycles \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2024-11-01"}'

# 3. Add first log
curl -X POST http://localhost:8000/users/$USER_ID/logs \
  -H "Content-Type: application/json" \
  -d '{
    "log_date": "2024-11-01",
    "flow_level": "medium",
    "mood": "happy",
    "energy_level": 7
  }'
```

### Scenario 2: Complete Cycle Tracking

```bash
USER_ID="your-user-id"

# Log period days (1-5)
for day in {1..5}; do
  date=$(date -d "2024-11-01 +$day days" +%Y-%m-%d)
  flow="medium"
  [ $day -eq 1 ] && flow="light"
  [ $day -eq 2 ] && flow="heavy"
  [ $day -eq 4 ] && flow="light"
  [ $day -eq 5 ] && flow="spotting"
  
  curl -X POST http://localhost:8000/users/$USER_ID/logs \
    -H "Content-Type: application/json" \
    -d "{
      \"log_date\": \"$date\",
      \"flow_level\": \"$flow\",
      \"mood\": \"calm\",
      \"energy_level\": 6,
      \"sleep_hours\": 7,
      \"symptoms\": [\"cramps\", \"fatigue\"]
    }"
done
```

### Scenario 3: Chat Interaction

```bash
USER_ID="your-user-id"

# Ask about patterns
curl -X POST http://localhost:8000/users/$USER_ID/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What patterns do you notice in my data?"}'

# Ask about specific symptom
curl -X POST http://localhost:8000/users/$USER_ID/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "When do I usually experience bloating?"}'

# Ask for advice
curl -X POST http://localhost:8000/users/$USER_ID/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How can I improve my sleep during my luteal phase?"}'
```

---

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Log already exists for this date"
}
```

### 404 Not Found

```json
{
  "detail": "User not found"
}
```

### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "energy_level"],
      "msg": "ensure this value is less than or equal to 10",
      "type": "value_error.number.not_le"
    }
  ]
}
```

---

## Rate Limits

```
General endpoints: 100 requests/minute
Chat endpoint: 20 requests/minute
Predictions: 10 requests/minute
```

---

## WebSocket Support (Future)

For real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/users/USER_ID');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New insight:', data);
};
```

---

## API Changelog

### v1.0.0 (Current)
- Initial release
- User management
- Daily logging
- Cycle tracking
- ML predictions
- RAG-powered chat
- Analytics

### Planned (v1.1.0)
- Export data (CSV/PDF)
- Medication tracking
- Custom symptom types
- Multi-language support
- Wearable integration

---

## Interactive API Documentation

Visit: http://localhost:8000/docs

Swagger UI with:
- Interactive endpoint testing
- Request/response schemas
- Authentication testing
- Example values

## Support

For API issues:
- GitHub: [Create an issue]
- Email: support@periodtracker.com
- Docs: https://docs.periodtracker.com
