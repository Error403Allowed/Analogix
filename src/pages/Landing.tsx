import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Brain, Zap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  hue: number;
}

const Landing = () => {
  const navigate = useNavigate();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);

  // Handle mouse movement for particles
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Create new particles on movement
      if (Math.random() > 0.7) {
        const newParticle: Particle = {
          id: particleIdRef.current++,
          x: e.clientX,
          y: e.clientY,
          size: Math.random() * 8 + 4,
          opacity: Math.random() * 0.6 + 0.4,
          hue: Math.random() * 60 + 240, // Purple to blue range
        };
        setParticles((prev) => [...prev.slice(-30), newParticle]);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Fade out particles over time
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, opacity: p.opacity - 0.02 }))
          .filter((p) => p.opacity > 0)
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "Learn Through Analogies",
      description: "Complex concepts explained using things you already love",
    },
    {
      icon: Zap,
      title: "AI-Powered Quizzes",
      description: "Smart questions that adapt to your learning style",
    },
    {
      icon: BookOpen,
      title: "ACARA Aligned",
      description: "Covering all Australian Curriculum subjects",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Floating particles that follow cursor */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="fixed pointer-events-none rounded-full"
          initial={{ scale: 0, x: particle.x, y: particle.y }}
          animate={{
            scale: 1,
            x: particle.x + (Math.random() - 0.5) * 50,
            y: particle.y + (Math.random() - 0.5) * 50,
          }}
          style={{
            width: particle.size,
            height: particle.size,
            background: `hsla(${particle.hue}, 85%, 65%, ${particle.opacity})`,
            boxShadow: `0 0 ${particle.size * 2}px hsla(${particle.hue}, 85%, 65%, ${particle.opacity * 0.5})`,
          }}
        />
      ))}

      {/* Cursor glow effect */}
      <div
        className="fixed pointer-events-none w-64 h-64 rounded-full opacity-20"
        style={{
          left: mousePos.x - 128,
          top: mousePos.y - 128,
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Background blobs */}
      <div className="liquid-blob w-[500px] h-[500px] bg-primary/30 -top-64 -left-64 fixed" />
      <div className="liquid-blob w-[400px] h-[400px] bg-secondary/30 top-1/2 -right-48 fixed" style={{ animationDelay: "-2s" }} />
      <div className="liquid-blob w-[300px] h-[300px] bg-accent/30 bottom-20 left-1/4 fixed" style={{ animationDelay: "-4s" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">AnalogyAI</span>
        </motion.div>
        <ThemeToggle />
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI-Powered Learning</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            <span className="text-foreground">Learn anything with </span>
            <span className="gradient-text">analogies</span>
            <span className="text-foreground"> you love</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Whether you're into gaming, sports, or music — we explain complex subjects
            using the things you're passionate about.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="gap-2 gradient-primary text-primary-foreground border-0 text-lg px-8 py-6"
              onClick={() => navigate("/onboarding")}
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 glass border-border"
              onClick={() => navigate("/home")}
            >
              I already have an account
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto w-full"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="glass-card p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Glass demo card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 glass-card p-8 max-w-2xl mx-auto text-center"
        >
          <p className="text-lg text-muted-foreground mb-2">Example analogy for a gamer:</p>
          <p className="text-2xl font-semibold text-foreground">
            "Variables in coding are like <span className="text-primary">inventory slots</span> in Minecraft — 
            they store stuff you can use later!"
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Landing;
