"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, X, Edit3, Loader2, Brain, BookOpen, Calendar, FileText, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ToolProposal, ToolCall, ToolPreview } from "@analogix/shared/types";
import { EditProposalModal } from "./EditProposalModal";

interface ToolProposalCardProps {
  proposal: ToolProposal;
  onAllow: (tools: ToolCall[]) => Promise<void>;
  onDeny: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  flashcards: <BookOpen className="w-4 h-4" />,
  quiz: <GraduationCap className="w-4 h-4" />,
  event: <Calendar className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  subject: <Brain className="w-4 h-4" />,
  deadline: <Calendar className="w-4 h-4" />,
};

const actionLabels: Record<string, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
};

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  update: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export function ToolProposalCard({ proposal, onAllow, onDeny }: ToolProposalCardProps) {
  const [executing, setExecuting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedTools, setEditedTools] = useState<ToolCall[]>(proposal.tools);

  const handleAllow = async () => {
    setExecuting(true);
    setError(null);
    try {
      await onAllow(editedTools);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveEdits = (newTools: ToolCall[]) => {
    setEditedTools(newTools);
    setEditing(false);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 py-2"
      >
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-2">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700 dark:text-green-400 font-medium">
            Done — {proposal.summary}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-lg my-3"
      >
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 p-4 pb-3">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Analogix AI wants to:
              </p>
              <p className="text-sm text-foreground/80 mt-0.5">
                {proposal.summary}
              </p>
              {proposal.description !== proposal.summary && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {proposal.description}
                </p>
              )}
            </div>
          </div>

          {proposal.previews.length > 0 && (
            <div className="px-4 pb-2 space-y-1.5">
              {proposal.previews.map((preview, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${actionColors[preview.action]}`}
                >
                  <span className="shrink-0">{typeIcons[preview.type]}</span>
                  <span className="text-xs font-medium flex-1">
                    {actionLabels[preview.action]} {preview.type}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-normal capitalize">
                    {preview.action}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="px-4 pb-2">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-4 pb-4 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAllow}
              disabled={executing}
              className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
            >
              {executing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {executing ? "Working..." : "Allow"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              disabled={executing}
              className="h-8 gap-1.5 rounded-lg text-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDeny}
              disabled={executing}
              className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
              Deny
            </Button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {editing && (
          <EditProposalModal
            proposal={proposal}
            initialTools={editedTools}
            onSave={handleSaveEdits}
            onCancel={() => setEditing(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
