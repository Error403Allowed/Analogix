"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import FORMULA_SHEETS, { Formula, FormulaSheet } from "@/data/formulaSheets";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { cn } from "@/lib/utils";

const subjectLabel = (id: string) =>
  SUBJECT_CATALOG.find(s => s.id === id)?.label
  || FORMULA_SHEETS.find(s => s.subjectId === id)?.label
  || id;

const matchesQuery = (formula: Formula, query: string) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return [
    formula.name,
    formula.description,
    formula.topic,
    formula.latex,
  ].some(v => v.toLowerCase().includes(q));
};

const groupByTopic = (formulas: Formula[], query: string) => {
  const grouped: Record<string, Formula[]> = {};
  for (const formula of formulas) {
    if (!matchesQuery(formula, query)) continue;
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
      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
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
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("All");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        setUserSubjects(Array.isArray(prefs.subjects) ? prefs.subjects : []);
      } catch {
        setUserSubjects([]);
      }
    };
    load();
    window.addEventListener("userPreferencesUpdated", load);
    return () => window.removeEventListener("userPreferencesUpdated", load);
  }, []);

  const sheets = useMemo<FormulaSheet[]>(() => {
    if (userSubjects.length === 0) return FORMULA_SHEETS;
    return FORMULA_SHEETS.filter(sheet => userSubjects.includes(sheet.subjectId));
  }, [userSubjects]);

  useEffect(() => {
    if (!sheets.length) return;
    if (!activeSheetId || !sheets.find(s => s.subjectId === activeSheetId)) {
      setActiveSheetId(sheets[0].subjectId);
      setQuery("");
      setActiveTopic("All");
    }
  }, [sheets, activeSheetId]);

  const currentSheet = sheets.find(s => s.subjectId === activeSheetId) || sheets[0];

  const topics = useMemo(() => {
    if (!currentSheet) return {};
    return groupByTopic(currentSheet.formulas, query);
  }, [currentSheet, query]);

  const topicList = useMemo(() => Object.keys(topics).sort(), [topics]);

  useEffect(() => {
    if (activeTopic === "All") return;
    if (!topicList.includes(activeTopic)) setActiveTopic("All");
  }, [activeTopic, topicList]);

  const totalFormulas = currentSheet?.formulas.length || 0;
  const visibleFormulas = Object.values(topics).flat().length;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Subjects</p>
              <div className="mt-3 grid gap-2">
                {sheets.map(sheet => (
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
                      activeSheetId === sheet.subjectId
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:border-primary/50"
                    )}
                  >
                    <span className="block">{subjectLabel(sheet.subjectId)}</span>
                    <span className={cn(
                      "block text-[11px]",
                      activeSheetId === sheet.subjectId ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                    >
                      {sheet.formulas.length} formulas
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Quick Stats</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Visible</span>
                  <span className="font-semibold">{visibleFormulas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{totalFormulas}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{currentSheet ? subjectLabel(currentSheet.subjectId) : "Formulas"}</p>
                  <p className="text-xs text-muted-foreground">Search across names, topics, and descriptions.</p>
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search formulas"
                    className="w-full rounded-xl border border-border bg-background px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                "All",
                ...topicList,
              ].map(topic => (
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

            {!currentSheet ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No formula sheets yet. Add subjects in your profile to unlock them.
              </div>
            ) : visibleFormulas === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No formulas match that search.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(activeTopic === "All" ? topicList : [activeTopic]).flatMap(topic =>
                  (topics[topic] || []).map(formula => (
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
