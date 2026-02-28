"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { SUBJECT_CATALOG } from "@/constants/subjects";

export function SubjectGrid() {
  const router = useRouter();
  const [userSubjects, setUserSubjects] = useState<string[]>([]);

  const subjectIds = useMemo<Set<string>>(
    () => new Set(SUBJECT_CATALOG.map((subject) => String(subject.id))),
    [],
  );
  const subjectByLabel = useMemo<Map<string, string>>(
    () =>
      new Map(
        SUBJECT_CATALOG.map((subject): [string, string] => [subject.label.toLowerCase(), String(subject.id)]),
      ),
    [],
  );

  const normalizeSubjects = useCallback((value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const normalized: string[] = [];

    value.forEach((entry) => {
      const raw = String(entry || "").trim();
      if (!raw) return;

      const id = subjectIds.has(raw) ? raw : subjectByLabel.get(raw.toLowerCase()) || "";
      if (!id || seen.has(id)) return;
      seen.add(id);
      normalized.push(id);
    });

    return normalized;
  }, [subjectByLabel, subjectIds]);

  useEffect(() => {
    const load = () => {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      setUserSubjects(normalizeSubjects(prefs.subjects));
    };

    load();
    window.addEventListener("userPreferencesUpdated", load);
    window.addEventListener("storage", load);

    return () => {
      window.removeEventListener("userPreferencesUpdated", load);
      window.removeEventListener("storage", load);
    };
  }, [normalizeSubjects]);

  const enrolled = SUBJECT_CATALOG.filter(s => userSubjects.includes(s.id));

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

      {enrolled.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {enrolled.slice(0, 4).map((subject) => {
            const Icon = subject.icon;
            return (
              <motion.div
                key={subject.id}
                whileHover={{ y: -4 }}
                onClick={() => router.push(`/subjects/${subject.id}`)}
                className="glass-card p-4 group cursor-pointer border border-border/40 rounded-[2rem] hover:border-primary/40 transition-all"
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
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">No subjects added yet.</p>
            <p className="text-xs text-muted-foreground">Add subjects in your profile to populate this widget.</p>
          </div>
          <button
            onClick={() => router.push("/subjects")}
            className="shrink-0 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/15 transition-colors"
          >
            Open Subjects
          </button>
        </div>
      )}
    </div>
  );
}
