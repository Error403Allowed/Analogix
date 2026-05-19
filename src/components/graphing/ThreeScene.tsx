"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface ThreeObject {
  id: string;
  shape: "sphere" | "torus" | "box" | "cylinder" | "cone" | "helix" | "ring" | "pyramid";
  label: string;
  color: string;
  size: number;
  position: { x: number; y: number; z: number };
  orbitRadius?: number | null;
  orbitSpeed?: number | null;
  pulsates?: boolean;
}

export interface ThreeConnection {
  from: string;
  to: string;
  color?: string;
}

export interface ThreeSceneSpec {
  title: string;
  description: string;
  sceneType?: string;
  primaryColor?: string;
  secondaryColor?: string;
  objects: ThreeObject[];
  connections?: ThreeConnection[];
  analogyHint?: string;
}

const COLORS = {
  sphere: "#8884d8",
  torus: "#ff8042",
  box: "#00c49f",
  cylinder: "#0088fe",
  cone: "#ffc658",
  helix: "#ff7300",
  ring: "#82ca9d",
  pyramid: "#ffbb28",
};

function getShapeColor(shape: string, color?: string): string {
  return color || COLORS[shape as keyof typeof COLORS] || "#8884d8";
}

function renderObjectSVG(obj: ThreeObject, viewBox: { w: number; h: number }): React.ReactNode {
  const cx = ((obj.position.x + 3) / 6) * viewBox.w;
  const cy = ((2 - obj.position.y) / 4) * viewBox.h;
  const r = obj.size * 18;
  const color = getShapeColor(obj.shape, obj.color);
  const pulseClass = obj.pulsates ? "animate-pulse" : "";

  switch (obj.shape) {
    case "sphere":
      return (
        <g key={obj.id} className={pulseClass}>
          <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={2} />
          <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.2} fill="white" fillOpacity={0.3} />
          {obj.label && (
            <text x={cx} y={cy + r + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
    case "torus":
      return (
        <g key={obj.id} className={pulseClass}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={r * 0.4} strokeOpacity={0.7} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1} />
          {obj.label && (
            <text x={cx} y={cy + r + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
    case "box":
      return (
        <g key={obj.id} className={pulseClass}>
          <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={color} fillOpacity={0.7} rx={2} stroke={color} strokeWidth={2} />
          {obj.label && (
            <text x={cx} y={cy + r + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
    case "cylinder":
      return (
        <g key={obj.id} className={pulseClass}>
          <ellipse cx={cx} cy={cy - r} rx={r} ry={r * 0.3} fill={color} fillOpacity={0.5} stroke={color} strokeWidth={1.5} />
          <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={1.5} />
          <ellipse cx={cx} cy={cy + r} rx={r} ry={r * 0.3} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={1.5} />
          {obj.label && (
            <text x={cx} y={cy + r + 18} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
    case "cone":
      return (
        <g key={obj.id} className={pulseClass}>
          <polygon points={`${cx},${cy - r * 1.5} ${cx - r},${cy + r} ${cx + r},${cy + r}`} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={2} />
          {obj.label && (
            <text x={cx} y={cy + r + 16} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
    case "helix":
      return (
        <g key={obj.id} className={pulseClass}>
          {[0, 1, 2].map(i => (
            <circle key={i} cx={cx} cy={cy - r + i * r} r={r * 0.5} fill={color} fillOpacity={0.4 - i * 0.1} stroke={color} strokeWidth={1} />
          ))}
          {obj.label && (
            <text x={cx} y={cy + r + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
    case "ring":
      return (
        <g key={obj.id} className={pulseClass}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={3} strokeOpacity={0.8} />
          <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
          {obj.label && (
            <text x={cx} y={cy + r + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
    case "pyramid":
      return (
        <g key={obj.id} className={pulseClass}>
          <polygon points={`${cx},${cy - r * 1.5} ${cx - r * 1.2},${cy + r} ${cx + r * 1.2},${cy + r}`} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={2} />
          <line x1={cx} y1={cy - r * 1.5} x2={cx} y2={cy + r} stroke={color} strokeWidth={1} strokeOpacity={0.4} />
          {obj.label && (
            <text x={cx} y={cy + r + 16} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
    default:
      return (
        <g key={obj.id}>
          <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.6} />
          {obj.label && (
            <text x={cx} y={cy + r + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">
              {obj.label}
            </text>
          )}
        </g>
      );
  }
}

function renderConnections(objects: ThreeObject[], connections: ThreeConnection[] | undefined, viewBox: { w: number; h: number }): React.ReactNode {
  if (!connections || connections.length === 0) return null;

  const posMap: Record<string, { x: number; y: number }> = {};
  objects.forEach(obj => {
    posMap[obj.id] = {
      x: ((obj.position.x + 3) / 6) * viewBox.w,
      y: ((2 - obj.position.y) / 4) * viewBox.h,
    };
  });

  return (
    <g>
      {connections.map((conn, i) => {
        const from = posMap[conn.from];
        const to = posMap[conn.to];
        if (!from || !to) return null;
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={conn.color || "hsl(var(--muted-foreground))"}
            strokeWidth={1.5}
            strokeOpacity={0.3}
            strokeDasharray="4 4"
          />
        );
      })}
    </g>
  );
}

interface ThreeSceneProps {
  spec: ThreeSceneSpec;
  className?: string;
}

export default function ThreeScene({ spec, className }: ThreeSceneProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const viewBox = { w: 500, h: 350 };

  const svgContent = useMemo(() => {
    const objects = spec.objects.map(obj => renderObjectSVG(obj, viewBox));
    const conns = renderConnections(spec.objects, spec.connections, viewBox);
    return { objects, conns };
  }, [spec.objects, spec.connections]);

  return (
    <div className={cn("my-4 rounded-2xl overflow-hidden border border-border/30 bg-muted/10", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{spec.title}</h3>
          <p className="text-xs text-muted-foreground/60 mt-0.5">{spec.description}</p>
        </div>
        <button
          onClick={() => setIsSpinning(p => !p)}
          className="text-[10px] font-bold text-primary/70 hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-muted/40"
        >
          {isSpinning ? "Stop" : "Spin"}
        </button>
      </div>

      {/* Scene */}
      <div className="p-4">
        <svg
          viewBox={`0 0 ${viewBox.w} ${viewBox.h}`}
          className={cn("w-full h-auto", isSpinning ? "animate-[spin_20s_linear_infinite]" : "")}
          style={{ transformOrigin: "center" }}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border)/0.15)" strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect width={viewBox.w} height={viewBox.h} fill="url(#grid)" />

          {/* Connections */}
          {svgContent.conns}

          {/* Objects */}
          {svgContent.objects}
        </svg>

        {/* Analogy hint */}
        {spec.analogyHint && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[11px] text-muted-foreground italic">
              <span className="font-semibold text-primary not-italic">💡 </span>
              {spec.analogyHint}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
