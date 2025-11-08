from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID

# ========== Daily Log Schemas ==========
class DailyLogCreate(BaseModel):
    log_date: date
    flow_level: Optional[str] = Field(None, pattern="^(none|spotting|light|medium|heavy)$")
    mood: Optional[str] = None
    mood_intensity: Optional[int] = Field(None, ge=1, le=10)
    energy_level: Optional[int] = Field(None, ge=1, le=10)
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    sleep_quality: Optional[int] = Field(None, ge=1, le=10)
    sleep_disruptions: Optional[int] = Field(0, ge=0)
    symptoms: Optional[List[str]] = []
    symptom_severity: Optional[Dict[str, int]] = {}
    cramps_severity: Optional[int] = Field(None, ge=0, le=10)
    headache_severity: Optional[int] = Field(None, ge=0, le=10)
    bloating_severity: Optional[int] = Field(None, ge=0, le=10)
    notes: Optional[str] = None

class DailyLogUpdate(BaseModel):
    flow_level: Optional[str] = None
    mood: Optional[str] = None
    mood_intensity: Optional[int] = None
    energy_level: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    sleep_disruptions: Optional[int] = None
    symptoms: Optional[List[str]] = None
    symptom_severity: Optional[Dict[str, int]] = None
    cramps_severity: Optional[int] = None
    headache_severity: Optional[int] = None
    bloating_severity: Optional[int] = None
    notes: Optional[str] = None

class DailyLogResponse(BaseModel):
    log_id: UUID
    user_id: UUID
    log_date: date
    flow_level: Optional[str]
    mood: Optional[str]
    mood_intensity: Optional[int]
    energy_level: Optional[int]
    sleep_hours: Optional[float]
    sleep_quality: Optional[int]
    sleep_disruptions: Optional[int]
    symptoms: Optional[List[str]]
    symptom_severity: Optional[Dict[str, int]]
    cramps_severity: Optional[int]
    headache_severity: Optional[int]
    bloating_severity: Optional[int]
    cycle_phase: Optional[str]
    cycle_day: Optional[int]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ========== Cycle Schemas ==========
class CycleCreate(BaseModel):
    start_date: date
    
class CycleResponse(BaseModel):
    cycle_id: UUID
    user_id: UUID
    cycle_number: Optional[int]
    start_date: date
    end_date: Optional[date]
    cycle_length: Optional[int]
    period_length: Optional[int]
    is_predicted: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========== User Schemas ==========
class UserCreate(BaseModel):
    email: EmailStr
    average_cycle_length: Optional[int] = 28
    
class UserResponse(BaseModel):
    user_id: UUID
    email: str
    average_cycle_length: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========== Chat Schemas ==========
class ChatMessageRequest(BaseModel):
    message: str
    include_context: bool = True

class ChatMessageResponse(BaseModel):
    message_id: UUID
    role: str
    content: str
    relevant_logs: Optional[List[DailyLogResponse]] = []
    created_at: datetime

# ========== Prediction Schemas ==========
class PredictionResponse(BaseModel):
    prediction_id: UUID
    prediction_type: str
    predicted_date: Optional[date]
    predicted_value: Optional[Dict[str, Any]]
    confidence_score: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========== Insight Schemas ==========
class InsightResponse(BaseModel):
    insight_id: UUID
    insight_type: str
    title: str
    description: str
    confidence_score: Optional[float]
    data_points: Optional[Dict[str, Any]]
    date_identified: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# ========== Analytics Schemas ==========
class CycleStatsResponse(BaseModel):
    average_cycle_length: float
    average_period_length: float
    shortest_cycle: Optional[int]
    longest_cycle: Optional[int]
    total_cycles: int
    regularity_score: float  # 0-100, how regular the cycles are

class SymptomPatternResponse(BaseModel):
    symptom: str
    frequency: int  # how many times it appeared
    average_severity: float
    most_common_phase: str
    phase_breakdown: Dict[str, int]  # count per phase

class MoodPatternResponse(BaseModel):
    mood: str
    frequency: int
    average_intensity: float
    most_common_phase: str
    correlation_with_symptoms: Dict[str, float]

class AnalyticsResponse(BaseModel):
    cycle_stats: CycleStatsResponse
    top_symptoms: List[SymptomPatternResponse]
    mood_patterns: List[MoodPatternResponse]
    sleep_trends: Dict[str, Any]
    energy_trends: Dict[str, Any]

# ========== Visualization Data Schemas ==========
class TimeSeriesDataPoint(BaseModel):
    date: date
    value: float
    label: Optional[str] = None

class VisualizationResponse(BaseModel):
    chart_type: str  # line, bar, heatmap, scatter
    data_points: List[TimeSeriesDataPoint]
    metadata: Dict[str, Any]
