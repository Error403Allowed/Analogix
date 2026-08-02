"use client";

const LAYERS = [3, 4, 4, 3];

const connections = (() => {
  const conns: { x1: number; y1: number; x2: number; y2: number; delay: number }[] = [];
  for (let l = 0; l < LAYERS.length - 1; l++) {
    for (let i = 0; i < LAYERS[l]; i++) {
      for (let j = 0; j < LAYERS[l + 1]; j++) {
        conns.push({
          x1: (l / (LAYERS.length - 1)) * 100,
          y1: ((i + 0.5) / LAYERS[l]) * 100,
          x2: ((l + 1) / (LAYERS.length - 1)) * 100,
          y2: ((j + 0.5) / LAYERS[l + 1]) * 100,
          delay: ((i * LAYERS[l + 1] + j) % 4) * 0.4,
        });
      }
    }
  }
  return conns;
})();

const getNodeDelay = (layer: number, index: number, count: number): string =>
  `${(index / count) * 1.6 + layer * 0.1}s`;

export function NeuralNetworkLoader() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-16 h-10">
        <svg
          viewBox="0 0 100 60"
          className="w-full h-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0)" />
              <stop offset="40%" stopColor="hsl(var(--primary) / 0.6)" />
              <stop offset="60%" stopColor="hsl(var(--primary) / 0.6)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
            </linearGradient>
            <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0.08)" />
              <stop offset="50%" stopColor="hsl(var(--primary) / 0.15)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.08)" />
            </linearGradient>
          </defs>

          {connections.map((c, i) => (
            <g key={i}>
              <line
                x1={c.x1} y1={c.y1}
                x2={c.x2} y2={c.y2}
                stroke="url(#line-grad)"
                strokeWidth="0.5"
              />
              <line
                x1={c.x1} y1={c.y1}
                x2={c.x2} y2={c.y2}
                stroke="url(#pulse-grad)"
                strokeWidth="1.5"
                strokeDasharray="8 24"
                className="neural-pulse"
                style={{ animationDelay: `${c.delay}s` }}
              />
            </g>
          ))}

          {LAYERS.map((count, l) =>
            Array.from({ length: count }).map((_, i) => (
              <circle
                key={`${l}-${i}`}
                cx={(l / (LAYERS.length - 1)) * 100}
                cy={((i + 0.5) / count) * 100}
                r="2.5"
                fill="hsl(var(--primary) / 0.3)"
                className="neural-node"
                style={{ animationDelay: getNodeDelay(l, i, count) }}
              />
            ))
          )}
        </svg>
      </div>
      <span className="text-xs text-muted-foreground/60 font-medium">
        Thinking<span className="neural-dots" />
      </span>
    </div>
  );
}
