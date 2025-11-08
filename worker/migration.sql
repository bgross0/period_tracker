-- Migration to add authentication and chat features
-- Run this to update existing database

-- Add password_hash to users table (if not exists)
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Log embeddings table for RAG
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

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_log_embeddings_user ON log_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_log_embeddings_log ON log_embeddings(log_id);
