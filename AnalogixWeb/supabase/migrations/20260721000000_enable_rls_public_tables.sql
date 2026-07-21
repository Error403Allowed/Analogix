-- Enable RLS on public reference tables and grant appropriate access.

-- curriculum_chunks: public domain curriculum data, read-only for authenticated users
ALTER TABLE public.curriculum_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read curriculum_chunks" ON public.curriculum_chunks;
CREATE POLICY "Authenticated users can read curriculum_chunks" ON public.curriculum_chunks
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies — only service role can write via ingestion scripts

-- ai_agents: system-defined agent registry, read-only for all authenticated users
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ai_agents" ON public.ai_agents;
CREATE POLICY "Anyone can read ai_agents" ON public.ai_agents
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies — only service role can manage agent definitions
