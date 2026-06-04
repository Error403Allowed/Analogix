-- Migration: Add custom_subjects table for user-customized subject appearance
-- This allows users to customize icons, colors, and covers for each subject (Notion-style)

CREATE TABLE IF NOT EXISTS public.custom_subjects (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id   TEXT NOT NULL,
  custom_icon  TEXT,                    -- Lucide icon name (e.g., "BookOpen")
  custom_color TEXT,                    -- Color ID (e.g., "blue", "red")
  custom_cover TEXT,                    -- Cover image URL or gradient ID
  custom_title TEXT,                    -- Custom display title for the subject
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, subject_id)
);

ALTER TABLE public.custom_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom subjects"
  ON public.custom_subjects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom subjects"
  ON public.custom_subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom subjects"
  ON public.custom_subjects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom subjects"
  ON public.custom_subjects FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_subjects_updated_at
  BEFORE UPDATE ON public.custom_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_subjects_user_id ON public.custom_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_subjects_subject_id ON public.custom_subjects(user_id, subject_id);
