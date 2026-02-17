"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Star, TrendingUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SubjectsOverview() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);

  useEffect(() => {
    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    setUserSubjects(prefs.subjects || []);
  }, []);

  const filteredSubjects = SUBJECT_CATALOG.filter((s) => 
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">My Subjects</h1>
          <p className="text-muted-foreground font-medium">Manage your progress and study materials.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search subjects..." 
            className="pl-10 h-11 bg-muted/30 border-none rounded-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {filteredSubjects.map((subject) => {
          const isEnrolled = userSubjects.includes(subject.id);
          const Icon = subject.icon;

          return (
            <motion.div
              key={subject.id}
              variants={item}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => router.push(`/subjects/${subject.id}`)}
              className={cn(
                "glass-card p-5 group cursor-pointer relative overflow-hidden transition-all duration-300",
                isEnrolled ? "border-primary/20 shadow-md" : "opacity-80 grayscale-[0.5]"
              )}
            >
              {/* Background Glow */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />

              <div className="relative space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl style-primary gradient-primary flex items-center justify-center text-primary-foreground text-2xl shadow-lg border border-white/10">
                    <Icon className="w-7 h-7" />
                  </div>
                  {isEnrolled && (
                    <div className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                      Enrolled
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                    {subject.label}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {subject.descriptions.senior}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                   <div className="flex gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <Star className="w-3 h-3 text-amber-400" />
                      <Star className="w-3 h-3 text-amber-400" />
                   </div>
                   <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs font-bold group-hover:bg-primary/10 group-hover:text-primary">
                      Manage <ArrowRight className="w-3 h-3 ml-1" />
                   </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
