"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Loader2, RefreshCw, RotateCcw, Download, Sliders, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as math from "mathjs";

interface GraphFunction3D {
  id: string;
  expression: string;
  color: string;
  enabled: boolean;
  label?: string;
  type: "surface" | "parametric" | "implicit";
}

interface SliderParam3D {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

interface Interactive3DGraphProps {
  initialFunctions?: GraphFunction3D[];
  initialSliders?: SliderParam3D[];
  width?: number;
  height?: number;
  showControls?: boolean;
  showSliders?: boolean;
}

export default function Interactive3DGraph({
  initialFunctions = [
    { 
      id: "1", 
      expression: "sin(sqrt(x^2 + y^2))", 
      color: "#6366f1", 
      enabled: true, 
      label: "z = sin(√(x² + y²))",
      type: "surface"
    }
  ],
  initialSliders = [],
  width = 600,
  height = 400,
  showControls = true,
  showSliders = true
}: Interactive3DGraphProps) {
  const { theme } = useTheme();
  const mountRef = useRef<HTMLDivElement>(null);
  const [functions, setFunctions] = useState<GraphFunction3D[]>(initialFunctions);
  const [sliders, setSliders] = useState<SliderParam3D[]>(initialSliders);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [activeTab, setActiveTab] = useState("graph");
  const [loading, setLoading] = useState(true);

  // Parse slider values for function evaluation
  const sliderValues = useMemo(() => {
    return sliders.reduce((acc, slider) => {
      acc[slider.name] = slider.value;
      return acc;
    }, {} as Record<string, number>);
  }, [sliders]);

  // Safe function evaluation for 3D
  const evaluateFunction3D = (expr: string, x: number, y: number): number => {
    try {
      let safeExpr = expr
        .replace(/\^/g, "**")
        .replace(/sin\(/g, "math.sin(")
        .replace(/cos\(/g, "math.cos(")
        .replace(/tan\(/g, "math.tan(")
        .replace(/sqrt\(/g, "math.sqrt(")
        .replace(/abs\(/g, "math.abs(")
        .replace(/log\(/g, "math.log(")
        .replace(/ln\(/g, "math.log(")
        .replace(/exp\(/g, "math.exp(")
        .replace(/pi/gi, "math.pi")
        .replace(/e/gi, "math.e");

      // Replace slider variables
      for (const [name, value] of Object.entries(sliderValues)) {
        safeExpr = safeExpr.replace(new RegExp(`\b${name}\b`, 'g'), value.toString());
      }

      const scope = { x, y, ...math, ...sliderValues };
      const result = math.evaluate(safeExpr, scope);

      if (typeof result === 'number' && isFinite(result)) {
        return result;
      }
      return 0; // Return 0 for invalid points to avoid holes
    } catch (err) {
      console.warn(`Error evaluating 3D function ${expr}:`, err);
      return 0;
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Clean up previous scene
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Theme-based colors
    const isDark = theme === 'dark';
    const bgColor = isDark ? 0x0f1117 : 0xffffff;
    const gridColor = isDark ? 0x333333 : 0xcccccc;
    const axisColor = isDark ? 0x555555 : 0x888888;

    renderer.setClearColor(bgColor, 1);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    directionalLight2.position.set(-5, -3, -5);
    scene.add(directionalLight2);

    // Grid helper
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(10, 20, gridColor, gridColor);
      scene.add(gridHelper);
    }

    // Axes helper
    if (showAxes) {
      const axesHelper = new THREE.AxesHelper(3);
      axesHelper.setColors(
        new THREE.Color(axisColor),
        new THREE.Color(axisColor),
        new THREE.Color(axisColor)
      );
      scene.add(axesHelper);
    }

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;

    // Create surface geometry
    const createSurface = (func: GraphFunction3D) => {
      if (!func.enabled || func.type !== "surface") return null;

      const size = 50;
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const colors: number[] = [];

      const color = new THREE.Color(func.color);

      for (let i = 0; i <= size; i++) {
        for (let j = 0; j <= size; j++) {
          const x = (i / size) * 4 - 2; // -2 to 2 range
          const y = (j / size) * 4 - 2;
          const z = evaluateFunction3D(func.expression, x, y);

          vertices.push(x, z, y);
          colors.push(color.r, color.g, color.b);
        }
      }

      const indices: number[] = [];
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const a = i * (size + 1) + j;
          const b = a + 1;
          const c = a + (size + 1);
          const d = c + 1;

          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }

      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
      );
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3)
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 50
      });

      return new THREE.Mesh(geometry, material);
    };

    // Add all surfaces to scene
    const meshes: THREE.Mesh[] = [];
    functions.forEach(func => {
      const mesh = createSurface(func);
      if (mesh) {
        scene.add(mesh);
        meshes.push(mesh);
      }
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup function
    return () => {
      controls.dispose();
      renderer.dispose();
      meshes.forEach(mesh => scene.remove(mesh));
      while (mountRef.current?.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
    };

    setLoading(false);

  }, [functions, sliders, autoRotate, showGrid, showAxes, theme]);

  const addFunction = () => {
    const colors = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
    const newColor = colors[functions.length % colors.length];
    setFunctions([...
      functions,
      {
        id: Date.now().toString(),
        expression: 'cos(x) * sin(y)',
        color: newColor,
        enabled: true,
        label: `Surface ${functions.length + 1}`,
        type: "surface"
      }
    ]);
  };

  const removeFunction = (id: string) => {
    setFunctions(functions.filter(f => f.id !== id));
  };

  const updateFunction = (id: string, field: keyof GraphFunction3D, value: any) => {
    setFunctions(functions.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const addSlider = () => {
    setSliders([...
      sliders,
      {
        id: Date.now().toString(),
        name: `p${sliders.length + 1}`,
        min: -5,
        max: 5,
        step: 0.1,
        value: 1
      }
    ]);
  };

  const removeSlider = (id: string) => {
    setSliders(sliders.filter(s => s.id !== id));
  };

  const updateSlider = (id: string, key: keyof SliderParam3D, value: string | number) => {
    setSliders(sliders.map(s => s.id === id ? { ...s, [key]: value } : s));
  };

  const resetView = () => {
    // This would require accessing the camera, which we can't do directly
    // In a full implementation, we'd need to expose the camera through refs
    window.location.reload(); // Temporary solution
  };

  const exportAsPNG = () => {
    if (!mountRef.current) return;
    const canvas = mountRef.current.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = '3d-graph.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-lg">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400/70"></div>
          <span className="text-sm font-medium text-foreground/80">
            Interactive 3D Graph
          </span>
        </div>
        
        {showControls && (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7 h-7" 
              onClick={resetView}
              title="Reset view"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7 h-7" 
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? "Stop rotation" : "Auto rotate"}
            >
              <RotateCcw className={`w-3 h-3 ${autoRotate ? 'text-purple-400' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7 h-7" 
              onClick={exportAsPNG}
              title="Export as PNG"
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* 3D canvas */}
        <div className="relative" style={{ width, height }}>
          <div ref={mountRef} className="w-full h-full" />
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/50">
              <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
              <span className="ml-2 text-sm text-muted-foreground">Loading 3D engine...</span>
            </div>
          )}
        </div>

        {/* Controls panel */}
        {showControls && (
          <div className="w-60 border-l border-border/40 bg-card/80 backdrop-blur p-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full h-8">
                <TabsTrigger value="graph" className="text-xs h-6">Graph</TabsTrigger>
                <TabsTrigger value="sliders" className="text-xs h-6">Sliders</TabsTrigger>
              </TabsList>

              <TabsContent value="graph" className="mt-2">
                <div className="space-y-3 max-h-[calc(400px-60px)] overflow-y-auto pr-2">
                  {functions.map(func => (
                    <div key={func.id} className="border border-border/40 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="color"
                          value={func.color}
                          onChange={(e) => updateFunction(func.id, 'color', e.target.value)}
                          className="w-4 h-4 rounded-full border-0 cursor-pointer"
                        />
                        <Input
                          value={func.expression}
                          onChange={(e) => updateFunction(func.id, 'expression', e.target.value)}
                          className="text-xs h-6"
                          placeholder="z = f(x, y)"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-5 h-5 text-red-500"
                          onClick={() => removeFunction(func.id)}
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground/60">
                        Type: {func.type}
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={addFunction}
                    size="sm"
                    className="w-full mt-2 text-xs"
                    variant="outline"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Surface
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="sliders" className="mt-2">
                <div className="space-y-3 max-h-[calc(400px-60px)] overflow-y-auto pr-2">
                  {sliders.map(slider => (
                    <div key={slider.id} className="border border-border/40 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          value={slider.name}
                          onChange={(e) => updateSlider(slider.id, 'name', e.target.value)}
                          className="text-xs h-6 w-16"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-5 h-5 text-red-500"
                          onClick={() => removeSlider(slider.id)}
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={slider.min}
                          onChange={(e) => updateSlider(slider.id, 'min', parseFloat(e.target.value))}
                          className="w-14 h-5 text-xs"
                          step="0.1"
                        />
                        <input
                          type="range"
                          min={slider.min}
                          max={slider.max}
                          step={slider.step}
                          value={slider.value}
                          onChange={(e) => updateSlider(slider.id, 'value', parseFloat(e.target.value))}
                          className="flex-1 h-1"
                        />
                        <Input
                          type="number"
                          value={slider.max}
                          onChange={(e) => updateSlider(slider.id, 'max', parseFloat(e.target.value))}
                          className="w-14 h-5 text-xs"
                          step="0.1"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground/60 mt-1">
                        Value: {slider.value.toFixed(2)}
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={addSlider}
                    size="sm"
                    className="w-full mt-2 text-xs"
                    variant="outline"
                  >
                    <Sliders className="w-3 h-3 mr-1" />
                    Add Slider
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Settings */}
            <div className="mt-3 border-t border-border/40 pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground/60">Grid</Label>
                <Switch
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground/60">Axes</Label>
                <Switch
                  checked={showAxes}
                  onCheckedChange={setShowAxes}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="px-3 py-2 border-t border-border/40 bg-card/80 text-xs text-muted-foreground/60">
        <div className="flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Drag to rotate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Scroll to zoom
          </span>
        </div>
      </div>
    </div>
  );
}