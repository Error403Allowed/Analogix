-- ============================================================
-- Enhanced Memory System
-- Extended memory storage for educational memory
-- ============================================================

ALTER TABLE ai_memory_fragments ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE ai_memory_fragments ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE ai_memory_fragments ADD COLUMN IF NOT EXISTS related_entity_type TEXT;
ALTER TABLE ai_memory_fragments ADD COLUMN IF NOT EXISTS related_entity_id UUID;

CREATE INDEX idx_ai_memory_subject ON ai_memory_fragments(subject_id);
CREATE INDEX idx_ai_memory_session ON ai_memory_fragments(session_id);
CREATE INDEX idx_ai_memory_related ON ai_memory_fragments(related_entity_type, related_entity_id);

-- ============================================================
-- Educational Memory
-- Store learning progress, weak areas, and study patterns
-- ============================================================

CREATE TABLE IF NOT EXISTS educational_memory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      TEXT NOT NULL,
  memory_type     TEXT NOT NULL CHECK (memory_type IN ('strength', 'weakness', 'learning_style', 'study_pattern', 'progress', 'preference')),
  content         JSONB NOT NULL,
  importance      FLOAT DEFAULT 0.5,
  reinforced_count INT DEFAULT 0,
  last_reinforced_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, subject_id, memory_type, content)
);

CREATE INDEX idx_educational_memory_user_subject ON educational_memory(user_id, subject_id);
CREATE INDEX idx_educational_memory_type ON educational_memory(memory_type);
CREATE INDEX idx_educational_memory_importance ON educational_memory(importance DESC);

ALTER TABLE educational_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own educational memory"
  ON educational_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Quiz Performance History
-- Track quiz results for weak area identification
-- ============================================================

CREATE TABLE IF NOT EXISTS quiz_performance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id         UUID NOT NULL,
  subject_id      TEXT NOT NULL,
  topic           TEXT,
  score           FLOAT NOT NULL,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  time_taken      INT,
  questions_data  JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_performance_user ON quiz_performance(user_id);
CREATE INDEX idx_quiz_performance_subject ON quiz_performance(subject_id);
CREATE INDEX idx_quiz_performance_topic ON quiz_performance(topic);
CREATE INDEX idx_quiz_performance_date ON quiz_performance(created_at DESC);

ALTER TABLE quiz_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own quiz performance"
  ON quiz_performance FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Study Sessions
-- Track study session data
-- ============================================================

CREATE TABLE IF NOT EXISTS study_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      TEXT,
  title           TEXT,
  session_type    TEXT CHECK (session_type IN ('flashcard', 'quiz', 'study_guide', 'freeform')),
  duration_minutes INT,
  activities      JSONB DEFAULT '[]',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_subject ON study_sessions(subject_id);
CREATE INDEX idx_study_sessions_date ON study_sessions(created_at DESC);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own study sessions"
  ON study_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Flashcard Review Log
-- Track spaced repetition reviews
-- ============================================================

CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id    UUID NOT NULL,
  rating          INT NOT NULL CHECK (rating IN (1, 2, 3, 4, 5)),
  ease_factor     FLOAT,
  interval        INT,
  next_review     TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcard_reviews_user ON flashcard_reviews(user_id);
CREATE INDEX idx_flashcard_reviews_card ON flashcard_reviews(flashcard_id);
CREATE INDEX idx_flashcard_reviews_next ON flashcard_reviews(next_review);

ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own flashcard reviews"
  ON flashcard_reviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);