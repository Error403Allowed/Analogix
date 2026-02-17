"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  ArrowRight, 
  Star, 
  TrendingUp, 
  Search, 
  Compass, 
  Flag, 
  Zap, 
  MessageCircle, 
  Medal,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { statsStore } from "@/utils/statsStore";

export default function SubjectsOverview() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [statsData, setStatsData] = useState(() => statsStore.get());

  useEffect(() => {
    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    setUserSubjects(prefs.subjects || []);
    
    const handleStatsUpdate = () => setStatsData(statsStore.get());
    window.addEventListener("statsUpdated", handleStatsUpdate);
    return () => window.removeEventListener("statsUpdated", handleStatsUpdate);
  }, []);

  const normalizedStats = useMemo(() => ({
    quizzesDone: Math.max(0, Number(statsData.quizzesDone || 0)),
    currentStreak: Math.max(0, Number(statsData.currentStreak || 0)),
    conversationsCount: Math.max(0, Number(statsData.conversationsCount || 0)),
    subjectCounts: statsData.subjectCounts || {}
  }), [statsData]);

  const subjectPerformance = useMemo(() => {
    const rows = SUBJECT_CATALOG.map((subject) => ({
      ...subject,
      count: normalizedStats.subjectCounts[subject.id] || 
             normalizedStats.subjectCounts[subject.label.toLowerCase()] || 
             normalizedStats.subjectCounts[subject.label] || 0
    }));
    const max = Math.max(1, ...rows.map(r => r.count));
    return rows.map(r => ({
      ...r,
      percent: Math.round((r.count / max) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [normalizedStats]);

  const weakestSubjects = useMemo(() => {
    const active = subjectPerformance.filter(s => s.count > 0);
    if (active.length === 0) return [];
    return active.sort((a, b) => a.count - b.count).slice(0, 2);
  }, [subjectPerformance]);

  const filteredSubjects = SUBJECT_CATALOG.filter((s) => 
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-5xl font-black text-foreground tracking-tight mb-2">My Subjects</h1>
          <p className="text-muted-foreground font-medium text-lg italic">The headquarters for your academic mastery.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
          <Input 
            placeholder="Search your curriculum..." 
            className="pl-12 h-14 bg-muted/30 border-none rounded-2xl text-lg shadow-inner focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Steps */}
        <motion.div 
          variants={item}
          initial="hidden"
          animate="show"
          className="lg:col-span-4 glass-card p-6 flex flex-col"
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary mb-6">
            <Compass className="w-4 h-4" />
            Strategic Next Steps
          </div>
          <div className="space-y-4 flex-1">
            {weakestSubjects.length > 0 ? (
              weakestSubjects.map((subject) => (
                <div key={subject.id} className="p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors">
                  <div className="flex items-start gap-3">
                    <Flag className="w-5 h-5 text-rose-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-foreground">Build Strength in {subject.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">Lower activity detected. Try 2-3 quick analogies to bridge core concepts.</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20">
                <Activity className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-bold text-muted-foreground">No gaps detected yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Keep studying to unlock tailored growth paths.</p>
              </div>
            )}
          </div>
          <Button 
            onClick={() => router.push("/chat")}
            variant="outline" 
            className="w-full mt-6 rounded-xl border-dashed hover:border-solid transition-all font-black uppercase tracking-widest text-[10px] h-12"
          >
            Start New Session
          </Button>
        </motion.div>

        {/* Subject Performance */}
        <motion.div 
          variants={item}
          initial="hidden"
          animate="show"
          className="lg:col-span-5 glass-card p-6"
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary mb-6">
            <TrendingUp className="w-4 h-4" />
            Curriculum Mastery
          </div>
          <div className="space-y-5">
            {subjectPerformance.filter(s => s.count > 0).length > 0 ? (
              subjectPerformance.filter(s => s.count > 0).slice(0, 5).map((subject) => (
                <div key={subject.id} className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-sm font-black text-foreground">{subject.label}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{subject.count} Analogies</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.percent}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={cn(
                        "h-full rounded-full",
                        subject.percent >= 70 ? "gradient-primary" : "bg-amber-400"
                      )}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 opacity-50">
                <p className="text-sm font-bold">Academic data pending...</p>
                <p className="text-xs mt-1">Your subject distribution will appear here.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Analytics */}
        <motion.div 
          variants={item}
          initial="hidden"
          animate="show"
          className="lg:col-span-3 glass-card p-6 flex flex-col"
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary mb-6">
            <Zap className="w-4 h-4" />
            Efficiency Stats
          </div>
          <div className="grid grid-cols-1 gap-4 flex-1">
            {[
              { label: "Day Streak", value: normalizedStats.currentStreak, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Learnings", value: normalizedStats.conversationsCount, icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
              { label: "Quizzes", value: normalizedStats.quizzesDone, icon: Medal, color: "text-emerald-500", bg: "bg-emerald-500/10" }
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-2xl border border-muted-foreground/10 bg-muted/5 flex items-center justify-between group hover:scale-[1.02] transition-transform">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-foreground">{stat.value}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Grid Content */}
      <div className="space-y-6">
         <div className="flex items-center gap-4 px-2">
            <h2 className="text-2xl font-black text-foreground">Catalogue Explorer</h2>
            <div className="h-px flex-1 bg-border/50" />
         </div>
         
         <motion.div 
           variants={container}
           initial="hidden"
           animate="show"
           className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
         >
           {filteredSubjects.map((subject) => {
             const isEnrolled = userSubjects.includes(subject.id);
             const Icon = subject.icon;

             return (
               <motion.div
                 key={subject.id}
                 variants={item}
                 whileHover={{ y: -8, scale: 1.03 }}
                 onClick={() => router.push(`/subjects/${subject.id}`)}
                 className={cn(
                   "glass-card p-6 group cursor-pointer relative overflow-hidden transition-all duration-500",
                   isEnrolled ? "border-primary/20 shadow-xl" : "opacity-70 grayscale-[0.3] hover:grayscale-0 hover:opacity-100"
                 )}
               >
                 {/* Background Glow */}
                 <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-primary/5 group-hover:bg-primary/20 transition-all duration-700 blur-2xl" />

                 <div className="relative space-y-6">
                   <div className="flex items-start justify-between">
                     <div className="w-16 h-16 rounded-[1.5rem] style-primary gradient-primary flex items-center justify-center text-primary-foreground text-3xl shadow-2xl border border-white/20 transform group-hover:rotate-6 transition-transform">
                       <Icon className="w-8 h-8" />
                     </div>
                     {isEnrolled && (
                       <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 shadow-sm">
                         Active
                       </div>
                     )}
                   </div>

                   <div>
                     <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
                       {subject.label}
                     </h3>
                     <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                       {subject.descriptions.senior}
                     </p>
                   </div>

                   <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex gap-1">
                         <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                         <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                         <Star className="w-3.5 h-3.5 text-amber-500/30" />
                      </div>
                       <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs font-bold group-hover:bg-primary/10 group-hover:text-primary border border-transparent group-hover:border-primary/20">
                          {isEnrolled ? "Dive In" : "Enroll"} <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                       </Button>
                   </div>
                 </div>
               </motion.div>
             );
           })}
         </motion.div>
      </div>
    </div>
  );
}
