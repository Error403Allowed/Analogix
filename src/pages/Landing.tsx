import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BookOpen, MessageCircle, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Mascot from "@/components/Mascot";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  const navigate = useNavigate();
  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const hasCompletedOnboarding = userPrefs.onboardingComplete;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Dynamic Background Blobs */}
      <div className="liquid-blob w-[500px] h-[500px] bg-primary/20 -top-48 -left-48 fixed blur-3xl" />
      <div className="liquid-blob w-[400px] h-[400px] bg-accent/20 bottom-20 right-10 fixed blur-3xl" style={{ animationDelay: "-3s" }} />
      <div className="liquid-blob w-[300px] h-[300px] bg-secondary/20 top-1/2 right-1/4 fixed blur-3xl" style={{ animationDelay: "-6s" }} />

      {/* Nav Placeholder */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Mascot size="sm" mood="happy" />
          <span className="text-2xl font-black gradient-text tracking-tight text-foreground">Analogix</span>
        </div>
        <div className="flex gap-4">
          {hasCompletedOnboarding ? (
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>Dashboard</Button>
          ) : (
            <Button variant="ghost" onClick={() => navigate("/onboarding")}>Sign In</Button>
          )}
          <ThemeToggle />
          <Button className="gradient-primary text-primary-foreground border-0 shadow-lg" onClick={() => navigate(hasCompletedOnboarding ? "/dashboard" : "/onboarding")}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="space-y-8">
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Personal Learning
              </span>
              <h1 className="text-6xl md:text-7xl font-black text-foreground leading-[1.1] tracking-tight">
                Master any subject with <span className="gradient-text">Analogies</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg mt-6 leading-relaxed">
                Connect complex concepts to things you already love. Whether it's gaming, sports, or music—Analogix makes learning feel like a breeze.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4">
              <Button 
                size="lg" 
                className="h-14 px-8 text-lg font-bold gradient-primary text-primary-foreground border-0 shadow-xl hover:scale-105 transition-transform"
                onClick={() => navigate(hasCompletedOnboarding ? "/dashboard" : "/onboarding")}
              >
                {hasCompletedOnboarding ? "Return to Dashboard" : "Start Your Journey"}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold glass" onClick={() => navigate("/chat")}>
                Try Analogy Tutor
              </Button>
            </motion.div>
          </div>

          <motion.div 
            variants={itemVariants}
            className="relative flex justify-center items-center"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Mascot size="lg" mood="excited" />
            </motion.div>
            
            {/* Floating Features */}
            <motion.div 
              className="absolute -top-10 -right-10 glass-card p-4 flex items-center gap-3 shadow-2xl"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Fast Learning</p>
                <p className="font-bold">78% Better Retention</p>
              </div>
            </motion.div>

            <motion.div 
              className="absolute -bottom-10 -left-10 glass-card p-4 flex items-center gap-3 shadow-2xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">AI Tutor</p>
                <p className="font-bold">Real-time Analogies</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Features Preview */}
        <motion.section 
          className="mt-40 grid md:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <div className="glass-card p-8 space-y-4 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Personalized Syllabus</h3>
            <p className="text-muted-foreground">Pick the subjects you want to master and we'll tailor every analogy to your goals.</p>
          </div>
          <div className="glass-card p-8 space-y-4 hover:border-accent/50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Interest-Driven</h3>
            <p className="text-muted-foreground">Love football? We'll explain Photosynthesis as a championship game. Love gaming? It's a mana craft.</p>
          </div>
          <div className="glass-card p-8 space-y-4 hover:border-success/50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Progress Tracking</h3>
            <p className="text-muted-foreground">Watch your mastery grow with our intuitive dashboard and performance analytics.</p>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Landing;
