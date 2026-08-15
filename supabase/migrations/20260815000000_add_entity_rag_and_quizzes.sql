-- ============================================================
-- Entity RAG + Quizzes
-- Unified embedding index for workspace entities (flashcards,
-- formulas, calendar events, subjects, memory, quizzes) plus a
-- real `quizzes` / `quiz_attempts` storage layer.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Unified entity embedding index
-- owner_user_id NULL = shared corpus rows (e.g. static formulas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entity_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  subject_id    TEXT,
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  embedding     VECTOR(768),
  search_vector TSVECTOR,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (entity_type, entity_id, owner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_embeddings_hnsw
  ON public.entity_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_search
  ON public.entity_embeddings USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_owner
  ON public.entity_embeddings (owner_user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_subject
  ON public.entity_embeddings (subject_id);

CREATE OR REPLACE FUNCTION update_entity_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entity_search_vector ON public.entity_embeddings;
CREATE TRIGGER trg_entity_search_vector
  BEFORE INSERT OR UPDATE ON public.entity_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_entity_search_vector();

ALTER TABLE public.entity_embeddings ENABLE ROW LEVEL SECURITY;

-- Users manage their own indexed rows.
DROP POLICY IF EXISTS "Users manage their own entity embeddings" ON public.entity_embeddings;
CREATE POLICY "Users manage their own entity embeddings"
  ON public.entity_embeddings FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Shared corpus rows (owner NULL, e.g. formulas) are readable by authenticated users.
DROP POLICY IF EXISTS "Authenticated users can read shared entity embeddings" ON public.entity_embeddings;
CREATE POLICY "Authenticated users can read shared entity embeddings"
  ON public.entity_embeddings FOR SELECT
  TO authenticated
  USING (owner_user_id IS NULL);

-- ------------------------------------------------------------
-- 2. Quizzes storage (canonical, matches @analogix/shared handler)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  difficulty TEXT DEFAULT 'intermediate',
  questions  JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user ON public.quizzes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON public.quizzes(subject_id);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own quizzes" ON public.quizzes;
CREATE POLICY "Users manage their own quizzes"
  ON public.quizzes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id     UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
  score       INTEGER,
  total_questions INTEGER,
  correct_answers INTEGER,
  answers     JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users manage their own quiz attempts"
  ON public.quiz_attempts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3. Relax documents.role CHECK (legacy + planned roles)
-- ------------------------------------------------------------
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_role_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_role_check
  CHECK (role IN ('notes', 'study-guide', 'flashcard', 'formula', 'quiz', 'document'));

-- ------------------------------------------------------------
-- 4. Extend hybrid_search with an entity_embeddings branch
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION hybrid_search(
  query_table TEXT,
  query_embedding TEXT,
  query_text TEXT,
  match_threshold DOUBLE PRECISION DEFAULT 0.5,
  match_count INT DEFAULT 10,
  vector_weight DOUBLE PRECISION DEFAULT 0.7,
  filter_subject TEXT DEFAULT NULL,
  filter_grade TEXT DEFAULT NULL,
  filter_state TEXT DEFAULT NULL,
  filter_chunk_type TEXT DEFAULT NULL,
  p_owner_user_id TEXT DEFAULT NULL,
  p_subject_id TEXT DEFAULT NULL,
  p_entity_types TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  score DOUBLE PRECISION,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  embedding_vec VECTOR(768);
  ts_query TSQUERY;
BEGIN
  embedding_vec := query_embedding::VECTOR(768);
  ts_query := plainto_tsquery('english', query_text);

  IF query_table = 'curriculum_chunks' THEN
    RETURN QUERY
    SELECT
      c.id,
      c.content,
      (vector_weight * (1 - (c.embedding <=> embedding_vec)) +
       (1 - vector_weight) * COALESCE(ts_rank(c.search_vector, ts_query), 0)) AS score,
      jsonb_build_object(
        'subject', c.subject,
        'grade', c.grade,
        'strand', c.strand,
        'topic', c.topic,
        'acara_code', c.acara_code,
        'state', c.state,
        'chunk_type', c.chunk_type,
        'key_terms', c.key_terms
      ) AS metadata
    FROM curriculum_chunks c
    WHERE c.embedding IS NOT NULL
      AND (1 - (c.embedding <=> embedding_vec)) > match_threshold
      AND (filter_subject IS NULL OR c.subject = filter_subject)
      AND (filter_grade IS NULL OR c.grade = filter_grade)
      AND (filter_state IS NULL OR c.state = filter_state)
      AND (filter_chunk_type IS NULL OR c.chunk_type = filter_chunk_type)
    ORDER BY score DESC
    LIMIT match_count;
  ELSIF query_table = 'documents' THEN
    RETURN QUERY
    SELECT
      d.id,
      COALESCE(d.content, '') AS content,
      (vector_weight * (1 - (d.embedding <=> embedding_vec)) +
       (1 - vector_weight) * COALESCE(ts_rank(d.search_vector, ts_query), 0)) AS score,
      jsonb_build_object(
        'title', d.title,
        'subject_id', d.subject_id,
        'role', d.role
      ) AS metadata
    FROM documents d
    WHERE d.embedding IS NOT NULL
      AND (1 - (d.embedding <=> embedding_vec)) > match_threshold
      AND (p_owner_user_id IS NULL OR d.owner_user_id = p_owner_user_id::uuid)
      AND (p_subject_id IS NULL OR d.subject_id = p_subject_id)
    ORDER BY score DESC
    LIMIT match_count;
  ELSIF query_table = 'entity_embeddings' THEN
    RETURN QUERY
    SELECT
      e.id,
      e.content,
      (vector_weight * (1 - (e.embedding <=> embedding_vec)) +
       (1 - vector_weight) * COALESCE(ts_rank(e.search_vector, ts_query), 0)) AS score,
      jsonb_build_object(
        'entity_type', e.entity_type,
        'entity_id', e.entity_id,
        'subject_id', e.subject_id,
        'title', COALESCE(e.metadata->>'title', '')
      ) AS metadata
    FROM entity_embeddings e
    WHERE e.embedding IS NOT NULL
      AND (1 - (e.embedding <=> embedding_vec)) > match_threshold
      AND (p_owner_user_id IS NULL OR e.owner_user_id = p_owner_user_id::uuid OR e.owner_user_id IS NULL)
      AND (p_subject_id IS NULL OR e.subject_id = p_subject_id)
      AND (p_entity_types IS NULL OR e.entity_type = ANY(p_entity_types))
    ORDER BY score DESC
    LIMIT match_count;
  END IF;
END;
$$;