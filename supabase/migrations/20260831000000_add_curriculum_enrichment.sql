-- CURRICULUM TOPIC ENRICHMENT (Option A: generate-on-demand cache)
-- ----------------------------------------------------------------------------
-- The raw ACARA curriculum data (vendor/analogix-shared) is genuine but
-- terse - one content-description sentence plus a few short elaboration
-- bullets per topic. This table caches richer, AI-generated content per
-- topic (plain-language explanation, worked examples, common
-- misconceptions) the first time any user opens that topic, so it's
-- generated once ever rather than per-user-per-click.
--
-- This is shared reference content, not personal data - keyed by topic_id
-- only, with no user_id. Any authenticated user may read it, and may write
-- it (there's no service-role client in this codebase; writes go through
-- the user's own session). A unique constraint on topic_id means a second
-- concurrent generation attempt for the same topic simply no-ops via
-- ON CONFLICT DO NOTHING rather than producing duplicates.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.curriculum_topic_enrichment (
  topic_id      TEXT PRIMARY KEY,
  subject_name  TEXT NOT NULL,
  explanation   TEXT NOT NULL,
  examples      JSONB NOT NULL DEFAULT '[]',
  misconceptions JSONB NOT NULL DEFAULT '[]',
  real_world    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.curriculum_topic_enrichment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in can read curriculum enrichment" ON public.curriculum_topic_enrichment;
CREATE POLICY "Anyone signed in can read curriculum enrichment"
  ON public.curriculum_topic_enrichment FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone signed in can add curriculum enrichment" ON public.curriculum_topic_enrichment;
CREATE POLICY "Anyone signed in can add curriculum enrichment"
  ON public.curriculum_topic_enrichment FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
