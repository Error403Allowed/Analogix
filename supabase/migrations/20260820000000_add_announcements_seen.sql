-- ============================================================
-- ANNOUNCEMENTS SEEN
-- ----------------------------------------------------------------------------
-- Tracks which "What's New" announcements a user has dismissed. Mirrors the
-- existing tours_completed pattern so announcements are shown once per release
-- and stay dismissed across devices. RLS is covered by the existing
-- "Users can view/update their own profile" policies.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS announcements_seen TEXT[] DEFAULT '{}';