CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS curriculum_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768),
  subject VARCHAR(50) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  strand VARCHAR(255),
  topic VARCHAR(255),
  acara_code VARCHAR(50),
  state VARCHAR(10) DEFAULT 'NATIONAL',
  key_terms TEXT[],
  chunk_type VARCHAR(50),
  metadata JSONB,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

CREATE INDEX IF NOT EXISTS idx_curriculum_embedding ON curriculum_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_curriculum_search ON curriculum_chunks USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_curriculum_subject_grade ON curriculum_chunks (subject, grade);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION update_curriculum_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_curriculum_search_vector ON curriculum_chunks;
CREATE TRIGGER trg_curriculum_search_vector
  BEFORE INSERT OR UPDATE ON curriculum_chunks
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_search_vector();

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
  p_subject_id TEXT DEFAULT NULL
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
      AND (p_owner_user_id IS NULL OR d.owner_user_id = p_owner_user_id)
      AND (p_subject_id IS NULL OR d.subject_id = p_subject_id)
    ORDER BY score DESC
    LIMIT match_count;
  END IF;
END;
$$;
