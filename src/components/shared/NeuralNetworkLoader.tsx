"use client";

import { motion } from "framer-motion";

const INPUTS = [
  { x: 7, y: 7 },
  { x: 7, y: 17 },
];
const MERGE = { x: 22, y: 12 };
const OUTPUT = { x: 37, y: 12 };

const NODES = [...INPUTS, MERGE, OUTPUT];

const EDGES = [
  { x1: INPUTS[0].x, y1: INPUTS[0].y, x2: MERGE.x, y2: MERGE.y },
  { x1: INPUTS[1].x, y1: INPUTS[1].y, x2: MERGE.x, y2: MERGE.y },
  { x1: MERGE.x, y1: MERGE.y, x2: OUTPUT.x, y2: OUTPUT.y },
];

// Pulses travel input → merge → output. Rendered with native SMIL
// (<animateMotion>) so the signal visibly moves in every browser without
// relying on JS animation libraries or reduce-motion media queries.
const PULSE_PATHS = [
  `M ${INPUTS[0].x} ${INPUTS[0].y} L ${MERGE.x} ${MERGE.y} L ${OUTPUT.x} ${OUTPUT.y}`,
  `M ${INPUTS[1].x} ${INPUTS[1].y} L ${MERGE.x} ${MERGE.y} L ${OUTPUT.x} ${OUTPUT.y}`,
];
const PULSE_DUR = "1.6s";
const PULSE_BEGIN = ["0s", "0.6s"] as const;

export function NeuralNetworkLoader() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-11 h-6">
        <svg viewBox="0 0 44 24" className="w-full h-full" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="anx-loader-edge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0.12)" />
              <stop offset="50%" stopColor="hsl(var(--primary) / 0.22)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.12)" />
            </linearGradient>
          </defs>

          {EDGES.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1}
              x2={e.x2} y2={e.y2}
              stroke="url(#anx-loader-edge)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          ))}

          {NODES.map((n, i) => (
            <circle key={i} data-node cx={n.x} cy={n.y} r="1.8" fill="hsl(var(--primary) / 0.55)">
              <animate
                attributeName="opacity"
                values="0.35;0.85;0.35"
                keyTimes="0;0.5;1"
                dur="2.4s"
                begin={`${(n.x / 44) * 1.2}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          {PULSE_PATHS.map((path, i) => (
            <g key={i} data-pulse>
              <circle r="3.6" fill="hsl(var(--primary) / 0.35)">
                <animateMotion dur={PULSE_DUR} begin={PULSE_BEGIN[i]} repeatCount="indefinite" path={path} />
                <animate
                  attributeName="opacity"
                  values="0;0.4;0"
                  keyTimes="0;0.5;1"
                  dur={PULSE_DUR}
                  begin={PULSE_BEGIN[i]}
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="1.5" fill="hsl(var(--primary))">
                <animateMotion dur={PULSE_DUR} begin={PULSE_BEGIN[i]} repeatCount="indefinite" path={path} />
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  keyTimes="0;0.5;1"
                  dur={PULSE_DUR}
                  begin={PULSE_BEGIN[i]}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </svg>
      </div>
      <span className="text-xs text-muted-foreground/60 font-medium">
        Thinking
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
      </span>
    </div>
  );
}