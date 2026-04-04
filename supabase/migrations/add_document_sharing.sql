-- ============================================================
-- DOCUMENT SHARING
-- Adds support for sharing documents between users
-- ============================================================

-- Create document_shares table
CREATE TABLE IF NOT EXISTS public.document_shares (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     TEXT NOT NULL,
  subject_id      TEXT NOT NULL,
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_link_id   UUID,  -- For link-based sharing, links to another share record
  permission      TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  email           TEXT,  -- For link-based sharing without requiring account
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ,
  revoked         BOOLEAN DEFAULT FALSE,
  UNIQUE (document_id, subject_id, shared_with_user_id, permission)
);

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON public.document_shares(document_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with ON public.document_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_owner ON public.document_shares(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_link_id ON public.document_shares(share_link_id);

-- RLS Policies for document_shares

-- Owners can manage their shares
CREATE POLICY "Document owners can manage shares"
  ON public.document_shares FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Users can view shares where they are the recipient
CREATE POLICY "Users can view shares they received"
  ON public.document_shares FOR SELECT
  USING (auth.uid() = shared_with_user_id);

-- Allow public read access for link-based sharing (with valid share_link_id)
-- This is handled in the API layer with signed URLs instead

-- Function to check if user has access to a document (owner or shared)
CREATE OR REPLACE FUNCTION public.has_document_access(
  p_document_id TEXT,
  p_subject_id TEXT,
  p_permission TEXT DEFAULT 'view'
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is the owner
  SELECT EXISTS (
    SELECT 1 FROM public.subject_data
    WHERE user_id = v_user_id
      AND subject_id = p_subject_id
      AND notes->>'documents' @> jsonb_build_array(jsonb_build_object('id', p_document_id))
  ) INTO v_has_access;
  
  IF v_has_access THEN
    RETURN TRUE;
  END IF;
  
  -- Check if document is shared with user
  SELECT EXISTS (
    SELECT 1 FROM public.document_shares
    WHERE document_id = p_document_id
      AND subject_id = p_subject_id
      AND shared_with_user_id = v_user_id
      AND permission = p_permission
      AND revoked = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;

-- Function to get shared documents for a user
CREATE OR REPLACE FUNCTION public.get_shared_documents_for_user()
RETURNS TABLE (
  document_id TEXT,
  subject_id TEXT,
  owner_user_id UUID,
  owner_name TEXT,
  permission TEXT,
  shared_at TIMESTAMPTZ,
  document_title TEXT,
  document_data JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.document_id,
    ds.subject_id,
    ds.owner_user_id,
    p.name AS owner_name,
    ds.permission,
    ds.created_at AS shared_at,
    (ds_doc.doc_data->>'title')::TEXT AS document_title,
    ds_doc.doc_data AS document_data
  FROM public.document_shares ds
  LEFT JOIN public.profiles p ON p.id = ds.owner_user_id
  LEFT JOIN LATERAL (
    SELECT 
      sd.notes->'documents' AS docs,
      jsonb_array_elements(sd.notes->'documents') AS doc_data
    FROM public.subject_data sd
    WHERE sd.user_id = ds.owner_user_id 
      AND sd.subject_id = ds.subject_id
  ) ds_doc ON TRUE
  WHERE ds.shared_with_user_id = auth.uid()
    AND ds.revoked = FALSE
    AND (ds.expires_at IS NULL OR expires_at > NOW())
  ORDER BY ds.created_at DESC;
END;
$$;

-- ============================================================
-- UPDATE SUBJECT_DATA RLS TO ALLOW SHARED ACCESS
-- ============================================================

-- Drop the old restrictive policy and create a new one that allows shared access
DROP POLICY IF EXISTS "Users manage their own subject data" ON public.subject_data;

CREATE POLICY "Users manage their own subject data"
  ON public.subject_data FOR ALL
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.document_shares ds
      WHERE ds.shared_with_user_id = auth.uid()
        AND ds.subject_id = subject_data.subject_id
        AND ds.revoked = FALSE
        AND (ds.expires_at IS NULL OR ds.expires_at > NOW())
    )
  )
  WITH CHECK (auth.uid() = user_id);
