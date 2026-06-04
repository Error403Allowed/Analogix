"use client";

import { useEffect, useRef, useState } from "react";
import katex from "katex";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MathInputProps {
  onInsert: (latex: string, mode: "inline" | "block") => void;
  onClose: () => void;
  initialValue?: string;
}

// Quick-insert symbol groups
const SYMBOL_GROUPS = [
  {
    label: "Common",
    symbols: [
      { label: "x²", latex: "x^2" },
      { label: "xⁿ", latex: "x^{n}" },
      { label: "√x", latex: "\\sqrt{x}" },
      { label: "ⁿ√x", latex: "\\sqrt[n]{x}" },
      { label: "x/y", latex: "\\frac{x}{y}" },
      { label: "|x|", latex: "|x|" },
    ],
  },
  {
    label: "Calculus",
    symbols: [
      { label: "∫", latex: "\\int_{a}^{b}" },
      { label: "∑", latex: "\\sum_{i=1}^{n}" },
      { label: "∏", latex: "\\prod_{i=1}^{n}" },
      { label: "lim", latex: "\\lim_{x \\to \\infty}" },
      { label: "d/dx", latex: "\\frac{d}{dx}" },
      { label: "∂", latex: "\\frac{\\partial}{\\partial x}" },
    ],
  },
  {
    label: "Greek",
    symbols: [
      { label: "α", latex: "\\alpha" },
      { label: "β", latex: "\\beta" },
      { label: "γ", latex: "\\gamma" },
      { label: "δ", latex: "\\delta" },
      { label: "θ", latex: "\\theta" },
      { label: "λ", latex: "\\lambda" },
      { label: "μ", latex: "\\mu" },
      { label: "π", latex: "\\pi" },
      { label: "σ", latex: "\\sigma" },
      { label: "φ", latex: "\\phi" },
      { label: "ω", latex: "\\omega" },
      { label: "Σ", latex: "\\Sigma" },
    ],
  },
  {
    label: "Logic",
    symbols: [
      { label: "∞", latex: "\\infty" },
      { label: "≠", latex: "\\neq" },
      { label: "≤", latex: "\\leq" },
      { label: "≥", latex: "\\geq" },
      { label: "≈", latex: "\\approx" },
      { label: "∈", latex: "\\in" },
      { label: "∉", latex: "\\notin" },
      { label: "⊂", latex: "\\subset" },
      { label: "∩", latex: "\\cap" },
      { label: "∪", latex: "\\cup" },
      { label: "∀", latex: "\\forall" },
      { label: "∃", latex: "\\exists" },
    ],
  },
];

export default function MathInput({ onInsert, onClose, initialValue = "" }: MathInputProps) {
  const [latex, setLatex] = useState(initialValue);
  const [mode, setMode] = useState<"inline" | "block">("inline");
  const [renderedHtml, setRenderedHtml] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!latex.trim()) {
      setRenderedHtml("");
      setError("");
      return;
    }
    try {
      const html = katex.renderToString(latex, {
        throwOnError: true,
        displayMode: mode === "block",
        strict: false,
      });
      setRenderedHtml(html);
      setError("");
    } catch (e: unknown) {
      setRenderedHtml("");
      setError(e instanceof Error ? e.message.replace(/^KaTeX parse error: /, "") : "Invalid LaTeX");
    }
  }, [latex, mode]);

  const insertSymbol = (sym: string) => {
    const ta = inputRef.current;
    if (!ta) {
      setLatex((v) => v + sym);
      return;
    }
    const start = ta.selectionStart ?? latex.length;
    const end = ta.selectionEnd ?? latex.length;
    const next = latex.slice(0, start) + sym + latex.slice(end);
    setLatex(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + sym.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const handleInsert = () => {
    if (!latex.trim()) return;
    onInsert(latex.trim(), mode);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setMode("inline")}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-bold transition-all",
            mode === "inline" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Inline
        </button>
        <button
          type="button"
          onClick={() => setMode("block")}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-bold transition-all",
            mode === "block" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Block
        </button>
      </div>

      {/* LaTeX input */}
      <textarea
        ref={inputRef}
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleInsert();
          }
          if (e.key === "Escape") onClose();
        }}
        placeholder="Type LaTeX… e.g. \frac{1}{2} or x^2 + 3x"
        rows={3}
        className="w-full bg-muted/20 border border-border/40 rounded-xl px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
      />

      {/* Symbol palette */}
      <div className="space-y-2">
        {SYMBOL_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{group.label}</p>
            <div className="flex flex-wrap gap-1">
              {group.symbols.map((sym) => (
                <button
                  key={sym.latex}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertSymbol(sym.latex); }}
                  className="h-7 px-2 rounded-lg bg-muted/40 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/30 text-xs font-mono transition-all"
                  title={sym.latex}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="min-h-[48px] rounded-xl border border-border/40 bg-background/60 px-4 py-3 flex items-center justify-center">
        {error ? (
          <p className="text-xs text-red-400 font-mono">{error}</p>
        ) : renderedHtml ? (
          <div
            className={cn("katex-preview", mode === "block" && "text-center w-full")}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <p className="text-xs text-muted-foreground/40 select-none">Preview appears here…</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <Button
          size="sm"
          disabled={!latex.trim() || !!error}
          onClick={handleInsert}
          className="rounded-xl text-xs font-black uppercase tracking-widest"
        >
          Insert ⌘↵
        </Button>
      </div>
    </div>
  );
}
