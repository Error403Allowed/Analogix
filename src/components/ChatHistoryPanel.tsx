"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ChevronDown, Trash2, Clock, Loader2 } from "lucide-react";
import { chatStore, ChatSession } from "@/utils/chatStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ChatHistoryPanelProps {
  isCollapsed?: boolean;
}

export default function ChatHistoryPanel({ isCollapsed }: ChatHistoryPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await chatStore.getSessions();
    setSessions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Reload when a new session is created
  useEffect(() => {
    const handler = () => { if (open) load(); };
    window.addEventListener("chatSessionCreated", handler);
    return () => window.removeEventListener("chatSessionCreated", handler);
  }, [open, load]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    await chatStore.deleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setDeletingId(null);
  };

  const handleResume = (session: ChatSession) => {
    router.push(`/chat?session=${session.id}&subject=${session.subjectId}`);
  };

  const getSubjectLabel = (subjectId: string) => {
    return SUBJECT_CATALOG.find(s => s.id === subjectId)?.label || subjectId;
  };

  const getSubjectIcon = (subjectId: string) => {
    return SUBJECT_CATALOG.find(s => s.id === subjectId)?.icon;
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => router.push("/chat")}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors text-muted-foreground"
        title="Chat History"
      >
        <Clock className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 flex items-center gap-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground font-semibold text-sm"
      >
        <Clock className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">Chat History</span>
        {loading && open
          ? <Loader2 className="w-3 h-3 animate-spin opacity-50" />
          : <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
        }
      </button>

      {/* Session list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-1 pt-1 pb-1 flex flex-col gap-0.5 max-h-64 overflow-y-auto">
              {sessions.length === 0 && !loading && (
                <p className="text-[10px] text-muted-foreground/50 px-2 py-2 text-center">
                  No past sessions yet
                </p>
              )}
              {sessions.map(session => {
                const Icon = getSubjectIcon(session.subjectId);
                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => handleResume(session)}
                  >
                    {/* Subject icon */}
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {Icon
                        ? <Icon className="w-3 h-3 text-primary" />
                        : <MessageCircle className="w-3 h-3 text-primary" />
                      }
                    </div>

                    {/* Title + time */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
                        {getSubjectLabel(session.subjectId)}
                      </p>
                      <p className="text-[9px] text-muted-foreground/50 truncate">
                        {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive shrink-0"
                      title="Delete session"
                    >
                      {deletingId === session.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />
                      }
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
