import { createClient } from "@/lib/supabase/server";

export async function getAgentById(agentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (error) {
    console.error("[getAgentById] Error:", error);
    return null;
  }

  return data;
}

export async function getUserAgents(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_agents")
    .select("*, ai_agents(*)")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (error) {
    console.error("[getUserAgents] Error:", error);
    return [];
  }

  return data || [];
}

export async function setUserAgent(userId: string, agentId: string, enabled: boolean, settings: Record<string, unknown> = {}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_agents")
    .upsert({
      user_id: userId,
      agent_id: agentId,
      enabled,
      settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,agent_id' });

  if (error) {
    console.error("[setUserAgent] Error:", error);
    return false;
  }

  return true;
}

export async function getAgentMemories(userId: string, agentId: string, memoryType?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("agent_memories")
    .select("*")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .order("importance", { ascending: false })
    .limit(20);

  if (memoryType) {
    query = query.eq("memory_type", memoryType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getAgentMemories] Error:", error);
    return [];
  }

  return data || [];
}

export async function saveAgentMemory(
  userId: string,
  agentId: string,
  memoryType: string,
  content: Record<string, unknown>,
  importance: number = 0.5
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_memories")
    .insert({
      user_id: userId,
      agent_id: agentId,
      memory_type: memoryType,
      content,
      importance,
    });

  if (error) {
    console.error("[saveAgentMemory] Error:", error);
    return false;
  }

  return true;
}

export async function getPendingConfirmations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_confirmations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPendingConfirmations] Error:", error);
    return [];
  }

  return data || [];
}

export async function createConfirmation(
  userId: string,
  agentId: string,
  action: string,
  payload: Record<string, unknown>,
  summary: string,
  expiresInMinutes: number = 30
) {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from("agent_confirmations")
    .insert({
      user_id: userId,
      agent_id: agentId,
      action,
      payload,
      summary,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error("[createConfirmation] Error:", error);
    return null;
  }

  return data;
}

export async function respondToConfirmation(
  confirmationId: string,
  userId: string,
  approved: boolean
) {
  const supabase = await createClient();
  const status = approved ? 'approved' : 'rejected';
  
  const { error } = await supabase
    .from("agent_confirmations")
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq("id", confirmationId)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) {
    console.error("[respondToConfirmation] Error:", error);
    return false;
  }

  return true;
}

export async function getAgentActionLogs(userId: string, limit: number = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_action_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getAgentActionLogs] Error:", error);
    return [];
  }

  return data || [];
}

export async function logAgentAction(
  userId: string,
  agentId: string,
  action: string,
  payload: Record<string, unknown>,
  result: Record<string, unknown>,
  status: 'success' | 'failed' | 'partial',
  error?: string,
  executionTimeMs?: number
) {
  const supabase = await createClient();
  
  const { error: insertError } = await supabase
    .from("agent_action_logs")
    .insert({
      user_id: userId,
      agent_id: agentId,
      action,
      payload,
      result,
      status,
      error,
      execution_time_ms: executionTimeMs,
    });

  if (insertError) {
    console.error("[logAgentAction] Error:", insertError);
    return false;
  }

  return true;
}

export async function delegateToAgent(
  triggeringAgent: string,
  targetAgent: string,
  action: string,
  payload: Record<string, unknown>,
  requiresConfirmation: boolean = false,
  confirmationMessage?: string
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("agent_tasks")
    .insert({
      triggering_agent: triggeringAgent,
      target_agent: targetAgent,
      action,
      payload,
      requires_confirmation: requiresConfirmation,
      confirmation_message: confirmationMessage,
      status: requiresConfirmation ? 'awaiting_confirmation' : 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error("[delegateToAgent] Error:", error);
    return null;
  }

  return data;
}

export async function getCalendarIntegrations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("sync_enabled", true);

  if (error) {
    console.error("[getCalendarIntegrations] Error:", error);
    return [];
  }

  return data || [];
}

export async function saveCalendarIntegration(
  userId: string,
  provider: 'google' | 'apple',
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  expiresAt?: string
) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("calendar_integrations")
    .upsert({
      user_id: userId,
      provider,
      access_token: accessToken,
      refresh_token: refreshToken,
      calendar_id: calendarId,
      expires_at: expiresAt,
      sync_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });

  if (error) {
    console.error("[saveCalendarIntegration] Error:", error);
    return false;
  }

  return true;
}

export async function initializeUserAgents(userId: string) {
  const supabase = await createClient();
  const agents = ['planner', 'notes', 'tasks', 'collab'];
  
  for (const agentId of agents) {
    const { error } = await supabase
      .from("user_agents")
      .upsert({
        user_id: userId,
        agent_id: agentId,
        enabled: true,
        settings: {},
      }, { onConflict: 'user_id,agent_id' });

    if (error) {
      console.error(`[initializeUserAgents] Error for ${agentId}:`, error);
    }
  }

  return true;
}