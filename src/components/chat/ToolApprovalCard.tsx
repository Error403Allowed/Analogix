"use client";

import { motion } from "framer-motion";
import { Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PendingApproval {
  messageId: string;
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
}

interface ToolApprovalCardProps {
  approvals: PendingApproval[];
  onAllow: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
  loading?: boolean;
}

const FRIENDLY_TOOL_NAMES: Record<string, string> = {
  createEvent: "add an event to your calendar",
  updateEvent: "update a calendar event",
  deleteEvent: "delete a calendar event",
  createDeadline: "create a deadline",
  createDocument: "create a document in your workspace",
  updateDocument: "update a document in your workspace",
  deleteDocument: "delete a document from your workspace",
  createFlashcardSet: "create a flashcard set",
  createFlashcards: "add flashcards to a set",
  updateFlashcard: "update a flashcard",
  deleteFlashcard: "delete a flashcard",
  deleteFlashcardSet: "delete a flashcard set",
  createQuiz: "create a quiz",
  createSubject: "create a subject",
  updateSubjectNotes: "update subject notes",
  storeMemory: "remember this for later",
};

const formatInputSummary = (input: unknown): string => {
  if (!input || typeof input !== "object") return "";
  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 4);
  if (entries.length === 0) return "";
  return entries
    .map(([key, value]) => {
      const display =
        typeof value === "string"
          ? value.length > 60
            ? `${value.slice(0, 60)}…`
            : value
          : Array.isArray(value)
            ? `${value.length} item(s)`
            : JSON.stringify(value);
      return `${key}: ${display}`;
    })
    .join(" · ");
};

export function ToolApprovalCard({ approvals, onAllow, onDeny, loading }: ToolApprovalCardProps) {
  if (approvals.length === 0) return null;

  return (
    <div className="space-y-2">
      {approvals.map((approval) => {
        const action = FRIENDLY_TOOL_NAMES[approval.toolName] ?? `run "${approval.toolName}"`;
        return (
          <motion.div
            key={approval.approvalId}
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
                    Analogix AI wants to
                  </p>
                  <p className="text-sm text-foreground/80 mt-0.5">{action}</p>
                  {formatInputSummary(approval.input) && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
                      {formatInputSummary(approval.input)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-4 pb-4 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAllow(approval.approvalId)}
                  disabled={loading}
                  className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5" />
                  Allow
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeny(approval.approvalId)}
                  disabled={loading}
                  className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  Deny
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
