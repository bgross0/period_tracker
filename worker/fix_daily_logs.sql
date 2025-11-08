-- Fix daily_logs schema for V2
DROP TABLE IF EXISTS daily_logs;

CREATE TABLE daily_logs (
    log_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cycle_id TEXT,
    log_date TEXT NOT NULL,
    cycle_day INTEGER,
    cycle_phase TEXT,
    mood INTEGER CHECK (mood BETWEEN 1 AND 5),
    energy INTEGER CHECK (energy BETWEEN 1 AND 5),
    flow_level INTEGER CHECK (flow_level BETWEEN 1 AND 5),
    symptoms TEXT,
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    sleep_hours REAL,
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
    exercise_level TEXT,
    cravings TEXT,
    foods TEXT,
    remedies_tried TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (cycle_id) REFERENCES cycles(cycle_id)
);

CREATE UNIQUE INDEX idx_user_date ON daily_logs(user_id, log_date);
CREATE INDEX idx_cycle_logs ON daily_logs(cycle_id);
