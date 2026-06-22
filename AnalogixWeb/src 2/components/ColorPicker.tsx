"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";

// Notion-like color palette
export const SUBJECT_COLORS = [
  { id: "default", name: "Default", bg: "bg-muted/40", text: "text-muted-foreground", border: "border-border" },
  { id: "red", name: "Red", bg: "bg-red-500", text: "text-red-500", border: "border-red-500/30" },
  { id: "orange", name: "Orange", bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500/30" },
  { id: "amber", name: "Amber", bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/30" },
  { id: "yellow", name: "Yellow", bg: "bg-yellow-500", text: "text-yellow-600", border: "border-yellow-500/30" },
  { id: "lime", name: "Lime", bg: "bg-lime-500", text: "text-lime-500", border: "border-lime-500/30" },
  { id: "green", name: "Green", bg: "bg-green-500", text: "text-green-500", border: "border-green-500/30" },
  { id: "emerald", name: "Emerald", bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500/30" },
  { id: "teal", name: "Teal", bg: "bg-teal-500", text: "text-teal-500", border: "border-teal-500/30" },
  { id: "cyan", name: "Cyan", bg: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500/30" },
  { id: "sky", name: "Sky", bg: "bg-sky-500", text: "text-sky-500", border: "border-sky-500/30" },
  { id: "blue", name: "Blue", bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500/30" },
  { id: "indigo", name: "Indigo", bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500/30" },
  { id: "violet", name: "Violet", bg: "bg-violet-500", text: "text-violet-500", border: "border-violet-500/30" },
  { id: "purple", name: "Purple", bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500/30" },
  { id: "fuchsia", name: "Fuchsia", bg: "bg-fuchsia-500", text: "text-fuchsia-500", border: "border-fuchsia-500/30" },
  { id: "pink", name: "Pink", bg: "bg-pink-500", text: "text-pink-500", border: "border-pink-500/30" },
  { id: "rose", name: "Rose", bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500/30" },
] as const;

export type SubjectColorId = typeof SUBJECT_COLORS[number]["id"];

interface ColorPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColor: SubjectColorId;
  onSelect: (colorId: SubjectColorId) => void;
}

export function ColorPicker({ open, onOpenChange, selectedColor, onSelect }: ColorPickerProps) {
  const handleSelect = (colorId: SubjectColorId) => {
    onSelect(colorId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Choose a Color</DialogTitle>
          <DialogDescription>
            Select a color for this subject
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[300px] pr-4">
          <div className="grid grid-cols-3 gap-3">
            {SUBJECT_COLORS.map((color) => {
              const isSelected = selectedColor === color.id;
              
              return (
                <motion.button
                  key={color.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(color.id)}
                  className={cn(
                    "relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/40 hover:border-border/60 hover:bg-muted/30"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color.bg)}>
                    {isSelected && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{color.name}</span>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get color classes
export function getSubjectColorClasses(colorId: SubjectColorId) {
  const color = SUBJECT_COLORS.find(c => c.id === colorId) || SUBJECT_COLORS[0];
  return {
    bg: color.bg,
    text: color.text,
    border: color.border,
    bgSoft: color.bg.replace("bg-", "bg-").replace("500", "500/10"),
  };
}
