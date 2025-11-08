from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from typing import List, Optional
from datetime import datetime, date, timedelta
import os
from dotenv import load_dotenv

from models import Base, User, DailyLog, Cycle, Prediction, Insight
from schemas import *
from ml_engine import CyclePredictionEngine
from rag_system import RAGChatSystem

load_dotenv()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/period_tracker")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize ML and RAG systems
ml_engine = CyclePredictionEngine()
rag_system = RAGChatSystem(
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.1-70b-versatile"
)

# FastAPI app
app = FastAPI(
    title="Period Tracker API",
    description="AI-powered menstrual cycle tracking with ML predictions and RAG-based chat",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ========== User Endpoints ==========
@app.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user details"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ========== Daily Log Endpoints ==========
@app.post("/users/{user_id}/logs", response_model=DailyLogResponse, status_code=status.HTTP_201_CREATED)
def create_daily_log(user_id: str, log: DailyLogCreate, db: Session = Depends(get_db)):
    """Create a new daily log entry"""
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for existing log on this date
    existing_log = db.query(DailyLog).filter(
        DailyLog.user_id == user_id,
        DailyLog.log_date == log.log_date
    ).first()
    
    if existing_log:
        raise HTTPException(status_code=400, detail="Log already exists for this date")
    
    # Find or create cycle
    cycle = db.query(Cycle).filter(
        Cycle.user_id == user_id,
        Cycle.start_date <= log.log_date,
        (Cycle.end_date >= log.log_date) | (Cycle.end_date == None)
    ).first()
    
    # Calculate cycle day
    cycle_day = None
    if cycle:
        cycle_day = (log.log_date - cycle.start_date).days + 1
    
    # Create log
    db_log = DailyLog(
        user_id=user_id,
        cycle_id=cycle.cycle_id if cycle else None,
        cycle_day=cycle_day,
        **log.dict()
    )
    
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    # Generate and store embedding for RAG
    log_data = {
        'log_date': db_log.log_date,
        'cycle_phase': db_log.cycle_phase,
        'cycle_day': db_log.cycle_day,
        'flow_level': db_log.flow_level,
        'mood': db_log.mood,
        'mood_intensity': db_log.mood_intensity,
        'energy_level': db_log.energy_level,
        'sleep_hours': db_log.sleep_hours,
        'sleep_quality': db_log.sleep_quality,
        'symptoms': db_log.symptoms,
        'symptom_severity': db_log.symptom_severity,
        'notes': db_log.notes
    }
    
    try:
        rag_system.store_log_embedding(db, str(db_log.log_id), user_id, log_data)
    except Exception as e:
        print(f"Warning: Failed to store embedding: {e}")
    
    return db_log


@app.get("/users/{user_id}/logs", response_model=List[DailyLogResponse])
def get_daily_logs(
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get daily logs for a user"""
    query = db.query(DailyLog).filter(DailyLog.user_id == user_id)
    
    if start_date:
        query = query.filter(DailyLog.log_date >= start_date)
    if end_date:
        query = query.filter(DailyLog.log_date <= end_date)
    
    logs = query.order_by(DailyLog.log_date.desc()).limit(limit).all()
    return logs


@app.put("/users/{user_id}/logs/{log_date}", response_model=DailyLogResponse)
def update_daily_log(
    user_id: str,
    log_date: date,
    log_update: DailyLogUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing daily log"""
    db_log = db.query(DailyLog).filter(
        DailyLog.user_id == user_id,
        DailyLog.log_date == log_date
    ).first()
    
    if not db_log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    # Update fields
    update_data = log_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_log, field, value)
    
    db.commit()
    db.refresh(db_log)
    
    # Update embedding
    log_data = {
        'log_date': db_log.log_date,
        'cycle_phase': db_log.cycle_phase,
        'cycle_day': db_log.cycle_day,
        'flow_level': db_log.flow_level,
        'mood': db_log.mood,
        'mood_intensity': db_log.mood_intensity,
        'energy_level': db_log.energy_level,
        'sleep_hours': db_log.sleep_hours,
        'sleep_quality': db_log.sleep_quality,
        'symptoms': db_log.symptoms,
        'symptom_severity': db_log.symptom_severity,
        'notes': db_log.notes
    }
    
    try:
        rag_system.store_log_embedding(db, str(db_log.log_id), user_id, log_data)
    except Exception as e:
        print(f"Warning: Failed to update embedding: {e}")
    
    return db_log


# ========== Cycle Endpoints ==========
@app.post("/users/{user_id}/cycles", response_model=CycleResponse, status_code=status.HTTP_201_CREATED)
def start_new_cycle(user_id: str, cycle: CycleCreate, db: Session = Depends(get_db)):
    """Start a new menstrual cycle"""
    # Close previous cycle if exists
    previous_cycle = db.query(Cycle).filter(
        Cycle.user_id == user_id,
        Cycle.end_date == None
    ).first()
    
    if previous_cycle:
        previous_cycle.end_date = cycle.start_date - timedelta(days=1)
        previous_cycle.cycle_length = (previous_cycle.end_date - previous_cycle.start_date).days + 1
        db.commit()
    
    # Get cycle number
    last_cycle = db.query(Cycle).filter(
        Cycle.user_id == user_id
    ).order_by(Cycle.cycle_number.desc()).first()
    
    cycle_number = (last_cycle.cycle_number + 1) if last_cycle else 1
    
    # Create new cycle
    db_cycle = Cycle(
        user_id=user_id,
        start_date=cycle.start_date,
        cycle_number=cycle_number
    )
    
    db.add(db_cycle)
    db.commit()
    db.refresh(db_cycle)
    
    return db_cycle


@app.get("/users/{user_id}/cycles", response_model=List[CycleResponse])
def get_cycles(user_id: str, limit: int = 12, db: Session = Depends(get_db)):
    """Get user's cycle history"""
    cycles = db.query(Cycle).filter(
        Cycle.user_id == user_id
    ).order_by(Cycle.start_date.desc()).limit(limit).all()
    
    return cycles


# ========== Prediction Endpoints ==========
@app.get("/users/{user_id}/predictions/next-period")
def predict_next_period(user_id: str, db: Session = Depends(get_db)):
    """Predict the next menstrual period"""
    # Get historical cycles
    cycles = db.query(Cycle).filter(
        Cycle.user_id == user_id,
        Cycle.cycle_length != None
    ).order_by(Cycle.start_date.desc()).limit(12).all()
    
    if len(cycles) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 complete cycles needed for prediction"
        )
    
    # Convert to dict format
    cycle_data = [
        {
            'start_date': c.start_date,
            'cycle_length': c.cycle_length,
            'period_length': c.period_length
        }
        for c in cycles
    ]
    
    # Make prediction
    prediction = ml_engine.predict_next_cycle(cycle_data)
    
    # Store prediction
    db_prediction = Prediction(
        user_id=user_id,
        prediction_type='next_period',
        predicted_date=prediction['predicted_start_date'],
        predicted_value=prediction,
        confidence_score=prediction['confidence_score'],
        model_version='v1.0'
    )
    
    db.add(db_prediction)
    db.commit()
    
    return prediction


@app.get("/users/{user_id}/predictions/symptoms")
def predict_symptoms(
    user_id: str,
    target_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Predict likely symptoms for a future date"""
    if target_date is None:
        target_date = date.today()
    
    # Get historical logs
    logs = db.query(DailyLog).filter(
        DailyLog.user_id == user_id
    ).order_by(DailyLog.log_date.desc()).limit(90).all()
    
    if len(logs) < 30:
        raise HTTPException(
            status_code=400,
            detail="At least 30 days of logs needed for symptom prediction"
        )
    
    # Convert to dict format
    log_data = [
        {
            'log_date': log.log_date,
            'cycle_phase': log.cycle_phase,
            'cycle_day': log.cycle_day,
            'symptoms': log.symptoms,
            'symptom_severity': log.symptom_severity,
            'mood': log.mood,
            'energy_level': log.energy_level
        }
        for log in logs
    ]
    
    # Make prediction
    prediction = ml_engine.predict_symptoms(log_data, target_date)
    
    return prediction


@app.get("/users/{user_id}/warnings")
def get_early_warnings(user_id: str, db: Session = Depends(get_db)):
    """Get early warning system alerts"""
    # Get recent logs
    logs = db.query(DailyLog).filter(
        DailyLog.user_id == user_id
    ).order_by(DailyLog.log_date.desc()).limit(90).all()
    
    if len(logs) < 14:
        return {"warnings": [], "message": "More data needed for warnings"}
    
    # Convert to dict format
    log_data = [
        {
            'log_date': log.log_date,
            'cycle_phase': log.cycle_phase,
            'cycle_day': log.cycle_day,
            'symptoms': log.symptoms,
            'mood': log.mood,
            'energy_level': log.energy_level,
            'sleep_quality': log.sleep_quality
        }
        for log in logs
    ]
    
    warnings = ml_engine.generate_early_warnings(log_data, upcoming_days=7)
    
    return {"warnings": warnings}


# ========== Analytics Endpoints ==========
@app.get("/users/{user_id}/analytics", response_model=AnalyticsResponse)
def get_analytics(user_id: str, db: Session = Depends(get_db)):
    """Get comprehensive analytics and insights"""
    # Get cycle stats
    cycles = db.query(Cycle).filter(
        Cycle.user_id == user_id,
        Cycle.cycle_length != None
    ).all()
    
    if not cycles:
        raise HTTPException(status_code=404, detail="No cycle data available")
    
    cycle_lengths = [c.cycle_length for c in cycles]
    period_lengths = [c.period_length for c in cycles if c.period_length]
    
    cycle_stats = CycleStatsResponse(
        average_cycle_length=sum(cycle_lengths) / len(cycle_lengths) if cycle_lengths else 0,
        average_period_length=sum(period_lengths) / len(period_lengths) if period_lengths else 0,
        shortest_cycle=min(cycle_lengths) if cycle_lengths else None,
        longest_cycle=max(cycle_lengths) if cycle_lengths else None,
        total_cycles=len(cycles),
        regularity_score=ml_engine.calculate_cycle_regularity([
            {'cycle_length': c.cycle_length} for c in cycles
        ])
    )
    
    # Get symptom patterns
    symptom_query = text("""
        SELECT 
            symptom,
            COUNT(*) as frequency,
            AVG(CAST(symptom_severity->>symptom AS FLOAT)) as avg_severity,
            cycle_phase
        FROM daily_logs,
        LATERAL jsonb_array_elements_text(symptoms) as symptom
        WHERE user_id = :user_id AND cycle_phase IS NOT NULL
        GROUP BY symptom, cycle_phase
        ORDER BY frequency DESC
    """)
    
    symptom_results = db.execute(symptom_query, {'user_id': user_id}).fetchall()
    
    # Process symptoms
    symptom_dict = {}
    for row in symptom_results:
        symptom = row.symptom
        if symptom not in symptom_dict:
            symptom_dict[symptom] = {
                'frequency': 0,
                'severities': [],
                'phases': {}
            }
        symptom_dict[symptom]['frequency'] += row.frequency
        if row.avg_severity:
            symptom_dict[symptom]['severities'].append(row.avg_severity)
        symptom_dict[symptom]['phases'][row.cycle_phase] = row.frequency
    
    top_symptoms = []
    for symptom, data in sorted(symptom_dict.items(), key=lambda x: x[1]['frequency'], reverse=True)[:10]:
        most_common_phase = max(data['phases'].items(), key=lambda x: x[1])[0] if data['phases'] else 'unknown'
        top_symptoms.append(SymptomPatternResponse(
            symptom=symptom,
            frequency=data['frequency'],
            average_severity=sum(data['severities']) / len(data['severities']) if data['severities'] else 0,
            most_common_phase=most_common_phase,
            phase_breakdown=data['phases']
        ))
    
    # Get mood patterns (simplified)
    mood_patterns = []
    
    # Get sleep and energy trends
    sleep_trends = {}
    energy_trends = {}
    
    return AnalyticsResponse(
        cycle_stats=cycle_stats,
        top_symptoms=top_symptoms,
        mood_patterns=mood_patterns,
        sleep_trends=sleep_trends,
        energy_trends=energy_trends
    )


@app.get("/users/{user_id}/insights", response_model=List[InsightResponse])
def get_insights(user_id: str, db: Session = Depends(get_db)):
    """Get AI-generated insights about patterns"""
    # Get historical data
    logs = db.query(DailyLog).filter(
        DailyLog.user_id == user_id
    ).order_by(DailyLog.log_date.desc()).limit(90).all()
    
    if len(logs) < 30:
        return []
    
    # Convert to dict format
    log_data = [
        {
            'log_date': log.log_date,
            'cycle_phase': log.cycle_phase,
            'symptoms': log.symptoms,
            'mood': log.mood,
            'mood_intensity': log.mood_intensity,
            'energy_level': log.energy_level,
            'sleep_quality': log.sleep_quality
        }
        for log in logs
    ]
    
    # Detect patterns
    patterns = ml_engine.detect_patterns(log_data)
    
    # Store as insights
    db_insights = []
    for pattern in patterns:
        # Check if similar insight already exists
        existing = db.query(Insight).filter(
            Insight.user_id == user_id,
            Insight.title == pattern['title'],
            Insight.is_active == True
        ).first()
        
        if not existing:
            db_insight = Insight(
                user_id=user_id,
                insight_type=pattern['type'],
                title=pattern['title'],
                description=pattern['description'],
                confidence_score=pattern['confidence_score'],
                data_points=pattern['data_points']
            )
            db.add(db_insight)
            db_insights.append(db_insight)
    
    db.commit()
    
    # Return all active insights
    return db.query(Insight).filter(
        Insight.user_id == user_id,
        Insight.is_active == True
    ).order_by(Insight.date_identified.desc()).all()


# ========== Chat Endpoints ==========
@app.post("/users/{user_id}/chat")
def chat_with_assistant(
    user_id: str,
    request: ChatMessageRequest,
    db: Session = Depends(get_db)
):
    """Chat with AI assistant about menstrual health"""
    # Get conversation history
    history = rag_system.get_conversation_history(db, user_id, limit=6)
    
    # Process chat
    response = rag_system.chat(
        db=db,
        user_id=user_id,
        message=request.message,
        conversation_history=history,
        include_context=request.include_context
    )
    
    return {
        'response': response['response'],
        'relevant_context': response['relevant_logs'],
        'tokens_used': response.get('tokens_used')
    }


@app.get("/users/{user_id}/chat/history")
def get_chat_history(user_id: str, limit: int = 20, db: Session = Depends(get_db)):
    """Get chat conversation history"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id
    ).order_by(ChatMessage.created_at.desc()).limit(limit).all()
    
    return [
        {
            'message_id': str(msg.message_id),
            'role': msg.role,
            'content': msg.content,
            'created_at': msg.created_at
        }
        for msg in reversed(messages)
    ]


# ========== Health Check ==========
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
