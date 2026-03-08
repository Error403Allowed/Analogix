"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, Loader2, Sparkles, RotateCcw, Camera, CameraOff, Info, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SceneObject {
  id: string;
  shape: "sphere" | "torus" | "box" | "cylinder" | "cone" | "helix" | "ring" | "pyramid";
  label: string;
  color: string;
  size: number;
  position: { x: number; y: number; z: number };
  orbitRadius: number | null;
  orbitSpeed: number | null;
  pulsates: boolean;
}

interface SceneConnection {
  from: string;
  to: string;
  color: string;
}

interface ARScene {
  title: string;
  description: string;
  sceneType: string;
  primaryColor: string;
  secondaryColor: string;
  objects: SceneObject[];
  connections: SceneConnection[];
  analogyHint: string;
}

// ─── Canvas 3D Renderer ───────────────────────────────────────────────────────
// Think of this like a puppet show: we draw each "puppet" (object)
// onto the canvas in the right spot, spinning them around over time.

function use3DScene(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  scene: ARScene | null,
  isAR: boolean,
) {
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    // Scale up so objects spread across ~70% of the canvas
    const scale = Math.min(W, H) * 0.16;

    // Simple isometric-ish 3D → 2D projection
    const project = (x: number, y: number, z: number) => ({
      px: cx + (x - z * 0.4) * scale,
      py: cy + (y - z * 0.25) * scale,
      depth: z,
    });

    const hexToRgba = (hex: string, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };

    const drawShape = (
      ctx: CanvasRenderingContext2D,
      shape: SceneObject["shape"],
      px: number,
      py: number,
      radius: number,
      color: string,
      pulseFactor: number,
    ) => {
      const r = radius * pulseFactor;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.strokeStyle = hexToRgba(color, 0.4);
      ctx.lineWidth = 2;

      switch (shape) {
        case "sphere":
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
          // Specular highlight
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.beginPath();
          ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.3, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "torus":
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            const tx = px + Math.cos(a) * r;
            const ty = py + Math.sin(a) * r * 0.5;
            ctx.beginPath();
            ctx.arc(tx, ty, r * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
          }
          break;
        case "box":
          ctx.fillRect(px - r, py - r, r * 2, r * 2);
          ctx.strokeRect(px - r, py - r, r * 2, r * 2);
          break;
        case "cylinder":
          ctx.beginPath();
          ctx.ellipse(px, py - r * 0.6, r, r * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(px - r, py - r * 0.6, r * 2, r * 1.2);
          ctx.beginPath();
          ctx.ellipse(px, py + r * 0.6, r, r * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "cone":
          ctx.beginPath();
          ctx.moveTo(px, py - r);
          ctx.lineTo(px + r, py + r * 0.7);
          ctx.lineTo(px - r, py + r * 0.7);
          ctx.closePath();
          ctx.fill();
          break;
        case "pyramid":
          ctx.beginPath();
          ctx.moveTo(px, py - r);
          ctx.lineTo(px + r * 0.9, py + r * 0.6);
          ctx.lineTo(px, py + r * 0.3);
          ctx.lineTo(px - r * 0.9, py + r * 0.6);
          ctx.closePath();
          ctx.fill();
          break;
        case "ring":
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = r * 0.25;
          ctx.stroke();
          break;
        case "helix":
          for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 4;
            const hx = px + Math.cos(a) * r * 0.5;
            const hy = py + (i / 20) * r * 2 - r;
            ctx.beginPath();
            ctx.arc(hx, hy, r * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = i % 2 === 0 ? color : hexToRgba(color, 0.6);
            ctx.fill();
          }
          break;
      }
      ctx.shadowBlur = 0;
    };

    const draw = (timestamp: number) => {
      timeRef.current = timestamp / 1000;
      const t = timeRef.current;

      ctx.clearRect(0, 0, W, H);

      // AR background: transparent if in AR, subtle grid if preview
      if (!isAR) {
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.clearRect(0, 0, W, H);
      }

      // Compute animated positions
      const computed = scene.objects.map((obj) => {
        let x = obj.position.x;
        let y = obj.position.y;
        let z = obj.position.z;

        if (obj.orbitRadius && obj.orbitSpeed) {
          const angle = t * obj.orbitSpeed;
          x += Math.cos(angle) * obj.orbitRadius;
          z += Math.sin(angle) * obj.orbitRadius;
        }

        const pulseFactor = obj.pulsates
          ? 1 + Math.sin(t * 2.5) * 0.12
          : 1;

        return { ...obj, x, y, z, pulseFactor };
      });

      // Sort by depth (painter's algorithm — draw far objects first)
      computed.sort((a, b) => a.z - b.z);

      // Draw connections first (behind objects)
      for (const conn of scene.connections) {
        const from = computed.find((o) => o.id === conn.from);
        const to = computed.find((o) => o.id === conn.to);
        if (!from || !to) continue;
        const p1 = project(from.x, from.y, from.z);
        const p2 = project(to.x, to.y, to.z);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.strokeStyle = conn.color + "88";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw objects
      for (const obj of computed) {
        const { px, py } = project(obj.x, obj.y, obj.z);
        const radius = obj.size * scale * 0.22;
        drawShape(ctx, obj.shape, px, py, radius, obj.color, obj.pulseFactor);

        // Label — pill background so text never overlaps sphere
        const labelY = py + radius + 18;
        const fontSize = 11;
        ctx.font = `bold ${fontSize}px system-ui`;
        const tw = ctx.measureText(obj.label).width;
        // Pill bg
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(px - tw / 2 - 5, labelY - fontSize, tw + 10, fontSize + 6, 4);
        ctx.fill();
        // Label text
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.textAlign = "center";
        ctx.fillText(obj.label, px, labelY);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [scene, isAR, canvasRef]);
}

// ─── AR Camera Overlay ────────────────────────────────────────────────────────

function useCameraStream(videoRef: React.RefObject<HTMLVideoElement | null>, active: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setSupported(false);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setSupported(false));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [active, videoRef]);

  return { supported };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ARVisualiser() {
  const [concept, setConcept] = useState("");
  const [scene, setScene] = useState<ARScene | null>(null);
  const [loading, setLoading] = useState(false);
  const [arMode, setArMode] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { supported: cameraSupported } = useCameraStream(videoRef, arMode);

  use3DScene(canvasRef, scene, arMode);

  const generate = useCallback(async () => {
    const trimmed = concept.trim();
    if (!trimmed) { toast.error("Enter a concept first!"); return; }
    setLoading(true);
    setScene(null);
    setArMode(false);
    try {
      const prefs = (() => { try { return JSON.parse(localStorage.getItem("userPreferences") || "{}"); } catch { return {}; } })();
      const res = await fetch("/api/groq/ar-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: trimmed, subject: prefs.subjects?.[0], grade: prefs.grade }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScene(data.scene);
      toast.success("Scene generated! Tap AR Mode to view through your camera.");
    } catch (e) {
      toast.error("Couldn't generate scene. Try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [concept]);

  const EXAMPLES = [
    "Photosynthesis", "Atom structure", "DNA double helix",
    "Water molecule", "Solar system", "Cell mitosis",
    "Sound waves", "Pythagorean theorem", "Supply and demand",
    "Food web", "The water cycle", "Roman Empire trade routes",
    "Newton's laws", "Federalism", "Electromagnetic spectrum",
    "Narrative structure", "Compound interest", "The carbon cycle",
  ];

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <Scan className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black gradient-text tracking-tight">AR Concept Visualiser</h1>
          <p className="text-xs text-muted-foreground font-semibold">See your concepts in 3D — point your camera and explore</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">

        {/* ── Search bar ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-black text-foreground">What concept do you want to visualise?</p>
          <div className="flex gap-2">
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="e.g. Photosynthesis, Atom, DNA..."
              className="flex-1 rounded-xl bg-white/5 border-white/10 font-semibold"
              disabled={loading}
            />
            <Button onClick={generate} disabled={loading || !concept.trim()}
              className="rounded-xl gradient-primary text-white font-black px-5 shadow-lg shadow-primary/25 shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
          {/* Example chips */}
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setConcept(ex)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Canvas area ── */}
        <AnimatePresence>
          {scene && (
            <motion.div
              key="canvas-area"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-2xl overflow-hidden relative"
            >
              {/* AR camera feed behind canvas */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                  arMode ? "opacity-100" : "opacity-0"
                )}
              />

              {/* 3D canvas overlay */}
              <canvas
                ref={canvasRef}
                width={700}
                height={460}
                className="relative z-10 w-full"
                style={{
                  background: arMode
                    ? "transparent"
                    : "radial-gradient(ellipse at 50% 45%, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.04) 50%, transparent 80%)",
                  borderRadius: "0 0 1rem 1rem",
                }}
              />

              {/* Scene title overlay */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <div className="px-3 py-1 rounded-full glass-card border border-white/15 backdrop-blur-md">
                  <span className="text-xs font-black text-foreground">{scene.title}</span>
                </div>
                <button onClick={() => setShowInfo(v => !v)}
                  className="w-7 h-7 rounded-full glass-card border border-white/15 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* AR toggle */}
              <div className="absolute top-3 right-3 z-20 flex gap-2">
                <button onClick={() => { if (!cameraSupported) { toast.error("Camera not available on this device."); return; } setArMode(v => !v); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border transition-all",
                    arMode
                      ? "bg-primary/80 border-primary text-white shadow-lg shadow-primary/30"
                      : "glass-card border-white/15 text-muted-foreground hover:text-foreground"
                  )}>
                  {arMode ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                  {arMode ? "Exit AR" : "AR Mode"}
                </button>
                <button onClick={() => { setScene(null); setArMode(false); setConcept(""); }}
                  className="w-7 h-7 rounded-full glass-card border border-white/15 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Info panel */}
              <AnimatePresence>
                {showInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-0 left-0 right-0 z-20 p-4 glass-card border-t border-white/10 backdrop-blur-xl"
                  >
                    <button onClick={() => setShowInfo(false)} className="absolute top-3 right-3">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <p className="text-sm font-bold text-foreground mb-1">{scene.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{scene.description}</p>
                    <div className="flex items-start gap-2 bg-primary/10 rounded-xl p-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-primary font-semibold">{scene.analogyHint}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {!scene && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="w-20 h-20 rounded-3xl gradient-primary/20 border border-primary/20 flex items-center justify-center">
              <Scan className="w-10 h-10 text-primary/60" />
            </div>
            <div>
              <p className="font-black text-foreground text-lg">No scene yet</p>
              <p className="text-sm text-muted-foreground max-w-xs mt-1">
                Type a concept above and hit generate — then point your camera at a flat surface to see it come alive.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Loading state ── */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-bold text-muted-foreground">Building your 3D scene...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
