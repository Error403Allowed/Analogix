"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Sigma, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import FORMULA_SHEETS, { Formula, FormulaSheet } from "@/data/formulaSheets";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { cn } from "@/lib/utils";
import { NextConfig } from 'next';

// Caching
const nextConfig: NextConfig = {
  cacheComponents: true,
}

const subjectLabel = (id: string) =>
  SUBJECT_CATALOG.find(s => s.id === id)?.label
  || FORMULA_SHEETS.find(s => s.subjectId === id)?.label
  || id;

const matchesQuery = (formula: Formula, query: string) => {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [formula.name, formula.description, formula.topic, formula.latex]
    .concat(formula.tags || []);
  return haystack.some(v => v.toLowerCase().includes(q));
};

const matchesState = (formula: Formula, state: string | null) => {
  if (!state) return true; // no preference, show all
  if (!formula.states) return true; // already normalized to ALL
  return formula.states.includes("ALL") || formula.states.includes(state);
};

const groupByTopic = (formulas: Formula[], query: string, state: string | null) => {
  const grouped: Record<string, Formula[]> = {};
  for (const formula of formulas) {
    if (!matchesQuery(formula, query) || !matchesState(formula, state)) continue;
    if (!grouped[formula.topic]) grouped[formula.topic] = [];
    grouped[formula.topic].push(formula);
  }
  return grouped;
};

const FormulaCard = ({ formula }: { formula: Formula }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{formula.name}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{formula.description}</p>
      </div>
      <Badge variant="outline" className="text-[10px] uppercase tracking-wide shrink-0">
        {formula.topic}
      </Badge>
    </div>
    <div className="mt-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
      <MarkdownRenderer content={`$$${formula.latex}$$`} className="text-base" />
    </div>
  </div>
);

export default function FormulasPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("All");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [userState, setUserState] = useState<string | null>(null); // for state‑based filtering

  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        setUserSubjects(Array.isArray(prefs.subjects) ? prefs.subjects : []);
        setUserState(typeof prefs.state === "string" ? prefs.state : null);
      } catch {
        setUserSubjects([]);
        setUserState(null);
      }
    };
    load();
    window.addEventListener("userPreferencesUpdated", load);
    return () => window.removeEventListener("userPreferencesUpdated", load);
  }, []);

  // All sheets the user has access to
  const sheets = useMemo<FormulaSheet[]>(() => {
    if (userSubjects.length === 0) return FORMULA_SHEETS;
    return FORMULA_SHEETS.filter(sheet => userSubjects.includes(sheet.subjectId));
  }, [userSubjects]);

  // Sheets filtered by the subject search box
  const filteredSheets = useMemo(() => {
    if (!subjectSearch.trim()) return sheets;
    const q = subjectSearch.toLowerCase();
    return sheets.filter(sheet =>
      subjectLabel(sheet.subjectId).toLowerCase().includes(q)
    );
  }, [sheets, subjectSearch]);

  useEffect(() => {
    if (!sheets.length) return;
    if (!activeSheetId || !sheets.find(s => s.subjectId === activeSheetId)) {
      setActiveSheetId(sheets[0].subjectId);
      setQuery("");
      setActiveTopic("All");
    }
  }, [sheets, activeSheetId]);

  // When there's a formula query, show results across ALL sheets (cross-subject search)
  const isCrossSearch = query.trim().length > 0;

  // Results for the current single sheet (no query or topic filter)
  const currentSheet = sheets.find(s => s.subjectId === activeSheetId) || sheets[0];

  const topics = useMemo(() => {
    if (!currentSheet || isCrossSearch) return {};
    return groupByTopic(currentSheet.formulas, "", userState);
  }, [currentSheet, isCrossSearch, userState]);

  const filteredTopics = useMemo(() => {
    if (!currentSheet || isCrossSearch) return {};
    return groupByTopic(currentSheet.formulas, query, userState);
  }, [currentSheet, query, isCrossSearch, userState]);

  const topicList = useMemo(() => Object.keys(topics).sort(), [topics]);

  useEffect(() => {
    if (activeTopic === "All") return;
    if (!topicList.includes(activeTopic)) setActiveTopic("All");
  }, [activeTopic, topicList]);

  // Cross-subject search results: group by subject then topic
  const crossResults = useMemo(() => {
    if (!isCrossSearch) return [];
    const results: { sheet: FormulaSheet; formula: Formula }[] = [];
    for (const sheet of sheets) {
      for (const formula of sheet.formulas) {
        if (matchesQuery(formula, query) && matchesState(formula, userState)) {
          results.push({ sheet, formula });
        }
      }
    }
    return results;
  }, [isCrossSearch, sheets, query, userState]);

  const totalFormulas = currentSheet?.formulas.length || 0;
  const visibleFormulas = isCrossSearch
    ? crossResults.length
    : Object.values(filteredTopics).flat().length;

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
              <Sigma className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Formula Vault</p>
              <h1 className="text-lg font-semibold">Formula Sheets</h1>
            </div>
          </div>
          <div className="w-24" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Subjects</p>

              {/* Subject search */}
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
                {filteredSheets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No subjects match.</p>
                ) : (
                  filteredSheets.map(sheet => (
                    <button
                      key={sheet.subjectId}
                      type="button"
                      onClick={() => {
                        setActiveSheetId(sheet.subjectId);
                        setQuery("");
                        setActiveTopic("All");
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                        activeSheetId === sheet.subjectId && !isCrossSearch
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/50"
                      )}
                    >
                      <span className="block">{subjectLabel(sheet.subjectId)}</span>
                      <span className={cn(
                        "block text-[11px]",
                        activeSheetId === sheet.subjectId && !isCrossSearch
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}>
                        {sheet.formulas.length} formulas
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Quick Stats</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{isCrossSearch ? "Matches" : "Visible"}</span>
                  <span className="font-semibold">{visibleFormulas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{isCrossSearch ? "Searched" : "Total"}</span>
                  <span className="font-semibold">
                    {isCrossSearch
                      ? sheets.reduce((a, s) => a + s.formulas.length, 0)
                      : totalFormulas}
                  </span>
                </div>
                {isCrossSearch && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subjects hit</span>
                    <span className="font-semibold">
                      {new Set(crossResults.map(r => r.sheet.subjectId)).size}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-5">

            {/* Search bar */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {isCrossSearch
                      ? `Searching all subjects for "${query}"`
                      : currentSheet ? subjectLabel(currentSheet.subjectId) : "Formulas"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isCrossSearch
                      ? "Results across every subject."
                      : "Search names, topics, and descriptions — or type to search all subjects."}
                  </p>
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setActiveTopic("All"); }}
                    placeholder="Search formulas…"
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

            {/* Topic pills — only shown in single-subject mode */}
            {!isCrossSearch && (
              <div className="flex flex-wrap gap-2">
                {["All", ...topicList].map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setActiveTopic(topic)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      activeTopic === topic
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {!currentSheet && !isCrossSearch ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No formula sheets yet. Add subjects in your profile to unlock them.
              </div>
            ) : isCrossSearch ? (
              crossResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  No formulas match "{query}" across any subject.
                </div>
              ) : (
                // Group cross-search results by subject
                (() => {
                  const bySubject: Record<string, typeof crossResults> = {};
                  for (const r of crossResults) {
                    if (!bySubject[r.sheet.subjectId]) bySubject[r.sheet.subjectId] = [];
                    bySubject[r.sheet.subjectId].push(r);
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
                        {results.map(({ formula }) => (
                          <FormulaCard key={`${subjectId}-${formula.name}`} formula={formula} />
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )
            ) : visibleFormulas === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No formulas match that search.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(activeTopic === "All" ? topicList : [activeTopic]).flatMap(topic =>
                  (filteredTopics[topic] || []).map(formula => (
                    <FormulaCard key={`${topic}-${formula.name}`} formula={formula} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
