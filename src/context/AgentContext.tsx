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
      if (saved === "floating" || saved === "sidebar") {
        setAgentMode(saved);
        if (saved === "sidebar") setAgentOpen(true);
      }
      // "chat" mode is intentionally NOT restored on load —
      // it just changes what the FAB does, not a persistent panel state
    } catch {}
  }, []);

  const handleSetMode = useCallback((mode: AgentMode) => {
    setAgentMode(mode);
    try { localStorage.setItem(AGENT_MODE_KEY, mode); } catch {}
    if (mode === "chat") setAgentOpen(false);
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
