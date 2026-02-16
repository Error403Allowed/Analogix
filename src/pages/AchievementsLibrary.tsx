"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { achievementStore } from "@/utils/achievementStore";
import TypewriterText from "@/components/TypewriterText";

const AchievementsLibrary = () => {
  const router = useRouter();
  const [achievements, setAchievements] = useState(achievementStore.getAll());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const userPrefs =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
  const userName = userPrefs.name || "Student";

  useEffect(() => {
    // Refresh on mount to catch any new unlocks
    setAchievements(achievementStore.getAll());
  }, []);

  const filtered = achievements.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                          a.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || a.category === filter;
    return matchesSearch && matchesFilter;
  });

  const categories = [
    { id: "all", label: "All" },
    { id: "starter", label: "Starter" },
    { id: "streak", label: "Streaks" },
    { id: "mastery", label: "Mastery" },
    { id: "social", label: "Social" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const percentage = Math.round((totalUnlocked / totalCount) * 100);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617]">
      <div className="max-w-[1700px] mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-6">
        <Header userName={userName} />
        
        <div className="pb-8">
           <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary gap-2" onClick={() => router.push("/dashboard")}>
             <ArrowLeft className="w-4 h-4" /> Back to Dashboard
           </Button>
           
           <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
             <div>
               <h1 className="text-4xl font-black text-foreground mb-2 flex items-center gap-3">
                 <Trophy className="w-8 h-8 text-warning" />
                 <TypewriterText text="Achievement Library" delay={120} />
               </h1>
               <p className="text-muted-foreground">Collect badges as you master new topics.</p>
             </div>
             
             <div className="flex items-center gap-4 bg-card/50 p-4 rounded-2xl border border-border">
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">Completion</p>
                  <p className="text-2xl font-black text-primary">{percentage}%</p>
                </div>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" 
                     style={{ width: `${percentage}%` }}
                   />
                </div>
             </div>
           </div>

           <div className="flex flex-wrap gap-4 items-center justify-between glass-card p-4 mb-8">
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilter(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      filter === cat.id 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search badges..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 bg-background/50 border-border"
                />
              </div>
           </div>

           <motion.div 
             variants={container}
             initial="hidden"
             animate="show"
             className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {filtered.map((ach) => (
                <motion.div
                  key={ach.id}
                  variants={item}
                  className={`relative p-6 rounded-2xl border transition-all group overflow-hidden ${
                    ach.unlocked 
                      ? "bg-card border-primary/20 shadow-lg shadow-primary/5 hover:border-primary/50" 
                      : "bg-muted/30 border-transparent opacity-60 grayscale hover:opacity-80 transition-opacity"
                  }`}
                >
                  {/* Shiny effect for unlocked */}
                  {ach.unlocked && (
                     <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  )}
                  
                  <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {ach.icon}
                  </div>
                  <h3 className="font-bold text-foreground mb-1 line-clamp-1" title={ach.title}>{ach.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2" title={ach.description}>{ach.description}</p>
                  
                  {ach.unlocked && (
                    <div className="mt-4 pt-3 border-t border-border/50 text-[10px] font-medium text-success flex items-center gap-1">
                      <span>✓ Unlocked</span>
                    </div>
                  )}
                </motion.div>
              ))}
           </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AchievementsLibrary;
