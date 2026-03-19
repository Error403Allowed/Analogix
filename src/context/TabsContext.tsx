"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode, useRef } from "react";

export interface AppTab {
  id: string;
  path: string;
  label: string;
  emoji: string;
  isPinned?: boolean;
}

interface TabsContextValue {
  tabs: AppTab[];
  activeTabId: string | null;
  openTab: (path: string, label: string, emoji: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateActiveTabLabel: (label: string, emoji?: string) => void;
  updateTabLabelByPath: (path: string, label: string, emoji?: string) => void;
  togglePin: (id: string) => void;
  reorderTabs: (ordered: AppTab[]) => void;
}

interface TabContentCacheContextValue {
  activeTabId: string | null;
  getTabContent: (tabId: string) => ReactNode | null;
  setTabContent: (tabId: string, content: ReactNode) => void;
  removeTabContent: (tabId: string) => void;
  getTabInstance: (tabId: string) => ReactNode | null;
  setTabInstance: (tabId: string, instance: ReactNode) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);
const TabContentCacheContext = createContext<TabContentCacheContextValue | null>(null);

export const useTabs = () => {
  const ctx = useContext(TabsContext);
  // Return a safe no-op if used outside provider (e.g. landing page)
  if (!ctx) return {
    tabs: [] as AppTab[],
    activeTabId: null,
    openTab: () => {},
    closeTab: () => {},
    setActiveTab: () => {},
    updateActiveTabLabel: () => {},
    updateTabLabelByPath: () => {},
    togglePin: () => {},
    reorderTabs: () => {},
  };
  return ctx;
};

export const useTabContentCache = () => {
  const ctx = useContext(TabContentCacheContext);
  if (!ctx) return {
    activeTabId: null,
    getTabContent: () => null,
    setTabContent: () => {},
    removeTabContent: () => {},
    getTabInstance: () => null,
    setTabInstance: () => {},
  };
  return ctx;
};

// Derive a label + emoji from a pathname
export const pathMeta = (path: string): { label: string; emoji: string } => {
  if (path === "/dashboard")    return { label: "Dashboard",   emoji: "🏠" };
  if (path === "/chat")         return { label: "AI Tutor",    emoji: "💬" };
  if (path === "/flashcards")   return { label: "Flashcards",  emoji: "🃏" };
  if (path === "/formulas")     return { label: "Formulas",    emoji: "∑"  };
  if (path === "/resources")    return { label: "Resources",   emoji: "📚" };
  if (path === "/subjects")     return { label: "My Subjects", emoji: "🎓" };
  if (path === "/calendar")     return { label: "Calendar",    emoji: "📅" };
  if (path === "/achievements") return { label: "Achievements",emoji: "🏆" };
  if (path.startsWith("/subjects/") && path.includes("/document/")) return { label: "Document", emoji: "📄" };
  if (path.startsWith("/subjects/")) return { label: "Subject", emoji: "📖" };
  return { label: "Page", emoji: "📄" };
};

const newId = () => {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    const cryptoObj = globalThis.crypto as Crypto;
    if (typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeTabs = (tabs: AppTab[], activeId: string | null) => {
  const seenPaths = new Map<string, AppTab>();
  const idRemap = new Map<string, string>();
  const normalized: AppTab[] = [];

  for (const tab of tabs) {
    // If we've seen this path before, skip this duplicate
    if (seenPaths.has(tab.path)) {
      // If this tab is/was active, remap to the first one
      if (activeId === tab.id) {
        const existing = seenPaths.get(tab.path)!;
        idRemap.set(tab.id, existing.id);
      }
      continue;
    }

    let id = tab.id;
    if (!id) {
      id = newId();
      idRemap.set(tab.id, id);
    }

    seenPaths.set(tab.path, { ...tab, id });
    normalized.push({ ...tab, id });
  }

  let normalizedActiveId = activeId;
  if (activeId && idRemap.has(activeId)) {
    normalizedActiveId = idRemap.get(activeId)!;
  }
  if (normalizedActiveId && !normalized.some(t => t.id === normalizedActiveId)) {
    normalizedActiveId = normalized[0]?.id ?? null;
  }

  return { normalizedTabs: normalized, normalizedActiveId };
};

const tabsEqual = (a: AppTab[], b: AppTab[]) =>
  a.length === b.length &&
  a.every((t, i) =>
    t.id === b[i]?.id &&
    t.path === b[i]?.path &&
    t.label === b[i]?.label &&
    t.emoji === b[i]?.emoji &&
    t.isPinned === b[i]?.isPinned
  );

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<AppTab[]>([]);
  const [activeTabId, setActiveTabIdState] = useState<string | null>(null);
  const { normalizedTabs, normalizedActiveId } = useMemo(
    () => normalizeTabs(tabs, activeTabId),
    [tabs, activeTabId]
  );

  // Tab content cache - uses refs to preserve component instances and their state
  const tabInstancesRef = useRef<Map<string, ReactNode>>(new Map());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const needsSync =
      !tabsEqual(tabs, normalizedTabs) ||
      normalizedActiveId !== activeTabId;
    if (needsSync) {
      setTabs(normalizedTabs);
      if (normalizedActiveId !== activeTabId) {
        setActiveTabIdState(normalizedActiveId);
      }
    }
  }, [tabs, normalizedTabs, activeTabId, normalizedActiveId]);

  const openTab = useCallback((path: string, label: string, emoji: string) => {
    setTabs(prev => {
      // If tab with this exact path already exists, just activate it
      const existing = prev.find(t => t.path === path);
      if (existing) {
        setActiveTabIdState(existing.id);
        return prev;
      }
      const newTab: AppTab = { id: newId(), path, label, emoji };
      setActiveTabIdState(newTab.id);
      return [...prev, newTab];
    });
  }, [tabs]);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(t => t.id === id);
      if (idx === -1) return prev;
      const next = prev.filter(t => t.id !== id);
      // Remove cached instance for closed tab
      tabInstancesRef.current.delete(id);
      forceUpdate({});
      // If we closed the active tab, activate the nearest remaining one
      setActiveTabIdState(current => {
        if (current !== id) return current;
        if (next.length === 0) return null;
        const newIdx = Math.max(0, idx - 1);
        return next[newIdx]?.id ?? null;
      });
      return next;
    });
  }, []);

  const setActiveTab = useCallback((id: string) => {
    setActiveTabIdState(id);
  }, []);

  const updateActiveTabLabel = useCallback((label: string, emoji?: string) => {
    setTabs(prev => prev.map(t =>
      t.id === activeTabId
        ? { ...t, label, ...(emoji ? { emoji } : {}) }
        : t
    ));
  }, [activeTabId]);

  const updateTabLabelByPath = useCallback((path: string, label: string, emoji?: string) => {
    setTabs(prev => prev.map(t =>
      t.path === path
        ? { ...t, label, ...(emoji ? { emoji } : {}) }
        : t
    ));
  }, []);

  const togglePin = useCallback((id: string) => {
    setTabs(prev => prev.map(t =>
      t.id === id
        ? { ...t, isPinned: !t.isPinned }
        : t
    ));
  }, []);

  const reorderTabs = useCallback((ordered: AppTab[]) => {
    setTabs(prev => {
      if (ordered.length === 0) return prev;
      const byId = new Map(prev.map(t => [t.id, t] as const));
      return ordered.map(t => byId.get(t.id) ?? t);
    });
  }, []);

  // Cache component instance for a tab (preserves state)
  const setTabInstance = useCallback((tabId: string, instance: ReactNode) => {
    tabInstancesRef.current.set(tabId, instance);
    forceUpdate({});
  }, []);

  // Get cached instance for a tab
  const getTabInstance = useCallback((tabId: string) => {
    return tabInstancesRef.current.get(tabId) || null;
  }, []);

  // Remove cached instance for a tab
  const removeTabContent = useCallback((tabId: string) => {
    tabInstancesRef.current.delete(tabId);
    forceUpdate({});
  }, []);

  // Legacy API - just use instances
  const setTabContent = setTabInstance;
  const getTabContent = getTabInstance;

  return (
    <TabContentCacheContext.Provider value={{
      activeTabId: normalizedActiveId,
      getTabContent,
      setTabContent,
      removeTabContent,
      getTabInstance,
      setTabInstance,
    }}>
      <TabsContext.Provider value={{
        tabs: normalizedTabs,
        activeTabId: normalizedActiveId,
        openTab,
        closeTab,
        setActiveTab,
        updateActiveTabLabel,
        updateTabLabelByPath,
        togglePin,
        reorderTabs,
      }}>
        {children}
      </TabsContext.Provider>
    </TabContentCacheContext.Provider>
  );
}
