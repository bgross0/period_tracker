-- Period Tracker Database Schema for Cloudflare D1 (SQLite)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    date_of_birth TEXT,
    average_cycle_length INTEGER DEFAULT 28,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Cycles table
CREATE TABLE IF NOT EXISTS cycles (
    cycle_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cycle_number INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    cycle_length INTEGER,
    period_length INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Daily logs table
CREATE TABLE IF NOT EXISTS daily_logs (
    log_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cycle_id TEXT,
    log_date TEXT NOT NULL,
    cycle_phase TEXT,
    cycle_day INTEGER,
    flow_level INTEGER CHECK (flow_level BETWEEN 0 AND 5),
    mood TEXT,
    mood_intensity INTEGER CHECK (mood_intensity BETWEEN 1 AND 5),
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    sleep_hours REAL,
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    symptoms TEXT,  -- JSON array as text
    symptom_severity TEXT,  -- JSON object as text
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (cycle_id) REFERENCES cycles(cycle_id),
    UNIQUE(user_id, log_date)
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
    prediction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    prediction_type TEXT NOT NULL,
    predicted_date TEXT NOT NULL,
    predicted_value TEXT,  -- JSON as text
    confidence_score REAL,
    model_version TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    confidence_score REAL,
    data_points TEXT,  -- JSON as text
    is_active INTEGER DEFAULT 1,
    date_identified TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cycles_user ON cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_dates ON cycles(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id, is_active);
