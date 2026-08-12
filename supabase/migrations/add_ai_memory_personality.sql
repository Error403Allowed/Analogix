-- Migration: Add AI memory and personality tables
-- Created: 2026-03-18

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: ai_personalities
-- Stores user-customizable AI personality settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_personalities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personality traits (0-100 scales)
  friendliness INTEGER DEFAULT 70 CHECK (friendliness BETWEEN 0 AND 100),
  formality INTEGER DEFAULT 30 CHECK (formality BETWEEN 0 AND 100),
  humor INTEGER DEFAULT 50 CHECK (humor BETWEEN 0 AND 100),
  detail_level INTEGER DEFAULT 50 CHECK (detail_level BETWEEN 0 AND 100),
  patience INTEGER DEFAULT 70 CHECK (patience BETWEEN 0 AND 100),
  encouragement INTEGER DEFAULT 70 CHECK (encouragement BETWEEN 0 AND 100),
  
  -- Teaching style preferences
  socratic_method BOOLEAN DEFAULT false,  -- Ask guiding questions instead of direct answers
  step_by_step BOOLEAN DEFAULT true,      -- Always show working for problems
  real_world_examples BOOLEAN DEFAULT true,
  
  -- Custom instructions
  custom_instructions TEXT DEFAULT '',
  persona_description TEXT DEFAULT '',
  
  -- Response preferences
  use_emojis BOOLEAN DEFAULT true,
  use_analogies BOOLEAN DEFAULT true,
  analogy_frequency INTEGER DEFAULT 3 CHECK (analogy_frequency BETWEEN 0 AND 5),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one personality per user
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_personalities_user_id ON ai_personalities(user_id);

-- ============================================================================
-- TABLE: ai_memory_fragments
-- Stores long-term memory fragments about the user
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_memory_fragments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Memory content
  content TEXT NOT NULL,
  
  -- Memory type: fact, preference, skill, goal, context
  memory_type TEXT NOT NULL CHECK (memory_type IN ('fact', 'preference', 'skill', 'goal', 'context')),
  
  -- Importance score (0-1) - determines retention priority
  importance DECIMAL DEFAULT 0.5 CHECK (importance BETWEEN 0 AND 1),
  
  -- How many times this memory has been reinforced
  reinforcement_count INTEGER DEFAULT 1,
  
  -- Last time this memory was accessed/used
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- When this memory was created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional: source conversation/session
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL
);

-- Indexes for memory queries
CREATE INDEX IF NOT EXISTS idx_ai_memory_fragments_user_id ON ai_memory_fragments(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_fragments_type ON ai_memory_fragments(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_memory_fragments_importance ON ai_memory_fragments(user_id, importance DESC);

-- ============================================================================
-- TABLE: ai_memory_summaries
-- Stores condensed summaries of past conversations for context
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_memory_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Summary of what was discussed
  summary TEXT NOT NULL,
  
  -- Key topics covered
  topics TEXT[] DEFAULT '{}',
  
  -- Subject area (if applicable)
  subject_id TEXT,
  
  -- Date range of conversations summarized
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  
  -- Number of conversations summarized
  conversation_count INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we don't duplicate summaries for same period
  UNIQUE(user_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_summaries_user_id ON ai_memory_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_summaries_subject ON ai_memory_summaries(user_id, subject_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory_fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory_summaries ENABLE ROW LEVEL SECURITY;

-- Policies for ai_personalities
CREATE POLICY "Users can view their own personality"
  ON ai_personalities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own personality"
  ON ai_personalities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personality"
  ON ai_personalities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for ai_memory_fragments
CREATE POLICY "Users can view their own memories"
  ON ai_memory_fragments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
  ON ai_memory_fragments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
  ON ai_memory_fragments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON ai_memory_fragments FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for ai_memory_summaries
CREATE POLICY "Users can view their own summaries"
  ON ai_memory_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries"
  ON ai_memory_summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summaries"
  ON ai_memory_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summaries"
  ON ai_memory_summaries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ai_personalities
DROP TRIGGER IF EXISTS update_ai_personalities_updated_at ON ai_personalities;
CREATE TRIGGER update_ai_personalities_updated_at
  BEFORE UPDATE ON ai_personalities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create personality for new users
CREATE OR REPLACE FUNCTION create_default_ai_personality()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ai_personalities (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create personality when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_ai_personality();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_personalities IS 'Stores customizable AI personality settings for each user';
COMMENT ON TABLE ai_memory_fragments IS 'Long-term memory storage about user preferences, facts, and goals';
COMMENT ON TABLE ai_memory_summaries IS 'Condensed summaries of past conversations for AI context';

COMMENT ON COLUMN ai_personalities.friendliness IS 'How warm and friendly the AI should be (0=cold, 100=very warm)';
COMMENT ON COLUMN ai_personalities.formality IS 'How formal the AI should be (0=casual, 100=very formal)';
COMMENT ON COLUMN ai_personalities.humor IS 'How much humor/wittiness to include (0=serious, 100=very funny)';
COMMENT ON COLUMN ai_personalities.detail_level IS 'How detailed explanations should be (0=brief, 100=comprehensive)';
COMMENT ON COLUMN ai_personalities.patience IS 'How patient/repetitive the AI should be (0=impatient, 100=very patient)';
COMMENT ON COLUMN ai_personalities.encouragement IS 'How encouraging/supportive the AI should be';
COMMENT ON COLUMN ai_personalities.socratic_method IS 'Whether to use questioning technique instead of direct answers';
COMMENT ON COLUMN ai_personalities.analogy_frequency IS 'How often to use analogies (0=never, 5=always)';

COMMENT ON COLUMN ai_memory_fragments.memory_type IS 'Type of memory: fact, preference, skill, goal, or context';
COMMENT ON COLUMN ai_memory_fragments.importance IS 'Memory importance score for retention prioritization';
COMMENT ON COLUMN ai_memory_fragments.reinforcement_count IS 'How many times this memory has been reinforced';
