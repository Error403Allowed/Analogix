-- ============================================================
-- Workspace Entities Registry
-- Central registry for all workspace entities with relationships
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_entities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT NOT NULL,
  workspace_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id       TEXT NOT NULL,
  entity_data     JSONB DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  relationships   JSONB DEFAULT '[]',
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, entity_type, entity_id)
);

CREATE INDEX idx_workspace_entities_workspace ON workspace_entities(workspace_id);
CREATE INDEX idx_workspace_entities_type ON workspace_entities(entity_type);
CREATE INDEX idx_workspace_entities_entity_id ON workspace_entities(entity_id);
CREATE INDEX idx_workspace_entities_tags ON workspace_entities USING GIN(tags);

ALTER TABLE workspace_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workspace entities"
  ON workspace_entities FOR ALL
  USING (auth.uid() = workspace_id)
  WITH CHECK (auth.uid() = workspace_id);

-- ============================================================
-- Entity Relationships
-- Explicit relationships between workspace entities
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_relationships (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type         TEXT NOT NULL,
  source_id           UUID NOT NULL,
  target_type         TEXT NOT NULL,
  target_id           UUID NOT NULL,
  relationship_type   TEXT NOT NULL,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entity_relationships_workspace ON entity_relationships(workspace_id);
CREATE INDEX idx_entity_relationships_source ON entity_relationships(source_type, source_id);
CREATE INDEX idx_entity_relationships_target ON entity_relationships(target_type, target_id);
CREATE INDEX idx_entity_relationships_type ON entity_relationships(relationship_type);

ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own entity relationships"
  ON entity_relationships FOR ALL
  USING (auth.uid() = workspace_id)
  WITH CHECK (auth.uid() = workspace_id);

-- ============================================================
-- Operation Logs
-- Track all AI operations for audit, rollback, and streaming
-- ============================================================

CREATE TABLE IF NOT EXISTS operation_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type  TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  payload         JSONB NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applying', 'applied', 'rolled_back', 'failed')),
  result          JSONB,
  error_message   TEXT,
  rollback_data   JSONB,
  parent_operation_id UUID REFERENCES operation_logs(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_status ON operation_logs(status);
CREATE INDEX idx_operation_logs_type ON operation_logs(operation_type);
CREATE INDEX idx_operation_logs_parent ON operation_logs(parent_operation_id);

ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own operation logs"
  ON operation_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Full-text Search
-- Enable tsvector for efficient text search on documents
-- ============================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;

CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);

-- Function to update search vector on content changes
CREATE OR REPLACE FUNCTION documents_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_search_update ON documents;
CREATE TRIGGER documents_search_update
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_trigger();