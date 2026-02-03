import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, Sparkles, Brain, Zap, BookOpen, Star, Users, Trophy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  hue: number;
  targetX: number;
  targetY: number;
}

const Landing = () => {
  const navigate = useNavigate();
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);
  
  // Smooth cursor tracking
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothX = useSpring(cursorX, { stiffness: 100, damping: 30 });
  const smoothY = useSpring(cursorY, { stiffness: 100, damping: 30 });

  // Handle mouse movement for particles - smoother version
  useEffect(() => {
    let lastTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      
      const now = Date.now();
      if (now - lastTime > 100 && Math.random() > 0.5) {
        lastTime = now;
        const newParticle: Particle = {
          id: particleIdRef.current++,
          x: e.clientX,
          y: e.clientY,
          targetX: e.clientX + (Math.random() - 0.5) * 100,
          targetY: e.clientY + (Math.random() - 0.5) * 100,
          size: Math.random() * 6 + 3,
          opacity: 0.7,
          hue: Math.random() * 60 + 240,
        };
        setParticles((prev) => [...prev.slice(-20), newParticle]);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [cursorX, cursorY]);

  // Fade out particles smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, opacity: p.opacity - 0.015 }))
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
      gradient: "gradient-primary",
    },
    {
      icon: Zap,
      title: "AI-Powered Quizzes",
      description: "Smart questions that adapt to your learning style",
      gradient: "gradient-accent",
    },
    {
      icon: BookOpen,
      title: "ACARA Aligned",
      description: "Covering all Australian Curriculum subjects",
      gradient: "gradient-success",
    },
  ];

  const stats = [
    { value: "10K+", label: "Students Learning", icon: Users },
    { value: "50+", label: "Subject Topics", icon: BookOpen },
    { value: "98%", label: "Success Rate", icon: Trophy },
    { value: "4.9", label: "User Rating", icon: Star },
  ];

  const interests = [
    { emoji: "⚽", label: "Sports" },
    { emoji: "🎮", label: "Gaming" },
    { emoji: "🎵", label: "Music" },
    { emoji: "🍳", label: "Cooking" },
    { emoji: "🎨", label: "Art" },
    { emoji: "🎬", label: "Movies" },
    { emoji: "🌿", label: "Nature" },
    { emoji: "💻", label: "Tech" },
    { emoji: "📚", label: "Reading" },
    { emoji: "✈️", label: "Travel" },
  ];

  const subjects = [
    { emoji: "📝", label: "English" },
    { emoji: "🔢", label: "Mathematics" },
    { emoji: "🔬", label: "Science" },
    { emoji: "🏃", label: "Health & PE" },
    { emoji: "🏛️", label: "History" },
    { emoji: "🌏", label: "Geography" },
    { emoji: "⚖️", label: "Civics" },
    { emoji: "💰", label: "Economics" },
    { emoji: "🎭", label: "The Arts" },
    { emoji: "💻", label: "Digital Tech" },
    { emoji: "🔧", label: "Design Tech" },
    { emoji: "🗣️", label: "Languages" },
  ];

  const analogyExamples = [
    {
      interest: "🎮 For Gamers",
      subject: "Mathematics",
      analogy: "Variables are like inventory slots — they store stuff you can use later!",
    },
    {
      interest: "🎵 For Musicians",
      subject: "Science",
      analogy: "Atoms vibrating are like guitar strings — faster vibrations mean higher energy!",
    },
    {
      interest: "⚽ For Sports Fans",
      subject: "History",
      analogy: "Trade routes were like transfer windows — moving valuable players (goods) between teams (countries)!",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Floating particles - smoother animation */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="fixed pointer-events-none rounded-full z-50"
          initial={{ scale: 0, x: particle.x, y: particle.y }}
          animate={{
            scale: [0, 1, 0.8],
            x: particle.targetX,
            y: particle.targetY,
            opacity: particle.opacity,
          }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            width: particle.size,
            height: particle.size,
            background: `hsla(${particle.hue}, 85%, 65%, ${particle.opacity})`,
            boxShadow: `0 0 ${particle.size * 2}px hsla(${particle.hue}, 85%, 65%, ${particle.opacity * 0.5})`,
          }}
        />
      ))}

      {/* Smooth cursor glow */}
      <motion.div
        className="fixed pointer-events-none w-80 h-80 rounded-full z-40"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
          background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Background blobs */}
      <div className="liquid-blob w-[600px] h-[600px] bg-primary/20 -top-72 -left-72 fixed" />
      <div className="liquid-blob w-[500px] h-[500px] bg-secondary/20 top-1/3 -right-64 fixed" style={{ animationDelay: "-2s" }} />
      <div className="liquid-blob w-[400px] h-[400px] bg-accent/20 bottom-0 left-1/4 fixed" style={{ animationDelay: "-4s" }} />
      <div className="liquid-blob w-[300px] h-[300px] bg-success/20 top-2/3 right-1/4 fixed" style={{ animationDelay: "-6s" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">AnalogyAI</span>
        </motion.div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden sm:flex" onClick={() => navigate("/home")}>
            Sign In
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-8 pb-24 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI-Powered Learning for Australian Students</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            <span className="text-foreground">Learn anything with </span>
            <span className="gradient-text">analogies</span>
            <span className="text-foreground"> you love</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Whether you're into gaming, sports, or music — we explain complex subjects
            using the things you're passionate about.
          </p>

          {/* Interest pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 justify-center mb-10 max-w-3xl"
          >
            {interests.map((interest, i) => (
              <motion.div
                key={interest.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.03 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary cursor-pointer transition-shadow hover:shadow-md hover:bg-primary/20"
              >
                <span>{interest.emoji}</span>
                <span className="font-medium">{interest.label}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="gap-2 gradient-primary text-primary-foreground border-0 text-lg px-10 py-7 shadow-lg hover:shadow-xl transition-shadow"
              onClick={() => navigate("/onboarding")}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-7 glass border-border hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/home")}
            >
              I already have an account
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-20 w-full max-w-4xl"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass-card p-5 text-center cursor-default"
            >
              <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid md:grid-cols-3 gap-6 mt-20 w-full"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="glass-card p-8 text-center cursor-default group"
            >
              <div className={`w-16 h-16 rounded-2xl ${feature.gradient} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Subjects Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-24 w-full"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              All ACARA Subjects Covered
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From English to Digital Technologies — we've got your entire curriculum
            </p>
          </div>

          <motion.div
            className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto"
          >
            {subjects.map((subject, i) => (
              <motion.div
                key={subject.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.15 + i * 0.04 }}
                whileHover={{ scale: 1.05, y: -3 }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl glass-card cursor-pointer"
              >
                <span className="text-xl">{subject.emoji}</span>
                <span className="font-medium text-foreground">{subject.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Analogy Examples Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-24 w-full"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              See Analogies in Action
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We transform complex topics into relatable concepts based on your interests
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {analogyExamples.map((example, index) => (
              <motion.div
                key={example.interest}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + index * 0.15 }}
                whileHover={{ y: -6 }}
                className="glass-card p-6 cursor-default"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-primary">{example.interest}</span>
                  <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">{example.subject}</span>
                </div>
                <p className="text-lg text-foreground leading-relaxed">"{example.analogy}"</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Interactive Chat Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-24 w-full max-w-3xl"
        >
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Tutor Chat</h3>
                  <p className="text-sm text-muted-foreground">Ask anything, get analogies you understand</p>
                </div>
              </div>

              {/* Mock chat messages */}
              <div className="space-y-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.7 }}
                  className="flex justify-end"
                >
                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-br-md max-w-xs">
                    Can you explain photosynthesis? I love cooking!
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.9 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted text-foreground px-4 py-3 rounded-2xl rounded-bl-md max-w-md">
                    Think of it like cooking! 🍳 Plants are like chefs — they take raw ingredients (sunlight, water, CO2) and cook up their own food (glucose). The chlorophyll is their kitchen!
                  </div>
                </motion.div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 glass rounded-xl px-4 py-3 text-muted-foreground">
                  Ask me anything about your subjects...
                </div>
                <Button className="gradient-primary text-primary-foreground border-0 px-6">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="mt-24 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to learn differently?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of Australian students already learning with personalized analogies.
          </p>
          <Button
            size="lg"
            className="gap-2 gradient-primary text-primary-foreground border-0 text-lg px-10 py-7 shadow-lg hover:shadow-xl transition-shadow"
            onClick={() => navigate("/onboarding")}
          >
            Start Learning Now
            <Sparkles className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-border w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>AnalogyAI © 2024</span>
            </div>
            <div className="flex gap-6">
              <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
