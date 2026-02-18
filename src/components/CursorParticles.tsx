import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#3b82f6"];

const CursorParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const addParticle = useCallback((x: number, y: number) => {
    const id = Date.now();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size = Math.random() * 3 + 2;
    
    setParticles((prev) => [...prev.slice(-10), { id, x, y, color, size }]);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Add particle every few pixels or on every move with throttling
      if (Math.random() > 0.85) {
        addParticle(e.clientX, e.clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [addParticle]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              opacity: 0.4, 
              scale: 0.5, 
              x: particle.x, 
              y: particle.y 
            }}
            animate={{ 
              opacity: 0, 
              scale: 0,
              x: particle.x + (Math.random() - 0.5) * 40,
              y: particle.y + (Math.random() - 0.5) * 40,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: "50%",
              opacity: 0.3,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CursorParticles;
