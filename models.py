from sqlalchemy import Column, String, Integer, Float, Date, DateTime, Boolean, ForeignKey, ARRAY, JSON, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    settings = Column(JSONB, default={})
    average_cycle_length = Column(Integer, default=28)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cycles = relationship("Cycle", back_populates="user", cascade="all, delete-orphan")
    daily_logs = relationship("DailyLog", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="user", cascade="all, delete-orphan")


class Cycle(Base):
    __tablename__ = 'cycles'
    
    cycle_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'))
    cycle_number = Column(Integer)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    cycle_length = Column(Integer)
    period_length = Column(Integer)
    is_predicted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="cycles")
    daily_logs = relationship("DailyLog", back_populates="cycle")


class DailyLog(Base):
    __tablename__ = 'daily_logs'
    
    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'))
    cycle_id = Column(UUID(as_uuid=True), ForeignKey('cycles.cycle_id', ondelete='SET NULL'), nullable=True)
    log_date = Column(Date, nullable=False)
    
    # Flow tracking
    flow_level = Column(String(20))  # none, spotting, light, medium, heavy
    
    # Mood tracking
    mood = Column(String(50))
    mood_intensity = Column(Integer, CheckConstraint('mood_intensity >= 1 AND mood_intensity <= 10'))
    
    # Energy
    energy_level = Column(Integer, CheckConstraint('energy_level >= 1 AND energy_level <= 10'))
    
    # Sleep
    sleep_hours = Column(Float)
    sleep_quality = Column(Integer, CheckConstraint('sleep_quality >= 1 AND sleep_quality <= 10'))
    sleep_disruptions = Column(Integer, default=0)
    
    # Symptoms
    symptoms = Column(JSONB, default=[])
    symptom_severity = Column(JSONB, default={})
    
    # Specific symptoms
    cramps_severity = Column(Integer, CheckConstraint('cramps_severity >= 0 AND cramps_severity <= 10'))
    headache_severity = Column(Integer, CheckConstraint('headache_severity >= 0 AND headache_severity <= 10'))
    bloating_severity = Column(Integer, CheckConstraint('bloating_severity >= 0 AND bloating_severity <= 10'))
    
    # Cycle info
    cycle_phase = Column(String(20))
    cycle_day = Column(Integer)
    
    # Notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="daily_logs")
    cycle = relationship("Cycle", back_populates="daily_logs")
    embeddings = relationship("LogEmbedding", back_populates="log", cascade="all, delete-orphan")


class SymptomType(Base):
    __tablename__ = 'symptom_types'
    
    symptom_id = Column(Integer, primary_key=True, autoincrement=True)
    symptom_name = Column(String(100), unique=True, nullable=False)
    category = Column(String(50))
    description = Column(Text)


class Prediction(Base):
    __tablename__ = 'predictions'
    
    prediction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'))
    prediction_type = Column(String(50))
    predicted_date = Column(Date)
    predicted_value = Column(JSONB)
    confidence_score = Column(Float)
    model_version = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    was_accurate = Column(Boolean)
    actual_date = Column(Date)
    
    # Relationships
    user = relationship("User", back_populates="predictions")


class LogEmbedding(Base):
    __tablename__ = 'log_embeddings'
    
    embedding_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    log_id = Column(UUID(as_uuid=True), ForeignKey('daily_logs.log_id', ondelete='CASCADE'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'))
    embedding_text = Column(Text)
    embedding = Column(Vector(1536))  # OpenAI embedding dimension
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    log = relationship("DailyLog", back_populates="embeddings")


class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    
    message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'))
    role = Column(String(20))
    content = Column(Text, nullable=False)
    relevant_log_ids = Column(ARRAY(UUID(as_uuid=True)))
    created_at = Column(DateTime, default=datetime.utcnow)


class Insight(Base):
    __tablename__ = 'insights'
    
    insight_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'))
    insight_type = Column(String(50))
    title = Column(String(255))
    description = Column(Text)
    confidence_score = Column(Float)
    data_points = Column(JSONB)
    date_identified = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="insights")
