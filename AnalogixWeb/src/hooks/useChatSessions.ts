import { useState, useEffect, useCallback } from "react";
import { chatStore, ChatSession } from "@/utils/chatStore";
import type { SubjectId } from "@/constants/subjects";
import { buildWelcomeMessage } from "@/lib/chat-utils";

export function useChatSessions(options: {
  setSelectedSubject: (s: SubjectId | null) => void;
  setMessages: (msgs: any[] | ((prev: any[]) => any[])) => void;
  setChatSessionId: (s: string | null) => void;
  setStreamingId: (s: string | null) => void;
  setStreamingContent: (s: string) => void;
  abortRef: { current: AbortController | null };
  allSubjects: Array<{ id: string; label: string }>;
  userName: string;
  chatSessionId: string | null;
}) {
  const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renamingThreadName, setRenamingThreadName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      setSessionsLoading(true);
      const sessions = await chatStore.getSessions();
      setAllSessions(sessions);
      setSessionsLoading(false);
    };
    loadSessions();
    const onFocus = () => loadSessions();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  const handleSwitchThread = useCallback(async (session: ChatSession) => {
    options.setSelectedSubject(session.subjectId as SubjectId);
    options.setChatSessionId(session.id);
    options.setMessages([]);
    options.setStreamingId(null);
    options.setStreamingContent("");

    const msgs = await chatStore.getMessages(session.id);
    if (msgs.length === 0) {
      const subject = options.allSubjects.find(s => s.id === session.subjectId);
      const welcomeContent = buildWelcomeMessage(subject?.label || session.subjectId, options.userName);
      options.setMessages([{
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: welcomeContent,
        isNew: true,
        isWelcome: true,
      }]);
    } else {
      options.setMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        isNew: false,
      })));
    }
  }, [options]);

  const handleStartNewChat = useCallback(() => {
    options.setSelectedSubject(null);
    options.setMessages([]);
    options.setChatSessionId(null);
    options.setStreamingId(null);
    options.setStreamingContent("");
    options.abortRef.current?.abort();
  }, [options]);

  const handleDeleteThread = useCallback(async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await chatStore.deleteSession(sessionId);
    setAllSessions(prev => prev.filter(s => s.id !== sessionId));
    if (options.chatSessionId === sessionId) {
      handleStartNewChat();
    }
  }, [options, handleStartNewChat]);

  const handleRenameThread = useCallback(async (sessionId: string) => {
    if (!renamingThreadName.trim()) {
      setRenamingThreadId(null);
      return;
    }
    await chatStore.updateSessionTitle(sessionId, renamingThreadName);
    setAllSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title: renamingThreadName } : s
    ));
    setRenamingThreadId(null);
    setRenamingThreadName("");
  }, [renamingThreadName]);

  return {
    allSessions, setAllSessions,
    sessionsLoading,
    threadSearch, setThreadSearch,
    renamingThreadId, setRenamingThreadId,
    renamingThreadName, setRenamingThreadName,
    contextMenu, setContextMenu,
    sidebarOpen, setSidebarOpen,
    handleSwitchThread,
    handleStartNewChat,
    handleDeleteThread,
    handleRenameThread,
  };
}
