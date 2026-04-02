-- ============================================================
-- Fix: add UNIQUE constraint on ydoc_snapshots.doc_id
-- Required for the ON CONFLICT (doc_id) upsert in compactDoc.
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.ydoc_snapshots
  ADD CONSTRAINT ydoc_snapshots_doc_id_unique UNIQUE (doc_id);
