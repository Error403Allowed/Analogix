-- Migration: Add missing RPC functions for activity tracking
-- Created: 2026-03-18

-- ============================================================================
-- FUNCTION: increment_activity
-- Tracks user activity for stats/achievements
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update activity tracking
  INSERT INTO user_activity (user_id, activity_type, count)
  VALUES (p_user_id, p_activity_type, p_count)
  ON CONFLICT (user_id, activity_type) 
  DO UPDATE SET 
    count = user_activity.count + p_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_activity TO authenticated;

-- ============================================================================
-- TABLE: user_activity (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_type)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(user_id, activity_type);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own activity"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity"
  ON user_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow the RPC function to write
CREATE POLICY "Function can write activity"
  ON user_activity FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION increment_activity IS 'Increments user activity count for tracking stats and achievements';
COMMENT ON TABLE user_activity IS 'Tracks user activities like messages sent, documents created, etc.';
