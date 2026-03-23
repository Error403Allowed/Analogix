"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
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

function loadPersistedMode(): AgentMode {
  if (typeof window === "undefined") return "floating";
  try {
    const saved = localStorage.getItem(AGENT_MODE_KEY);
    if (saved === "floating" || saved === "sidebar" || saved === "chat") return saved;
  } catch {}
  return "floating";
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agentMode, setAgentMode] = useState<AgentMode>(loadPersistedMode);
  const [agentOpen, setAgentOpen] = useState(false);

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
