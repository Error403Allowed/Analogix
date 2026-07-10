"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PRESET_COLORS } from "../constants";
import { EmojiPicker } from "./EmojiPicker";

export function TagEditorPanel({ currentLabel, currentColor, currentIcon, onSave, onCancel, saveLabel = "Save" }: {
  currentLabel?: string;
  currentColor: string;
  currentIcon: string;
  onSave: (label: string | undefined, color: string, icon: string) => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [label, setLabel] = useState(currentLabel ?? "");
  const [color, setColor] = useState(currentColor);
  const [icon, setIcon] = useState(currentIcon);

  return (
    <div className="mt-1.5 mb-1 px-2.5 py-2 rounded-lg bg-muted/50 border border-border space-y-2">
      {currentLabel !== undefined && (
        <input
          aria-label="Tag name"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Tag name"
          className="w-full text-xs bg-background/80 border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}
      <EmojiPicker value={icon} onChange={setIcon} />
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)}
            className={cn("w-5 h-5 rounded-full transition-all", color === c && "ring-2 ring-offset-1 ring-primary")}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 text-[10px] font-semibold py-1 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">Cancel</button>
        <button
          type="button"
          onClick={() => onSave(currentLabel !== undefined ? label : undefined, color, icon)}
          className="flex-1 text-[10px] font-bold py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
