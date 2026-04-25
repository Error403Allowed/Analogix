"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  LayoutGrid,
  List,
  Search,
  Sparkles,
} from "lucide-react";
import {
  getGradeBand,
  getSubjectDescription,
  type SubjectId,
  SUBJECT_CATALOG,
} from "@/constants/subjects";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { statsStore } from "@/utils/statsStore";
import { SubjectCustomizationSheet } from "@/components/SubjectCustomizationSheet";
import { subjectStore, type CustomSubject } from "@/utils/subjectStore";
import { SUBJECT_COLORS } from "@/components/ColorPicker";
import { DynamicIcon } from "@/components/IconPicker";
import { useQuery } from "@apollo/client/react";
import { SUBJECTS_QUERY } from "@/lib/graphql/queries";

type SubjectPagePrefs = {
  subjects?: string[];
  grade?: string;
  state?: string;
};

const SUBJECT_COVER_STYLES: Record<string, string> = {
  sunset: "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500",
  ocean: "bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500",
  forest: "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500",
  berry: "bg-gradient-to-r from-pink-500 via-rose-500 to-red-500",
  sky: "bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-500",
  twilight: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
  fire: "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500",
  midnight: "bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900",
  gold: "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500",
};

const GRADE_STAGE_COPY: Record<string, string> = {
  junior: "Foundation-first study spaces for building confidence early.",
  middle: "Connected subject workspaces for linking ideas across topics.",
  senior: "Exam-focused subject hubs built for revision, pace, and output.",
};

export default function SubjectsOverview() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<"list" | "grid">("grid");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [userPrefs, setUserPrefs] = useState<SubjectPagePrefs>({});
  const [statsData, setStatsData] = useState<any>({});
  const [customSubjects, setCustomSubjects] = useState<Record<string, CustomSubject>>({});
  const [customizeSubjectId, setCustomizeSubjectId] = useState<SubjectId | null>(null);
  const { data: gqlSubjects } = useQuery<{ subjects: { id: string }[] }>(SUBJECTS_QUERY);

  useEffect(() => {
    const saved = localStorage.getItem("subjectsLayout") as "list" | "grid" | null;
    if (saved) setLayout(saved);
    
    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    setUserPrefs(prefs);
    const preferenceSubjects = Array.isArray(prefs.subjects) ? prefs.subjects : [];
    setUserSubjects(preferenceSubjects);

    statsStore.get().then(setStatsData);
    subjectStore.getAllCustomSubjects().then(setCustomSubjects);
  }, []);

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
    const gqlSubjectIds = (gqlSubjects?.subjects ?? []).map((item) => item.id);
    const ids = gqlSubjectIds.length > 0 ? gqlSubjectIds : userSubjects;
    return SUBJECT_CATALOG.filter((subject) => ids.includes(subject.id));
  }, [gqlSubjects?.subjects, userSubjects]);

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

  const toggleLayout = (next: "list" | "grid") => {
    setLayout(next);
    localStorage.setItem("subjectsLayout", next);
  };

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
                  placeholder="Filter subjects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary/50 shadow-sm"
                />
              </div>
              <div className="flex rounded-lg border border-border bg-muted/20 p-1">
                <button
                  onClick={() => toggleLayout("list")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    layout === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground/40 hover:text-foreground"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleLayout("grid")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    layout === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground/40 hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {filteredSubjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-20 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground/20" />
            <h3 className="text-lg font-bold">No subjects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Add subjects in your profile to start building your workspace.
            </p>
          </div>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((subject) => {
              const appearance = getSubjectAppearance(subject);
              const activity = getActivityCount(subject);
              return (
                <motion.div
                  layout
                  key={subject.id}
                  onClick={() => router.push(`/subjects/${subject.id}`)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-border/80 hover:shadow-md"
                >
                  <div className={cn("h-24 w-full", appearance.cover ? SUBJECT_COVER_STYLES[appearance.cover] : "bg-muted/30")} />
                  <div className="p-6">
                    <div className="absolute top-16 left-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-2xl shadow-md transition-transform group-hover:scale-105">
                      <DynamicIcon name={appearance.icon} />
                    </div>
                    <div className="mt-6">
                      <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{appearance.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/60">
                        {getSubjectDescription(subject.id, userPrefs.grade)}
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        {activity} Sessions
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/20 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSubjects.map((subject) => {
              const appearance = getSubjectAppearance(subject);
              const activity = getActivityCount(subject);
              return (
                <motion.div
                  layout
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
          </div>
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
