-- AI Tool Approval Settings
-- Adds columns to ai_personalities for controlling tool auto-approval behavior

ALTER TABLE ai_personalities
ADD COLUMN IF NOT EXISTS auto_approve_tools BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_approve_read_tools BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_approve_write_subjects JSONB DEFAULT '[]'::jsonb;
