"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Search, Filter, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { achievementStore } from "@/utils/achievementStore";
import TypewriterText from "@/components/TypewriterText";
import { cn } from "@/lib/utils";

const AchievementsLibrary = () => {
  const router = useRouter();
  const [achievements, setAchievements] = useState<Awaited<ReturnType<typeof achievementStore.getAll>>>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    achievementStore.getAll().then(setAchievements);
    const refresh = () => achievementStore.getAll().then(setAchievements);
    window.addEventListener("achievementsUpdated", refresh);
    return () => window.removeEventListener("achievementsUpdated", refresh);
  }, []);

  const filtered = achievements.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                          a.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || a.category === filter;
    return matchesSearch && matchesFilter;
  });

  const categories = [
    { id: "all", label: "All Badges" },
    { id: "starter", label: "Early Steps" },
    { id: "streak", label: "Loyalty" },
    { id: "mastery", label: "Academic" },
    { id: "social", label: "Exploration" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    show: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring" as const, stiffness: 260, damping: 20 }
    }
  };

  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const percentage = Math.round((totalUnlocked / totalCount) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-5xl font-black text-foreground tracking-tight flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <Trophy className="w-7 h-7" />
            </div>
            Achievement Library
          </h1>
          <p className="text-muted-foreground text-lg italic ml-1">Your legacy of mastery, recorded in digital gold.</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full lg:w-auto flex items-center gap-6 glass-card p-6 border-primary/10"
        >
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Mastery Progress</p>
            <p className="text-3xl font-black text-primary">{percentage}%</p>
          </div>
          <div className="relative w-48 h-3 bg-muted rounded-full overflow-hidden shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              className="absolute inset-0 gradient-primary shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            />
          </div>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 items-center justify-between glass-card p-5"
      >
        <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setFilter(cat.id)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                filter === cat.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/30 border-primary" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
              )}
            >
              {cat.label}
            </motion.button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input 
            placeholder="Search your collection..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 bg-muted/30 border-none rounded-xl text-sm focus-visible:ring-primary/20"
          />
        </div>
      </motion.div>

      {/* Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((ach) => (
            <motion.div
              layout
              key={ach.id}
              variants={item}
              whileHover={{ y: -8, scale: 1.02 }}
              className={cn(
                "relative p-8 rounded-[2rem] border transition-all group overflow-hidden flex flex-col items-center text-center",
                ach.unlocked 
                  ? "glass-card border-primary/20 shadow-xl shadow-primary/5 hover:border-primary/50" 
                  : "bg-muted/30 border-dashed border-muted-foreground/10 opacity-60 grayscale"
              )}
            >
              {/* Background Glow */}
              {ach.unlocked && (
                <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-all duration-700 blur-2xl" />
              )}
              
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl">
                {ach.icon}
              </div>
              
              <div className="space-y-2 mb-6">
                <h3 className="font-black text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">{ach.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed px-2 font-medium">{ach.description}</p>
              </div>
              
              <div className="mt-auto w-full pt-4 border-t border-border/50">
                {ach.unlocked ? (
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-center gap-1.5 bg-primary/10 py-2 rounded-xl">
                    <Medal className="w-3 h-3" /> Unlocked
                  </div>
                ) : (
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 py-2">
                    Locked
                  </div>
                )}
              </div>

              {/* Shiny overlap */}
              {ach.unlocked && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AchievementsLibrary;
