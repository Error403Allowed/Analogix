-- ============================================================
-- Yjs document persistence: append-only updates + snapshots
-- Run in Supabase SQL Editor after the base schema.
-- ============================================================

-- ── ydoc_updates ─────────────────────────────────────────────
-- Every Yjs binary update is appended here.
-- The realtime provider broadcasts updates; the persistence
-- layer also writes them so they survive a page refresh.
CREATE TABLE IF NOT EXISTS public.ydoc_updates (
  id         BIGSERIAL PRIMARY KEY,
  doc_id     TEXT        NOT NULL,   -- matches SubjectDocumentItem.id
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seq        BIGINT      NOT NULL,   -- monotonically increasing per doc_id
  update     BYTEA       NOT NULL,   -- raw Yjs encoded update
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ydoc_updates ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own doc updates.
CREATE POLICY "Users manage their own ydoc updates"
  ON public.ydoc_updates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ydoc_updates_doc ON public.ydoc_updates(doc_id, seq);
CREATE INDEX IF NOT EXISTS idx_ydoc_updates_user ON public.ydoc_updates(user_id);

-- ── ydoc_snapshots ────────────────────────────────────────────
-- Periodic compacted snapshots so page load is fast.
-- On load: apply latest snapshot + all updates after snapshot_seq.
CREATE TABLE IF NOT EXISTS public.ydoc_snapshots (
  id           BIGSERIAL PRIMARY KEY,
  doc_id       TEXT        NOT NULL,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_seq BIGINT      NOT NULL,  -- latest ydoc_update seq included
  snapshot     BYTEA       NOT NULL,  -- Y.encodeStateAsUpdate of full doc
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ydoc_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own ydoc snapshots"
  ON public.ydoc_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ydoc_snapshots_doc ON public.ydoc_snapshots(doc_id, snapshot_seq DESC);
CREATE INDEX IF NOT EXISTS idx_ydoc_snapshots_user ON public.ydoc_snapshots(user_id);

-- ── next_ydoc_seq RPC ─────────────────────────────────────────
-- Returns the next sequence number for a given doc atomically.
CREATE OR REPLACE FUNCTION public.next_ydoc_seq(p_doc_id TEXT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next BIGINT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1
    INTO v_next
    FROM public.ydoc_updates
   WHERE doc_id = p_doc_id;
  RETURN v_next;
END;
$$;
