-- Add document version tracking for revert functionality
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS content_backup TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS last_reverted_at TIMESTAMPTZ;

-- Function to backup document content before AI edits
CREATE OR REPLACE FUNCTION public.backup_document_content(doc_id TEXT, new_content TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_content TEXT;
BEGIN
  -- Get current content before update
  SELECT content INTO current_content FROM documents WHERE id = doc_id;
  
  -- Store previous content in backup
  UPDATE documents 
  SET content_backup = current_content,
      last_reverted_at = NOW()
  WHERE id = doc_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revert document to previous version
CREATE OR REPLACE FUNCTION public.revert_document(doc_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  backup_content TEXT;
BEGIN
  -- Get backup content
  SELECT content_backup INTO backup_content FROM documents WHERE id = doc_id;
  
  IF backup_content IS NULL OR backup_content = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Restore from backup
  UPDATE documents 
  SET content = backup_content,
      content_backup = NULL,
      last_reverted_at = NULL,
      updated_at = NOW()
  WHERE id = doc_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revert status
CREATE OR REPLACE FUNCTION public.can_revert_document(doc_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_backup BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM documents 
    WHERE id = doc_id 
    AND content_backup IS NOT NULL 
    AND content_backup != ''
  ) INTO has_backup;
  
  RETURN has_backup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;