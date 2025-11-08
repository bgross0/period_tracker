-- Migration to V2 - Research-Based Design
-- This updates the database to the new simplified schema

-- Add new columns to users
ALTER TABLE users ADD COLUMN last_period_start TEXT;
ALTER TABLE users ADD COLUMN regularity TEXT DEFAULT 'regular';
ALTER TABLE users ADD COLUMN track_mood BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN track_energy BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN track_sleep BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN track_symptoms BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN track_flow BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN track_remedies BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN track_food BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN track_exercise BOOLEAN DEFAULT false;

-- Update daily_logs - add new columns
ALTER TABLE daily_logs ADD COLUMN exercise_level TEXT;
ALTER TABLE daily_logs ADD COLUMN cravings TEXT;
ALTER TABLE daily_logs ADD COLUMN foods TEXT;
ALTER TABLE daily_logs ADD COLUMN remedies_tried TEXT;

-- Remedies library
CREATE TABLE IF NOT EXISTS remedies (
    remedy_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- User remedy effectiveness tracking
CREATE TABLE IF NOT EXISTS user_remedy_effectiveness (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    remedy_id TEXT NOT NULL,
    symptom TEXT NOT NULL,
    log_id TEXT NOT NULL,
    effectiveness INTEGER CHECK (effectiveness BETWEEN 1 AND 5),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (remedy_id) REFERENCES remedies(remedy_id),
    FOREIGN KEY (log_id) REFERENCES daily_logs(log_id)
);

-- Streaks tracking
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id TEXT PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_log_date TEXT,
    total_logs INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    achievement_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    achievement_type TEXT NOT NULL,
    earned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Pattern insights (replaces scary medical insights)
CREATE TABLE IF NOT EXISTS user_patterns (
    pattern_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    confidence REAL,
    data_points INTEGER,
    is_active BOOLEAN DEFAULT true,
    first_detected TEXT DEFAULT (datetime('now')),
    last_updated TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Drop old predictions and insights tables (replace with user_patterns)
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS insights;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_remedies_category ON remedies(category);
CREATE INDEX IF NOT EXISTS idx_user_remedy_eff ON user_remedy_effectiveness(user_id, remedy_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns ON user_patterns(user_id, is_active);

-- ========== Populate Default Remedies ==========

-- Cramps
INSERT INTO remedies (remedy_id, name, category, description) VALUES
('rem_heating_pad', 'Heating Pad', 'cramps', 'Apply heat to lower abdomen'),
('rem_ibuprofen', 'Ibuprofen', 'cramps', 'Anti-inflammatory pain relief'),
('rem_magnesium', 'Magnesium Supplement', 'cramps', 'Helps relax muscles'),
('rem_pickle_juice', 'Pickle Juice', 'cramps', 'Electrolytes help with cramping'),
('rem_light_exercise', 'Light Exercise', 'cramps', 'Walking or gentle stretching'),
('rem_hot_bath', 'Hot Bath', 'cramps', 'Soak in warm water');

-- Bloating
INSERT INTO remedies (remedy_id, name, category, description) VALUES
('rem_peppermint_tea', 'Peppermint Tea', 'bloating', 'Helps with digestion'),
('rem_ginger_tea', 'Ginger Tea', 'bloating', 'Reduces inflammation'),
('rem_water', 'Drink More Water', 'bloating', 'Hydration helps reduce retention'),
('rem_cucumber', 'Eat Cucumber', 'bloating', 'Natural diuretic'),
('rem_avoid_salt', 'Avoid Salty Foods', 'bloating', 'Reduces water retention');

-- Headache
INSERT INTO remedies (remedy_id, name, category, description) VALUES
('rem_caffeine', 'Caffeine (small amount)', 'headache', 'Can help with certain headaches'),
('rem_dark_room', 'Rest in Dark Room', 'headache', 'Reduce light and sound'),
('rem_cold_compress', 'Cold Compress', 'headache', 'Apply to forehead or neck'),
('rem_acetaminophen', 'Acetaminophen', 'headache', 'Pain relief'),
('rem_hydrate', 'Hydrate', 'headache', 'Dehydration can cause headaches');

-- Mood
INSERT INTO remedies (remedy_id, name, category, description) VALUES
('rem_walk_outside', 'Walk Outside', 'mood', '30 min in nature'),
('rem_sunshine', 'Get Sunshine', 'mood', 'Vitamin D boosts mood'),
('rem_talk_friend', 'Talk to a Friend', 'mood', 'Social connection helps'),
('rem_journal', 'Journal', 'mood', 'Write down your feelings'),
('rem_meditation', 'Meditation', 'mood', '10 min mindfulness');

-- Energy
INSERT INTO remedies (remedy_id, name, category, description) VALUES
('rem_nap', 'Short Nap (20min)', 'energy', 'Quick power nap'),
('rem_protein_snack', 'Protein Snack', 'energy', 'Sustained energy boost'),
('rem_b_vitamins', 'B Vitamins', 'energy', 'Energy supplement'),
('rem_cold_shower', 'Cold Shower', 'energy', 'Quick wake-up'),
('rem_movement', 'Move Your Body', 'energy', 'Light activity boosts energy');

-- Sleep
INSERT INTO remedies (remedy_id, name, category, description) VALUES
('rem_no_screens', 'No Screens 1hr Before Bed', 'sleep', 'Blue light disrupts sleep'),
('rem_chamomile_tea', 'Chamomile Tea', 'sleep', 'Natural relaxant'),
('rem_consistent_time', 'Consistent Bedtime', 'sleep', 'Train your circadian rhythm'),
('rem_cool_room', 'Cool Room Temp', 'sleep', '65-68°F is ideal'),
('rem_melatonin', 'Melatonin', 'sleep', 'Sleep supplement');
