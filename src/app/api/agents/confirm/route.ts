import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { respondToConfirmation, logAgentAction, getAgentActionLogs, getPendingConfirmations } from "@/lib/server/agents";
import { isAgentAllActionType, canAgentPerform } from "@/lib/agentActions";

export const runtime = "nodejs";

async function executeAction(
  userId: string,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const supabase = await createClient();
  const startTime = Date.now();

  try {
    switch (action) {
      case 'add_event': {
        const { title, date, time, type, subject, description } = payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("events")
          .insert({
            user_id: userId,
            title,
            date: time ? `${date}T${time}:00` : date,
            type: type || 'event',
            subject,
            description,
            source: 'agent',
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, result: { eventId: data?.id } };
      }

      case 'add_deadline': {
        const { title, dueDate, priority, subject, description } = payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("deadlines")
          .insert({
            user_id: userId,
            title,
            due_date: dueDate,
            priority: priority || 'medium',
            subject,
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, result: { deadlineId: data?.id } };
      }

      case 'create_task': {
        const { title, dueDate, priority, subject } = payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("deadlines")
          .insert({
            user_id: userId,
            title,
            due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            priority: priority || 'medium',
            subject,
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, result: { taskId: data?.id } };
      }

      case 'update_task': {
        const { taskId, title, dueDate, priority, status } = payload as Record<string, unknown>;
        const updates: Record<string, unknown> = {};
        if (title) updates.title = title;
        if (dueDate) updates.due_date = dueDate;
        if (priority) updates.priority = priority;
        
        const { error } = await supabase
          .from("deadlines")
          .update(updates)
          .eq("id", taskId)
          .eq("user_id", userId);

        if (error) throw error;
        return { success: true, result: { taskId } };
      }

      case 'complete_task': {
        const { taskId } = payload as Record<string, unknown>;
        const { error } = await supabase
          .from("deadlines")
          .delete()
          .eq("id", taskId)
          .eq("user_id", userId);

        if (error) throw error;
        return { success: true, result: { taskId } };
      }

      case 'create_document': {
        const { title, subjectId, content } = payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("documents")
          .insert({
            owner_user_id: userId,
            subject_id: subjectId,
            title,
            content: content || '',
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, result: { documentId: data?.id } };
      }

      case 'update_document': {
        const { documentId, title, content } = payload as Record<string, unknown>;
        const updates: Record<string, unknown> = {};
        if (title) updates.title = title;
        if (content) updates.content = content;
        updates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("documents")
          .update(updates)
          .eq("id", documentId)
          .eq("owner_user_id", userId);

        if (error) throw error;
        return { success: true, result: { documentId } };
      }

      case 'delete_document': {
        const { documentId } = payload as Record<string, unknown>;
        const { error } = await supabase
          .from("documents")
          .delete()
          .eq("id", documentId)
          .eq("owner_user_id", userId);

        if (error) throw error;
        return { success: true, result: { documentId } };
      }

      case 'create_room': {
        const { name, description, subject, isPrivate } = payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("study_rooms")
          .insert({
            name,
            description,
            subject,
            is_private: isPrivate,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, result: { roomId: data?.id } };
      }

      case 'invite_member': {
        const { roomId, email, role } = payload as Record<string, unknown>;
        const { data: inviteData, error: inviteError } = await supabase
          .from("study_room_members")
          .insert({
            room_id: roomId,
            user_email: email,
            role: role || 'member',
          })
          .select()
          .single();

        if (inviteError) throw inviteError;
        return { success: true, result: { memberId: inviteData?.id } };
      }

      case 'set_reminder': {
        const { title, remindAt, relatedId, relatedType } = payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("events")
          .insert({
            user_id: userId,
            title: `Reminder: ${title}`,
            date: remindAt,
            type: 'reminder',
            description: relatedType && relatedId ? `${relatedType}: ${relatedId}` : undefined,
            source: 'agent',
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, result: { reminderId: data?.id } };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logAgentAction(userId, agentId, action, payload, {}, 'failed', error, Date.now() - startTime);
    return { success: false, error };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, confirmationId, approved, agentId, actionType, payload } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (action === 'respond' && confirmationId) {
      const success = await respondToConfirmation(confirmationId, user.id, approved);
      if (!success) {
        return NextResponse.json({ error: "Failed to respond to confirmation" }, { status: 500 });
      }

      if (approved) {
        const { data: confirmation } = await supabase
          .from("agent_confirmations")
          .select("*")
          .eq("id", confirmationId)
          .single();

        if (confirmation) {
          const execResult = await executeAction(
            user.id,
            confirmation.agent_id,
            confirmation.action,
            confirmation.payload
          );

          await logAgentAction(
            user.id,
            confirmation.agent_id,
            confirmation.action,
            confirmation.payload,
            execResult.result || {},
            execResult.success ? 'success' : 'failed',
            execResult.error
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'execute' && agentId && actionType && payload) {
      if (!isAgentAllActionType(actionType)) {
        return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
      }

      if (!canAgentPerform(agentId, actionType)) {
        return NextResponse.json({ error: "Agent cannot perform this action" }, { status: 403 });
      }

      const result = await executeAction(user.id, agentId, actionType, payload);
      return NextResponse.json(result);
    }

    if (action === 'list') {
      const confirmations = await getPendingConfirmations(user.id);
      return NextResponse.json({ confirmations });
    }

    if (action === 'logs') {
      const logs = await getAgentActionLogs(user.id);
      return NextResponse.json({ logs });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[agents/confirm] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}