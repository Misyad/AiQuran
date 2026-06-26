-- QLVRS Database Schema
-- Quran verse embeddings + session data

CREATE EXTENSION IF NOT EXISTS vector;

-- Surah metadata
CREATE TABLE surah (
    id INTEGER PRIMARY KEY,
    name_arabic TEXT NOT NULL,
    name_transliteration TEXT NOT NULL,
    name_translation TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('makkiyah', 'madaniiyah')),
    total_verses INTEGER NOT NULL,
    page_start INTEGER NOT NULL,
    page_end INTEGER NOT NULL
);

-- All verses with embeddings
CREATE TABLE verses (
    id INTEGER PRIMARY KEY,
    surah INTEGER NOT NULL REFERENCES surah(id),
    ayah INTEGER NOT NULL,
    text_arabic TEXT NOT NULL,
    text_normalized TEXT NOT NULL,
    translation_id TEXT,
    page INTEGER NOT NULL,
    juz INTEGER NOT NULL,
    hizb INTEGER NOT NULL,
    embedding vector(384),  -- sentence-transformers all-MiniLM-L6-v2
    UNIQUE(surah, ayah)
);

CREATE INDEX idx_verses_surah ON verses(surah);
CREATE INDEX idx_verses_page ON verses(page);
CREATE INDEX idx_verses_juz ON verses(juz);
CREATE INDEX idx_verses_embedding ON verses USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Recognition sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    total_recognitions INTEGER DEFAULT 0,
    total_auto_display INTEGER DEFAULT 0,
    total_manual_correction INTEGER DEFAULT 0
);

-- Recognition log
CREATE TABLE recognition_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Input
    input_text TEXT,
    input_audio_url TEXT,
    input_duration_ms INTEGER,
    asr_engine TEXT,  -- 'faster-whisper' or 'openai'
    asr_latency_ms INTEGER,
    
    -- Match
    matched_surah INTEGER,
    matched_ayah INTEGER,
    confidence REAL,
    match_latency_ms INTEGER,
    
    -- Result
    auto_displayed BOOLEAN DEFAULT FALSE,
    operator_corrected BOOLEAN DEFAULT FALSE,
    correct_surah INTEGER,
    correct_ayah INTEGER,
    
    -- Error
    error_message TEXT
);

CREATE INDEX idx_logs_session ON recognition_logs(session_id);
CREATE INDEX idx_logs_timestamp ON recognition_logs(timestamp);
CREATE INDEX idx_logs_confidence ON recognition_logs(confidence);

-- Operator corrections (for accuracy tracking)
CREATE TABLE corrections (
    id BIGSERIAL PRIMARY KEY,
    log_id BIGINT REFERENCES recognition_logs(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    original_surah INTEGER,
    original_ayah INTEGER,
    corrected_surah INTEGER NOT NULL,
    corrected_ayah INTEGER NOT NULL,
    operator_id TEXT,
    correction_time_ms INTEGER
);

-- Audio device config
CREATE TABLE audio_devices (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    device_type TEXT DEFAULT 'mic',
    sample_rate INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI model config
CREATE TABLE ai_config (
    id SERIAL PRIMARY KEY,
    engine TEXT NOT NULL,  -- 'faster-whisper' or 'openai'
    model_name TEXT NOT NULL DEFAULT 'large-v3',
    device TEXT DEFAULT 'cuda',
    compute_type TEXT DEFAULT 'float16',
    threshold_auto REAL DEFAULT 0.85,
    threshold_candidate REAL DEFAULT 0.60,
    timeout_ms INTEGER DEFAULT 5000,
    max_retries INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
