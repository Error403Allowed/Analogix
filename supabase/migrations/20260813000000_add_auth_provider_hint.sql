-- ============================================================
-- Auth sign-in method hint
-- Lets the app tell users who registered with Google that they
-- must keep signing in with Google (their account has no
-- password, so email/password always fails). SECURITY DEFINER
-- so clients can't read auth.identities directly, and only the
-- provider string for the supplied email is ever returned.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_email_auth_provider(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM auth.identities i
        JOIN auth.users u ON u.id = i.user_id
       WHERE lower(u.email) = lower(p_email)
    ) THEN NULL
    WHEN EXISTS (
      SELECT 1 FROM auth.identities i
        JOIN auth.users u ON u.id = i.user_id
       WHERE lower(u.email) = lower(p_email) AND i.provider = 'google'
    ) AND EXISTS (
      SELECT 1 FROM auth.identities i
        JOIN auth.users u ON u.id = i.user_id
       WHERE lower(u.email) = lower(p_email) AND i.provider = 'email'
    ) THEN 'both'
    WHEN EXISTS (
      SELECT 1 FROM auth.identities i
        JOIN auth.users u ON u.id = i.user_id
       WHERE lower(u.email) = lower(p_email) AND i.provider = 'google'
    ) THEN 'google'
    WHEN EXISTS (
      SELECT 1 FROM auth.identities i
        JOIN auth.users u ON u.id = i.user_id
       WHERE lower(u.email) = lower(p_email) AND i.provider = 'email'
    ) THEN 'email'
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_auth_provider(TEXT) TO anon, authenticated;
