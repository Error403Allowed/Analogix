"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

const LAYERS = [3, 4, 4, 3];

const connections = (() => {
  const conns: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let l = 0; l < LAYERS.length - 1; l++) {
    for (let i = 0; i < LAYERS[l]; i++) {
      for (let j = 0; j < LAYERS[l + 1]; j++) {
        conns.push({
          x1: (l / (LAYERS.length - 1)) * 100,
          y1: ((i + 0.5) / LAYERS[l]) * 100,
          x2: ((l + 1) / (LAYERS.length - 1)) * 100,
          y2: ((j + 0.5) / LAYERS[l + 1]) * 100,
        });
      }
    }
  }
  return conns;
})();

const nodeDelay = (layer: number, index: number, count: number): number =>
  layer * 0.12 + (index / Math.max(count - 1, 1)) * 0.3;

export function NeuralNetworkLoader() {
  const lineGradId = useId();
  const pulseGradId = useId();
  const reduceMotion = useReducedMotion();

  const pulseProps = reduceMotion
    ? {}
    : {
        animate: { strokeDashoffset: [-40, 40] },
        transition: { duration: 1.8, repeat: Infinity, ease: "linear" as const },
      };

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-16 h-10">
        <svg viewBox="0 0 100 60" className="w-full h-full" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id={lineGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0.08)" />
              <stop offset="50%" stopColor="hsl(var(--primary) / 0.15)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.08)" />
            </linearGradient>
            <linearGradient id={pulseGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0)" />
              <stop offset="45%" stopColor="hsl(var(--primary) / 0.9)" />
              <stop offset="55%" stopColor="hsl(var(--primary) / 0.9)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
            </linearGradient>
          </defs>

          {connections.map((c, i) => (
            <line
              key={i}
              x1={c.x1} y1={c.y1}
              x2={c.x2} y2={c.y2}
              stroke={`url(#${lineGradId})`}
              strokeWidth="0.5"
            />
          ))}

          {!reduceMotion &&
            connections.map((c, i) => (
              <motion.line
                key={`pulse-${i}`}
                x1={c.x1} y1={c.y1}
                x2={c.x2} y2={c.y2}
                stroke={`url(#${pulseGradId})`}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="10 30"
                initial={{ strokeDashoffset: -40 }}
                {...pulseProps}
              />
            ))}

          {LAYERS.map((count, l) =>
            Array.from({ length: count }).map((_, i) => (
              <motion.circle
                key={`${l}-${i}`}
                cx={(l / (LAYERS.length - 1)) * 100}
                cy={((i + 0.5) / count) * 100}
                r="2.4"
                fill="hsl(var(--primary) / 0.35)"
                initial={{ opacity: 0.3, scale: 1 }}
                animate={
                  reduceMotion
                    ? undefined
                    : { opacity: [0.3, 1, 0.3], scale: [1, 1.25, 1] }
                }
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: nodeDelay(l, i, count),
                }}
              />
            ))
          )}
        </svg>
      </div>
      <span className="text-xs text-muted-foreground/60 font-medium">
        Thinking
        {!reduceMotion && (
          <span className="inline-flex ml-1.5 items-end" aria-hidden>
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                className="inline-block w-[3px] h-[3px] rounded-full bg-current"
                initial={{ opacity: 0.15 }}
                animate={{ opacity: [0.15, 1, 0.15] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              />
            ))}
          </span>
        )}
      </span>
    </div>
  );
}
