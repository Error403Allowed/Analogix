-- ============================================================
-- Replace legacy document collaboration with room-centric rooms
-- ============================================================

-- ── Tear down obsolete sharing / collaboration schema ───────────────────────
DROP FUNCTION IF EXISTS public.get_shared_documents_for_user();
DROP FUNCTION IF EXISTS public.has_document_access(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.next_ydoc_seq(TEXT);

DROP TABLE IF EXISTS public.document_shares CASCADE;
DROP TABLE IF EXISTS public.ydoc_updates CASCADE;
DROP TABLE IF EXISTS public.ydoc_snapshots CASCADE;

DROP FUNCTION IF EXISTS public.get_study_room_members(UUID);
DROP FUNCTION IF EXISTS public.get_study_room_messages(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.update_study_room_member_count();

DROP TRIGGER IF EXISTS update_study_room_member_count_after_insert ON public.study_room_members;
DROP TRIGGER IF EXISTS update_study_room_member_count_after_delete ON public.study_room_members;

DROP TABLE IF EXISTS public.study_room_shared_documents CASCADE;
DROP TABLE IF EXISTS public.study_room_messages CASCADE;
DROP TABLE IF EXISTS public.study_room_members CASCADE;
DROP TABLE IF EXISTS public.study_room_canvas CASCADE;
DROP TABLE IF EXISTS public.study_rooms CASCADE;

-- ── Documents ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id              TEXT PRIMARY KEY,
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      TEXT NOT NULL,
  title           TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL DEFAULT '<p></p>',
  content_json    TEXT,
  content_text    TEXT,
  content_format  TEXT,
  role            TEXT NOT NULL DEFAULT 'notes' CHECK (role IN ('notes', 'study-guide')),
  icon            TEXT,
  cover           TEXT,
  study_guide_markdown TEXT,
  study_guide_data JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_edited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_subject
  ON public.documents(owner_user_id, subject_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_subject
  ON public.documents(subject_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Backfill legacy embedded documents into the new first-class table.
INSERT INTO public.documents (
  id,
  owner_user_id,
  subject_id,
  title,
  content,
  content_json,
  content_text,
  content_format,
  role,
  icon,
  cover,
  study_guide_markdown,
  study_guide_data,
  created_at,
  updated_at,
  last_edited_by
)
SELECT
  COALESCE(doc->>'id', gen_random_uuid()::TEXT),
  sd.user_id,
  sd.subject_id,
  COALESCE(doc->>'title', ''),
  COALESCE(NULLIF(doc->>'content', ''), '<p></p>'),
  NULLIF(doc->>'contentJson', ''),
  NULLIF(doc->>'contentText', ''),
  NULLIF(doc->>'contentFormat', ''),
  COALESCE(NULLIF(doc->>'role', ''), 'notes'),
  NULLIF(doc->>'icon', ''),
  NULLIF(doc->>'cover', ''),
  NULLIF(doc->>'studyGuideMarkdown', ''),
  CASE
    WHEN jsonb_typeof(doc->'studyGuideData') IS NOT NULL THEN doc->'studyGuideData'
    ELSE NULL
  END,
  COALESCE(NULLIF(doc->>'createdAt', '')::TIMESTAMPTZ, NOW()),
  COALESCE(NULLIF(doc->>'lastUpdated', '')::TIMESTAMPTZ, sd.updated_at, NOW()),
  sd.user_id
FROM public.subject_data sd
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(sd.notes->'documents') = 'array' THEN sd.notes->'documents'
    ELSE '[]'::JSONB
  END
) AS doc
ON CONFLICT (id) DO NOTHING;

UPDATE public.subject_data
SET notes = jsonb_set(COALESCE(notes, '{}'::JSONB), '{documents}', '[]'::JSONB, true),
    updated_at = NOW()
WHERE jsonb_typeof(notes->'documents') = 'array'
  AND jsonb_array_length(notes->'documents') > 0;

-- ── Rooms ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    TEXT NOT NULL,
  topic                    TEXT,
  visibility               TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  join_code                TEXT NOT NULL UNIQUE,
  owner_user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count             INTEGER NOT NULL DEFAULT 0,
  timer_state              TEXT NOT NULL DEFAULT 'idle' CHECK (timer_state IN ('idle', 'running', 'paused')),
  timer_duration_seconds   INTEGER NOT NULL DEFAULT 1500,
  timer_elapsed_seconds    INTEGER NOT NULL DEFAULT 0,
  timer_started_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_room_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'cohost', 'member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_type   TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'ai', 'system')),
  content        TEXT NOT NULL,
  metadata       JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_room_canvas (
  room_id          UUID PRIMARY KEY REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  title            TEXT NOT NULL DEFAULT 'Room canvas',
  content          TEXT NOT NULL DEFAULT '<p></p>',
  content_json     TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_edited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.study_room_shared_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  document_id    TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, document_id)
);

CREATE TABLE IF NOT EXISTS public.study_room_collab_updates (
  id            BIGSERIAL PRIMARY KEY,
  room_id        UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  surface_type   TEXT NOT NULL CHECK (surface_type IN ('canvas', 'document')),
  surface_id     TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seq            BIGINT NOT NULL,
  update         BYTEA NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, surface_type, surface_id, seq)
);

CREATE TABLE IF NOT EXISTS public.study_room_collab_snapshots (
  id            BIGSERIAL PRIMARY KEY,
  room_id        UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  surface_type   TEXT NOT NULL CHECK (surface_type IN ('canvas', 'document')),
  surface_id     TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_seq   BIGINT NOT NULL,
  snapshot       BYTEA NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, surface_type, surface_id)
);

CREATE INDEX IF NOT EXISTS idx_study_rooms_visibility
  ON public.study_rooms(visibility, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_rooms_owner
  ON public.study_rooms(owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_room_members_room
  ON public.study_room_members(room_id, joined_at ASC);
CREATE INDEX IF NOT EXISTS idx_study_room_members_user
  ON public.study_room_members(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_room
  ON public.study_room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_room_shared_documents_room
  ON public.study_room_shared_documents(room_id, shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_room_collab_updates_surface
  ON public.study_room_collab_updates(room_id, surface_type, surface_id, seq);
CREATE INDEX IF NOT EXISTS idx_study_room_collab_snapshots_surface
  ON public.study_room_collab_snapshots(room_id, surface_type, surface_id, snapshot_seq DESC);

ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_canvas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_collab_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_collab_snapshots ENABLE ROW LEVEL SECURITY;

-- ── Policies: documents ─────────────────────────────────────────────────────
CREATE POLICY "Users manage their own documents"
  ON public.documents FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Room members can view shared documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_room_shared_documents srsd
      JOIN public.study_room_members srm
        ON srm.room_id = srsd.room_id
      WHERE srsd.document_id = documents.id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can update shared documents"
  ON public.documents FOR UPDATE
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM public.study_room_shared_documents srsd
      JOIN public.study_room_members srm
        ON srm.room_id = srsd.room_id
      WHERE srsd.document_id = documents.id
        AND srm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM public.study_room_shared_documents srsd
      JOIN public.study_room_members srm
        ON srm.room_id = srsd.room_id
      WHERE srsd.document_id = documents.id
        AND srm.user_id = auth.uid()
    )
  );

-- ── Policies: rooms ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.study_room_members
    WHERE room_id = p_room_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_owner(p_room_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.study_rooms
    WHERE id = p_room_id
      AND owner_user_id = auth.uid()
  );
$$;

CREATE POLICY "Users can view accessible rooms"
  ON public.study_rooms FOR SELECT
  USING (
    visibility = 'public'
    OR owner_user_id = auth.uid()
    OR public.is_room_member(id)
  );

CREATE POLICY "Users can create their own rooms"
  ON public.study_rooms FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Hosts and cohosts can update their rooms"
  ON public.study_rooms FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_rooms.id
        AND srm.user_id = auth.uid()
        AND srm.role IN ('host', 'cohost')
    )
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_rooms.id
        AND srm.user_id = auth.uid()
        AND srm.role IN ('host', 'cohost')
    )
  );

CREATE POLICY "Room owners can delete their rooms"
  ON public.study_rooms FOR DELETE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can view room memberships they belong to"
  ON public.study_room_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_room_owner(room_id)
  );

CREATE POLICY "Users can join rooms as themselves"
  ON public.study_room_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members and owners can update room memberships"
  ON public.study_room_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.study_rooms sr
      WHERE sr.id = study_room_members.room_id
        AND sr.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.study_rooms sr
      WHERE sr.id = study_room_members.room_id
        AND sr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Members and owners can delete memberships"
  ON public.study_room_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.study_rooms sr
      WHERE sr.id = study_room_members.room_id
        AND sr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view room messages"
  ON public.study_room_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_messages.room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send room messages"
  ON public.study_room_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_messages.room_id
        AND srm.user_id = auth.uid()
    )
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Members can view the room canvas"
  ON public.study_room_canvas FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_canvas.room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update the room canvas"
  ON public.study_room_canvas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_canvas.room_id
        AND srm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_canvas.room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create the room canvas"
  ON public.study_room_canvas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.study_rooms sr
      WHERE sr.id = study_room_canvas.room_id
        AND sr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view room shared documents"
  ON public.study_room_shared_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_shared_documents.room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can share documents into rooms"
  ON public.study_room_shared_documents FOR INSERT
  WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_shared_documents.room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Sharers and owners can remove shared documents"
  ON public.study_room_shared_documents FOR DELETE
  USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.study_rooms sr
      WHERE sr.id = study_room_shared_documents.room_id
        AND sr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Members can read collaboration updates"
  ON public.study_room_collab_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_collab_updates.room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can append collaboration updates"
  ON public.study_room_collab_updates FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_collab_updates.room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can read collaboration snapshots"
  ON public.study_room_collab_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_collab_snapshots.room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can write collaboration snapshots"
  ON public.study_room_collab_snapshots FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_collab_snapshots.room_id
        AND srm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_room_members srm
      WHERE srm.room_id = study_room_collab_snapshots.room_id
        AND srm.user_id = auth.uid()
    )
  );

-- ── Helper functions ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.next_study_room_collab_seq(
  p_room_id UUID,
  p_surface_type TEXT,
  p_surface_id TEXT
)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next BIGINT;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1
    INTO v_next
    FROM public.study_room_collab_updates
   WHERE room_id = p_room_id
     AND surface_type = p_surface_type
     AND surface_id = p_surface_id;
  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_study_room_by_code(
  p_join_code TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id
    INTO v_room_id
    FROM public.study_rooms
   WHERE UPPER(join_code) = UPPER(TRIM(p_join_code))
   LIMIT 1;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Study room not found';
  END IF;

  INSERT INTO public.study_room_members (
    room_id,
    user_id,
    role,
    joined_at,
    last_seen,
    is_online
  )
  VALUES (
    v_room_id,
    v_user_id,
    'member',
    NOW(),
    NOW(),
    TRUE
  )
  ON CONFLICT (room_id, user_id)
  DO UPDATE SET
    last_seen = NOW(),
    is_online = TRUE;

  RETURN v_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_study_room_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_room_id UUID;
BEGIN
  v_room_id := COALESCE(NEW.room_id, OLD.room_id);
  UPDATE public.study_rooms
  SET member_count = (
        SELECT COUNT(*)
        FROM public.study_room_members srm
        WHERE srm.room_id = v_room_id
      ),
      updated_at = NOW()
  WHERE id = v_room_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER refresh_study_room_member_count_after_insert
  AFTER INSERT ON public.study_room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_study_room_member_count();

CREATE TRIGGER refresh_study_room_member_count_after_update
  AFTER UPDATE ON public.study_room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_study_room_member_count();

CREATE TRIGGER refresh_study_room_member_count_after_delete
  AFTER DELETE ON public.study_room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_study_room_member_count();

GRANT EXECUTE ON FUNCTION public.next_study_room_collab_seq(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_study_room_by_code(TEXT) TO authenticated;
