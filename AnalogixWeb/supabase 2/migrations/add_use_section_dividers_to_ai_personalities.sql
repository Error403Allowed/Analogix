-- Migration: Add use_section_dividers to ai_personalities
-- Created: 2026-03-19

-- The UI exposes `use_section_dividers`, but the initial migration didn’t include this column.
-- Add it in an idempotent way so re-running is safe.
ALTER TABLE ai_personalities
  ADD COLUMN IF NOT EXISTS use_section_dividers BOOLEAN DEFAULT true;

-- Backfill any existing rows that might have NULLs.
UPDATE ai_personalities
SET use_section_dividers = true
WHERE use_section_dividers IS NULL;

