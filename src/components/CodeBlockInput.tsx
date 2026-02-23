"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "jsx", label: "JSX / TSX" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "bash", label: "Bash / Shell" },
  { id: "sql", label: "SQL" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "markdown", label: "Markdown" },
  { id: "", label: "Plain text" },
];

interface CodeBlockInputProps {
  onInsert: (code: string, language: string) => void;
  onClose: () => void;
  initialCode?: string;
}

export default function CodeBlockInput({ onInsert, onClose, initialCode = "" }: CodeBlockInputProps) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState("python");
  const [langSearch, setLangSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const filteredLangs = LANGUAGES.filter((l) =>
    l.label.toLowerCase().includes(langSearch.toLowerCase())
  );

  const handleInsert = () => {
    if (!code.trim()) return;
    onInsert(code, language);
  };

  // Tab key inserts spaces instead of changing focus
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = code.slice(0, start) + "  " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2));
    }
    if (e.key === "Escape") onClose();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleInsert();
    }
  };

  const selectedLang = LANGUAGES.find((l) => l.id === language);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Language selector */}
      <div className="flex flex-col gap-1">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Language</p>
        <input
          type="text"
          value={langSearch}
          onChange={(e) => setLangSearch(e.target.value)}
          placeholder="Search language…"
          className="w-full bg-muted/20 border border-border/40 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
        />
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          {filteredLangs.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLanguage(l.id)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all",
                language === l.id
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted/30 border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Code editor area — styled like a terminal / VS Code */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        {/* Fake window chrome */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/40">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono ml-2">
            {selectedLang?.label || "Plain text"}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`# Write your ${selectedLang?.label || "code"} here…`}
          rows={8}
          spellCheck={false}
          className="w-full bg-muted/10 px-4 py-3 text-sm font-mono resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/30 leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <Button
          size="sm"
          disabled={!code.trim()}
          onClick={handleInsert}
          className="rounded-xl text-xs font-black uppercase tracking-widest"
        >
          Insert block ⌘↵
        </Button>
      </div>
    </div>
  );
}
