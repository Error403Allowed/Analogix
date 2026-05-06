"use client";

import React from "react";
import { motion } from "framer-motion";
import { Brain, Check, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { GROQ_MODELS, type GroqModelId } from "@/types/groq-models";

interface ModelSelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: GroqModelId;
  onSelectModel: (model: GroqModelId) => void;
}

export default function ModelSelectorSheet({ open, onOpenChange, selectedModel, onSelectModel }: ModelSelectorSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass p-0 border-border sm:max-w-[420px] shadow-2xl rounded-2xl overflow-hidden">
        <DialogDescription className="sr-only">
          Select the AI model to use for this chat
        </DialogDescription>

        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-black tracking-tight">AI Model</DialogTitle>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Choose which model powers this chat</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </DialogHeader>

        {/* Model list */}
        <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
          {GROQ_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                onSelectModel(model.id);
                onOpenChange(false);
              }}
              className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                selectedModel === model.id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "hover:bg-muted text-foreground border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{model.name}</p>
                  <p className="text-xs text-muted-foreground/70 truncate mt-1 leading-relaxed">{model.description}</p>
                </div>
                {selectedModel === model.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 shrink-0">
          <p className="text-[11px] text-muted-foreground/60">
            <span className="font-semibold">Auto</span> mode picks the best model for your query automatically.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}