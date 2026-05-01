-- ============================================================
-- Analogix — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- One row per user. Mirrors auth.users. Stores onboarding data.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  grade         TEXT,
  state         TEXT,
  subjects      TEXT[]    DEFAULT '{}',
  hobbies       TEXT[]    DEFAULT '{}',
  hobby_ids     TEXT[]    DEFAULT '{}',
  hobby_details JSONB     DEFAULT '{}',
  timezone      TEXT      DEFAULT 'Australia/Sydney',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- USER STATS
-- One row per user. Upserted on each stat update.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_stats (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quizzes_done        INT     DEFAULT 0,
  current_streak      INT     DEFAULT 0,
  accuracy            INT     DEFAULT 0,
  conversations_count INT     DEFAULT 0,
  top_subject         TEXT    DEFAULT 'None',
  subject_counts      JSONB   DEFAULT '{}',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own stats"
  ON public.user_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SUBJECT DATA  (marks + notes per subject)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subject_data (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  marks      JSONB DEFAULT '[]',
  notes      JSONB DEFAULT '{"content":"","lastUpdated":""}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, subject_id)
);

ALTER TABLE public.subject_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own subject data"
  ON public.subject_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- EVENTS  (calendar events, e.g. from ICS imports)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  date       TIMESTAMPTZ NOT NULL,
  end_date   TIMESTAMPTZ,
  type       TEXT,
  subject    TEXT,
  location   TEXT,
  description TEXT,
  color      TEXT,
  source     TEXT DEFAULT 'import',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own events"
  ON public.events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DEADLINES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deadlines (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  due_date   TIMESTAMPTZ NOT NULL,
  subject    TEXT,
  priority   TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own deadlines"
  ON public.deadlines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own achievements"
  ON public.achievements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CHAT SESSIONS  (one session = one subject conversation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  title      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own chat sessions"
  ON public.chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CHAT MESSAGES  (individual messages within a session)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own chat messages"
  ON public.chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ACTIVITY LOG  (per-day session counts for streak/heatmap)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  count      INT  NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own activity log"
  ON public.activity_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- USER PREFERENCES  (theme, mood, UI prefs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mood       TEXT DEFAULT 'focus',
  theme      TEXT DEFAULT 'Classic Blue',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RPC: increment_activity
-- Atomically increments (or inserts) today's activity count.
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_activity(p_user_id UUID, p_date DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = activity_log.count + 1, updated_at = NOW();
END;
$$;

-- Index for fast session message lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);


-- ============================================================
-- FLASHCARDS  (spaced-repetition cards per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id        TEXT NOT NULL,
  front             TEXT NOT NULL,
  back              TEXT NOT NULL,
  source_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  next_review       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
  interval_days     INTEGER NOT NULL DEFAULT 1,
  ease_factor       NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  repetitions       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own flashcards"
  ON public.flashcards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for fast due-card lookups
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON public.flashcards(user_id, next_review);

-- ============================================================
-- FLASHCARD SETS  (topic-named sets within a subject)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own flashcard sets"
  ON public.flashcard_sets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON public.flashcard_sets(user_id);

-- Add set_id to flashcards (nullable — existing cards have no set)
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS set_id UUID REFERENCES public.flashcard_sets(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_flashcards_set_id ON public.flashcards(set_id);
