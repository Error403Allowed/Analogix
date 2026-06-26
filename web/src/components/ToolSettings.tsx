"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Check, RotateCcw, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AIPersonality } from "@/types/ai-personality";
import { DEFAULT_AI_PERSONALITY } from "@/types/ai-personality";
import { useAIPersonality } from "@/hooks/useAIPersonality";

interface ToolSettingsProps {
  onClose?: () => void;
}

export const ToolSettings: React.FC<ToolSettingsProps> = ({ onClose }) => {
  const { personality, loading, saving, savePersonality, resetToDefaults } = useAIPersonality();
  const [local, setLocal] = useState<AIPersonality>(personality);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocal(personality);
  }, [personality]);

  const update = (key: keyof AIPersonality, value: number | boolean | string | string[]) => {
    setLocal(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  useEffect(() => {
    if (!dirty || saving) return;
    const timer = setTimeout(async () => {
      const success = await savePersonality(local);
      if (success) {
        setDirty(false);
        toast.success("Tool settings saved");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [local, dirty, saving, savePersonality]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading tool settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground leading-snug flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Tool Permissions
        </h3>
        <p className="text-xs text-muted-foreground/70">
          Control how the AI uses tools to manage your flashcards, documents, quizzes, events, and deadlines
        </p>
      </div>

      <ScrollArea className="h-[650px] pr-4">
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">Auto-approve All Tools</Label>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  AI can create, edit, and delete data without asking for permission each time
                </p>
              </div>
              <Switch
                checked={local.auto_approve_tools}
                onCheckedChange={(checked) => update("auto_approve_tools", checked)}
              />
            </div>

            {!local.auto_approve_tools && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Auto-approve Read-Only</Label>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      AI can view your data (list, get, show) without asking permission
                    </p>
                  </div>
                  <Switch
                    checked={local.auto_approve_read_tools}
                    onCheckedChange={(checked) => update("auto_approve_read_tools", checked)}
                  />
                </div>

                <div className="pt-3 border-t border-border/40">
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Create/Edit in Specific Subjects
                  </Label>
                  <p className="text-[10px] text-muted-foreground/60 mb-3">
                    Allow the AI to create and edit data in these subjects without asking (comma-separated subject names). Leave empty to require permission for all write operations.
                  </p>
                  <input
                    type="text"
                    value={(local.auto_approve_write_subjects || []).join(", ")}
                    onChange={(e) => {
                      const subjects = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                      update("auto_approve_write_subjects", subjects);
                    }}
                    placeholder="e.g. Mathematics, Biology, English"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-background/90 border border-border/80 focus:border-primary/50 focus:outline-none"
                  />
                  {local.auto_approve_write_subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {local.auto_approve_write_subjects.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {s}
                          <button
                            onClick={() => {
                              const updated = local.auto_approve_write_subjects.filter((_, j) => j !== i);
                              update("auto_approve_write_subjects", updated);
                            }}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-border/60">
            <h4 className="text-xs font-bold text-foreground mb-2">Summary</h4>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5">
              <p className="text-xs text-muted-foreground/80">
                {local.auto_approve_tools
                  ? "All tools are auto-approved. The AI will never ask for permission."
                  : local.auto_approve_read_tools
                    ? "Read-only tools are auto-approved. Write tools require your permission."
                    : "All tools require your permission before executing."}
              </p>
              {!local.auto_approve_tools && local.auto_approve_write_subjects.length > 0 && (
                <p className="text-xs text-muted-foreground/70">
                  Write tools auto-approved for: {local.auto_approve_write_subjects.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 pt-4 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl text-xs border-border/80"
          onClick={async () => {
            await resetToDefaults();
            setDirty(false);
          }}
          disabled={saving}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset
        </Button>
        <div className="flex-1 rounded-xl text-xs bg-muted/30 border border-border/60 px-3 py-2 text-center text-muted-foreground/70">
          {saving ? (
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          ) : dirty ? (
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Auto-save enabled
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              All changes saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolSettings;
