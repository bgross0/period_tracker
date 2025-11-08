# Period Tracker - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │  Mobile App  │  │   Desktop    │          │
│  │   (React)    │  │ (React Native│  │     App      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                        HTTPS/REST
                             │
┌─────────────────────────────┼─────────────────────────────────┐
│                       API GATEWAY                              │
│                    (FastAPI Backend)                           │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              API Endpoints                                │ │
│  │  /users  /logs  /cycles  /predictions  /chat  /analytics │ │
│  └──────────────────────────────────────────────────────────┘ │
│                             │                                  │
│  ┌──────────────┬───────────┼───────────┬───────────────────┐ │
│  │              │           │           │                   │ │
│  │   Auth       │   Input   │  Business │   Response       │ │
│  │  Middleware  │ Validation│   Logic   │   Formatting     │ │
│  │              │ (Pydantic)│           │                   │ │
│  └──────────────┴───────────┴───────────┴───────────────────┘ │
└─────────────────────────────┼─────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   ML ENGINE     │  │   RAG SYSTEM    │  │   DATABASE      │
│  (Python)       │  │  (Groq + PG)    │  │  (PostgreSQL)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Detailed Component Architecture

### 1. Frontend Layer (React)

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │   Analytics  │  │   Chat UI    │     │
│  │  Component   │  │   Charts     │  │  Component   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│  ┌──────┴──────────────────┴──────────────────┴──────┐    │
│  │           Component State (React Hooks)            │    │
│  └────────────────────────┬───────────────────────────┘    │
│                           │                                │
│  ┌────────────────────────┴───────────────────────────┐    │
│  │         API Client (Axios)                         │    │
│  │  - Request interceptors                            │    │
│  │  - Response handlers                               │    │
│  │  - Error management                                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2. Backend API Layer (FastAPI)

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Request Flow                            │   │
│  │                                                      │   │
│  │  HTTP Request → CORS → Validation → Route Handler   │   │
│  │                              ↓                       │   │
│  │                      Business Logic                  │   │
│  │                              ↓                       │   │
│  │              Database/ML/RAG Operations             │   │
│  │                              ↓                       │   │
│  │                  Response Serialization              │   │
│  │                              ↓                       │   │
│  │                       HTTP Response                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Core Modules:                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   models.py  │  │  schemas.py  │  │   main.py    │     │
│  │  (SQLAlchemy)│  │  (Pydantic)  │  │  (Routes)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ ml_engine.py │  │ rag_system.py│  │  analytics   │     │
│  │  (Predictions)│  │   (Chat)    │  │   (Stats)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 3. Machine Learning Engine

```
┌─────────────────────────────────────────────────────────────┐
│                  ML Prediction Pipeline                      │
│                                                              │
│  Input: Historical Data                                     │
│         ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Data Preprocessing                           │  │
│  │  - Clean missing values                              │  │
│  │  - Feature engineering                               │  │
│  │  - Normalization                                     │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│         ┌───────────┴───────────┐                          │
│         ▼                       ▼                          │
│  ┌─────────────────┐   ┌─────────────────┐               │
│  │ Cycle Prediction│   │    Symptom      │               │
│  │   (Prophet)     │   │   Prediction    │               │
│  │                 │   │  (Frequency)    │               │
│  └─────────┬───────┘   └─────────┬───────┘               │
│            │                     │                         │
│            └──────────┬──────────┘                         │
│                       ▼                                    │
│            ┌──────────────────────┐                        │
│            │  Pattern Detection   │                        │
│            │  - Correlations      │                        │
│            │  - Phase patterns    │                        │
│            │  - Trends            │                        │
│            └──────────┬───────────┘                        │
│                       ▼                                    │
│            ┌──────────────────────┐                        │
│            │ Confidence Scoring   │                        │
│            │ & Validation         │                        │
│            └──────────┬───────────┘                        │
│                       ▼                                    │
│              Predictions Output                            │
└─────────────────────────────────────────────────────────────┘
```

### 4. RAG System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              RAG (Retrieval-Augmented Generation)           │
│                                                              │
│  User Query                                                 │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────┐           │
│  │  Query Embedding Generation                 │           │
│  │  (OpenAI text-embedding-3-small)            │           │
│  │  Input: "Why do I get headaches?"          │           │
│  │  Output: [0.023, -0.156, 0.891, ...]      │           │
│  └──────────────────┬──────────────────────────┘           │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────┐           │
│  │    Vector Similarity Search (pgvector)      │           │
│  │                                             │           │
│  │  SELECT * FROM log_embeddings               │           │
│  │  ORDER BY embedding <=> query_embedding     │           │
│  │  LIMIT 5;                                   │           │
│  └──────────────────┬──────────────────────────┘           │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────┐           │
│  │    Retrieve Top 5 Relevant Logs            │           │
│  │                                             │           │
│  │  1. July 15: Headache (severity 7)         │           │
│  │     during luteal phase                     │           │
│  │  2. June 12: Headache + irritability        │           │
│  │  3. May 28: Headache before period          │           │
│  │  ... (similarity scores)                    │           │
│  └──────────────────┬──────────────────────────┘           │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────┐           │
│  │    Context Assembly                         │           │
│  │                                             │           │
│  │  System: You are a menstrual health...     │           │
│  │  Context: User has history of headaches... │           │
│  │  Query: Why do I get headaches?            │           │
│  └──────────────────┬──────────────────────────┘           │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────┐           │
│  │    Groq API (Llama 3.1 70B)                │           │
│  │                                             │           │
│  │  Generates personalized response based on   │           │
│  │  user's actual symptom history              │           │
│  └──────────────────┬──────────────────────────┘           │
│                     ▼                                       │
│           Contextual Response                              │
└─────────────────────────────────────────────────────────────┘
```

### 5. Database Schema (PostgreSQL + pgvector)

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Structure                        │
│                                                              │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │    users     │        │    cycles    │                  │
│  ├──────────────┤        ├──────────────┤                  │
│  │ user_id (PK) │───┐ ┌─▶│ cycle_id (PK)│                  │
│  │ email        │   │ │  │ user_id (FK) │                  │
│  │ settings     │   │ │  │ start_date   │                  │
│  │ avg_cycle    │   │ │  │ cycle_length │                  │
│  └──────────────┘   │ │  └──────────────┘                  │
│                     │ │                                     │
│                     │ │  ┌──────────────┐                  │
│                     │ └──│  daily_logs  │                  │
│                     │    ├──────────────┤                  │
│                     └───▶│ log_id (PK)  │                  │
│                          │ user_id (FK) │                  │
│                          │ log_date     │                  │
│                          │ mood         │                  │
│                          │ symptoms     │◀──┐              │
│                          │ cycle_phase  │   │              │
│                          └──────────────┘   │              │
│                                             │              │
│  ┌──────────────────────┐                  │              │
│  │   log_embeddings     │                  │              │
│  ├──────────────────────┤                  │              │
│  │ embedding_id (PK)    │                  │              │
│  │ log_id (FK)          │──────────────────┘              │
│  │ embedding (vector)   │  ← pgvector column              │
│  │ embedding_text       │                                 │
│  └──────────────────────┘                                 │
│                                                              │
│  Vector Similarity:                                         │
│  SELECT * FROM log_embeddings                              │
│  ORDER BY embedding <=> '[query_vector]'::vector           │
│  LIMIT 5;                                                  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Daily Log Creation Flow

```
User → Frontend Form
         │
         ▼
    Validation
         │
         ▼
    POST /users/{id}/logs
         │
         ▼
    FastAPI Endpoint
         │
    ┌────┴────┐
    ▼         ▼
Create Log  Find/Create Cycle
    │         │
    └────┬────┘
         ▼
    Save to Database
         │
         ▼
    Generate Embedding
         │
         ▼
    Store in log_embeddings
         │
         ▼
    Return Response
```

### Chat Interaction Flow

```
User Message
     │
     ▼
POST /users/{id}/chat
     │
     ▼
Generate Query Embedding
     │
     ▼
Vector Similarity Search
     │
     ▼
Retrieve Top 5 Logs
     │
     ▼
Build Context Prompt
     │
     ▼
Groq API Call
     │
     ▼
Store Chat History
     │
     ▼
Return Response
```

### Prediction Generation Flow

```
GET /predictions/next-period
         │
         ▼
    Fetch Historical Cycles
         │
         ▼
    Data Validation
    (min 2-3 cycles)
         │
         ▼
    Prophet Model Training
         │
         ▼
    Generate Forecast
         │
         ▼
    Calculate Confidence
         │
         ▼
    Store Prediction
         │
         ▼
    Return Results
```

## Technology Stack Details

### Backend Technologies
```
┌──────────────────────────────────────┐
│ FastAPI 0.104+                       │
│ - Async support                      │
│ - Automatic API docs                 │
│ - Type validation                    │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ SQLAlchemy 2.0                       │
│ - ORM for database                   │
│ - Relationship management            │
│ - Query optimization                 │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ PostgreSQL 15 + pgvector 0.5+        │
│ - JSONB for flexible data            │
│ - Vector similarity search           │
│ - Full-text search                   │
└──────────────────────────────────────┘
```

### ML/AI Technologies
```
┌──────────────────────────────────────┐
│ scikit-learn 1.3+                    │
│ - Pattern detection                  │
│ - Statistical analysis               │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Prophet 1.1+                         │
│ - Time series forecasting            │
│ - Cycle prediction                   │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Groq API (Llama 3.1 70B)             │
│ - Fast inference                     │
│ - Natural language understanding     │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ OpenAI Embeddings API                │
│ - text-embedding-3-small             │
│ - 1536 dimensions                    │
└──────────────────────────────────────┘
```

## Performance Considerations

### Database Indexes
- `idx_daily_logs_user_date`: Speed up date range queries
- `idx_cycles_user`: Fast cycle lookups
- Vector index (IVFFlat): Efficient similarity search

### Caching Strategy
- User context summaries (5 min TTL)
- Prediction results (24 hour TTL)
- Symptom statistics (1 hour TTL)

### Optimization Techniques
- Connection pooling (SQLAlchemy)
- Lazy loading for relationships
- Paginated API responses
- Batch embedding generation
- Query result caching

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     HTTPS/TLS                     │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │     JWT Authentication            │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │     Input Validation (Pydantic)   │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │     SQL Injection Protection      │ │
│  │     (SQLAlchemy ORM)              │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │     Rate Limiting                 │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │     CORS Policy                   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

This architecture is designed to be:
- **Scalable**: Can handle growing user base with horizontal scaling
- **Maintainable**: Clear separation of concerns
- **Performant**: Optimized queries and caching
- **Secure**: Multiple layers of protection
- **Intelligent**: ML predictions and RAG-powered chat
- **Flexible**: JSONB for evolving data needs
