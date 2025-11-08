-- Period Tracker V2 - Research-Based Schema
-- Simplified, privacy-focused, no medical BS

-- ========== Core Tables ==========

-- Users (simplified)
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,

    -- Onboarding data
    last_period_start TEXT,  -- When was your last period?
    average_cycle_length INTEGER DEFAULT 28,
    average_period_length INTEGER DEFAULT 5,
    regularity TEXT DEFAULT 'regular' CHECK (regularity IN ('regular', 'somewhat', 'irregular')),

    -- Tracking preferences (what they want to track)
    track_mood BOOLEAN DEFAULT true,
    track_energy BOOLEAN DEFAULT true,
    track_sleep BOOLEAN DEFAULT true,
    track_symptoms BOOLEAN DEFAULT true,
    track_flow BOOLEAN DEFAULT true,
    track_remedies BOOLEAN DEFAULT false,
    track_food BOOLEAN DEFAULT false,
    track_exercise BOOLEAN DEFAULT false,

    -- Privacy
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Cycles
CREATE TABLE IF NOT EXISTS cycles (
    cycle_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cycle_number INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    cycle_length INTEGER,
    period_length INTEGER,  -- How many days of bleeding
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Daily logs (simplified - only what matters)
CREATE TABLE IF NOT EXISTS daily_logs (
    log_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cycle_id TEXT,
    log_date TEXT NOT NULL,

    -- Calculated fields
    cycle_day INTEGER,  -- Day 1, 2, 3... of cycle
    cycle_phase TEXT,   -- menstrual, follicular, ovulation, luteal_early, luteal_late

    -- Core tracking (always asked)
    mood INTEGER CHECK (mood BETWEEN 1 AND 5),  -- 1=😞 5=😊
    energy INTEGER CHECK (energy BETWEEN 1 AND 5),  -- 1=🪫 5=🔋

    -- Phase-specific (only asked when relevant)
    flow_level INTEGER CHECK (flow_level BETWEEN 0 AND 5),  -- 0=none, 5=heavy (only menstrual phase)

    -- Symptoms (simple multi-select)
    symptoms TEXT,  -- JSON array: ["cramps", "bloating", "headache"]

    -- Optional tracking (based on user preferences)
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    sleep_hours REAL,
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
    exercise_level TEXT CHECK (exercise_level IN ('none', 'light', 'moderate', 'intense')),

    -- Cravings (luteal phase)
    cravings TEXT,  -- JSON array: ["sweet", "salty", "carbs"]

    -- Foods (if tracking)
    foods TEXT,  -- JSON array: ["dairy", "caffeine", "alcohol"]

    -- Remedies tried today
    remedies_tried TEXT,  -- JSON array of remedy_ids: ["rem_123", "rem_456"]

    -- Free-form notes (always available)
    notes TEXT,

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (cycle_id) REFERENCES cycles(cycle_id),
    UNIQUE(user_id, log_date)
);

-- ========== Remedy System ==========

-- Remedy library (pre-populated + user-added)
CREATE TABLE IF NOT EXISTS remedies (
    remedy_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,  -- cramps, bloating, headache, mood, energy, sleep
    description TEXT,
    is_default BOOLEAN DEFAULT true,  -- true = we provide it, false = user added
    created_by TEXT,  -- user_id if custom remedy
    created_at TEXT DEFAULT (datetime('now'))
);

-- User remedy effectiveness (what worked for them)
CREATE TABLE IF NOT EXISTS user_remedy_effectiveness (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    remedy_id TEXT NOT NULL,
    symptom TEXT NOT NULL,  -- which symptom it helped with
    log_id TEXT NOT NULL,  -- which day they tried it
    effectiveness INTEGER CHECK (effectiveness BETWEEN 1 AND 5),  -- 1=didn't help, 5=totally worked
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (remedy_id) REFERENCES remedies(remedy_id),
    FOREIGN KEY (log_id) REFERENCES daily_logs(log_id)
);

-- ========== Gamification ==========

-- User streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id TEXT PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_log_date TEXT,
    total_logs INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Achievements (optional - for dopamine hits)
CREATE TABLE IF NOT EXISTS user_achievements (
    achievement_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    achievement_type TEXT NOT NULL,  -- first_log, week_streak, month_streak, 100_logs
    earned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ========== Pattern Insights (NOT Medical Advice) ==========

-- Simple correlations detected
CREATE TABLE IF NOT EXISTS user_patterns (
    pattern_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pattern_type TEXT NOT NULL,  -- sleep_energy, remedy_effectiveness, mood_phase, etc
    title TEXT NOT NULL,  -- "Better sleep = more energy"
    description TEXT,  -- "When you sleep 7+ hours, your energy is 30% higher"
    confidence REAL,  -- How strong is the correlation
    data_points INTEGER,  -- How many logs support this
    is_active BOOLEAN DEFAULT true,
    first_detected TEXT DEFAULT (datetime('now')),
    last_updated TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ========== Chat System (Keep) ==========

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Log embeddings for RAG
CREATE TABLE IF NOT EXISTS log_embeddings (
    embedding_id TEXT PRIMARY KEY,
    log_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embedding_text TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (log_id) REFERENCES daily_logs(log_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ========== Indexes ==========

CREATE INDEX IF NOT EXISTS idx_cycles_user ON cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_dates ON cycles(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_log_embeddings_user ON log_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_remedies_category ON remedies(category);
CREATE INDEX IF NOT EXISTS idx_user_remedy_eff ON user_remedy_effectiveness(user_id, remedy_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns ON user_patterns(user_id, is_active);
