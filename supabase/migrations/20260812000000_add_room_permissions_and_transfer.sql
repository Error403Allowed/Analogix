-- ============================================================
-- Room permissions + ownership transfer
-- Adds a `permissions` JSONB column to study_rooms and a
-- SECURITY DEFINER RPC for transferring ownership (the plain
-- UPDATE path is blocked by RLS WITH CHECK on study_rooms).
-- ============================================================

-- ── Permissions column ──────────────────────────────────────
ALTER TABLE public.study_rooms
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
    "canShareDocuments": true,
    "canInviteMembers": false,
    "canManageRoles": false,
    "canDeleteMessages": false,
    "canControlTimer": false
  }'::JSONB;

-- ── Ownership transfer RPC ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.transfer_study_room_ownership(
  p_room_id UUID,
  p_new_owner_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_owner UUID;
  v_is_member BOOLEAN;
BEGIN
  SELECT owner_user_id INTO v_old_owner
    FROM public.study_rooms
   WHERE id = p_room_id;

  IF v_old_owner IS NULL THEN
    RAISE EXCEPTION 'Study room not found';
  END IF;

  IF v_old_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  IF p_new_owner_user_id = auth.uid() THEN
    RAISE EXCEPTION 'The room already belongs to you';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.study_room_members
     WHERE room_id = p_room_id
       AND user_id = p_new_owner_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'New owner must already be a member of the room';
  END IF;

  -- Demote the old owner / promote the new owner (old owner becomes cohost).
  UPDATE public.study_room_members
     SET role = 'cohost',
         last_seen = NOW()
   WHERE room_id = p_room_id
     AND user_id = v_old_owner;

  UPDATE public.study_room_members
     SET role = 'host',
         last_seen = NOW(),
         is_online = TRUE
   WHERE room_id = p_room_id
     AND user_id = p_new_owner_user_id;

  -- Transfer ownership.
  UPDATE public.study_rooms
     SET owner_user_id = p_new_owner_user_id,
         updated_at = NOW()
   WHERE id = p_room_id
     AND owner_user_id = v_old_owner;

  RETURN p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_study_room_ownership(UUID, UUID) TO authenticated;