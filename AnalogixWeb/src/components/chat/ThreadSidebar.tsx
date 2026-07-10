"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { allSubjects } from "@/hooks/useChat";

interface ThreadSidebarProps {
  sidebarOpen: boolean;
  handleStartNewChat: () => void;
  threadSearch: string;
  setThreadSearch: (value: string) => void;
  sessionsLoading: boolean;
  allSessions: any[];
  chatSessionId: string | null;
  handleSwitchThread: (session: any) => void;
  renamingThreadId: string | null;
  renamingThreadName: string;
  setRenamingThreadName: (value: string) => void;
  handleRenameThread: (id: string) => void;
  setRenamingThreadId: (id: string | null) => void;
  setContextMenu: (menu: any) => void;
}

const ThreadSidebar = ({
  sidebarOpen,
  handleStartNewChat,
  threadSearch,
  setThreadSearch,
  sessionsLoading,
  allSessions,
  chatSessionId,
  handleSwitchThread,
  renamingThreadId,
  renamingThreadName,
  setRenamingThreadName,
  handleRenameThread,
  setRenamingThreadId,
  setContextMenu,
}: ThreadSidebarProps) => {
  return (
    <>
      {/* Threads Sidebar */}
      <div className="flex-shrink-0 overflow-hidden" style={{ width: sidebarOpen ? 272 : 0, transition: 'width 0.25s ease' }}>
      <motion.div
        animate={{ opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col my-2 mr-2 rounded-2xl border-r border-border/60 overflow-hidden bg-card/60 backdrop-blur-sm shadow-sm"
        style={{ width: 256, height: 'calc(100% - 16px)', padding: 8 }}
      >
        {/* New Chat */}
        <div className="flex-shrink-0 p-3 pt-4">
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search…"
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-md bg-muted/40 border-0 placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-border transition-all"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="overflow-y-auto flex-1 min-h-0 px-2 py-1 space-y-0.5">
          {sessionsLoading ? (
            <div className="flex items-center justify-center h-16 text-muted-foreground/50 text-xs">Loading…</div>
          ) : (() => {
            // Show all sessions, not filtered by subject
            let filteredSessions = allSessions;
            if (threadSearch.trim()) {
              const q = threadSearch.toLowerCase();
              filteredSessions = filteredSessions.filter(s => {
                const sub = allSubjects.find(x => x.id === s.subjectId);
                return (sub?.label || s.subjectId).toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
              });
            }
            return filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 text-muted-foreground/40 text-xs text-center px-3">
                <p>{threadSearch ? "No results" : "No chats yet"}</p>
              </div>
            ) : (
              <>
                {filteredSessions.map((session) => {
                  const isActive = chatSessionId === session.id;
                  const isRenaming = renamingThreadId === session.id;
                  return (
                    <div
                      key={session.id}
                      className={`relative rounded-md transition-all ${isActive ? "bg-muted/70" : "hover:bg-muted/40"}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ sessionId: session.id, x: e.clientX, y: e.clientY });
                      }}
                    >
                      <button
                        onClick={() => handleSwitchThread(session)}
                        className="w-full text-left px-3 py-2 flex flex-col gap-0.5 min-h-[40px]"
                      >
                        {isRenaming ? (
                          <input
                            autoFocus
                            type="text"
                            value={renamingThreadName}
                            onChange={(e) => setRenamingThreadName(e.target.value)}
                            onBlur={() => handleRenameThread(session.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameThread(session.id);
                              else if (e.key === "Escape") setRenamingThreadId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-1 text-sm bg-transparent border-b border-border focus:outline-none"
                          />
                        ) : (
                          <p className={`text-sm truncate leading-snug ${isActive ? "text-foreground font-medium" : "text-foreground/70"}`}>
                            {session.title}
                          </p>
                        )}
                      </button>
                    </div>
                  );
                })}
              </>
            )
          })()}
        </div>
      </motion.div>
      </div>{/* end sidebar wrapper */}
    </>
  );
};

export default ThreadSidebar;
