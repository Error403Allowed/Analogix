-- CURRICULUM TOPIC TAGGING
-- ----------------------------------------------------------------------------
-- Links flashcard sets and quizzes to a specific ACARA curriculum topic, so
-- the "Curriculum" tab in Subjects can show real coverage/mastery instead of
-- an empty reference tree. topic_id stores the ACARA content-descriptor code
-- (e.g. "AC9M7N01") as plain text - it intentionally is NOT a foreign key,
-- since the curriculum data itself lives in code
-- (vendor/analogix-shared/src/curriculum/acara/*.ts), not the database.
--
-- Nullable and additive only: existing rows are unaffected, and a null
-- topic_id just means "not yet linked to a curriculum topic" rather than an
-- error state - most historical sets/quizzes will never be tagged
-- retroactively.
-- ============================================================

ALTER TABLE public.flashcard_sets
  ADD COLUMN IF NOT EXISTS topic_id TEXT;

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS topic_id TEXT;

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_topic_id ON public.flashcard_sets(topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_topic_id ON public.quizzes(topic_id) WHERE topic_id IS NOT NULL;
