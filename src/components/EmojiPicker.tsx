/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ open, onOpenChange, selectedEmoji, onSelect }: EmojiPickerProps) {
  const [search, setSearch] = useState("");

  // Handle emoji selection from the picker
  const handleEmojiSelect = (emoji: any) => {
    onSelect(emoji.native);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Choose an Emoji</DialogTitle>
          <DialogDescription>
            Select an emoji for your document
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4">
          <Picker 
            data={data}
            onEmojiSelect={handleEmojiSelect}
            emojiSize={24}
            showPreview={false}
            showSkinTones={false}
            theme="auto"
            maxFrequentRows={2}
            perLine={8}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
