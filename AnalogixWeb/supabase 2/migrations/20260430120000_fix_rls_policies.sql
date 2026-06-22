-- Fix RLS policies for study guide functionality
-- Run this in Supabase Dashboard SQL Editor

-- Subject Data: Allow authenticated users full access to their own data
DROP POLICY IF EXISTS "Users manage their own subject data" ON public.subject_data;
CREATE POLICY "Users manage their own subject data" ON public.subject_data
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Flashcards: Allow authenticated users full access to their own cards
DROP POLICY IF EXISTS "Users manage their own flashcards" ON public.flashcards;
CREATE POLICY "Users manage their own flashcards" ON public.flashcards
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Flashcard Sets: Allow authenticated users access to their own sets
DROP POLICY IF EXISTS "Users manage their own flashcard sets" ON public.flashcard_sets;
CREATE POLICY "Users manage their own flashcard sets" ON public.flashcard_sets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Documents: Allow authenticated users full access to their own documents
DROP POLICY IF EXISTS "Users manage their own documents" ON public.documents;
CREATE POLICY "Users manage their own documents" ON public.documents
  FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Custom Subjects: Allow authenticated users access to their own custom subjects
DROP POLICY IF EXISTS "Users manage their own custom subjects" ON public.custom_subjects;
CREATE POLICY "Users manage their own custom subjects" ON public.custom_subjects
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Study Rooms: Allow authenticated users access to rooms they're member of
DROP POLICY IF EXISTS "Users can access their own rooms" ON public.study_rooms;
CREATE POLICY "Users can access their own rooms" ON public.study_rooms
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.study_room_members WHERE room_id = id AND user_id = auth.uid())
    OR owner_user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.study_room_members WHERE room_id = id AND user_id = auth.uid())
    OR owner_user_id = auth.uid()
  );

-- Study Room Members: Allow authenticated users access to their own memberships
DROP POLICY IF EXISTS "Users manage their own room memberships" ON public.study_room_members;
CREATE POLICY "Users manage their own room memberships" ON public.study_room_members
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Study Room Messages: Allow authenticated users access to messages in their rooms
DROP POLICY IF EXISTS "Users can access room messages" ON public.study_room_messages;
CREATE POLICY "Users can access room messages" ON public.study_room_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.study_room_members WHERE room_id = room_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.study_room_members WHERE room_id = room_id AND user_id = auth.uid())
  );

-- User Stats: Allow authenticated users access to their own stats
DROP POLICY IF EXISTS "Users manage their own stats" ON public.user_stats;
CREATE POLICY "Users manage their own stats" ON public.user_stats
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profiles: Allow authenticated users access to their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users manage their own profile" ON public.profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Chat Sessions: Allow authenticated users access to their own chat sessions
DROP POLICY IF EXISTS "Users manage their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users manage their own chat sessions" ON public.chat_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Chat Messages: Allow authenticated users access to their own chat messages
DROP POLICY IF EXISTS "Users manage their own chat messages" ON public.chat_messages;
CREATE POLICY "Users manage their own chat messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Activity Log: Allow authenticated users access to their own activity
DROP POLICY IF EXISTS "Users manage their own activity" ON public.activity_log;
CREATE POLICY "Users manage their own activity" ON public.activity_log
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User Preferences: Allow authenticated users access to their own preferences
DROP POLICY IF EXISTS "Users manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users manage their own preferences" ON public.user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled on all user-tied tables
ALTER TABLE public.custom_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_members ENABLE ROW LEVEL SECURITY;