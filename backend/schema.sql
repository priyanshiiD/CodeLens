-- CodeLens Database Schema
-- Run this against a PostgreSQL database to initialize CodeLens.
-- Usage: psql -U postgres -d codelens -f backend/schema.sql

-- Enable pgvector extension (required for vector similarity search)
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Repositories table
CREATE TABLE IF NOT EXISTS repos (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_url     VARCHAR(500) NOT NULL,
  repo_name    VARCHAR(255) NOT NULL,
  status       VARCHAR(50)  DEFAULT 'processing',
  chunks_count INTEGER      DEFAULT 0,
  created_at   TIMESTAMP    DEFAULT NOW(),
  UNIQUE(user_id, repo_url)
);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_id     INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sources     JSONB DEFAULT '[]',
  chunks_used INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Chunks table (vector storage — replaces ChromaDB)
CREATE TABLE IF NOT EXISTS chunks (
  id         SERIAL PRIMARY KEY,
  chunk_id   TEXT UNIQUE NOT NULL,
  repo_url   TEXT NOT NULL,
  file_path  TEXT NOT NULL,
  start_line INTEGER NOT NULL DEFAULT 0,
  end_line   INTEGER NOT NULL DEFAULT 0,
  language   TEXT DEFAULT 'unknown',
  text       TEXT NOT NULL,
  embedding  vector(768),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repos_user_id          ON repos(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_repo ON chat_history(user_id, repo_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created   ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chunks_repo_url        ON chunks(repo_url);

-- Demo user seed (password: test123)
INSERT INTO users (email, password, name)
VALUES ('test@test.com', '$2b$10$B54XyPpOMqoU5KKUcc2jS..DvzbmQ1jgkBekD2UK3dAMFo28T.X9a', 'Demo User')
ON CONFLICT (email) DO NOTHING;
