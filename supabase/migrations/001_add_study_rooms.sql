-- ============================================================
-- STUDY ROOMS SCHEMA
-- Adds support for study rooms with persistent rooms, members, chat, and shared documents
-- ============================================================

-- Create study_rooms table
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  subject_id      TEXT,  -- Optional subject association
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public       BOOLEAN DEFAULT TRUE,
  max_members     INTEGER DEFAULT 10,
  current_members INTEGER DEFAULT 0,
  study_topic     TEXT,  -- Current study topic for AI context
  study_notes     TEXT,  -- Shared notes for AI context
  timer_duration  INTEGER DEFAULT 0,  -- Study timer in seconds
  timer_started_at TIMESTAMPTZ,  -- When timer was started
  timer_paused_at TIMESTAMPTZ,  -- When timer was paused
  timer_elapsed   INTEGER DEFAULT 0,  -- Elapsed time when paused
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Create study_room_members table
CREATE TABLE IF NOT EXISTS public.study_room_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id    UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  last_seen  TIMESTAMPTZ DEFAULT NOW(),
  is_online  BOOLEAN DEFAULT TRUE,
  UNIQUE(room_id, user_id)
);

-- Create study_room_messages table (chat)
CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id    UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'ai')),
  ai_context JSONB,  -- For AI messages, store context used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create study_room_shared_documents table
CREATE TABLE IF NOT EXISTS public.study_room_shared_documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id        UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  document_id    TEXT NOT NULL,  -- References SubjectDocumentItem.id
  subject_id     TEXT NOT NULL,
  shared_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at      TIMESTAMPTZ DEFAULT NOW(),
  access_level   TEXT DEFAULT 'view' CHECK (access_level IN ('view', 'copy')),  -- view or copy only
  UNIQUE(room_id, document_id, subject_id)
);

-- Enable Row Level Security
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_shared_documents ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_rooms_owner ON public.study_rooms(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_public ON public.study_rooms(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_study_room_members_room ON public.study_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_members_user ON public.study_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_room ON public.study_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_user ON public.study_room_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_shared_docs_room ON public.study_room_shared_documents(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_shared_docs_doc ON public.study_room_shared_documents(document_id, subject_id);

-- RLS Policies for study_rooms
CREATE POLICY "Users can view public rooms"
  ON public.study_rooms FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can view their own rooms"
  ON public.study_rooms FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own rooms"
  ON public.study_rooms FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own rooms"
  ON public.study_rooms FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own rooms"
  ON public.study_rooms FOR DELETE
  USING (auth.uid() = owner_user_id);

-- RLS Policies for study_room_members
CREATE POLICY "Members can view room members"
  ON public.study_room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_rooms sr
      WHERE sr.id = room_id
        AND (sr.is_public = TRUE OR sr.owner_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can join rooms"
  ON public.study_room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_rooms sr
      WHERE sr.id = room_id
        AND (sr.is_public = TRUE OR sr.owner_user_id = auth.uid())
    )
  );

CREATE POLICY "Members can update their own member status"
  ON public.study_room_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave rooms"
  ON public.study_room_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for study_room_messages
CREATE POLICY "Room members can view room messages"
  ON public.study_room_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_room_members srm
      WHERE srm.room_id = room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can send messages"
  ON public.study_room_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_room_members srm
      WHERE srm.room_id = room_id
        AND srm.user_id = auth.uid()
    )
  );

-- RLS Policies for study_room_shared_documents
CREATE POLICY "Room members can view shared documents"
  ON public.study_room_shared_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_room_members srm
      WHERE srm.room_id = room_id
        AND srm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can share documents to rooms they own or are members of"
  ON public.study_room_shared_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_rooms sr
      WHERE sr.id = room_id
        AND (sr.owner_user_id = auth.uid() OR 
             EXISTS (
               SELECT 1 FROM public.study_room_members srm
               WHERE srm.room_id = sr.id
                 AND srm.user_id = auth.uid()
             ))
    )
  );

CREATE POLICY "Users can remove their own shared documents"
  ON public.study_room_shared_documents FOR DELETE
  USING (auth.uid() = shared_by);

-- Function to update room member count
CREATE OR REPLACE FUNCTION public.update_study_room_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.study_rooms
  SET current_members = (
    SELECT COUNT(*) 
    FROM public.study_room_members 
    WHERE room_id = NEW.room_id
  ),
  updated_at = NOW()
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update member count when members join/leave
CREATE TRIGGER update_study_room_member_count_after_insert
  AFTER INSERT ON public.study_room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_study_room_member_count();

CREATE TRIGGER update_study_room_member_count_after_delete
  AFTER DELETE ON public.study_room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_study_room_member_count();

-- Function to get room members with their online status
CREATE OR REPLACE FUNCTION public.get_study_room_members(p_room_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  joined_at TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  is_online BOOLEAN,
  user_name TEXT,
  user_avatar_url TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    srm.id,
    srm.user_id,
    srm.joined_at,
    srm.last_seen,
    srm.is_online,
    COALESCE(p.full_name, p.email, 'Anonymous') as user_name,
    p.avatar_url as user_avatar_url
  FROM public.study_room_members srm
  LEFT JOIN public.profiles p ON p.id = srm.user_id
  WHERE srm.room_id = p_room_id
  ORDER BY srm.joined_at;
END;
$$;

-- Function to get recent messages for a room
CREATE OR REPLACE FUNCTION public.get_study_room_messages(p_room_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  message_type TEXT,
  ai_context JSONB,
  created_at TIMESTAMPTZ,
  user_name TEXT,
  user_avatar_url TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    srm.id,
    srm.user_id,
    srm.content,
    srm.message_type,
    srm.ai_context,
    srm.created_at,
    COALESCE(p.full_name, p.email, 'Anonymous') as user_name,
    p.avatar_url as user_avatar_url
  FROM public.study_room_messages srm
  LEFT JOIN public.profiles p ON p.id = srm.user_id
  WHERE srm.room_id = p_room_id
  ORDER BY srm.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON TABLE public.study_rooms IS 'Study rooms for group tutoring sessions';
COMMENT ON TABLE public.study_room_members 'Members of study rooms';
COMMENT ON TABLE public.study_room_messages 'Chat messages in study rooms';
COMMENT ON TABLE public.study_room_shared_documents 'Documents shared to study rooms (view/copy only)';
