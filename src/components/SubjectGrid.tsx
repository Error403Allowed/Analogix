"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ArrowRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { cn } from "@/lib/utils";

export function SubjectGrid() {
  const router = useRouter();
  const [userSubjects, setUserSubjects] = useState<string[]>([]);

  useEffect(() => {
    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    setUserSubjects(prefs.subjects || []);
  }, []);

  const enrolled = SUBJECT_CATALOG.filter(s => userSubjects.includes(s.id));

  if (enrolled.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          My Subjects
        </h3>
        <button 
          onClick={() => router.push("/subjects")}
          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {enrolled.slice(0, 4).map((subject) => {
          const Icon = subject.icon;
          return (
            <motion.div
              key={subject.id}
              whileHover={{ y: -4 }}
              onClick={() => router.push(`/subjects/${subject.id}`)}
              className="glass-card p-4 group cursor-pointer border border-border/20 rounded-[2rem] hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-lg">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {subject.label}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                    Continue learning
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
