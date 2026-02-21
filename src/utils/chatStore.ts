import { createClient } from "@/lib/supabase/client";

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

export const chatStore = {
  /** Create a new chat session and return its ID */
  createSession: async (subjectId: string, title?: string): Promise<string | null> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        title: title || `${subjectId} chat`,
      })
      .select("id")
      .single();

    if (error) { console.error("[chatStore] createSession:", error); return null; }
    return data.id;
  },

  /** Append a message to an existing session */
  addMessage: async (sessionId: string, role: "user" | "assistant", content: string): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role,
      content,
    });

    if (error) { console.error("[chatStore] addMessage:", error); return; }

    // Bump session updated_at
    await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  },

  /** Fetch all sessions for the current user (no messages) */
  getSessions: async (): Promise<ChatSession[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) { console.error("[chatStore] getSessions:", error); return []; }

    return data.map((row: any) => ({
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

    if (error) { console.error("[chatStore] getMessages:", error); return []; }

    return data.map((row: any) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
  },

  /** Delete a session and all its messages (cascade handles DB side) */
  deleteSession: async (sessionId: string): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("chat_sessions").delete().eq("id", sessionId).eq("user_id", user.id);
  },
};
