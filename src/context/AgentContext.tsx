"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { AgentMode } from "@/components/AgentPanel";

interface AgentContextValue {
  agentMode: AgentMode;
  agentOpen: boolean;
  setAgentMode: (mode: AgentMode) => void;
  setAgentOpen: (open: boolean) => void;
}

const AgentContext = createContext<AgentContextValue>({
  agentMode: "floating",
  agentOpen: false,
  setAgentMode: () => {},
  setAgentOpen: () => {},
});

const AGENT_MODE_KEY = "analogix_agent_mode";

export function AgentProvider({ children }: { children: ReactNode }) {
  // Always start floating — load real persisted value after hydration
  const [agentMode, setAgentMode] = useState<AgentMode>("floating");
  const [agentOpen, setAgentOpen] = useState(false);

  // Load persisted mode after mount (client-only, avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AGENT_MODE_KEY);
      // Clear any stale "chat" value from older builds
      if (saved === "chat") {
        localStorage.removeItem(AGENT_MODE_KEY);
        return;
      }
      if (saved === "sidebar") {
        setAgentMode("sidebar");
        setAgentOpen(true);
        return;
      }
      // "floating" or anything else — keep as floating (the default)
    } catch {}
  }, []);

  const handleSetMode = useCallback((mode: AgentMode) => {
    setAgentMode(mode);
    // Only persist floating/sidebar — never persist chat mode
    try { localStorage.setItem(AGENT_MODE_KEY, mode); } catch {}
    if (mode === "sidebar") setAgentOpen(true);
  }, []);

  return (
    <AgentContext.Provider value={{ agentMode, agentOpen, setAgentMode: handleSetMode, setAgentOpen }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  return useContext(AgentContext);
}
