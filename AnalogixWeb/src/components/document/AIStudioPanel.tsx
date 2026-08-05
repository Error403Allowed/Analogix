"use client";

import {
  ListChecks,
  Target,
  Lightbulb,
  AlertCircle,
  Edit3,
  AlignLeft,
  Trash2,
  PenTool,
  Layers,
  BookMarked,
  Puzzle,
  GraduationCap,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIStudioPanelProps {
  sidebarBusy: string | null;
  customInstruction: string;
  setCustomInstruction: (value: string) => void;
  onRunAction: (action: string, label: string, customPrompt?: string) => void;
}

const AIStudioPanel = ({
  sidebarBusy,
  customInstruction,
  setCustomInstruction,
  onRunAction,
}: AIStudioPanelProps) => {
  return (
    <div className="p-4 space-y-6">
      {/* Quick Actions */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Quick Actions</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "summarise", label: "Summarise", desc: "Bullet summary", icon: ListChecks, shortcut: "S" },
            { id: "quiz", label: "Quiz Me", desc: "Practice questions", icon: Target, shortcut: "Q" },
            { id: "explain", label: "Explain", desc: "Simple explanation", icon: Lightbulb, shortcut: "E" },
            { id: "fill-gaps", label: "Find Gaps", desc: "What's missing", icon: AlertCircle, shortcut: "G" },
          ].map((action) => {
            const Icon = action.icon;

            return (
            <button
              key={action.id}
              disabled={sidebarBusy !== null}
              onClick={() => onRunAction(action.id, action.label)}
              className="flex flex-col items-start p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 hover:border-primary/20 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center justify-between w-full">
                <Icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
                <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/50 font-mono">{action.shortcut}</kbd>
              </div>
              <span className="text-xs font-medium mt-2">{action.label}</span>
              <span className="text-[10px] text-muted-foreground/60">{action.desc}</span>
            </button>
            );
          })}
        </div>
      </div>

      {/* Transform */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Transform</span>
        <div className="space-y-1.5">
          {[
            { id: "simplify", label: "Simplify", desc: "Easier language", icon: Edit3 },
            { id: "expand", label: "Expand", desc: "More details", icon: AlignLeft },
            { id: "shorten", label: "Shorten", desc: "More concise", icon: Trash2 },
            { id: "rewrite", label: "Rewrite", desc: "Better flow", icon: PenTool },
          ].map((action) => {
            const Icon = action.icon;

            return (
            <button
              key={action.id}
              disabled={sidebarBusy !== null}
              onClick={() => onRunAction(action.id, action.label)}
              className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted transition-colors text-left disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span>{action.label}</span>
                <span className="text-[10px] text-muted-foreground/50">{action.desc}</span>
              </div>
              {sidebarBusy === action.id && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
            </button>
            );
          })}
        </div>
      </div>

      {/* Study Tools */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Study Tools</span>
        <div className="space-y-1.5">
          {[
            { id: "flashcards", label: "Flashcards", desc: "Create flashcards from notes", icon: Layers },
            { id: "key-terms", label: "Key Terms", desc: "Glossary of important terms", icon: BookMarked },
            { id: "practice-problems", label: "Practice Problems", desc: "Worked solutions", icon: Puzzle },
            { id: "add-examples", label: "Add Examples", desc: "Concrete examples", icon: GraduationCap },
          ].map((action) => {
            const Icon = action.icon;

            return (
            <button
              key={action.id}
              disabled={sidebarBusy !== null}
              onClick={() => onRunAction(action.id, action.label)}
              className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted transition-colors text-left disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span>{action.label}</span>
                <span className="text-[10px] text-muted-foreground/50">{action.desc}</span>
              </div>
              {sidebarBusy === action.id && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
            </button>
            );
          })}
        </div>
      </div>

      {/* Custom Command */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Custom Command</span>
        </div>
        <textarea
          value={customInstruction}
          onChange={(event) => setCustomInstruction(event.target.value)}
          placeholder="e.g. Turn these notes into a rapid-recall checklist..."
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
        />
        <Button
          variant="secondary"
          className="w-full h-9 text-xs font-semibold rounded-lg"
          disabled={sidebarBusy !== null || !customInstruction.trim()}
          onClick={() => onRunAction("custom", "AI Output", customInstruction)}
        >
          {sidebarBusy === "custom" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
          Run Instruction
        </Button>
      </div>
    </div>
  );
};

export default AIStudioPanel;
