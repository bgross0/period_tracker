# Period Tracker - AI-Powered Menstrual Health App

A comprehensive period tracking application with ML predictions, RAG-powered chatbot, and data visualization capabilities. Built for women to understand their menstrual cycles, track patterns, and gain insights into their health.

## 🌟 Features

### Core Tracking
- **Daily Logging**: Track menstrual flow, moods, symptoms, energy levels, and sleep
- **Cycle Management**: Automatic cycle detection and phase tracking
- **Flexible Symptom Tracking**: Log 15+ common symptoms with severity ratings
- **Sleep Integration**: Track sleep hours and quality for luteal phase analysis

### AI & ML Features
- **Cycle Predictions**: ML-powered predictions for next period start date
- **Symptom Forecasting**: Predict likely symptoms based on historical patterns
- **Early Warning System**: Get alerts for upcoming symptoms and changes
- **Pattern Detection**: Automatic identification of correlations and trends

### RAG-Powered Chat
- **Context-Aware Assistant**: Chatbot that remembers your history using vector embeddings
- **Groq API Integration**: Fast, intelligent responses about menstrual health
- **Semantic Search**: Retrieves relevant past logs for personalized answers
- **Natural Conversations**: Ask questions about patterns, symptoms, and health

### Analytics & Visualization
- **Cycle Statistics**: Average length, regularity scores, and trends
- **Symptom Analysis**: Frequency and phase correlations
- **Mood Patterns**: Track emotional changes across cycle phases
- **Energy & Sleep Trends**: Visualize how your body changes throughout the cycle

## 🏗️ Architecture

### Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL 15 with pgvector extension
- SQLAlchemy ORM
- scikit-learn + Prophet for ML predictions

**AI/ML:**
- Groq API (Llama 3.1 70B) for chat
- OpenAI Embeddings (text-embedding-3-small) for RAG
- pgvector for semantic similarity search

**Frontend:**
- React 18
- Recharts for data visualization
- Tailwind CSS for styling
- Axios for API calls

### Database Schema

The system uses PostgreSQL with the following key tables:
- `users`: User accounts and settings
- `cycles`: Menstrual cycle records
- `daily_logs`: Daily tracking data (mood, symptoms, sleep, etc.)
- `log_embeddings`: Vector embeddings for RAG (1536 dimensions)
- `predictions`: ML-generated predictions
- `insights`: Detected patterns and correlations
- `chat_messages`: Conversation history

### RAG System Architecture

```
User Query → Generate Embedding → Vector Similarity Search (pgvector)
                                           ↓
                                   Top 5 Relevant Logs
                                           ↓
                      Build Context → Groq API → Response
```

The RAG system:
1. Converts daily logs into readable text summaries
2. Generates embeddings using OpenAI's API
3. Stores in PostgreSQL with pgvector
4. Uses cosine similarity for semantic search
5. Provides relevant context to Groq for personalized responses

### ML Prediction Pipeline

**Cycle Prediction:**
- Uses Facebook Prophet for time series forecasting
- Calculates regularity scores based on cycle length variance
- Predicts ovulation windows (14 days before expected period)

**Symptom Prediction:**
- Frequency-based analysis by cycle phase
- Historical pattern matching
- Probability scoring for each symptom

**Pattern Detection:**
- Correlation analysis (e.g., sleep quality vs mood)
- Symptom clustering by cycle phase
- Energy level trends across phases

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Groq API Key ([get one here](https://console.groq.com))
- OpenAI API Key (for embeddings)

### Quick Start with Docker

1. **Clone the repository:**
```bash
git clone <repo-url>
cd period_tracker
```

2. **Create environment file:**
```bash
cat > .env << EOF
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://tracker_user:secure_password_change_me@db:5432/period_tracker
EOF
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Initialize the database:**
```bash
docker-compose exec backend python -c "
from models import Base
from main import engine
Base.metadata.create_all(bind=engine)
print('Database initialized!')
"
```

5. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup (Without Docker)

**Backend Setup:**

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up PostgreSQL with pgvector
createdb period_tracker
psql period_tracker -c "CREATE EXTENSION vector;"

# Run migrations
python -c "from models import Base; from main import engine; Base.metadata.create_all(bind=engine)"

# Start backend
uvicorn main:app --reload
```

**Frontend Setup:**

```bash
cd frontend
npm install
npm start
```

## 📊 API Endpoints

### Daily Logs
- `POST /users/{user_id}/logs` - Create daily log
- `GET /users/{user_id}/logs` - Get logs (with date filters)
- `PUT /users/{user_id}/logs/{date}` - Update log

### Cycles
- `POST /users/{user_id}/cycles` - Start new cycle
- `GET /users/{user_id}/cycles` - Get cycle history

### Predictions
- `GET /users/{user_id}/predictions/next-period` - Predict next period
- `GET /users/{user_id}/predictions/symptoms` - Predict symptoms
- `GET /users/{user_id}/warnings` - Get early warnings

### Analytics
- `GET /users/{user_id}/analytics` - Comprehensive stats
- `GET /users/{user_id}/insights` - AI-detected patterns

### Chat
- `POST /users/{user_id}/chat` - Send message to AI assistant
- `GET /users/{user_id}/chat/history` - Get conversation history

Full API documentation available at: http://localhost:8000/docs

## 🔧 Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/period_tracker
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key

# Optional
GROQ_MODEL=llama-3.1-70b-versatile  # Default model
EMBEDDING_MODEL=text-embedding-3-small  # OpenAI embedding model
```

### Database Configuration

The app uses PostgreSQL with pgvector. Key configurations:
- Vector dimension: 1536 (matches OpenAI embeddings)
- Similarity metric: Cosine similarity
- Index type: IVFFlat for fast similarity search

## 🧪 Testing

### Test the ML Engine:

```python
from ml_engine import CyclePredictionEngine

engine = CyclePredictionEngine()

# Test cycle prediction
cycles = [
    {'start_date': datetime(2024, 1, 1), 'cycle_length': 28},
    {'start_date': datetime(2024, 1, 29), 'cycle_length': 30},
    {'start_date': datetime(2024, 2, 28), 'cycle_length': 27}
]

prediction = engine.predict_next_cycle(cycles)
print(f"Next period predicted: {prediction['predicted_start_date']}")
print(f"Confidence: {prediction['confidence_score']}")
```

### Test the RAG System:

```python
from rag_system import RAGChatSystem

rag = RAGChatSystem(groq_api_key="your_key")

response = rag.chat(
    db=session,
    user_id="user_123",
    message="Why do I get headaches before my period?",
    include_context=True
)

print(response['response'])
```

## 📈 ML Models & Algorithms

### Cycle Length Prediction
- **Algorithm**: Facebook Prophet time series forecasting
- **Features**: Historical cycle lengths, temporal patterns
- **Confidence Calculation**: Based on cycle regularity (std deviation)

### Symptom Prediction
- **Algorithm**: Frequency-based with phase correlation
- **Features**: Cycle phase, historical symptom occurrence
- **Output**: Probability score for each symptom

### Pattern Detection
- **Algorithms**: 
  - Pearson correlation for continuous variables
  - Frequency analysis for categorical data
  - Phase-based clustering
- **Detected Patterns**:
  - Sleep-mood correlations
  - Symptom phase preferences
  - Energy level fluctuations

### Regularity Score
```python
regularity = 100 * (1 - std_deviation / mean_cycle_length)
```
- Score 90-100: Very regular
- Score 70-89: Regular
- Score <70: Irregular

## 🔐 Security Considerations

**For Production Deployment:**

1. **Authentication**: Implement JWT or OAuth2
2. **HTTPS**: Use SSL certificates
3. **API Rate Limiting**: Add rate limits to prevent abuse
4. **Input Validation**: Already included via Pydantic
5. **Database Security**: Use environment variables, not hardcoded credentials
6. **CORS**: Configure allowed origins properly
7. **API Keys**: Store in environment variables or secrets manager

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Export data to PDF/CSV
- [ ] Integration with wearables (Fitbit, Apple Health)
- [ ] Medication tracking
- [ ] Fertility window calculator
- [ ] Community features (anonymous data insights)
- [ ] Multi-language support
- [ ] Dark mode

## 🤝 Contributing

This is a personal health tracking app. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

[Choose appropriate license - MIT, Apache 2.0, etc.]

## ⚠️ Disclaimer

This app is for informational purposes only and is not a substitute for professional medical advice. Always consult with healthcare providers for medical concerns.

## 🙏 Acknowledgments

- Built with [Groq](https://groq.com) for fast LLM inference
- Uses [Facebook Prophet](https://facebook.github.io/prophet/) for time series predictions
- Powered by [pgvector](https://github.com/pgvector/pgvector) for vector similarity search

---

**Built with ❤️ for better menstrual health awareness**
