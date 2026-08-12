 
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Search,
} from "lucide-react";
import {
  getGradeBand,
  getSubjectDescription,
  type SubjectId,
  SUBJECT_CATALOG,
} from "@/constants/subjects";
import { motion } from "framer-motion";
import { staggerContainer, fadeInUp } from "@/utils/animations";
import { statsStore } from "@/utils/statsStore";
import { SubjectCustomizationSheet } from "@/components/settings/SubjectCustomizationSheet";
import { subjectStore, type CustomSubject } from "@/utils/subjectStore";
import { SUBJECT_COLORS } from "@/components/shared/ColorPicker";
import { DynamicIcon } from "@/components/shared/IconPicker";

type SubjectPagePrefs = {
  subjects?: string[];
  grade?: string;
  state?: string;
};

const GRADE_STAGE_COPY: Record<string, string> = {
  junior: "Foundation-first study spaces for building confidence early.",
  middle: "Connected subject workspaces for linking ideas across topics.",
  senior: "Exam-focused subject hubs built for revision, pace, and output.",
};

export default function SubjectsOverview() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [userPrefs, setUserPrefs] = useState<SubjectPagePrefs>({});
  const [statsData, setStatsData] = useState<any>({});
  const [customSubjects, setCustomSubjects] = useState<Record<string, CustomSubject>>({});
  const [customizeSubjectId, setCustomizeSubjectId] = useState<SubjectId | null>(null);

  const [synced, setSynced] = useState(false);

  const loadPrefs = useCallback(() => {
    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    setUserPrefs(prefs);
    const preferenceSubjects = Array.isArray(prefs.subjects) ? prefs.subjects : [];
    setUserSubjects(preferenceSubjects);
    setSynced(true);
  }, []);

  useEffect(() => {
    loadPrefs();

    statsStore.get().then(setStatsData);
    subjectStore.getAllCustomSubjects().then(setCustomSubjects);

    const onUpdate = () => loadPrefs();
    window.addEventListener("userPreferencesUpdated", onUpdate);
    return () => window.removeEventListener("userPreferencesUpdated", onUpdate);
  }, [loadPrefs]);

  const getSubjectAppearance = useCallback((subject: any) => {
    const custom = customSubjects[subject.id];
    const colorId = custom?.custom_color || "default";
    const colorData = SUBJECT_COLORS.find((color) => color.id === colorId) || SUBJECT_COLORS[0];

    return {
      icon: custom?.custom_icon || subject.iconName,
      color: colorData,
      title: custom?.custom_title || subject.label,
      cover: custom?.custom_cover,
    };
  }, [customSubjects]);

  const activeSubjectObjects = useMemo(() => {
    return SUBJECT_CATALOG.filter((subject) => userSubjects.includes(subject.id));
  }, [userSubjects]);

  const getActivityCount = useCallback(
    (subject: any) => (statsData.subjectCounts?.[subject.id] || 0),
    [statsData.subjectCounts],
  );

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeSubjectObjects.filter((subject) => {
      if (!query) return true;
      const appearance = getSubjectAppearance(subject);
      return (
        appearance.title.toLowerCase().includes(query) ||
        subject.label.toLowerCase().includes(query)
      );
    });
  }, [activeSubjectObjects, getSubjectAppearance, search]);

  const gradeBand = getGradeBand(userPrefs.grade);
  const stageCopy = GRADE_STAGE_COPY[gradeBand] || "Your subject workspaces.";

  return (
    <div className="notion-ui min-h-screen bg-background text-foreground fade-in">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">My Subjects</h1>
              <p className="mt-2 text-muted-foreground/60 max-w-md">{stageCopy}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary/50 shadow-sm"
                />
              </div>

            </div>
          </div>
        </header>

        {filteredSubjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-20 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground/20" />
            <h3 className="text-lg font-bold">{synced ? "No subjects yet" : "Loading your subjects..."}</h3>
            <p className="mt-1 text-sm text-muted-foreground/60">
              {synced ? "Add subjects in your profile to start building your workspace." : "Syncing your preferences from your profile."}
            </p>
          </div>
        ) : (
          <motion.div
            className="space-y-1"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {filteredSubjects.map((subject) => {
              const appearance = getSubjectAppearance(subject);
              const activity = getActivityCount(subject);
              return (
                <motion.div
                  layout
                  variants={fadeInUp}
                  key={subject.id}
                  onClick={() => router.push(`/subjects/${subject.id}`)}
                  className="group flex cursor-pointer items-center gap-4 rounded-xl border border-transparent p-4 transition-all hover:bg-muted/40"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-2xl shadow-sm">
                    <DynamicIcon name={appearance.icon} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors">{appearance.title}</h3>
                    <p className="truncate text-xs text-muted-foreground/50">
                      {getSubjectDescription(subject.id, userPrefs.grade)}
                    </p>
                  </div>
                  <div className="flex items-center gap-8 pr-4">
                    <div className="hidden text-right sm:block">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">Sessions</p>
                      <p className="text-xs font-bold text-foreground/60">{activity}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/20 transition-all group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {customizeSubjectId && (
        <SubjectCustomizationSheet
          subjectId={customizeSubjectId}
          open={!!customizeSubjectId}
          onOpenChange={(open) => !open && setCustomizeSubjectId(null)}
        />
      )}
    </div>
  );
}
