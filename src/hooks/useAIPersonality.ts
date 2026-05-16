import { useState, useEffect, useCallback } from "react";
import type { AIPersonality, AIMemoryFragment, AIMemorySummary, MemoryType } from "@/types/ai-personality";
import { DEFAULT_AI_PERSONALITY } from "@/types/ai-personality";
import { toast } from "sonner";

/**
 * Hook for managing AI personality settings
 */
export function useAIPersonality() {
  const [personality, setPersonality] = useState<AIPersonality>(DEFAULT_AI_PERSONALITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load personality on mount
  useEffect(() => {
    const loadPersonality = async () => {
      try {
        const res = await fetch("/api/ai/personality");
        if (res.status === 401) {
          // User not authenticated - try localStorage
          const local = localStorage.getItem("ai_personality");
          if (local) {
            setPersonality({ ...DEFAULT_AI_PERSONALITY, ...JSON.parse(local) });
          }
          return;
        }
        if (!res.ok) {
          console.warn("[useAIPersonality] Failed to load personality:", res.status);
          // Try localStorage as fallback
          const local = localStorage.getItem("ai_personality");
          if (local) {
            setPersonality({ ...DEFAULT_AI_PERSONALITY, ...JSON.parse(local) });
          }
          return;
        }
        const data = await res.json();
        setPersonality({ ...DEFAULT_AI_PERSONALITY, ...data });
      } catch (error) {
        // Silently fail - use defaults or localStorage
        console.debug("[useAIPersonality] Using default personality");
        const local = localStorage.getItem("ai_personality");
        if (local) {
          setPersonality({ ...DEFAULT_AI_PERSONALITY, ...JSON.parse(local) });
        }
      } finally {
        setLoading(false);
      }
    };

    loadPersonality();
  }, []);

  // Save personality changes
  const savePersonality = useCallback(async (updates: Partial<AIPersonality>) => {
    setSaving(true);
    try {
      const newPersonality = { ...personality, ...updates };
      const res = await fetch("/api/ai/personality", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPersonality),
      });

      if (!res.ok) {
        // Fallback to localStorage if API fails (user not authenticated)
        console.warn("[useAIPersonality] API save failed, using localStorage");
        localStorage.setItem("ai_personality", JSON.stringify(newPersonality));
        setPersonality(newPersonality);
        toast.success("AI personality saved! (local only)");
        return true;
      }

      // Keep client-side cache in sync even when the API succeeds.
      // This is important because chat may use localStorage when auth isn't available
      // (and it also prevents "it saved but chat didn't change" issues).
      localStorage.setItem("ai_personality", JSON.stringify(newPersonality));

      setPersonality(newPersonality);
      toast.success("AI personality saved!");
      return true;
    } catch (error) {
      console.error("[useAIPersonality] Failed to save:", error);
      // Fallback to localStorage
      const newPersonality = { ...personality, ...updates };
      localStorage.setItem("ai_personality", JSON.stringify(newPersonality));
      setPersonality(newPersonality);
      toast.success("AI personality saved! (local only)");
      return true;
    } finally {
      setSaving(false);
    }
  }, [personality]);

  // Apply a preset
  const applyPreset = useCallback(async (preset: Partial<AIPersonality>) => {
    return savePersonality(preset);
  }, [savePersonality]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    return savePersonality(DEFAULT_AI_PERSONALITY);
  }, [savePersonality]);

  return {
    personality,
    loading,
    saving,
    savePersonality,
    applyPreset,
    resetToDefaults,
  };
}

/**
 * Hook for managing AI memory
 */
export function useAIMemory() {
  const [memories, setMemories] = useState<AIMemoryFragment[]>([]);
  const [summaries, setSummaries] = useState<AIMemorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load memories on mount
  useEffect(() => {
    const loadMemories = async () => {
      try {
        const res = await fetch("/api/ai/memory?limit=100");
        if (res.status === 401) {
          // User not authenticated - use localStorage
          const local = JSON.parse(localStorage.getItem("ai_memories") || "[]");
          setMemories(local);
          setSummaries([]);
          return;
        }
        if (!res.ok) {
          console.warn("[useAIMemory] Failed to load memories:", res.status);
          // Try localStorage
          const local = JSON.parse(localStorage.getItem("ai_memories") || "[]");
          setMemories(local);
          return;
        }
        const data = await res.json();
        setMemories(data.memories || []);
        setSummaries(data.summaries || []);
      } catch (error) {
        // Silently fail - use localStorage
        console.debug("[useAIMemory] Using localStorage memories");
        const local = JSON.parse(localStorage.getItem("ai_memories") || "[]");
        setMemories(local);
      } finally {
        setLoading(false);
      }
    };

    loadMemories();
  }, []);

  // Add a new memory
  const addMemory = useCallback(async (
    content: string,
    memoryType: MemoryType,
    importance = 0.5
  ) => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, memory_type: memoryType, importance }),
      });

      if (!res.ok) {
        // Fallback to localStorage
        console.warn("[useAIMemory] API save failed, using localStorage");
        const newMemory = {
          id: `local-${Date.now()}`,
          user_id: "local",
          content,
          memory_type: memoryType,
          importance,
          reinforcement_count: 1,
          last_accessed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          session_id: null,
        };
        const existing = JSON.parse(localStorage.getItem("ai_memories") || "[]");
        localStorage.setItem("ai_memories", JSON.stringify([newMemory, ...existing]));
        setMemories(prev => [newMemory, ...prev]);
        toast.success("Memory saved! (local only)");
        return newMemory;
      }

      const newMemory = await res.json();
      setMemories(prev => [newMemory, ...prev]);
      toast.success("Memory saved!");
      return newMemory;
    } catch (error) {
      console.error("[useAIMemory] Failed to add memory:", error);
      // Fallback to localStorage
      const newMemory = {
        id: `local-${Date.now()}`,
        user_id: "local",
        content,
        memory_type: memoryType,
        importance,
        reinforcement_count: 1,
        last_accessed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        session_id: null,
      };
      const existing = JSON.parse(localStorage.getItem("ai_memories") || "[]");
      localStorage.setItem("ai_memories", JSON.stringify([newMemory, ...existing]));
      setMemories(prev => [newMemory, ...prev]);
      toast.success("Memory saved! (local only)");
      return newMemory;
    } finally {
      setSaving(false);
    }
  }, []);

  // Delete a memory
  const deleteMemory = useCallback(async (memoryId: string) => {
    try {
      const res = await fetch(`/api/ai/memory?id=${encodeURIComponent(memoryId)}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete memory");

      setMemories(prev => prev.filter(m => m.id !== memoryId));
      toast.success("Memory deleted");
      return true;
    } catch (error) {
      console.error("[useAIMemory] Failed to delete memory:", error);
      toast.error("Failed to delete memory");
      return false;
    }
  }, []);

  // Update memory importance
  const updateMemoryImportance = useCallback(async (memoryId: string, importance: number) => {
    try {
      const res = await fetch(`/api/ai/memory?id=${encodeURIComponent(memoryId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importance }),
      });

      if (!res.ok) {
        // Fallback to localStorage
        console.warn("[useAIMemory] API update failed, using localStorage");
        setMemories(prev => prev.map(m => 
          m.id === memoryId ? { ...m, importance } : m
        ));
        return true;
      }

      setMemories(prev => prev.map(m => 
        m.id === memoryId ? { ...m, importance } : m
      ));
      return true;
    } catch (error) {
      console.error("[useAIMemory] Failed to update memory:", error);
      // Fallback to localStorage
      setMemories(prev => prev.map(m => 
        m.id === memoryId ? { ...m, importance } : m
      ));
      return true;
    }
  }, []);

  // Reinforce a memory (increment reinforcement count)
  const reinforceMemory = useCallback(async (memoryId: string) => {
    try {
      const res = await fetch(`/api/ai/memory?id=${encodeURIComponent(memoryId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reinforce: true }),
      });

      if (!res.ok) throw new Error("Failed to reinforce memory");

      setMemories(prev => prev.map(m => 
        m.id === memoryId 
          ? { ...m, reinforcement_count: m.reinforcement_count + 1, last_accessed_at: new Date().toISOString() }
          : m
      ));
      return true;
    } catch (error) {
      console.error("[useAIMemory] Failed to reinforce memory:", error);
      return false;
    }
  }, []);

  // Clear all memories
  const clearAllMemories = useCallback(async () => {
    setSaving(true);
    try {
      // Delete all memories one by one (could be optimized with batch delete)
      const deletePromises = memories.map(m => 
        fetch(`/api/ai/memory?id=${encodeURIComponent(m.id)}`, { method: "DELETE" })
      );
      await Promise.all(deletePromises);
      
      setMemories([]);
      setSummaries([]);
      toast.success("All memories cleared");
      return true;
    } catch (error) {
      console.error("[useAIMemory] Failed to clear memories:", error);
      toast.error("Failed to clear memories");
      return false;
    } finally {
      setSaving(false);
    }
  }, [memories]);

  // Filter memories by type
  const getMemoriesByType = useCallback((type: MemoryType) => {
    return memories.filter(m => m.memory_type === type);
  }, [memories]);

  return {
    memories,
    summaries,
    loading,
    saving,
    addMemory,
    deleteMemory,
    updateMemoryImportance,
    reinforceMemory,
    clearAllMemories,
    getMemoriesByType,
  };
}
