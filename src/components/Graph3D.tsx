"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { RefreshCw, ZoomIn, ZoomOut, RotateCcw, Check, X, Settings2, Plus, Sliders } from "lucide-react";
import * as THREE from "three";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Slider3D {
  name: string; min: number; max: number; step: number; value: number;
}

export interface ParsedGraph3D {
  type: "surface" | "parametric" | "shape";
  fn?: string;
  xFn?: string; yFn?: string; zFn?: string;
  shape?: string;
  sliders: Slider3D[];
  title?: string;
  color?: string;
  bounds?: { xMin: number; xMax: number; yMin: number; yMax: number };
  tRange?: { min: number; max: number };
}

const SHAPES = ["sphere","cube","cone","torus","cylinder","dodecahedron","icosahedron","octahedron","tetrahedron"];

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseGraph3DBlock(raw: string): ParsedGraph3D {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const result: ParsedGraph3D = { type: "surface", sliders: [] };
  for (const line of lines) {
    const m = (p: RegExp) => line.match(p);
    const titleM = m(/^title:\s*(.+)$/i); if (titleM) { result.title = titleM[1].trim(); continue; }
    const typeM = m(/^type:\s*(surface|parametric|shape)$/i); if (typeM) { result.type = typeM[1].toLowerCase() as ParsedGraph3D["type"]; continue; }
    const colorM = m(/^color:\s*(.+)$/i); if (colorM) { result.color = colorM[1].trim(); continue; }
    const fnM = m(/^fn:\s*(.+)$/i); if (fnM) { result.fn = fnM[1].trim(); continue; }
    const shapeM = m(/^shape:\s*(sphere|cube|box|cone|torus|cylinder|dodecahedron|icosahedron|octahedron|tetrahedron)$/i);
    if (shapeM) { result.type = "shape"; result.shape = shapeM[1].toLowerCase(); continue; }
    const xFnM = m(/^xfn:\s*(.+)$/i); if (xFnM) { result.xFn = xFnM[1].trim(); result.type = "parametric"; continue; }
    const yFnM = m(/^yfn:\s*(.+)$/i); if (yFnM) { result.yFn = yFnM[1].trim(); continue; }
    const zFnM = m(/^zfn:\s*(.+)$/i); if (zFnM) { result.zFn = zFnM[1].trim(); continue; }
    const sliderM = line.match(/^slider:\s*([a-zA-Z_]\w*)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)/i);
    if (sliderM) { result.sliders.push({ name: sliderM[1], min: parseFloat(sliderM[2]), max: parseFloat(sliderM[3]), step: parseFloat(sliderM[4]), value: parseFloat(sliderM[5]) }); continue; }
    const boundsM = line.match(/^bounds?:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)/i);
    if (boundsM) { result.bounds = { xMin: parseFloat(boundsM[1]), xMax: parseFloat(boundsM[2]), yMin: parseFloat(boundsM[3]), yMax: parseFloat(boundsM[4]) }; continue; }
    const tRangeM = line.match(/^trange:\s*([-\d.]+)\s*,\s*([-\d.]+)/i);
    if (tRangeM) { result.tRange = { min: parseFloat(tRangeM[1]), max: parseFloat(tRangeM[2]) }; continue; }
  }
  return result;
}

// ─── Math evaluators ─────────────────────────────────────────────────────────

function build3DFn(expr: string, sv: Record<string, number>): ((x: number, y: number) => number) | null {
  if (!expr) return null;
  try {
    let js = expr.replace(/\^/g,"**").replace(/(\d)([xyz])/g,"$1*$2").replace(/([xyz])(\d)/g,"$1*$2")
      .replace(/\bsin\b/g,"Math.sin").replace(/\bcos\b/g,"Math.cos").replace(/\btan\b/g,"Math.tan")
      .replace(/\bsqrt\b/g,"Math.sqrt").replace(/\babs\b/g,"Math.abs").replace(/\bln\b/g,"Math.log")
      .replace(/\blog\b/g,"Math.log10").replace(/\bexp\b/g,"Math.exp")
      .replace(/\bpi\b/gi,"Math.PI").replace(/\be\b/g,"Math.E")
      .replace(/\bfloor\b/g,"Math.floor").replace(/\bceil\b/g,"Math.ceil");
    const keys = Object.keys(sv), vals = keys.map(k => sv[k]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys,"x","y",`"use strict";try{return ${js};}catch(e){return 0;}`);
    return (x,y) => { const r = fn(...vals,x,y) as number; return isFinite(r)?r:0; };
  } catch { return null; }
}

function buildParamFn(expr: string, sv: Record<string, number>): ((t: number) => number) | null {
  if (!expr) return null;
  try {
    let js = expr.replace(/\^/g,"**")
      .replace(/\bsin\b/g,"Math.sin").replace(/\bcos\b/g,"Math.cos").replace(/\btan\b/g,"Math.tan")
      .replace(/\bsqrt\b/g,"Math.sqrt").replace(/\babs\b/g,"Math.abs")
      .replace(/\bpi\b/gi,"Math.PI").replace(/\be\b/g,"Math.E");
    const keys = Object.keys(sv), vals = keys.map(k => sv[k]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys,"t",`"use strict";try{return ${js};}catch(e){return 0;}`);
    return t => fn(...vals,t) as number;
  } catch { return null; }
}

function heightColor(z: number, zMin: number, zMax: number): THREE.Color {
  const t = zMax===zMin ? 0.5 : Math.max(0,Math.min(1,(z-zMin)/(zMax-zMin)));
  return new THREE.Color().setHSL(0.66-t*0.66,0.85,0.5);
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toPrecision(3)).toString();
}

// ─── InlineNumber ─────────────────────────────────────────────────────────────

function InlineNumber({ value, onChange, className="" }: { value: number; onChange: (v: number) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const commit = () => { const n = parseFloat(draft); if (!isNaN(n)) onChange(n); setEditing(false); };
  if (editing) return (
    <input value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEditing(false);}}
      className={`bg-white/5 border border-white/20 rounded px-1 outline-none text-center ${className}`}
      style={{width:`${Math.max(draft.length+1,4)}ch`}} autoFocus />
  );
  return (
    <button onClick={()=>{setDraft(String(value));setEditing(true);}}
      className={`hover:bg-white/10 rounded px-1 transition-colors cursor-text ${className}`} title="Click to edit">
      {fmt(value)}
    </button>
  );
}

// ─── Slider row ───────────────────────────────────────────────────────────────

function Slider3DRow({ slider, onValue, onRange, onDelete }: {
  slider: Slider3D;
  onValue: (v: number) => void;
  onRange: (f: "min"|"max"|"step", v: number) => void;
  onDelete: () => void;
}) {
  const [showStep, setShowStep] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground/70 w-5 shrink-0">{slider.name}</span>
        <InlineNumber value={slider.min} onChange={v=>onRange("min",v)} className="font-mono text-[10px] text-muted-foreground/50 w-8 text-center" />
        <input type="range" min={slider.min} max={slider.max} step={slider.step} value={slider.value}
          onChange={e=>onValue(parseFloat(e.target.value))} className="flex-1 h-1.5 accent-purple-400 cursor-pointer" />
        <InlineNumber value={slider.max} onChange={v=>onRange("max",v)} className="font-mono text-[10px] text-muted-foreground/50 w-8 text-center" />
        <InlineNumber value={slider.value} onChange={onValue} className="font-mono text-[11px] text-purple-400 w-12 text-right" />
        <button onClick={()=>setShowStep(v=>!v)} className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors" title="Edit step">
          <Settings2 className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="text-muted-foreground/20 hover:text-red-400 transition-colors" title="Remove"><X className="w-3 h-3" /></button>
      </div>
      {showStep && (
        <div className="flex items-center gap-3 pl-7 text-[10px] text-muted-foreground/50">
          <span>step:</span>
          <InlineNumber value={slider.step} onChange={v=>onRange("step",Math.max(0.0001,v))} className="font-mono text-[10px] w-14" />
        </div>
      )}
    </div>
  );
}

// ─── Inline editable function field ──────────────────────────────────────────

function EditableFn({ label, value, onChange, color="#a78bfa" }: { label: string; value: string; onChange: (v: string) => void; color?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { onChange(draft); setEditing(false); };
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] text-muted-foreground/50 shrink-0 font-mono w-8">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEditing(false);}}
            className="flex-1 min-w-0 bg-white/5 border border-purple-400/40 rounded-lg px-2 py-0.5 text-xs font-mono outline-none"
            style={{color}} autoFocus />
          <button onClick={commit} className="text-emerald-400 hover:text-emerald-300 shrink-0"><Check className="w-3 h-3" /></button>
          <button onClick={()=>setEditing(false)} className="text-red-400 hover:text-red-300 shrink-0"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <button onClick={()=>{setDraft(value);setEditing(true);}}
          className="font-mono text-xs truncate hover:opacity-70 transition-opacity text-left"
          style={{color}} title="Click to edit">
          {value || <span className="opacity-30 italic">click to set</span>}
        </button>
      )}
    </div>
  );
}

// ─── Main Graph3D component ───────────────────────────────────────────────────

interface Graph3DProps { rawBlock: string; height?: number; }

function Graph3D({ rawBlock, height = 380 }: Graph3DProps) {
  const parsed = useMemo(() => parseGraph3DBlock(rawBlock), [rawBlock]);

  // All editable state lives here
  const [type, setType] = useState<ParsedGraph3D["type"]>(parsed.type);
  const [fn, setFn] = useState(parsed.fn || "sin(sqrt(x^2+y^2))");
  const [xFn, setXFn] = useState(parsed.xFn || "cos(t)");
  const [yFn, setYFn] = useState(parsed.yFn || "sin(t)");
  const [zFn, setZFn] = useState(parsed.zFn || "t/(2*pi)");
  const [shape, setShape] = useState(parsed.shape || "sphere");
  const [color, setColor] = useState(parsed.color || "#6366f1");
  const [sliders, setSliders] = useState<Slider3D[]>(parsed.sliders);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [showSliders, setShowSliders] = useState(sliders.length > 0);
  const [addingSlider, setAddingSlider] = useState(false);
  const [newSliderName, setNewSliderName] = useState("");

  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | THREE.Line | null>(null);
  const dragRef = useRef<{ x: number; y: number; theta: number; phi: number } | null>(null);
  const rotRef = useRef({ theta: 0.6, phi: 0.4 });
  const distRef = useRef(5);
  const autoRotateRef = useRef(autoRotate);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  const sliderValues = useMemo(() => Object.fromEntries(sliders.map(s=>[s.name,s.value])), [sliders]);

  const buildMesh = useCallback((scene: THREE.Scene) => {
    if (meshRef.current) { scene.remove(meshRef.current); meshRef.current = null; }

    if (type === "shape") {
      let geo: THREE.BufferGeometry;
      if (shape==="sphere") geo=new THREE.SphereGeometry(1.5,48,48);
      else if (shape==="cube"||shape==="box") geo=new THREE.BoxGeometry(2,2,2);
      else if (shape==="cone") geo=new THREE.ConeGeometry(1.2,2.4,48);
      else if (shape==="torus") geo=new THREE.TorusGeometry(1.4,0.5,32,96);
      else if (shape==="cylinder") geo=new THREE.CylinderGeometry(1,1,2.5,48);
      else if (shape==="dodecahedron") geo=new THREE.DodecahedronGeometry(1.6);
      else if (shape==="icosahedron") geo=new THREE.IcosahedronGeometry(1.6);
      else if (shape==="octahedron") geo=new THREE.OctahedronGeometry(1.6);
      else if (shape==="tetrahedron") geo=new THREE.TetrahedronGeometry(1.8);
      else geo=new THREE.SphereGeometry(1.5,48,48);
      const mat = new THREE.MeshPhongMaterial({color,shininess:80,specular:"#ffffff",side:THREE.DoubleSide,transparent:true,opacity:0.92});
      const mesh = new THREE.Mesh(geo,mat);
      scene.add(mesh); meshRef.current=mesh; return;
    }

    if (type==="parametric") {
      const xF=buildParamFn(xFn,sliderValues), yF=buildParamFn(yFn,sliderValues), zF=buildParamFn(zFn,sliderValues);
      if (!xF||!yF||!zF) return;
      const tMin=parsed.tRange?.min??0, tMax=parsed.tRange?.max??(2*Math.PI);
      const pts: THREE.Vector3[]=[];
      for (let i=0;i<=400;i++) { const t=tMin+(i/400)*(tMax-tMin); pts.push(new THREE.Vector3(xF(t),yF(t),zF(t))); }
      const geo=new THREE.BufferGeometry().setFromPoints(pts);
      const mat=new THREE.LineBasicMaterial({color,linewidth:2});
      const line=new THREE.Line(geo,mat);
      scene.add(line); meshRef.current=line as unknown as THREE.Mesh; return;
    }

    // Surface
    const evalFn = build3DFn(fn, sliderValues);
    if (!evalFn) return;
    const b = parsed.bounds;
    const xMin=b?.xMin??-3, xMax=b?.xMax??3, yMin=b?.yMin??-3, yMax=b?.yMax??3;
    const N=60;
    const positions: number[]=[], colors: number[]=[], indices: number[]=[];
    let zMin=Infinity, zMax=-Infinity;
    const zGrid: number[]=[];
    for (let iy=0;iy<=N;iy++) for (let ix=0;ix<=N;ix++) {
      const x=xMin+(ix/N)*(xMax-xMin), y=yMin+(iy/N)*(yMax-yMin);
      const z=evalFn(x,y); zGrid.push(z);
      if(z<zMin)zMin=z; if(z>zMax)zMax=z;
    }
    for (let iy=0;iy<=N;iy++) for (let ix=0;ix<=N;ix++) {
      const x=xMin+(ix/N)*(xMax-xMin), y=yMin+(iy/N)*(yMax-yMin);
      const z=zGrid[iy*(N+1)+ix];
      positions.push(x,z*0.5,y);
      const c=heightColor(z,zMin,zMax); colors.push(c.r,c.g,c.b);
    }
    for (let iy=0;iy<N;iy++) for (let ix=0;ix<N;ix++) {
      const a=iy*(N+1)+ix,b2=a+1,c=a+(N+1),d=c+1;
      indices.push(a,b2,c,b2,d,c);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
    geo.setIndex(indices); geo.computeVertexNormals();
    const mat=new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:60,transparent:true,opacity:0.93});
    const mesh=new THREE.Mesh(geo,mat);
    scene.add(mesh); meshRef.current=mesh;
  }, [type, fn, xFn, yFn, zFn, shape, color, sliderValues, parsed]);

  // Init Three.js once
  useEffect(() => {
    const mount=mountRef.current; if(!mount) return;
    const w=mount.clientWidth||600, h=height;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setSize(w,h); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0x000000,0); mount.appendChild(renderer.domElement);
    rendererRef.current=renderer;
    const scene=new THREE.Scene(); sceneRef.current=scene;
    scene.add(new THREE.AmbientLight(0xffffff,0.6));
    const dir=new THREE.DirectionalLight(0xffffff,1.0); dir.position.set(5,8,5); scene.add(dir);
    const dir2=new THREE.DirectionalLight(0x8888ff,0.3); dir2.position.set(-5,-3,-5); scene.add(dir2);
    const camera=new THREE.PerspectiveCamera(50,w/h,0.01,1000); cameraRef.current=camera;
    scene.add(new THREE.AxesHelper(2.5));
    const grid=new THREE.GridHelper(6,12,0x444444,0x222222); grid.position.y=-2; scene.add(grid);
    buildMesh(scene);
    const updateCamera=()=>{
      const {theta,phi}=rotRef.current, d=distRef.current;
      camera.position.set(d*Math.sin(phi)*Math.sin(theta),d*Math.cos(phi),d*Math.sin(phi)*Math.cos(theta));
      camera.lookAt(0,0,0);
    };
    updateCamera();
    let raf=0;
    const animate=()=>{ raf=requestAnimationFrame(animate); if(autoRotateRef.current&&!dragRef.current){rotRef.current.theta+=0.005;updateCamera();} renderer.render(scene,camera); };
    animate();
    const onResize=()=>{ const rw=mount.clientWidth; renderer.setSize(rw,h); camera.aspect=rw/h; camera.updateProjectionMatrix(); };
    window.addEventListener("resize",onResize);
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",onResize); renderer.dispose(); mount.removeChild(renderer.domElement); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  useEffect(() => { if(sceneRef.current) buildMesh(sceneRef.current); }, [buildMesh]);

  const onMouseDown=useCallback((e:React.MouseEvent)=>{ dragRef.current={x:e.clientX,y:e.clientY,theta:rotRef.current.theta,phi:rotRef.current.phi}; },[]);
  const onMouseMove=useCallback((e:React.MouseEvent)=>{
    if(!dragRef.current||!cameraRef.current) return;
    const dx=(e.clientX-dragRef.current.x)*0.006, dy=(e.clientY-dragRef.current.y)*0.006;
    rotRef.current.theta=dragRef.current.theta-dx;
    rotRef.current.phi=Math.max(0.1,Math.min(Math.PI-0.1,dragRef.current.phi+dy));
    const {theta,phi}=rotRef.current, d=distRef.current;
    cameraRef.current.position.set(d*Math.sin(phi)*Math.sin(theta),d*Math.cos(phi),d*Math.sin(phi)*Math.cos(theta));
    cameraRef.current.lookAt(0,0,0);
  },[]);
  const onMouseUp=useCallback(()=>{ dragRef.current=null; },[]);
  const onWheel=useCallback((e:React.WheelEvent)=>{
    e.preventDefault();
    distRef.current=Math.max(1.5,Math.min(20,distRef.current+e.deltaY*0.01));
    if(!cameraRef.current) return;
    const {theta,phi}=rotRef.current, d=distRef.current;
    cameraRef.current.position.set(d*Math.sin(phi)*Math.sin(theta),d*Math.cos(phi),d*Math.sin(phi)*Math.cos(theta));
    cameraRef.current.lookAt(0,0,0);
  },[]);

  const resetView=useCallback(()=>{
    rotRef.current={theta:0.6,phi:0.4}; distRef.current=5;
    if(cameraRef.current){const{theta,phi}=rotRef.current,d=distRef.current;cameraRef.current.position.set(d*Math.sin(phi)*Math.sin(theta),d*Math.cos(phi),d*Math.sin(phi)*Math.cos(theta));cameraRef.current.lookAt(0,0,0);}
    setSliders(parsed.sliders); setFn(parsed.fn||"sin(sqrt(x^2+y^2))");
    setShape(parsed.shape||"sphere"); setColor(parsed.color||"#6366f1");
    setType(parsed.type);
  },[parsed]);

  const addSlider=()=>{
    const name=newSliderName.trim()||`p${sliders.length+1}`;
    if(sliders.find(s=>s.name===name)) return;
    setSliders(prev=>[...prev,{name,min:-5,max:5,step:0.1,value:1}]);
    setNewSliderName(""); setAddingSlider(false); setShowSliders(true);
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a14]/90 backdrop-blur shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400/70" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            {parsed.title || "3D Graph"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={()=>{distRef.current=Math.max(1.5,distRef.current*0.8);}} className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"><ZoomIn className="w-3 h-3" /></button>
          <button onClick={()=>{distRef.current=Math.min(20,distRef.current*1.25);}} className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"><ZoomOut className="w-3 h-3" /></button>
          <button onClick={()=>setAutoRotate(r=>!r)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${autoRotate?"text-purple-400":"text-muted-foreground/40 hover:text-muted-foreground"}`} title={autoRotate?"Stop rotation":"Auto-rotate"}><RotateCcw className="w-3 h-3" /></button>
          <button onClick={()=>setShowPanel(v=>!v)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${showPanel?"text-purple-400":"text-muted-foreground/40 hover:text-muted-foreground"}`} title="Edit parameters"><Settings2 className="w-3 h-3" /></button>
          <button onClick={()=>setShowSliders(v=>!v)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${showSliders?"text-purple-400":"text-muted-foreground/40 hover:text-muted-foreground"}`} title="Sliders"><Sliders className="w-3 h-3" /></button>
          <button onClick={resetView} className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"><RefreshCw className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Edit panel */}
      {showPanel && (
        <div className="px-3 py-2.5 border-b border-white/8 bg-white/2 flex flex-col gap-2">
          {/* Type switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 w-8">Type</span>
            <div className="flex gap-1">
              {(["surface","parametric","shape"] as const).map(t=>(
                <button key={t} onClick={()=>setType(t)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${type===t?"bg-purple-500/20 text-purple-300":"text-muted-foreground/40 hover:text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Surface fn */}
          {type==="surface" && (
            <EditableFn label="z =" value={fn} onChange={setFn} />
          )}

          {/* Parametric fns */}
          {type==="parametric" && (
            <>
              <EditableFn label="x(t)" value={xFn} onChange={setXFn} />
              <EditableFn label="y(t)" value={yFn} onChange={setYFn} />
              <EditableFn label="z(t)" value={zFn} onChange={setZFn} />
            </>
          )}

          {/* Shape picker */}
          {type==="shape" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 w-8">Shape</span>
              <div className="flex flex-wrap gap-1">
                {SHAPES.map(s=>(
                  <button key={s} onClick={()=>setShape(s)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize transition-colors ${shape===s?"bg-purple-500/20 text-purple-300":"text-muted-foreground/40 hover:text-muted-foreground"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 w-8">Color</span>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)}
              className="w-6 h-6 rounded-lg cursor-pointer border border-white/10 bg-transparent"
              style={{padding:0}} />
            <span className="font-mono text-[10px] text-muted-foreground/50">{color}</span>
          </div>
        </div>
      )}

      {/* Three.js mount */}
      <div ref={mountRef} style={{height,cursor:"grab"}} className="w-full select-none"
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel} />

      {/* Sliders panel */}
      {showSliders && (
        <div className="px-3 pb-3 pt-2 border-t border-white/8 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Parameters</span>
            <button onClick={()=>setAddingSlider(v=>!v)} className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-purple-400 transition-colors">
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          {addingSlider && (
            <div className="flex items-center gap-2 pb-1">
              <input value={newSliderName} onChange={e=>setNewSliderName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")addSlider();if(e.key==="Escape")setAddingSlider(false);}}
                placeholder="name (e.g. a)" autoFocus
                className="flex-1 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:border-purple-400/50" />
              <button onClick={addSlider} className="text-emerald-400 hover:text-emerald-300 p-1"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={()=>setAddingSlider(false)} className="text-muted-foreground/40 p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {sliders.length===0&&!addingSlider&&(
            <p className="text-[10px] text-muted-foreground/30 italic">No parameters yet — click "New" to add one.</p>
          )}
          {sliders.map(s=>(
            <Slider3DRow key={s.name} slider={s}
              onValue={v=>setSliders(prev=>prev.map(sl=>sl.name===s.name?{...sl,value:v}:sl))}
              onRange={(f,v)=>setSliders(prev=>prev.map(sl=>sl.name===s.name?{...sl,[f]:v}:sl))}
              onDelete={()=>setSliders(prev=>prev.filter(sl=>sl.name!==s.name))} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/30 px-3 pb-2 text-center">Drag to orbit · Scroll to zoom</p>
    </div>
  );
}

export default React.memo(Graph3D);
