"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Trash2, Search, Filter, Clock, Target,
  Bookmark, Star, BookOpen, Lightbulb, Zap,
  ChevronDown, ChevronUp, Plus, X, Check,
  History, TrendingUp, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAIMemory } from "@/hooks/useAIPersonality";
import type { MemoryType, AIMemoryFragment } from "@/types/ai-personality";

const MEMORY_TYPE_ICONS: Record<MemoryType, React.ReactNode> = {
  fact: <BookOpen className="w-3.5 h-3.5" />,
  preference: <Star className="w-3.5 h-3.5" />,
  skill: <Zap className="w-3.5 h-3.5" />,
  goal: <Target className="w-3.5 h-3.5" />,
  context: <Clock className="w-3.5 h-3.5" />,
};

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  fact: "Facts",
  preference: "Preferences",
  skill: "Skills",
  goal: "Goals",
  context: "Context",
};

const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  fact: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  preference: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  skill: "text-purple-500 bg-purple-500/10 border-purple-500/30",
  goal: "text-green-500 bg-green-500/10 border-green-500/30",
  context: "text-gray-500 bg-gray-500/10 border-gray-500/30",
};

interface MemoryManagerProps {
  onClose?: () => void;
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({ onClose }) => {
  const { memories, summaries, loading, saving, addMemory, deleteMemory, updateMemoryImportance, clearAllMemories, getMemoriesByType } = useAIMemory();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<MemoryType | "all">("all");
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryType, setNewMemoryType] = useState<MemoryType>("fact");
  const [showAddForm, setShowAddForm] = useState(false);

  // Filter memories
  const filteredMemories = useMemo(() => {
    return memories.filter(memory => {
      const matchesType = selectedType === "all" || memory.memory_type === selectedType;
      const matchesSearch = !searchQuery || 
        memory.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [memories, selectedType, searchQuery]);

  // Get memory stats
  const memoryStats = useMemo(() => {
    const total = memories.length;
    const byType: Record<MemoryType, number> = {
      fact: memories.filter(m => m.memory_type === "fact").length,
      preference: memories.filter(m => m.memory_type === "preference").length,
      skill: memories.filter(m => m.memory_type === "skill").length,
      goal: memories.filter(m => m.memory_type === "goal").length,
      context: memories.filter(m => m.memory_type === "context").length,
    };
    const avgImportance = total > 0 
      ? memories.reduce((sum, m) => sum + m.importance, 0) / total 
      : 0;
    const highImportance = memories.filter(m => m.importance > 0.7).length;
    
    return { total, byType, avgImportance, highImportance };
  }, [memories]);

  // Add new memory
  const handleAddMemory = async () => {
    if (!newMemoryContent.trim()) {
      toast.error("Please enter memory content");
      return;
    }

    const success = await addMemory(newMemoryContent.trim(), newMemoryType, 0.5);
    if (success) {
      setNewMemoryContent("");
      setShowAddForm(false);
    }
  };

  // Delete memory with confirmation
  const handleDeleteMemory = async (memoryId: string) => {
    if (confirm("Delete this memory? The AI will no longer remember this.")) {
      await deleteMemory(memoryId);
    }
  };

  // Toggle memory importance (high/low)
  const toggleImportance = async (memory: AIMemoryFragment) => {
    const newImportance = memory.importance > 0.5 ? 0.3 : 0.8;
    await updateMemoryImportance(memory.id, newImportance);
  };

  // Clear all memories with confirmation
  const handleClearAll = async () => {
    if (confirm("This will delete ALL memories. The AI will forget everything it has learned about you. This cannot be undone.")) {
      const success = await clearAllMemories();
      if (success) {
        onClose?.();
      }
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Brain className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading memories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">AI Memory</h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {memoryStats.total} memories • {memoryStats.highImportance} important
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs border-border/80"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Memory
        </Button>
      </div>

      {/* Add Memory Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <div>
                <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                  What should the AI remember?
                </Label>
                <Input
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  placeholder="e.g., I prefer visual explanations over text"
                  className="text-xs rounded-lg bg-background/90 border-border/80"
                  onKeyDown={(e) => e.key === "Enter" && handleAddMemory()}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-foreground">Type:</Label>
                <div className="flex gap-1">
                  {(Object.keys(MEMORY_TYPE_LABELS) as MemoryType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewMemoryType(type)}
                      className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold border transition-colors",
                        newMemoryType === type
                          ? MEMORY_TYPE_COLORS[type]
                          : "border-border/60 bg-card/50 text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {MEMORY_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 rounded-lg text-xs gradient-primary"
                  onClick={handleAddMemory}
                  disabled={saving || !newMemoryContent.trim()}
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Save Memory
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 rounded-lg text-xs"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMemoryContent("");
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="pl-8 text-xs rounded-lg bg-background/90 border-border/80"
          />
        </div>
        <Button
          variant={selectedType === "all" ? "default" : "outline"}
          size="sm"
          className="rounded-lg text-xs"
          onClick={() => setSelectedType("all")}
        >
          All
        </Button>
      </div>

      {/* Memory Type Pills */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(MEMORY_TYPE_LABELS) as MemoryType[]).map((type) => {
          const count = memoryStats.byType[type];
          const isActive = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type === selectedType ? "all" : type)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1.5",
                isActive
                  ? MEMORY_TYPE_COLORS[type]
                  : "border-border/60 bg-card/50 text-muted-foreground hover:border-primary/50"
              )}
            >
              {MEMORY_TYPE_ICONS[type]}
              {MEMORY_TYPE_LABELS[type]}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Memory List */}
      <ScrollArea className="h-[450px] pr-2">
        <div className="space-y-2">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/60">
                {searchQuery || selectedType !== "all"
                  ? "No matching memories"
                  : "No memories yet. Add something the AI should remember!"}
              </p>
            </div>
          ) : (
            filteredMemories.map((memory) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  expandedMemoryId === memory.id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/60 bg-card/50 hover:border-primary/30"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className={cn("p-1.5 rounded-lg mt-0.5", MEMORY_TYPE_COLORS[memory.memory_type])}>
                    {MEMORY_TYPE_ICONS[memory.memory_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", 
                          MEMORY_TYPE_COLORS[memory.memory_type].split(" ")[0]
                        )}>
                          {MEMORY_TYPE_LABELS[memory.memory_type]}
                        </span>
                        {memory.importance > 0.7 && (
                          <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/50">
                        {formatDate(memory.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">
                      {expandedMemoryId === memory.id ? memory.content : (
                        <span className="line-clamp-2">{memory.content}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => toggleImportance(memory)}
                        className={cn(
                          "text-[10px] font-semibold flex items-center gap-1 transition-colors",
                          memory.importance > 0.5
                            ? "text-yellow-500 hover:text-yellow-600"
                            : "text-muted-foreground/60 hover:text-foreground"
                        )}
                      >
                        <Star className="w-2.5 h-2.5" />
                        {memory.importance > 0.5 ? "Important" : "Mark important"}
                      </button>
                      <span className="text-[10px] text-muted-foreground/40">
                        Reinforced {memory.reinforcement_count}x
                      </span>
                      <button
                        onClick={() => setExpandedMemoryId(expandedMemoryId === memory.id ? null : memory.id)}
                        className="text-[10px] text-muted-foreground/60 hover:text-foreground flex items-center gap-1"
                      >
                        {expandedMemoryId === memory.id ? (
                          <>
                            <ChevronUp className="w-2.5 h-2.5" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-2.5 h-2.5" />
                            Show more
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteMemory(memory.id)}
                        className="text-[10px] text-destructive/70 hover:text-destructive flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Conversation Summaries */}
      {summaries.length > 0 && (
        <div className="pt-4 border-t border-border/60">
          <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-primary" />
            Past Conversation Summaries
          </h4>
          <ScrollArea className="h-[100px]">
            <div className="space-y-1.5">
              {summaries.slice(0, 3).map((summary) => (
                <div key={summary.id} className="p-2 rounded-lg border border-border/40 bg-muted/20">
                  <p className="text-xs text-foreground line-clamp-2">{summary.summary}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground/50">
                      {formatDate(summary.end_date)}
                    </span>
                    {summary.subject_id && (
                      <span className="text-[10px] text-primary/70 font-medium">
                        {summary.subject_id}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Danger Zone */}
      {memories.length > 0 && (
        <div className="pt-4 border-t border-border/60">
          <Button
            variant="destructive"
            size="sm"
            className="w-full rounded-xl text-xs"
            onClick={handleClearAll}
            disabled={saving}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear All Memories
          </Button>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
            This will make the AI forget everything it has learned about you
          </p>
        </div>
      )}
    </div>
  );
};

export default MemoryManager;
