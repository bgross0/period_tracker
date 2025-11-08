-- PostgreSQL Schema for Period Tracker App
-- Install pgvector extension first: CREATE EXTENSION vector;

-- Users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}',
    average_cycle_length INTEGER DEFAULT 28,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menstrual cycles table
CREATE TABLE cycles (
    cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    cycle_number INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    cycle_length INTEGER,
    period_length INTEGER,
    is_predicted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, start_date)
);

-- Daily logs - the core tracking table
CREATE TABLE daily_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES cycles(cycle_id) ON DELETE SET NULL,
    log_date DATE NOT NULL,
    
    -- Flow tracking
    flow_level VARCHAR(20), -- none, spotting, light, medium, heavy
    
    -- Mood tracking (1-10 scale or categorical)
    mood VARCHAR(50), -- happy, sad, anxious, irritable, calm, energetic, depressed
    mood_intensity INTEGER CHECK (mood_intensity BETWEEN 1 AND 10),
    
    -- Energy levels
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
    
    -- Sleep tracking
    sleep_hours DECIMAL(3,1),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
    sleep_disruptions INTEGER DEFAULT 0,
    
    -- Symptoms (flexible JSONB for extensibility)
    symptoms JSONB DEFAULT '[]', -- ["cramps", "headache", "bloating", "breast_tenderness", "acne", "fatigue"]
    symptom_severity JSONB DEFAULT '{}', -- {"cramps": 7, "headache": 5}
    
    -- Physical symptoms
    cramps_severity INTEGER CHECK (cramps_severity BETWEEN 0 AND 10),
    headache_severity INTEGER CHECK (headache_severity BETWEEN 0 AND 10),
    bloating_severity INTEGER CHECK (bloating_severity BETWEEN 0 AND 10),
    
    -- Cycle phase (calculated)
    cycle_phase VARCHAR(20), -- menstrual, follicular, ovulation, luteal
    cycle_day INTEGER,
    
    -- Free text notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, log_date)
);

-- Symptoms master list (for consistency)
CREATE TABLE symptom_types (
    symptom_id SERIAL PRIMARY KEY,
    symptom_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50), -- physical, emotional, digestive, skin, other
    description TEXT
);

-- Predictions table
CREATE TABLE predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    prediction_type VARCHAR(50), -- next_period, ovulation, symptom, mood
    predicted_date DATE,
    predicted_value JSONB,
    confidence_score DECIMAL(3,2),
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    was_accurate BOOLEAN,
    actual_date DATE
);

-- Vector embeddings for RAG (chat context)
CREATE TABLE log_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES daily_logs(log_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    embedding_text TEXT, -- human-readable summary of the log
    embedding vector(1536), -- OpenAI/Groq embedding dimension
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat history
CREATE TABLE chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(20), -- user, assistant, system
    content TEXT NOT NULL,
    relevant_log_ids UUID[], -- logs that were retrieved for context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User insights/patterns (ML-generated)
CREATE TABLE insights (
    insight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    insight_type VARCHAR(50), -- pattern, correlation, warning, recommendation
    title VARCHAR(255),
    description TEXT,
    confidence_score DECIMAL(3,2),
    data_points JSONB, -- relevant statistics
    date_identified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date DESC);
CREATE INDEX idx_daily_logs_cycle ON daily_logs(cycle_id);
CREATE INDEX idx_cycles_user ON cycles(user_id, start_date DESC);
CREATE INDEX idx_embeddings_user ON log_embeddings(user_id);
CREATE INDEX idx_chat_user ON chat_messages(user_id, created_at DESC);

-- Vector similarity search index (for RAG)
CREATE INDEX ON log_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Insert common symptom types
INSERT INTO symptom_types (symptom_name, category) VALUES
    ('cramps', 'physical'),
    ('headache', 'physical'),
    ('bloating', 'physical'),
    ('breast_tenderness', 'physical'),
    ('back_pain', 'physical'),
    ('fatigue', 'physical'),
    ('nausea', 'digestive'),
    ('diarrhea', 'digestive'),
    ('constipation', 'digestive'),
    ('acne', 'skin'),
    ('mood_swings', 'emotional'),
    ('anxiety', 'emotional'),
    ('irritability', 'emotional'),
    ('depression', 'emotional'),
    ('brain_fog', 'cognitive'),
    ('food_cravings', 'other'),
    ('increased_libido', 'other'),
    ('decreased_libido', 'other');

-- View for comprehensive daily overview
CREATE VIEW daily_overview AS
SELECT 
    dl.log_id,
    dl.user_id,
    dl.log_date,
    dl.flow_level,
    dl.mood,
    dl.energy_level,
    dl.sleep_hours,
    dl.sleep_quality,
    dl.symptoms,
    dl.cycle_phase,
    dl.cycle_day,
    c.cycle_number,
    c.start_date as cycle_start_date,
    (dl.log_date - c.start_date) as days_since_cycle_start
FROM daily_logs dl
LEFT JOIN cycles c ON dl.cycle_id = c.cycle_id;

-- Function to calculate cycle phase
CREATE OR REPLACE FUNCTION calculate_cycle_phase(
    p_cycle_day INTEGER,
    p_cycle_length INTEGER DEFAULT 28
) RETURNS VARCHAR AS $$
BEGIN
    IF p_cycle_day <= 5 THEN
        RETURN 'menstrual';
    ELSIF p_cycle_day <= 13 THEN
        RETURN 'follicular';
    ELSIF p_cycle_day <= 16 THEN
        RETURN 'ovulation';
    ELSE
        RETURN 'luteal';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update cycle phase
CREATE OR REPLACE FUNCTION update_cycle_phase()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cycle_day IS NOT NULL THEN
        NEW.cycle_phase = calculate_cycle_phase(NEW.cycle_day);
    END IF;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cycle_phase
    BEFORE INSERT OR UPDATE ON daily_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_cycle_phase();
