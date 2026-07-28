-- Add missing columns to profiles table that are queried by the frontend
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tours_completed TEXT[] DEFAULT '{}';
