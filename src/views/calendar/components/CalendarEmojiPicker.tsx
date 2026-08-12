"use client";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { EMOJI_OPTIONS } from "../constants";

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search.trim()
    ? EMOJI_OPTIONS.filter(e => e.includes(search.trim()))
    : EMOJI_OPTIONS;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      const segs = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(search.trim())];
      if (segs.length > 0 && search.trim()) {
        onChange(segs[0].segment);
        setOpen(false);
        setSearch("");
      }
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="w-12 h-[38px] text-lg flex items-center justify-center bg-muted/40 border border-border rounded-lg hover:bg-muted/70 transition-colors select-none">
        {value || "🏷️"}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-[100] bg-card border border-border rounded-xl shadow-xl p-2"
          style={{ width: "240px" }}
          onClick={e => e.stopPropagation()}
        >
          <input
            autoFocus
            value={search}
            placeholder="Search or type emoji…"
            className="w-full text-xs bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 mb-2"
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <div className="grid grid-cols-10 gap-0.5 max-h-40 overflow-y-auto">
            {filtered.map(em => (
              <button key={em} type="button"
                onClick={e => { e.stopPropagation(); onChange(em); setOpen(false); setSearch(""); }}
                className={cn("text-base w-full aspect-square flex items-center justify-center rounded hover:bg-muted transition-colors",
                  value === em && "bg-muted ring-1 ring-primary")}>
                {em}
              </button>
            ))}
            {filtered.length === 0 && search.trim() && (
              <button type="button"
                onClick={e => {
                  e.stopPropagation();
                  const segs = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(search.trim())];
                  if (segs.length > 0) { onChange(segs[0].segment); setOpen(false); setSearch(""); }
                }}
                className="col-span-10 text-sm py-2 hover:bg-muted rounded transition-colors text-center">
                Use "{search.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
