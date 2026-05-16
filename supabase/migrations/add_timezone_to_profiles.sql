-- Migration: Add timezone column to profiles table
-- Run this in Supabase SQL Editor to add timezone support for existing users

-- Add timezone column with default value
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Australia/Sydney';

-- Update existing users to use their browser's detected timezone
-- Note: This sets everyone to Sydney as a default - they can update it in settings
-- or re-run onboarding to capture their actual timezone
UPDATE public.profiles 
SET timezone = 'Australia/Sydney' 
WHERE timezone IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone for accurate date/time display (e.g., Australia/Sydney, Australia/Perth)';
