 
import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "./authCache";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  subjectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

/** Quick health check — call once on mount to surface any Supabase issues in console */
export const checkChatStoreHealth = async (): Promise<void> => {
  const user = await getAuthUser();
  if (!user) { console.warn("[chatStore:health] No user logged in — chat history will not save"); return; }
  const supabase = createClient();

  // Test read access to chat_sessions
  const { error: readErr } = await supabase
    .from("chat_sessions")
    .select("id")
    .limit(1);
  if (readErr) {
    console.error("[chatStore:health] Cannot read chat_sessions:", readErr.message, readErr.code);
    console.error("[chatStore:health] → Make sure the chat_sessions and chat_messages tables exist in Supabase (run supabase-schema.sql)");
  } else {
    console.log("[chatStore:health] ✅ Supabase chat tables accessible for user:", user.id);
  }
};

export const chatStore = {
  /** Create a new chat session and return its ID */
  createSession: async (subjectId: string, title?: string): Promise<string | null> => {
    const user = await getAuthUser();
    if (!user) { console.warn("[chatStore] createSession: no user logged in"); return null; }
    const supabase = createClient();

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        title: title || `${subjectId} chat`,
      })
      .select("id")
      .maybeSingle();

    if (error) { console.error("[chatStore] createSession insert error:", error.message, error.code, error.details); return null; }
    return data?.id ?? null;
  },

  /** Append a message to an existing session. Returns the database-assigned message ID (UUID). */
  addMessage: async (sessionId: string, role: "user" | "assistant", content: string): Promise<string | null> => {
    const user = await getAuthUser();
    if (!user) { console.warn("[chatStore] addMessage: no user logged in, message not saved"); return null; }
    const supabase = createClient();

    // Verify session exists before inserting message
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!session) {
      return null;
    }

    const { data, error } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role,
      content,
    }).select("id").single();

    if (error) { console.error("[chatStore] addMessage insert error:", error.message, error.code, "session:", sessionId); return null; }

    // Bump session updated_at
    const { error: updateError } = await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (updateError) console.warn("[chatStore] addMessage: failed to bump updated_at:", updateError.message);

    return data?.id ?? null;
  },

  /** Fetch all sessions for the current user (no messages) */
  getSessions: async (): Promise<ChatSession[]> => {
    const user = await getAuthUser();
    if (!user) { console.warn("[chatStore] getSessions: no user logged in"); return []; }
    const supabase = createClient();

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) { console.error("[chatStore] getSessions error:", error.message, error.code); return []; }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      subjectId: row.subject_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /** Fetch all messages for a specific session */
  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) { console.error("[chatStore] getMessages error:", error.message, error.code, "session:", sessionId); return []; }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
  },

  /** Delete a session and all its messages (cascade handles DB side) */
  deleteSession: async (sessionId: string): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;
    const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId).eq("user_id", user.id);
    if (error) console.error("[chatStore] deleteSession error:", error.message);
  },

  /** Update session title */
  updateSessionTitle: async (sessionId: string, title: string): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;
    const { error } = await supabase
      .from("chat_sessions")
      .update({ title })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) console.error("[chatStore] updateSessionTitle error:", error.message);
  },

  /** Update the content of an existing message.
   *  If `messageId` is not a UUID (e.g. a client-generated timestamp), looks up the
   *  latest assistant message in the session by position to find the real DB id. */
  updateMessageContent: async (sessionId: string, messageId: string, content: string): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
    let realId = isUuid ? messageId : null;

    if (!realId) {
      // Client generated a temp ID; find the actual DB row by session + ordering.
      // We grab the most recent assistant message (the one we just added).
      const { data } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) realId = data.id;
    }

    if (!realId) {
      console.warn("[chatStore] updateMessageContent: could not resolve message ID", messageId);
      return;
    }

    const { error } = await supabase
      .from("chat_messages")
      .update({ content })
      .eq("id", realId)
      .eq("session_id", sessionId);
    if (error) console.error("[chatStore] updateMessageContent error:", error.message);
  },
};
