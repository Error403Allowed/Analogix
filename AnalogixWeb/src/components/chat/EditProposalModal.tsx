"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ToolProposal, ToolCall } from "@analogix/shared/types";

interface EditProposalModalProps {
  proposal: ToolProposal;
  initialTools: ToolCall[];
  onSave: (tools: ToolCall[]) => void;
  onCancel: () => void;
}

const safeDateInput = (val: unknown): string => {
  if (!val || typeof val !== "string") return "";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
  } catch { return ""; }
};

const safeDateParse = (val: string): string => {
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  } catch { return ""; }
};

export function EditProposalModal({
  proposal,
  initialTools,
  onSave,
  onCancel,
}: EditProposalModalProps) {
  const [tools, setTools] = useState<ToolCall[]>(() =>
    JSON.parse(JSON.stringify(initialTools))
  );

  const updateToolArg = (toolIndex: number, key: string, value: unknown) => {
    setTools((prev) => {
      const next = [...prev];
      next[toolIndex] = {
        ...next[toolIndex],
        args: { ...next[toolIndex].args, [key]: value },
      };
      return next;
    });
  };

  const updateCard = (
    toolIndex: number,
    cardIndex: number,
    field: "front" | "back",
    value: string
  ) => {
    setTools((prev) => {
      const next = [...prev];
      const cards = [...((next[toolIndex].args.cards as any[]) ?? [])];
      cards[cardIndex] = { ...cards[cardIndex], [field]: value };
      next[toolIndex] = {
        ...next[toolIndex],
        args: { ...next[toolIndex].args, cards },
      };
      return next;
    });
  };

  const addCard = (toolIndex: number) => {
    setTools((prev) => {
      const next = [...prev];
      const cards = [...((next[toolIndex].args.cards as any[]) ?? [])];
      cards.push({ front: "", back: "" });
      next[toolIndex] = {
        ...next[toolIndex],
        args: { ...next[toolIndex].args, cards },
      };
      return next;
    });
  };

  const removeCard = (toolIndex: number, cardIndex: number) => {
    setTools((prev) => {
      const next = [...prev];
      const cards = [...((next[toolIndex].args.cards as any[]) ?? [])];
      cards.splice(cardIndex, 1);
      next[toolIndex] = {
        ...next[toolIndex],
        args: { ...next[toolIndex].args, cards },
      };
      return next;
    });
  };

  const renderCardEditor = (toolIndex: number) => {
    const tool = tools[toolIndex];
    const cards = (tool.args.cards as Array<{ front: string; back: string }>) ?? [];

    return (
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {cards.map((card, ci) => (
          <div key={ci} className="rounded-lg border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Card {ci + 1}
              </span>
              <button
                type="button"
                onClick={() => removeCard(toolIndex, ci)}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Front</Label>
              <Textarea
                value={card.front}
                onChange={(e) => updateCard(toolIndex, ci, "front", e.target.value)}
                className="mt-1 text-xs min-h-[60px] resize-none"
                placeholder="Question / term"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Back</Label>
              <Textarea
                value={card.back}
                onChange={(e) => updateCard(toolIndex, ci, "back", e.target.value)}
                className="mt-1 text-xs min-h-[60px] resize-none"
                placeholder="Answer / definition"
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addCard(toolIndex)}
          className="w-full h-8 text-xs"
        >
          + Add Card
        </Button>
      </div>
    );
  };

  const renderEventEditor = (toolIndex: number) => {
    const tool = tools[toolIndex];
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            value={(tool.args.title as string) ?? ""}
            onChange={(e) => updateToolArg(toolIndex, "title", e.target.value)}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="datetime-local"
            value={safeDateInput(tool.args.date)}
            onChange={(e) =>
              updateToolArg(toolIndex, "date", safeDateParse(e.target.value))
            }
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Type</Label>
          <select
            value={(tool.args.type as string) ?? "other"}
            onChange={(e) => updateToolArg(toolIndex, "type", e.target.value)}
            className="mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="exam">Exam</option>
            <option value="assignment">Assignment</option>
            <option value="study">Study Session</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Subject</Label>
          <Input
            value={(tool.args.subject as string) ?? ""}
            onChange={(e) => updateToolArg(toolIndex, "subject", e.target.value)}
            className="mt-1 text-sm"
            placeholder="e.g. math, biology"
          />
        </div>
      </div>
    );
  };

  const renderDocumentEditor = (toolIndex: number) => {
    const tool = tools[toolIndex];
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            value={(tool.args.title as string) ?? ""}
            onChange={(e) => updateToolArg(toolIndex, "title", e.target.value)}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Content</Label>
          <Textarea
            value={(tool.args.content as string) ?? ""}
            onChange={(e) => updateToolArg(toolIndex, "content", e.target.value)}
            className="mt-1 text-xs min-h-[120px]"
            placeholder="Document content..."
          />
        </div>
      </div>
    );
  };

  const renderIdInput = (toolIndex: number, key: string, label: string) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={(tools[toolIndex].args[key] as string) ?? ""}
        onChange={(e) => updateToolArg(toolIndex, key, e.target.value)}
        className="mt-1 text-sm font-mono text-xs"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </div>
  );

  const renderSubjectFilter = (toolIndex: number) => (
    <div>
      <Label className="text-xs text-muted-foreground">Subject (optional filter)</Label>
      <Input
        value={(tools[toolIndex].args.subjectId as string) ?? ""}
        onChange={(e) => updateToolArg(toolIndex, "subjectId", e.target.value)}
        className="mt-1 text-sm"
        placeholder="e.g. math, biology"
      />
    </div>
  );

  const renderToolEditor = (toolIndex: number) => {
    const tool = tools[toolIndex];

    if (tool.name === "create_flashcard_set" || tool.name === "create_flashcards") {
      return (
        <div className="space-y-3">
          {tool.name === "create_flashcard_set" && (
            <div>
              <Label className="text-xs text-muted-foreground">Set Name</Label>
              <Input
                value={(tool.args.name as string) ?? ""}
                onChange={(e) => updateToolArg(toolIndex, "name", e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          )}
          {tool.name === "create_flashcards" && (
            <div>
              <Label className="text-xs text-muted-foreground">Set ID</Label>
              <Input
                value={(tool.args.setId as string) ?? ""}
                onChange={(e) => updateToolArg(toolIndex, "setId", e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input
              value={(tool.args.subjectId as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "subjectId", e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          {renderCardEditor(toolIndex)}
        </div>
      );
    }

    if (tool.name === "create_event" || tool.name === "update_event") {
      return renderEventEditor(toolIndex);
    }

    if (tool.name === "create_document" || tool.name === "update_document") {
      return renderDocumentEditor(toolIndex);
    }

    if (tool.name === "delete_event") {
      return renderIdInput(toolIndex, "eventId", "Event ID");
    }

    if (tool.name === "create_deadline") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={(tool.args.title as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "title", e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Due Date</Label>
            <Input
              type="datetime-local"
              value={safeDateInput(tool.args.dueDate)}
              onChange={(e) =>
                updateToolArg(toolIndex, "dueDate", safeDateParse(e.target.value))
              }
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <select
              value={(tool.args.priority as string) ?? "medium"}
              onChange={(e) => updateToolArg(toolIndex, "priority", e.target.value)}
              className="mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      );
    }

    if (tool.name === "update_flashcard") {
      return (
        <div className="space-y-3">
          {renderIdInput(toolIndex, "flashcardId", "Flashcard ID")}
          <div>
            <Label className="text-xs text-muted-foreground">Front</Label>
            <Textarea
              value={(tool.args.front as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "front", e.target.value)}
              className="mt-1 text-xs min-h-[60px]"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Back</Label>
            <Textarea
              value={(tool.args.back as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "back", e.target.value)}
              className="mt-1 text-xs min-h-[60px]"
            />
          </div>
        </div>
      );
    }

    if (tool.name === "update_subject_notes") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Subject ID</Label>
            <Input
              value={(tool.args.subjectId as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "subjectId", e.target.value)}
              className="mt-1 text-sm"
              placeholder="e.g. math, biology"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Content</Label>
            <Textarea
              value={(tool.args.content as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "content", e.target.value)}
              className="mt-1 text-xs min-h-[120px]"
            />
          </div>
        </div>
      );
    }

    if (tool.name === "create_quiz" || tool.name === "generate_quiz") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={(tool.args.title as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "title", e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input
              value={(tool.args.subjectId as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "subjectId", e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Difficulty</Label>
            <select
              value={(tool.args.difficulty as string) ?? "intermediate"}
              onChange={(e) => updateToolArg(toolIndex, "difficulty", e.target.value)}
              className="mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      );
    }

    // Read tools: get_*, list_*, delete_* (with just an ID field)
    if (tool.name.startsWith("get_") || tool.name.startsWith("delete_")) {
      const idKey = tool.name.includes("event") ? "eventId"
        : tool.name.includes("document") ? "documentId"
        : tool.name.includes("quiz") ? "quizId"
        : tool.name.includes("subject") ? "subjectId"
        : tool.name.includes("flashcard") ? "flashcardId"
        : "id";
      return renderIdInput(toolIndex, idKey, `${idKey.charAt(0).toUpperCase() + idKey.slice(1)}`);
    }

    // Subject filter for list tools
    if (tool.name.startsWith("list_")) {
      return (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">View data — optional filters below</div>
          {renderSubjectFilter(toolIndex)}
          {tool.name === "list_flashcards" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Due only</Label>
                <select
                  value={(tool.args.due as boolean) ? "true" : "false"}
                  onChange={(e) => updateToolArg(toolIndex, "due", e.target.value === "true")}
                  className="mt-1 flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="false">All</option>
                  <option value="true">Due for review only</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Limit</Label>
                <Input
                  type="number"
                  value={(tool.args.limit as number) ?? 50}
                  onChange={(e) => updateToolArg(toolIndex, "limit", parseInt(e.target.value) || 50)}
                  className="mt-1 text-sm"
                />
              </div>
            </>
          )}
          {tool.name === "list_events" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="datetime-local"
                  value={safeDateInput(tool.args.from)}
                  onChange={(e) => updateToolArg(toolIndex, "from", safeDateParse(e.target.value))}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="datetime-local"
                  value={safeDateInput(tool.args.to)}
                  onChange={(e) => updateToolArg(toolIndex, "to", safeDateParse(e.target.value))}
                  className="mt-1 text-sm"
                />
              </div>
            </>
          )}
        </div>
      );
    }

    if (tool.name === "get_quiz_attempts") {
      return (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Optional quiz ID filter (leave empty for all attempts)</div>
          <div>
            <Label className="text-xs text-muted-foreground">Quiz ID</Label>
            <Input
              value={(tool.args.quizId as string) ?? ""}
              onChange={(e) => updateToolArg(toolIndex, "quizId", e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
        </div>
      );
    }

    // Default: show raw args as JSON with clear label
    return (
      <div>
        <Label className="text-xs text-muted-foreground">
          Arguments (JSON) — {Object.keys(tool.args).length === 0 ? "no arguments provided" : ""}
        </Label>
        <Textarea
          value={JSON.stringify(tool.args, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setTools((prev) => {
                const next = [...prev];
                next[toolIndex] = { ...next[toolIndex], args: parsed };
                return next;
              });
            } catch {
              // Invalid JSON, don't update
            }
          }}
          className="mt-1 text-xs font-mono min-h-[100px]"
          placeholder='{"key": "value"}'
        />
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h2 className="text-sm font-semibold">Edit proposal</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {tools.map((tool, i) => (
            <div key={i}>
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tool {i + 1}: {tool.name}
                </p>
              </div>
              {renderToolEditor(i)}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-8 text-xs rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(tools)}
            className="h-8 gap-1.5 text-xs rounded-lg"
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
