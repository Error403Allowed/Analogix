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
    const size = Math.random() * 8 + 4;
    
    setParticles((prev) => [...prev.slice(-15), { id, x, y, color, size }]);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Add particle every few pixels or on every move with throttling
      if (Math.random() > 0.7) {
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
              opacity: 0.8, 
              scale: 0.5, 
              x: particle.x, 
              y: particle.y 
            }}
            animate={{ 
              opacity: 0, 
              scale: 0,
              x: particle.x + (Math.random() - 0.5) * 100,
              y: particle.y + (Math.random() - 0.5) * 100,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: "50%",
              filter: "blur(1px)",
              boxShadow: `0 0 10px ${particle.color}`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CursorParticles;
