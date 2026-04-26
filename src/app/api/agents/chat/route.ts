import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroqChat, formatError } from "../../groq/_utils";
import { buildCalendarContext } from "../../groq/_calendarContext";
import { listUserDocuments } from "@/lib/server/documents";
import { AGENT_ACTION_PERMISSIONS, requiresConfirmation, isAgentAllActionType, AGENT_ACTION_DEFINITIONS, canAgentPerform } from "@/lib/agentActions";
import type { AgentId, AgentActionType } from "@/types/agent";
import { detectAgentIntent } from "@/types/agent";
import { getAgentMemories, saveAgentMemory, createConfirmation, initializeUserAgents, getAgentById } from "@/lib/server/agents";
import type { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";

const AGENT_PROMPTS: Record<AgentId, string> = {
  planner: `You are the Study Planner Agent. Your responsibility is to help students plan their studies effectively.

CORE CAPABILITIES:
- Create study schedules based on upcoming deadlines and exams
- Add events and deadlines to the calendar
- Check study progress and completion status
- Suggest topics to review based on upcoming exams
- Navigate to dashboard or calendar pages

RULES:
- ALWAYS ask for confirmation before creating or modifying events, deadlines, or schedules
- When asked to create a schedule, gather context about upcoming deadlines first
- Be proactive about reminding students of upcoming deadlines
- Use the calendar context to find relevant dates
- Keep recommendations practical and achievable

When taking actions, respond with a JSON object in this format:
{"type":"ACTION_TYPE","payload":{...}}`,

  notes: `You are the Notes Agent. Your responsibility is to help students create, organize, and summarize their notes and documents.

CORE CAPABILITIES:
- Create new documents and notes
- Update existing documents
- Delete documents (with confirmation)
- Summarize documents
- Extract key points from documents
- Navigate to subjects or documents pages

RULES:
- ALWAYS ask for confirmation before creating, updating, or deleting documents
- When summarizing, provide concise but comprehensive summaries
- Extract key points in bullet format
- Help organize notes by subject

When taking actions, respond with a JSON object in this format:
{"type":"ACTION_TYPE","payload":{...}}`,

  tasks: `You are the Task Manager Agent. Your responsibility is to help students track their assignments, create reminders, and prioritize tasks.

CORE CAPABILITIES:
- Create new tasks/todos
- Update existing tasks
- Mark tasks as complete
- Set reminders for tasks or events
- Prioritize tasks based on deadlines
- Navigate to dashboard or calendar pages

RULES:
- ALWAYS ask for confirmation before creating or modifying tasks
- Help prioritize by deadline urgency and importance
- Break down large assignments into manageable tasks
- Follow up on overdue tasks

When taking actions, respond with a JSON object in this format:
{"type":"ACTION_TYPE","payload":{...}}`,

  collab: `You are the Collaboration Agent. Your responsibility is to help students collaborate with peers, manage study rooms, and facilitate group learning.

CORE CAPABILITIES:
- Create new study rooms
- Invite members to study rooms
- Suggest edits in collaborative documents
- Sync documents with collaborators
- Start collaborative study sessions
- Navigate to rooms page

RULES:
- ALWAYS ask for confirmation before inviting others or making room changes
- Help facilitate productive study sessions
- Suggest constructive edits for peer documents
- Respect privacy and consent in collaboration

When taking actions, respond with a JSON object in this format:
{"type":"ACTION_TYPE","payload":{...}}`,
};

const PAGE_INTENTS = [
  { pattern: /dashboard|home|stats|progress/i, page: 'show_dashboard' },
  { pattern: /calendar|schedule|events/i, page: 'show_calendar' },
  { pattern: /subject|notes|docs?|documents/i, page: 'show_subjects' },
  { pattern: /quiz|exam|practice/i, page: 'show_quiz' },
  { pattern: /flashcard|cards/i, page: 'show_flashcards' },
  { pattern: /room|collaborate|study group/i, page: 'show_rooms' },
];

function detectPageIntent(message: string): string | null {
  const lower = message.toLowerCase();
  for (const intent of PAGE_INTENTS) {
    if (intent.pattern.test(lower)) {
      return intent.page;
    }
  }
  return null;
}

function buildActionSummary(type: string, payload: Record<string, unknown>): string {
  const def = AGENT_ACTION_DEFINITIONS[type as AgentActionType];
  if (!def) return type;

  const summaryParts: string[] = [];
  switch (type) {
    case 'create_schedule':
      return `Create study schedule from ${payload.startDate} to ${payload.endDate} for ${payload.subject}`;
    case 'add_event':
      return `Add event "${payload.title}" on ${payload.date}`;
    case 'add_deadline':
      return `Add deadline "${payload.title}" due ${payload.dueDate}`;
    case 'create_document':
      return `Create document "${payload.title}"`;
    case 'update_document':
      return `Update document ${payload.documentId}`;
    case 'delete_document':
      return `Delete document ${payload.documentId}`;
    case 'create_task':
      return `Create task "${payload.title}"`;
    case 'update_task':
      return `Update task ${payload.taskId}`;
    case 'complete_task':
      return `Mark task ${payload.taskId} as complete`;
    case 'set_reminder':
      return `Set reminder for "${payload.title}"`;
    case 'create_room':
      return `Create study room "${payload.name}"`;
    case 'invite_member':
      return `Invite ${payload.email} to room`;
    case 'navigate_to':
      return `Navigate to ${payload.page}`;
    default:
      return type;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext = body.userContext || {};
    const specifiedAgent: AgentId | null = body.agentId && ['planner', 'notes', 'tasks', 'collab'].includes(body.agentId) ? body.agentId : null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ role: "assistant", content: "Please log in." }, { status: 401 });

    await initializeUserAgents(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, grade, state, subjects, timezone")
      .eq("id", user.id)
      .maybeSingle();

    const grade = profile?.grade || userContext?.grade || "10";
    const state = profile?.state || userContext?.state;
    const subjects: string[] = profile?.subjects || userContext?.subjects || [];
    const timezone = profile?.timezone || "Australia/Sydney";
    const userName = profile?.name || "Student";

    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    const agentId = specifiedAgent || detectAgentIntent(lastUserMessage);
    const pageIntent = detectPageIntent(lastUserMessage);

    const { data: agent } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agentId === 'general' ? 'planner' : agentId)
      .single();

    const agentPrompt = agent?.system_prompt || AGENT_PROMPTS[agentId === 'general' ? 'planner' : agentId];

    const [subjectRows, allDocuments, memoriesResult, calendarResult] = await Promise.all([
      supabase.from("subject_data").select("subject_id").eq("user_id", user.id),
      listUserDocuments(supabase, user.id),
      getAgentMemories(user.id, agentId === 'general' ? 'planner' : agentId),
      buildCalendarContext(supabase, user.id).catch(() => ""),
    ]);

    const subjectIds = (subjectRows?.data || []).map((s: any) => s.subject_id);

    const memories = memoriesResult || [];
    const memoryContext = memories.length > 0
      ? `\n\n--- ${agentId.toUpperCase()} AGENT MEMORY ---\n${memories.slice(0, 5).map((m: any) => m.content).join("\n")}\n--- END MEMORY ---\n`
      : "";

    const curriculumContext = state
      ? `Year ${grade}, ${state}, Australia.`
      : `Year ${grade}, Australia.`;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: timezone });
    const timeStr = now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone });

    const calendarContext = calendarResult
      ? `\n\n--- CALENDAR CONTEXT ---\n${calendarResult}\n--- END CALENDAR ---\n`
      : "";

    const docContext = allDocuments.length > 0
      ? `\n\n--- YOUR DOCUMENTS ---\n${allDocuments.slice(0, 10).map((d: any) => `• ${d.title} [${d.subject_id}]`).join("\n")}\n--- END DOCUMENTS ---\n`
      : "";

    const subjectsInfo = subjectIds.length > 0
      ? `\n\n--- YOUR SUBJECTS ---\n${subjectIds.join(", ")}\n--- END SUBJECTS ---\n`
      : "";

    const systemPrompt = `${agentPrompt}

CURRENT USER CONTEXT:
- Name: ${userName}
- ${curriculumContext}
- Today: ${dateStr} at ${timeStr} (${timezone})
- Subjects: ${subjects.join(", ") || subjectIds.join(", ") || "Not set"}

${memoryContext}${calendarContext}${docContext}${subjectsInfo}

IMPORTANT RULES:
1. ALWAYS ask for confirmation before executing actions that modify data (create, update, delete)
2. Format your response as human-readable text first, then include actions in JSON
3. If the user wants to navigate to a page, include the navigate_to action
4. If you need another agent's help, you can coordinate with them but still ask for confirmation first
5. Keep responses concise and helpful

When you need to take an action, end your response with:
<ACTIONS>{"type":"ACTION_NAME","payload":{...}}</ACTIONS>

Example actions:
- {"type":"add_deadline","payload":{"title":"Math Essay","dueDate":"2024-03-15","priority":"high","subject":"Mathematics"}}
- {"type":"create_document","payload":{"title":"Chemistry Notes - Chapter 5","subjectId":"Chemistry"}}
- {"type":"create_task","payload":{"title":"Review Physics formulas","dueDate":"2024-03-10","priority":"high"}}
- {"type":"navigate_to","payload":{"page":"/calendar"}}
`;

    console.log(`[agents/chat] agentId=${agentId}, message="${lastUserMessage.slice(0, 50)}..."`);

    const raw = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.filter(m => m.role !== "system"),
        ],
        max_tokens: 4000,
        temperature: 0.3,
      },
      "default"
    );

    let content = raw;
    let actions: Array<{ type: string; payload: Record<string, unknown> }> = [];

    const actionsMatch = raw.match(/<ACTIONS\s*>([\s\S]*?)<\/ACTIONS\s*>/i);
    if (actionsMatch) {
      content = raw.replace(/<ACTIONS\s*>[\s\S]*?<\/ACTIONS\s*>/gi, "").trim();

      try {
        const actionsJson = actionsMatch[1].trim();
        const parsed = JSON.parse(actionsJson);
        actions = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        const jsonMatches = raw.match(/\{[\s\S]*?"type"[\s\S]*?\}/g);
        if (jsonMatches) {
          for (const match of jsonMatches) {
            try {
              actions.push(JSON.parse(match));
            } catch { /* skip invalid JSON */ }
          }
        }
      }
    }

    const validatedActions: Array<{ type: string; payload: Record<string, unknown>; requiresConfirm: boolean; summary: string }> = [];
    const confirmationsNeeded: Array<{ action: string; summary: string; payload: Record<string, unknown> }> = [];

    for (const action of actions) {
      const actionType = action.type;
      if (!isAgentAllActionType(actionType)) continue;

      const effectiveAgentId = agentId === 'general' ? 'planner' : agentId;
      if (!canAgentPerform(effectiveAgentId, actionType)) {
        console.log(`[agents/chat] Agent ${effectiveAgentId} cannot perform ${actionType}`);
        continue;
      }

      const needsConfirm = requiresConfirmation(actionType);
      const summary = buildActionSummary(actionType, action.payload || {});

      validatedActions.push({
        type: actionType,
        payload: action.payload || {},
        requiresConfirm: needsConfirm,
        summary,
      });

      if (needsConfirm) {
        confirmationsNeeded.push({
          action: actionType,
          summary,
          payload: action.payload || {},
        });
      }
    }

    const confirmationIds: string[] = [];
    if (confirmationsNeeded.length > 0) {
      const effectiveAgentId = agentId === 'general' ? 'planner' : agentId;
      for (const conf of confirmationsNeeded) {
        const confRec = await createConfirmation(
          user.id,
          effectiveAgentId,
          conf.action,
          conf.payload,
          conf.summary
        );
        if (confRec) {
          confirmationIds.push(confRec.id);
        }
      }
    }

    const response: Record<string, unknown> = {
      role: "assistant",
      content,
      agentId: agentId === 'general' ? 'planner' : agentId,
      actions: validatedActions.map(a => ({ type: a.type, payload: a.payload, summary: a.summary })),
    };

    if (confirmationIds.length > 0) {
      response.requiresConfirmation = true;
      response.confirmationIds = confirmationIds;
      response.content = `${content}\n\nNote: I've prepared the following actions that need your confirmation:\n${confirmationsNeeded.map(c => `• ${c.summary}`).join("\n")}`;
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = formatError(error);
    console.error("[agents/chat] Error:", message);
    return NextResponse.json({ role: "assistant", content: "Sorry, something went wrong. Please try again.", error: message }, { status: 500 });
  }
}