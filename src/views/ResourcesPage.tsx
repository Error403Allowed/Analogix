"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, ExternalLink, FileText,
  Search, X, BookMarked, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import RESOURCES, { type ResourceLink, type SubjectResources } from "@/data/resources";

const subjectLabel = (id: string) =>
  SUBJECT_CATALOG.find(s => s.id === id)?.label || id;

type Tab = "pastPapers" | "textbooks";

const ResourceCard = ({ resource }: { resource: ResourceLink }) => (
  <a
    href={resource.url}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
        {resource.title}
      </p>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {resource.free && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-emerald-600 border-emerald-500/40 bg-emerald-500/8">
            Free
          </Badge>
        )}
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>
    </div>
    {resource.description && (
      <p className="text-xs text-muted-foreground leading-relaxed">{resource.description}</p>
    )}
  </a>
);

export default function ResourcesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("pastPapers");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [userState, setUserState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        setUserSubjects(Array.isArray(prefs.subjects) ? prefs.subjects : []);
        setUserState(typeof prefs.state === "string" ? prefs.state : null);
      } catch {
        setUserSubjects([]);
      }
    };
    load();
    window.addEventListener("userPreferencesUpdated", load);
    return () => window.removeEventListener("userPreferencesUpdated", load);
  }, []);

  // Resources filtered to user's subjects (or all if none set)
  const subjectResources = useMemo<SubjectResources[]>(() => {
    if (userSubjects.length === 0) return RESOURCES;
    return RESOURCES.filter(r => userSubjects.includes(r.subjectId));
  }, [userSubjects]);

  // Subject sidebar filter
  const filteredSubjectList = useMemo(() => {
    if (!subjectSearch.trim()) return subjectResources;
    const q = subjectSearch.toLowerCase();
    return subjectResources.filter(r => subjectLabel(r.subjectId).toLowerCase().includes(q));
  }, [subjectResources, subjectSearch]);

  // Default to first subject
  useEffect(() => {
    if (!subjectResources.length) return;
    if (!activeSubjectId || !subjectResources.find(r => r.subjectId === activeSubjectId)) {
      setActiveSubjectId(subjectResources[0].subjectId);
    }
  }, [subjectResources, activeSubjectId]);

  const activeResource = subjectResources.find(r => r.subjectId === activeSubjectId);

  // Cross-subject search
  const isCrossSearch = query.trim().length > 0;

  const matchesQuery = (link: ResourceLink) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      link.title.toLowerCase().includes(q) ||
      (link.description?.toLowerCase().includes(q) ?? false)
    );
  };

  // Past papers: show user's state first (prioritised), then all untagged ones.
  // If no state set, show everything. Textbooks are never state-filtered — they're universal.
  const paperMatchesState = (link: ResourceLink) => {
    if (!userState) return true;
    if (!link.states || link.states.length === 0) return true;
    return link.states.includes(userState) || link.states.includes("ALL");
  };

  const crossResults = useMemo(() => {
    if (!isCrossSearch) return [];
    const results: { subjectId: string; link: ResourceLink; type: Tab }[] = [];
    for (const sr of subjectResources) {
      for (const link of sr.pastPapers) {
        if (matchesQuery(link) && paperMatchesState(link)) results.push({ subjectId: sr.subjectId, link, type: "pastPapers" });
      }
      for (const link of sr.textbooks) {
        if (matchesQuery(link)) results.push({ subjectId: sr.subjectId, link, type: "textbooks" });
      }
    }
    return results;
  }, [isCrossSearch, subjectResources, query, userState, matchesQuery, paperMatchesState]);

  const visiblePapers = activeResource?.pastPapers.filter(l => matchesQuery(l) && paperMatchesState(l)) ?? [];
  const visibleTextbooks = activeResource?.textbooks.filter(l => matchesQuery(l)) ?? [];

  const tabItems: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "pastPapers", label: "Past Papers", icon: FileText },
    { key: "textbooks", label: "Textbooks & Links", icon: BookOpen },
  ];

  return (
    <div className="bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}
            className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Study Hub</p>
              <h1 className="text-lg font-semibold">Resources</h1>
            </div>
          </div>
          <div className="w-24" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Subjects</p>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  value={subjectSearch}
                  onChange={e => setSubjectSearch(e.target.value)}
                  placeholder="Find a subject…"
                  className="w-full rounded-lg border border-border bg-background pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {subjectSearch && (
                  <button onClick={() => setSubjectSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid gap-2">
                {filteredSubjectList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No subjects match.</p>
                ) : (
                  filteredSubjectList.map(sr => (
                    <button
                      key={sr.subjectId}
                      type="button"
                      onClick={() => { setActiveSubjectId(sr.subjectId); setQuery(""); }}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                        activeSubjectId === sr.subjectId && !isCrossSearch
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/50"
                      )}
                    >
                      <span className="block">{subjectLabel(sr.subjectId)}</span>
                      <span className={cn(
                        "block text-[11px]",
                        activeSubjectId === sr.subjectId && !isCrossSearch
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}>
                        {sr.pastPapers.filter(l => !l.states || l.states.length === 0 || !userState || l.states.includes(userState)).length} papers · {sr.textbooks.length} books
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Legend</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-emerald-600 border-emerald-500/40 bg-emerald-500/8">Free</Badge>
                <span className="text-xs text-muted-foreground">No cost to access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-5 rounded-md border border-border bg-card" />
                <span className="text-xs text-muted-foreground">Paid / publisher resource</span>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="space-y-5">

            {/* Search bar */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {isCrossSearch
                      ? `Searching all subjects for "${query}"`
                      : activeResource ? subjectLabel(activeResource.subjectId) : "Resources"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isCrossSearch
                      ? "Results across every subject."
                      : "Past papers, textbooks, and free study links."}
                  </p>
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search resources…"
                    className="w-full rounded-xl border border-border bg-background px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {query && (
                    <button onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs — only shown in single-subject mode */}
            {!isCrossSearch && (
              <div className="flex gap-2">
                {tabItems.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                      activeTab === tab.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {isCrossSearch ? (
              crossResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  No resources match "{query}" across any subject.
                </div>
              ) : (
                (() => {
                  const bySubject: Record<string, typeof crossResults> = {};
                  for (const r of crossResults) {
                    if (!bySubject[r.subjectId]) bySubject[r.subjectId] = [];
                    bySubject[r.subjectId].push(r);
                  }
                  return Object.entries(bySubject).map(([subjectId, results]) => (
                    <div key={subjectId} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                          {subjectLabel(subjectId)}
                        </p>
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">{results.length}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {results.map(({ link, type }, i) => (
                          <div key={`${subjectId}-${type}-${i}`} className="relative">
                            <span className="absolute -top-2 left-3 z-10">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wide bg-background">
                                {type === "pastPapers" ? "Past Paper" : "Textbook"}
                              </Badge>
                            </span>
                            <ResourceCard resource={link} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )
            ) : !activeResource ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No resources yet. Add subjects in your profile to unlock them.
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === "pastPapers" ? (
                  visiblePapers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                      No past papers found for that search.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {visiblePapers.map((link, i) => (
                        <ResourceCard key={i} resource={link} />
                      ))}
                    </div>
                  )
                ) : (
                  visibleTextbooks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                      No textbooks found for that search.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {visibleTextbooks.map((link, i) => (
                        <ResourceCard key={i} resource={link} />
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
