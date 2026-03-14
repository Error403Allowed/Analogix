"use client";

import React, { useState } from "react";
import DesmosGraph from "./DesmosGraph";
import { Button } from "@/components/ui/button";

interface GraphingModuleProps {
  width?: number;
  height?: number;
}

export default function GraphingModule({
  width = 800,
  height = 500
}: GraphingModuleProps) {
  const [showControls, setShowControls] = useState(true);

  const expressionsString = `y = x^2
y = sin(x)
y = a*x + b
a = 1 \\{-3 < a < 3: 0.1\\}
b = 0 \\{-5 < b < 5: 0.1\\}`;

  return (
    <div className="space-y-4">
      <DesmosGraph
        expressions={expressionsString}
        height={height}
        showEditor={showControls}
      />
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowControls(!showControls)}
          className="flex items-center gap-1"
        >
          Controls
        </Button>
      </div>
    </div>
  );
}
