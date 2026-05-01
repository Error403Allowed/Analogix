-- ============================================================
-- Agentic Workflow System - Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Make uuid_generate_v4 available
CREATE OR REPLACE FUNCTION uuid_generate_v4()
RETURNS UUID
LANGUAGE sql
AS 'SELECT extensions.uuid_generate_v4()';

-- ============================================================
-- AI AGENTS REGISTRY
-- Each user can have multiple specialized AI agents
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_agents (
  id            TEXT PRIMARY KEY,  -- 'planner', 'notes', 'tasks', 'collab'
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,
  color         TEXT,
  system_prompt  TEXT NOT NULL,
  enabled       BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AGENT MEMORIES
-- Agent-specific上下文 and preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_memories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id     TEXT NOT NULL REFERENCES ai_agents(id),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type  TEXT NOT NULL,  -- 'preference', 'context', 'history', 'preference'
  content      JSONB NOT NULL,
  importance  FLOAT DEFAULT 0.5,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast memory retrieval
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_agent ON agent_memories(user_id, agent_id);

-- ============================================================
-- AGENT TASKS (Multi-Agent Task Queue)
-- Handles cross-agent communication and delegated tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_tasks (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  triggering_agent             TEXT NOT NULL REFERENCES ai_agents(id),
  target_agent             TEXT NOT NULL REFERENCES ai_agents(id),
  action                 TEXT NOT NULL,
  payload                JSONB NOT NULL,
  status                 TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_confirmation', 'in_progress', 'completed', 'failed', 'cancelled')),
  requires_confirmation  BOOLEAN DEFAULT false,
  confirmation_message   TEXT,
  user_response         TIMESTAMPTZ,
  error_message        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ
);

-- Index for pending tasks
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status) WHERE status IN ('pending', 'awaiting_confirmation', 'in_progress');

-- ============================================================
-- USER-AGENT ASSIGNMENTS
-- Which agents each user has enabled
-- ============================================================
CREATE TABLE IF NOT EXISTS user_agents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL REFERENCES ai_agents(id),
  enabled     BOOLEAN DEFAULT true,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, agent_id)
);

-- ============================================================
-- PENDING AGENT CONFIRMATIONS
-- Actions waiting for user confirmation before execution
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_confirmations (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id           TEXT NOT NULL REFERENCES ai_agents(id),
  action             TEXT NOT NULL,
  payload            JSONB NOT NULL,
  summary            TEXT NOT NULL,
  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  expires_at         TIMESTAMPTZ,
  responded_at       TIMESTAMPTZ
);

-- ============================================================
-- AGENT ACTION LOGS
-- Track all actions taken by agents for audit/debug
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_action_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL REFERENCES ai_agents(id),
  action       TEXT NOT NULL,
  payload      JSONB,
  result       JSONB,
  status       TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error        TEXT,
  execution_time_ms INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent logs
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_user_created ON agent_action_logs(user_id, created_at DESC);

-- ============================================================
-- CALENDAR INTEGRATIONS (Google/Apple)
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  access_token    TEXT,
  refresh_token   TEXT,
  calendar_id    TEXT,
  expires_at     TIMESTAMPTZ,
  last_sync_at   TIMESTAMPTZ,
  sync_enabled   BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Agent memories: users can only see their own
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own agent memories" ON agent_memories;
CREATE POLICY "Users manage own agent memories" ON agent_memories FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agent tasks: users can only see their own
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own agent tasks" ON agent_tasks;
CREATE POLICY "Users manage own agent tasks" ON agent_tasks FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM user_agents WHERE agent_id = triggering_agent OR agent_id = target_agent))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM user_agents WHERE agent_id = triggering_agent OR agent_id = target_agent));

-- User agents: users manage their own
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own user agents" ON user_agents;
CREATE POLICY "Users manage own user agents" ON user_agents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agent confirmations: users can only see their own
ALTER TABLE agent_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own confirmations" ON agent_confirmations;
CREATE POLICY "Users manage own confirmations" ON agent_confirmations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agent action logs: users can only see their own
ALTER TABLE agent_action_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own action logs" ON agent_action_logs;
CREATE POLICY "Users view own action logs" ON agent_action_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Calendar integrations: users manage their own
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own calendar integrations" ON calendar_integrations;
CREATE POLICY "Users manage own calendar integrations" ON calendar_integrations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED DEFAULT AGENTS
-- ============================================================
INSERT INTO ai_agents (id, name, description, icon, color, system_prompt) VALUES
('planner', 'Study Planner', 'Creates study schedules, manages deadlines, adapts to exam dates', '📅', '#10B981', 
'You are the Study Planner Agent. Your responsibility is to help students plan their studies effectively. You can create study schedules, manage deadlines, add events to the calendar, and generate personalized study plans based on upcoming exams and assignments. ALWAYS ask for confirmation before creating or modifying events/deadlines.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_agents (id, name, description, icon, color, system_prompt) VALUES
('notes', 'Notes Agent', 'Creates, edits, summarizes, and organizes documents', '📝', '#3B82F6',
'You are the Notes Agent. Your responsibility is to help students create, organize, and summarize their notes and documents. You can create new documents, update existing ones, extract key points, and generate study guides. ALWAYS ask for confirmation before creating or modifying documents.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_agents (id, name, description, icon, color, system_prompt) VALUES
('tasks', 'Task Manager', 'Tracks assignments, reminders, and prioritization', '✅', '#F59E0B',
'You are the Task Manager Agent. Your responsibility is to help students track their assignments, create reminders, and prioritize tasks. You can create tasks, set reminders, mark tasks complete, and organize work. ALWAYS ask for confirmation before creating or modifying tasks.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_agents (id, name, description, icon, color, system_prompt) VALUES
('collab', 'Collaboration Agent', 'Handles study rooms, real-time collaboration, and peer learning', '🤝', '#8B5CF6',
'You are the Collaboration Agent. Your responsibility is to help students collaborate with peers, manage study rooms, and facilitate group learning. You can create study rooms, invite members, and suggest edits. ALWAYS ask for confirmation before inviting others or making room changes.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RPC: Get user's enabled agents
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_agents(p_user_id UUID)
RETURNS TABLE(agent_id TEXT, name TEXT, description TEXT, icon TEXT, color TEXT, enabled BOOLEAN, settings JSONB) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.agent_id,
    a.name,
    a.description,
    a.icon,
    a.color,
    ua.enabled,
    ua.settings
  FROM user_agents ua
  JOIN ai_agents a ON a.id = ua.agent_id
  WHERE ua.user_id = p_user_id AND ua.enabled = true;
END;
$$;

-- ============================================================
-- RPC: Create agent task (for delegation)
-- ============================================================
CREATE OR REPLACE FUNCTION create_agent_task(
  p_triggering_agent TEXT,
  p_target_agent TEXT,
  p_action TEXT,
  p_payload JSONB,
  p_requires_confirmation BOOLEAN DEFAULT false,
  p_confirmation_message TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task_id UUID;
  v_user_id UUID;
BEGIN
  -- Get user_id from triggering agent
  SELECT user_id INTO v_user_id FROM user_agents WHERE agent_id = p_triggering_agent LIMIT 1;
  
  INSERT INTO agent_tasks (triggering_agent, target_agent, action, payload, requires_confirmation, confirmation_message)
  VALUES (p_triggering_agent, p_target_agent, p_action, p_payload, p_requires_confirmation, p_confirmation_message)
  RETURNING id INTO v_task_id;
  
  RETURN v_task_id;
END;
$$;

-- ============================================================
-- RPC: Log agent action
-- ============================================================
CREATE OR REPLACE FUNCTION log_agent_action(
  p_user_id UUID,
  p_agent_id TEXT,
  p_action TEXT,
  p_payload JSONB DEFAULT '{}'::JSONB,
  p_result JSONB DEFAULT '{}'::JSONB,
  p_status TEXT DEFAULT 'success',
  p_error TEXT DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO agent_action_logs (user_id, agent_id, action, payload, result, status, error, execution_time_ms)
  VALUES (p_user_id, p_agent_id, p_action, p_payload, p_result, p_status, p_error, p_execution_time_ms);
END;
$$;