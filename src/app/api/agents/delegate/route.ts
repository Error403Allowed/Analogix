import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroqChat, formatError } from "../../groq/_utils";
import { buildCalendarContext } from "../../groq/_calendarContext";
import { getAgentMemories, logAgentAction, delegateToAgent } from "@/lib/server/agents";
import type { AgentId } from "@/types/agent";
import type { AgentAllActionType } from "@/lib/agentActions";

export const runtime = "nodejs";

const AGENT_DELEGATION_PROMPTS: Record<AgentId, string> = {
  planner: `You are the Study Planner Agent. You can delegate tasks to other agents when appropriate. For example, if the user wants to create notes about a study topic, delegate to the Notes Agent. If the user wants to track tasks, delegate to the Tasks Agent.`,
  notes: `You are the Notes Agent. You can delegate tasks to other agents when appropriate. For example, if the user wants a study schedule, delegate to the Planner Agent. If the user wants to track tasks, delegate to the Tasks Agent.`,
  tasks: `You are the Task Manager Agent. You can delegate tasks to other agents when appropriate. For example, if the user wants to create a study schedule, delegate to the Planner Agent. If the user wants notes on a topic, delegate to the Notes Agent.`,
  collab: `You are the Collaboration Agent. You can delegate tasks to other agents when appropriate. For example, if the user needs notes on a topic, delegate to the Notes Agent.`,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetAgent, sourceAgent, action, payload, context } = body;

    if (!targetAgent || !action) {
      return NextResponse.json({ error: "targetAgent and action are required" }, { status: 400 });
    }

    const validAgents: AgentId[] = ["planner", "notes", "tasks", "collab"];
    if (!validAgents.includes(targetAgent) || (sourceAgent && !validAgents.includes(sourceAgent))) {
      return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agentId: AgentId = targetAgent;
    const triggeringAgent: AgentId = sourceAgent || "planner";

    const [calendarResult, memories] = await Promise.all([
      buildCalendarContext(supabase, user.id).catch(() => ""),
      getAgentMemories(user.id, agentId),
    ]);

    const delegationContext = context || "";

    const systemPrompt = `${AGENT_DELEGATION_PROMPTS[agentId]}

CONTEXT FROM OTHER AGENT:
${delegationContext}

CALENDAR:
${calendarResult || "No upcoming events"}`;

    console.log(`[agents/delegate] ${triggeringAgent} -> ${agentId}: ${action}`);

    const raw = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Execute this task: ${action}. Payload: ${JSON.stringify(payload || {})}` },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      },
      "default"
    );

    await logAgentAction(
      user.id,
      agentId,
      "delegate_from_agent",
      { triggeringAgent, action, payload },
      { response: raw },
      "success"
    );

    return NextResponse.json({
      role: "assistant",
      content: raw,
      agentId,
      delegatedFrom: triggeringAgent,
    });
  } catch (error) {
    const message = formatError(error);
    console.error("[agents/delegate] Error:", message);
    return NextResponse.json({ role: "assistant", content: "Sorry, I couldn't delegate that task.", error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";

  const { data, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data || [] });
}