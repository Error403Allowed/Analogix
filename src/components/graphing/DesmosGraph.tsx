"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Loader2, RefreshCw, Edit2, X, Plus, Maximize2, Minimize2, Download, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface DesmosGraphProps {
  expressions: string; // raw desmos block content — one expression per line
  height?: number;
  showEditor?: boolean;
}

// Desmos Embed API is loaded once globally via a script tag.
declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (
        el: HTMLElement,
        opts?: Record<string, unknown>
      ) => DesmosCalculator;
    };
  }
}

interface DesmosCalculator {
  setExpression: (expr: { id: string; latex: string; color?: string; hidden?: boolean }) => void;
  removeExpression: (expr: { id: string }) => void;
  setMathBounds: (bounds: { left: number; right: number; bottom: number; top: number }) => void;
  destroy: () => void;
  screenshot: (opts?: { width?: number; height?: number; targetPixelRatio?: number }) => string;
  getState: () => unknown;
  getExpressions: () => Array<{ id: string; latex?: string; error?: { message: string }; hidden?: boolean }>;
}

// ---------------------------------------------------------------------------
// sanitiseLatex — auto-fix common AI mistakes before handing to Desmos.
// ---------------------------------------------------------------------------
function sanitiseLatex(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^`+|`+$/g, "").trim();
  s = s.replace(/(?<!\^)\*(?!\{)/g, "\\cdot ");
  s = s.replace(/\*\*/g, "^");
  s = s.replace(/==/g, "=");
  const mathFns = [
    "sin","cos","tan","cot","sec","csc",
    "arcsin","arccos","arctan",
    "sinh","cosh","tanh",
    "ln","log","exp","sqrt","abs",
    "floor","ceil","sign","nthroot",
  ];
  for (const fn of mathFns) {
    const re = new RegExp(`(?<!\\\\)\\b${fn}\\b(?=\\s*\\()`, "g");
    s = s.replace(re, `\\${fn}`);
  }
  s = s.replace(/\\sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
  s = s.replace(/\^\(([^)]+)\)/g, "^{$1}");
  s = s.replace(/[;,]+$/g, "").trim();
  return s;
}

let scriptLoaded = false;
let scriptLoading = false;
const readyCallbacks: Array<() => void> = [];

function loadDesmosScript(onReady: () => void) {
  if (scriptLoaded) { onReady(); return; }
  readyCallbacks.push(onReady);
  if (scriptLoading) return;
  scriptLoading = true;

  const script = document.createElement("script");
  const apiKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY || "dcb31709b452b1cf9dc26972add0fda6";
  script.src = `https://www.desmos.com/api/v1.9/calculator.js?apiKey=${apiKey}`;
  script.async = true;
  script.onload = () => {
    scriptLoaded = true;
    readyCallbacks.forEach(cb => cb());
    readyCallbacks.length = 0;
  };
  script.onerror = () => {
    console.error("Failed to load Desmos script");
    scriptLoading = false;
  };
  document.head.appendChild(script);
}

const DESMOS_COLORS = [
  "#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899",
];

const DEFAULT_HEIGHT = 320;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 700;

function DesmosGraph({ expressions, height = DEFAULT_HEIGHT, showEditor = false }: DesmosGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalculator | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(DEFAULT_HEIGHT);

  const [ready, setReady] = useState(false);
  const [key, setKey] = useState(0);
  const [showExprEditor, setShowExprEditor] = useState(showEditor);
  const [editLatex, setEditLatex] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localExprs, setLocalExprs] = useState<string[]>([]);
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set());
  const [errorIndices, setErrorIndices] = useState<Set<number>>(new Set());
  const [correctedIndices, setCorrectedIndices] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [graphHeight, setGraphHeight] = useState(height);
  const [downloadFlash, setDownloadFlash] = useState(false);

  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Parse & sanitise expressions
  const parsedData = useMemo(() => {
    const lines = expressions.trim().split("\n").map(l => l.trim()).filter(Boolean);
    let bounds: { left: number; right: number; bottom: number; top: number } | undefined;
    const exprs: string[] = [];
    const corrected = new Set<number>();

    for (const line of lines) {
      const boundsMatch = line.match(/^\[bounds:\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\]$/i);
      if (boundsMatch) {
        bounds = {
          left: parseFloat(boundsMatch[1]),
          right: parseFloat(boundsMatch[2]),
          bottom: parseFloat(boundsMatch[3]),
          top: parseFloat(boundsMatch[4]),
        };
      } else {
        const sanitised = sanitiseLatex(line);
        if (sanitised !== line) corrected.add(exprs.length);
        exprs.push(sanitised);
      }
    }
    return { exprs, bounds, corrected };
  }, [expressions]);

  const { exprs, bounds, corrected } = parsedData;

  useEffect(() => { setCorrectedIndices(corrected); }, [corrected]);
  useEffect(() => { setLocalExprs(exprs); }, [exprs]);
  useEffect(() => { loadDesmosScript(() => setReady(true)); }, []);

  // HSL → hex for Desmos backgroundColor
  const hslToHex = (h: number, s: number, l: number) => {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * c).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Mount calculator
  useEffect(() => {
    if (!ready || !containerRef.current || !window.Desmos) return;
    calcRef.current?.destroy();

    const style = getComputedStyle(document.documentElement);
    const bgHsl = style.getPropertyValue("--background").trim();
    const [bh, bs, bl] = bgHsl.split(" ").map((v) => parseFloat(v));
    const bgColor = bgHsl ? hslToHex(bh || 0, bs || 0, bl || 100) : (isDark ? "#191919" : "#ffffff");
    const textColor = isDark ? "#ededed" : "#1a1a2e";

    const calc = window.Desmos.GraphingCalculator(containerRef.current, {
      keypad: false,
      expressions: false,
      settingsMenu: false,
      zoomButtons: true,
      lockViewport: false,
      border: false,
      backgroundColor: bgColor,
      textColor,
      manageFocus: false,
      // Disable keyboard navigation to prevent focus stealing
      enableKeyboard: false,
    });

    calcRef.current = calc;

    // Prevent the calculator container from stealing focus
    // Blur any element inside the container that might have received focus
    setTimeout(() => {
      if (containerRef.current) {
        const focusedInside = containerRef.current.querySelector(':focus') as HTMLElement;
        if (focusedInside) {
          focusedInside.blur();
        }
        // Also make sure the container div itself doesn't have a tabIndex
        containerRef.current.removeAttribute('tabindex');
      }
    }, 0);

    return () => { calc.destroy(); calcRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, isDark]);

  // Sync expressions to calculator
  useEffect(() => {
    const calc = calcRef.current;
    if (!calc || !ready) return;

    exprs.forEach((latex, i) => {
      calc.setExpression({
        id: `expr_${i}`,
        latex,
        color: DESMOS_COLORS[i % DESMOS_COLORS.length],
        hidden: hiddenIndices.has(i),
      });
    });

    if (bounds) calc.setMathBounds(bounds);

    // Check for parse errors after Desmos processes the expressions
    setTimeout(() => {
      const calc = calcRef.current;
      if (!calc) return;
      try {
        const state = calc.getExpressions();
        const errSet = new Set<number>();
        state.forEach((e) => {
          const match = e.id?.match(/^expr_(\d+)$/);
          if (match && e.error) errSet.add(parseInt(match[1]));
        });
        setErrorIndices(errSet);
      } catch { /* silent */ }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, exprs, bounds]);

  // Sync hidden state to calculator
  useEffect(() => {
    const calc = calcRef.current;
    if (!calc || !ready) return;
    localExprs.forEach((latex, i) => {
      calc.setExpression({
        id: `expr_${i}`,
        latex,
        color: DESMOS_COLORS[i % DESMOS_COLORS.length],
        hidden: hiddenIndices.has(i),
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenIndices]);

  // ── Drag-to-resize ──────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartHeight.current = graphHeight;

    const onMove = (ev: MouseEvent) => {
      if (dragStartY.current === null) return;
      const delta = ev.clientY - dragStartY.current;
      setGraphHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta)));
    };
    const onUp = () => {
      dragStartY.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [graphHeight]);

  // ── Download PNG ────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const calc = calcRef.current;
    if (!calc) return;
    try {
      const dataUrl = calc.screenshot({ width: 1200, height: 800, targetPixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "graph.png";
      a.click();
      setDownloadFlash(true);
      setTimeout(() => setDownloadFlash(false), 1500);
    } catch { /* silent */ }
  }, []);

  // ── Copy expression LaTeX ───────────────────────────────────────────────
  const handleCopyExpr = useCallback((expr: string, i: number) => {
    navigator.clipboard.writeText(expr).then(() => {
      setCopiedIndex(i);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  }, []);

  // ── Toggle visibility ───────────────────────────────────────────────────
  const handleToggleHidden = useCallback((i: number) => {
    setHiddenIndices(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }, []);

  // ── Add expression ──────────────────────────────────────────────────────
  const handleAddExpression = useCallback(() => {
    const calc = calcRef.current;
    const latex = editLatex.trim();
    if (!calc || !latex) return;

    if (editingIndex !== null) {
      // Update existing
      const sanitised = sanitiseLatex(latex);
      calc.setExpression({ id: `expr_${editingIndex}`, latex: sanitised, color: DESMOS_COLORS[editingIndex % DESMOS_COLORS.length] });
      setLocalExprs(prev => prev.map((e, i) => i === editingIndex ? sanitised : e));
      setEditingIndex(null);
    } else {
      // Add new
      const sanitised = sanitiseLatex(latex);
      const newId = `expr_${localExprs.length}`;
      calc.setExpression({ id: newId, latex: sanitised, color: DESMOS_COLORS[localExprs.length % DESMOS_COLORS.length] });
      setLocalExprs(prev => [...prev, sanitised]);
    }
    setEditLatex("");
  }, [editLatex, editingIndex, localExprs.length]);

  const handleRemoveExpression = useCallback((index: number) => {
    calcRef.current?.removeExpression({ id: `expr_${index}` });
    setLocalExprs(prev => prev.filter((_, i) => i !== index));
    setHiddenIndices(prev => { const n = new Set(prev); n.delete(index); return n; });
  }, []);

  const handleEditExpr = useCallback((expr: string, i: number) => {
    setEditLatex(expr);
    setEditingIndex(i);
    setShowExprEditor(true);
  }, []);

  const activeHeight = isFullscreen ? "100%" : graphHeight;

  return (
    <div
      ref={wrapperRef}
      className={isFullscreen
        ? "fixed inset-0 z-50 flex flex-col bg-background"
        : "my-4 rounded-2xl overflow-hidden border border-border/40 shadow-lg bg-background"
      }
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            Desmos Graph
          </span>
          {errorIndices.size > 0 && (
            <span className="text-[10px] text-amber-500 font-medium">
              · {errorIndices.size} expression{errorIndices.size > 1 ? "s" : ""} failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Download */}
          <Button
            size="sm" variant="ghost"
            onClick={handleDownload}
            className="h-7 w-7 p-0"
            title="Download as PNG"
          >
            {downloadFlash
              ? <Check className="w-3 h-3 text-green-500" />
              : <Download className="w-3 h-3" />
            }
          </Button>
          {/* Expression editor toggle */}
          <Button
            size="sm" variant="ghost"
            onClick={() => { setShowExprEditor(v => !v); setEditingIndex(null); setEditLatex(""); }}
            className="h-7 w-7 p-0"
            title="Edit expressions"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          {/* Reset */}
          <Button
            size="sm" variant="ghost"
            onClick={() => setKey(k => k + 1)}
            className="h-7 w-7 p-0"
            title="Reset view"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          {/* Fullscreen */}
          <Button
            size="sm" variant="ghost"
            onClick={() => setIsFullscreen(v => !v)}
            className="h-7 w-7 p-0"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* ── Expression chips ── */}
      {exprs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1.5 border-b border-border/30 bg-card/40 shrink-0">
          {localExprs.map((expr, i) => {
            const hasError = errorIndices.has(i);
            const wasCorrected = correctedIndices.has(i);
            const isHidden = hiddenIndices.has(i);
            const isCopied = copiedIndex === i;
            const color = DESMOS_COLORS[i % DESMOS_COLORS.length];
            return (
              <div
                key={i}
                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium transition-all"
                style={hasError ? {
                  color: "#ef4444", borderColor: "#ef444444", backgroundColor: "#ef444411",
                } : {
                  color: isHidden ? undefined : color,
                  borderColor: isHidden ? undefined : color + "44",
                  backgroundColor: isHidden ? undefined : color + "11",
                  opacity: isHidden ? 0.4 : 1,
                }}
                title={hasError ? "Parse error" : wasCorrected ? "Auto-corrected" : expr}
              >
                {/* Colour dot */}
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 transition-opacity"
                  style={{ backgroundColor: hasError ? "#ef4444" : color, opacity: isHidden ? 0.3 : 1 }}
                />

                {/* Expression — click to copy */}
                <button
                  onClick={() => handleCopyExpr(expr, i)}
                  className="leading-none max-w-[160px] truncate"
                  title="Click to copy LaTeX"
                >
                  {isCopied
                    ? <span className="text-green-500 text-[10px]">Copied!</span>
                    : <MarkdownRenderer content={`$${expr}$`} className="leading-none [&_.katex]:text-[0.75rem] pointer-events-none" />
                  }
                </button>

                {/* Error badge */}
                {hasError && <span className="text-[9px]">⚠</span>}
                {wasCorrected && !hasError && <span className="text-[9px] opacity-40">✓</span>}

                {/* Action buttons — visible on hover */}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-0.5">
                  <button
                    onClick={() => handleToggleHidden(i)}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title={isHidden ? "Show" : "Hide"}
                  >
                    {isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                  </button>
                  <button
                    onClick={() => handleEditExpr(expr, i)}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveExpression(i)}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/10 text-red-400 transition-colors"
                    title="Remove"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Expression editor panel ── */}
      {showExprEditor && (
        <div className="px-3 py-2 border-b border-border/40 bg-card/60 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={editLatex}
              onChange={(e) => setEditLatex(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddExpression(); if (e.key === "Escape") { setEditingIndex(null); setEditLatex(""); } }}
              placeholder={editingIndex !== null ? `Editing expr ${editingIndex + 1} — press Enter to save` : "Add equation (e.g. y=\\sin(x), a=2)…"}
              className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
            />
            {editingIndex !== null && (
              <Button size="sm" variant="ghost" onClick={() => { setEditingIndex(null); setEditLatex(""); }} className="h-8 px-2 text-xs">
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={handleAddExpression} className="h-8 px-3">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground/50 font-mono">
            Use LaTeX: \sin(x), \frac{"{"}{1}{"}"}{"{"}x{"}"}, x^{"{"}2{"}"}
          </p>
        </div>
      )}

      {/* ── Calculator ── */}
      <div className="relative flex-1" style={isFullscreen ? { minHeight: 0 } : { height: graphHeight }}>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
          </div>
        )}
        <div
          ref={containerRef}
          style={{ height: "100%", visibility: ready ? "visible" : "hidden" }}
          className="w-full"
        />
      </div>

      {/* ── Drag-to-resize handle (not shown in fullscreen) ── */}
      {!isFullscreen && (
        <div
          onMouseDown={handleDragStart}
          className="h-2.5 flex items-center justify-center cursor-ns-resize bg-card/60 hover:bg-muted/60 transition-colors border-t border-border/30 group shrink-0"
          title="Drag to resize"
        >
          <div className="w-8 h-0.5 rounded-full bg-muted-foreground/20 group-hover:bg-muted-foreground/40 transition-colors" />
        </div>
      )}
    </div>
  );
}

export default React.memo(DesmosGraph);
