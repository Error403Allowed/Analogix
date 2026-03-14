"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface DesmosGraphProps {
  expressions: string; // raw desmos block content — one expression per line
  height?: number;
}

// Desmos Embed API is loaded once globally via a script tag.
// Think of it like plugging a TV into the wall — you only need one power point,
// and then every TV (graph) in the house can use it.
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
  setExpression: (expr: { id: string; latex: string; color?: string }) => void;
  setMathBounds: (bounds: { left: number; right: number; bottom: number; top: number }) => void;
  destroy: () => void;
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
  // Use the Desmos API — key is read from env at build time via next.config
  const apiKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY || "dcb31709b452b1cf9dc26972add0fda6";
  script.src = `https://www.desmos.com/api/v1.9/calculator.js?apiKey=${apiKey}`;
  script.async = true;
  script.onload = () => {
    scriptLoaded = true;
    readyCallbacks.forEach(cb => cb());
    readyCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

// Parse the raw block content into expression lines and optional config.
// Format supported:
//   y=x^2
//   y=sin(x)
//   [bounds: -10,10,-5,5]   ← optional: left,right,bottom,top
function parseBlock(raw: string): {
  exprs: string[];
  bounds?: { left: number; right: number; bottom: number; top: number };
} {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  let bounds: { left: number; right: number; bottom: number; top: number } | undefined;
  const exprs: string[] = [];

  for (const line of lines) {
    const boundsMatch = line.match(/^\[bounds:\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\]$/i);
    if (boundsMatch) {
      bounds = {
        left:   parseFloat(boundsMatch[1]),
        right:  parseFloat(boundsMatch[2]),
        bottom: parseFloat(boundsMatch[3]),
        top:    parseFloat(boundsMatch[4]),
      };
    } else {
      exprs.push(line);
    }
  }
  return { exprs, bounds };
}

const DESMOS_COLORS = [
  "#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899",
];

// Memoize the parsed result so it doesn't re-parse on every render
const parseBlockMemo = (raw: string) => {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  let bounds: { left: number; right: number; bottom: number; top: number } | undefined;
  const exprs: string[] = [];

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
      exprs.push(line);
    }
  }
  return { exprs, bounds };
};

function DesmosGraph({ expressions, height = 320 }: DesmosGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalculator | null>(null);
  const [ready, setReady] = useState(false);
  const [key, setKey] = useState(0);

  // Parse once and memoize — prevents re-parsing on parent re-renders
  const parsedData = useMemo(() => parseBlockMemo(expressions), [expressions]);
  const { exprs, bounds } = parsedData;

  // Load the Desmos script once globally
  useEffect(() => {
    loadDesmosScript(() => setReady(true));
  }, []);

  // Mount the calculator once when ready. Never destroy/recreate on expression changes.
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    if (!window.Desmos) return;

    calcRef.current?.destroy();

    const calc = window.Desmos.GraphingCalculator(containerRef.current, {
      keypad: false,
      expressions: false,
      settingsMenu: false,
      zoomButtons: true,
      lockViewport: false,
      border: false,
      backgroundColor: "transparent",
    });

    calcRef.current = calc;

    return () => {
      calc.destroy();
      calcRef.current = null;
    };
    // key allows manual remount via the reset button; ready ensures DOM is there
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  // Update expressions on the existing calculator instance without remounting.
  // Only run when expressions actually change (memoized above prevents false changes)
  useEffect(() => {
    const calc = calcRef.current;
    if (!calc || !ready) return;

    exprs.forEach((latex, i) => {
      calc.setExpression({
        id: `expr_${i}`,
        latex,
        color: DESMOS_COLORS[i % DESMOS_COLORS.length],
      });
    });

    if (bounds) calc.setMathBounds(bounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, exprs, bounds]); // Use parsed values as deps, not raw string

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a2e]/60 backdrop-blur shadow-lg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 bg-white/3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/70" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            Graph
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setKey(k => k + 1)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            title="Reset graph"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expression chips — rendered with KaTeX */}
      {exprs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-2">
          {exprs.map((expr, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2.5 py-0.5 rounded-md border text-sm"
              style={{
                color: DESMOS_COLORS[i % DESMOS_COLORS.length],
                borderColor: DESMOS_COLORS[i % DESMOS_COLORS.length] + "44",
                backgroundColor: DESMOS_COLORS[i % DESMOS_COLORS.length] + "11",
              }}
            >
              <MarkdownRenderer content={`$${expr}$`} className="leading-none [&_.katex]:text-[0.85rem]" />
            </span>
          ))}
        </div>
      )}

      {/* Calculator mount point — always mounted to avoid flicker on re-render */}
      <div className="relative" style={{ height }}>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 z-10 rounded-b-2xl">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        )}
        <div
          ref={containerRef}
          style={{ height, visibility: ready ? "visible" : "hidden" }}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

// Memoize the entire component to prevent re-renders when parent updates during streaming
export default React.memo(DesmosGraph);
