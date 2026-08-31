"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Sparkles,
  MessageCircle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { ACARA_CURRICULUM } from "@/data/curriculum";
import { cn, cardStyles } from "@/lib/utils";
import { IconBadge } from "@/components/shared/IconBadge";
import { flashcardStore } from "@/utils/flashcardStore";
import { getSubjectTopicProgress, type TopicProgress } from "@/utils/curriculumProgress";
import { toast } from "sonner";

interface AcaraTopic {
  id: string;
  strand: string;
  topic: string;
  contentDescription: string;
  elaborations: string[];
}

interface TopicEnrichment {
  explanation: string;
  examples: string[];
  misconceptions: string[];
  realWorld: string;
}

export default function SubjectCurriculum() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);
  const subjectName = subject?.label;
  const curriculum = subjectName ? (ACARA_CURRICULUM as Record<string, any>)[subjectName] : undefined;

  const availableYears = useMemo(
    () => (curriculum ? Object.keys(curriculum.yearLevels).sort((a, b) => Number(a) - Number(b)) : []),
    [curriculum],
  );

  const [grade, setGrade] = useState<string>("7");
  const [progress, setProgress] = useState<Record<string, TopicProgress>>({});
  const [selectedTopic, setSelectedTopic] = useState<AcaraTopic | null>(null);
  const [busyTopicId, setBusyTopicId] = useState<string | null>(null);
  const [enrichment, setEnrichment] = useState<TopicEnrichment | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      if (prefs.grade) setGrade(String(prefs.grade));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (availableYears.length && !availableYears.includes(grade)) {
      setGrade(availableYears[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableYears]);

  useEffect(() => {
    if (!subjectId) return;
    getSubjectTopicProgress(subjectId).then(setProgress);
  }, [subjectId]);

  useEffect(() => {
    setSelectedTopic(null);
  }, [grade]);

  useEffect(() => {
    if (!selectedTopic) {
      setEnrichment(null);
      return;
    }
    let cancelled = false;
    setEnrichment(null);
    setEnrichmentLoading(true);
    fetch("/api/ai/curriculum-enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId: selectedTopic.id,
        subjectName,
        strand: selectedTopic.strand,
        topic: selectedTopic.topic,
        contentDescription: selectedTopic.contentDescription,
        elaborations: selectedTopic.elaborations,
        grade,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.explanation) setEnrichment(data);
      })
      .catch(() => { /* silent - detail panel just shows the base curriculum data */ })
      .finally(() => { if (!cancelled) setEnrichmentLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTopic, subjectName, grade]);

  const yearData = curriculum?.yearLevels?.[grade];
  const strandEntries: [string, AcaraTopic[]][] = yearData ? Object.entries(yearData.strands) : [];

  // ── Tree layout ──────────────────────────────────────────────────────
  // Computes absolute (x, y) positions for a Year -> Strand -> Topic tree so
  // it can be rendered as real connected nodes (an SVG overlay draws the
  // branches, plain divs render the nodes on top at the same coordinates).
  const TOPIC_GAP = 108;
  const STRAND_GAP = 64;
  const ROW_GAP = 128;
  const PADDING = 70;

  const layout = useMemo(() => {
    if (!strandEntries.length) return null;
    let cursorX = PADDING;
    const strands = strandEntries.map(([name, topics]) => {
      const clusterWidth = Math.max(topics.length, 1) * TOPIC_GAP;
      const topicNodes = topics.map((topic, i) => ({
        topic,
        x: cursorX + TOPIC_GAP / 2 + i * TOPIC_GAP,
      }));
      const centerX = cursorX + clusterWidth / 2;
      cursorX += clusterWidth + STRAND_GAP;
      return { name, topics, centerX, topicNodes };
    });
    const totalWidth = cursorX - STRAND_GAP + PADDING;
    const rootY = 44;
    const strandY = rootY + ROW_GAP;
    const topicY = strandY + ROW_GAP;
    return {
      strands,
      totalWidth: Math.max(totalWidth, 500),
      rootX: totalWidth / 2,
      rootY,
      strandY,
      topicY,
      height: topicY + 60,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strandEntries]);

  const handleExplain = (topic: AcaraTopic) => {
    const prompt = `Explain "${topic.topic}" for Year ${grade} ${subjectName}: ${topic.contentDescription}`;
    try {
      sessionStorage.setItem("analogix_chat_prefill", prompt);
    } catch { /* ignore */ }
    router.push(`/chat?subject=${subjectId}`);
  };

  const handleGenerateFlashcards = async (topic: AcaraTopic) => {
    setBusyTopicId(topic.id);
    try {
      const conversationText = `${topic.topic}: ${topic.contentDescription}\n${(topic.elaborations || []).join("\n")}`;
      const res = await fetch("/api/ai/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationText, subjectId, grade, count: 8 }),
      });
      const data = await res.json();
      if (!data.flashcards?.length) {
        toast.error("Couldn't generate flashcards for this topic.");
        return;
      }
      const set = await flashcardStore.createSet(subjectId, topic.topic, topic.id);
      if (!set) {
        toast.error("Failed to create the flashcard set.");
        return;
      }
      await flashcardStore.add(
        data.flashcards.map((c: { front: string; back: string }) => ({
          setId: set.id,
          subjectId,
          front: c.front,
          back: c.back,
        })),
      );
      toast.success(`Created "${topic.topic}" flashcard set`);
      setProgress(await getSubjectTopicProgress(subjectId));
    } catch {
      toast.error("Something went wrong generating flashcards.");
    } finally {
      setBusyTopicId(null);
    }
  };

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
          <h1 className="text-xl font-semibold mb-2">Subject not found</h1>
          <Button variant="outline" onClick={() => router.push("/subjects")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subjects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/subjects/${subjectId}`)} className="mb-6 -ml-2">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to {subject.label}
        </Button>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Curriculum</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aligned to the Australian Curriculum (v9) for {subject.label}.
            </p>
          </div>
          {availableYears.length > 1 && (
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          )}
        </div>

        {!curriculum ? (
          <div className={cn(cardStyles.default, "p-10 text-center")}>
            <IconBadge icon={BookOpen} tone="muted" size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Curriculum mapping isn&apos;t available for {subject.label} yet.
            </p>
          </div>
        ) : !yearData ? (
          <div className={cn(cardStyles.default, "p-10 text-center")}>
            <p className="text-sm text-muted-foreground">No Year {grade} data available for this subject yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {yearData.achievementStandard && (
              <div className={cn(cardStyles.default, "p-4 bg-primary/5 border-primary/15")}>
                <p className="text-xs font-bold tracking-wide text-primary mb-1">By the end of Year {grade}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{yearData.achievementStandard}</p>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-muted border-2 border-border" /> Not started
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-primary/10 border-2 border-primary" /> In progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-growth border-2 border-growth" /> Covered
              </span>
            </div>

            {/* Tree diagram: Year -> Strand -> Topic, positions computed above,
                connectors drawn with SVG. Generous padding on every side so
                hover rings / selection states never clip against the edge. */}
            {layout && (
              <div className={cn(cardStyles.default, "p-6")}>
                <div className="overflow-x-auto">
                  <div
                    className="relative mx-auto"
                    style={{ width: layout.totalWidth, height: layout.height, minWidth: "100%" }}
                  >
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      width={layout.totalWidth}
                      height={layout.height}
                    >
                      {layout.strands.map((strand) => (
                        <line
                          key={`root-${strand.name}`}
                          x1={layout.rootX}
                          y1={layout.rootY}
                          x2={strand.centerX}
                          y2={layout.strandY}
                          stroke="hsl(var(--border))"
                          strokeWidth={2}
                        />
                      ))}
                      {layout.strands.flatMap((strand) =>
                        strand.topicNodes.map(({ topic, x }) => (
                          <line
                            key={`strand-${topic.id}`}
                            x1={strand.centerX}
                            y1={layout.strandY}
                            x2={x}
                            y2={layout.topicY}
                            stroke="hsl(var(--border))"
                            strokeWidth={2}
                          />
                        )),
                      )}
                    </svg>

                    {/* Root node */}
                    <div
                      className="absolute flex items-center justify-center rounded-full gradient-primary text-white text-xs font-bold px-4 py-2 shadow-sm whitespace-nowrap"
                      style={{ left: layout.rootX, top: layout.rootY, transform: "translate(-50%, -50%)" }}
                    >
                      Year {grade}
                    </div>

                    {/* Strand nodes */}
                    {layout.strands.map((strand) => {
                      const coveredCount = strand.topics.filter((t) => progress[t.id]?.status === "covered").length;
                      return (
                        <div
                          key={strand.name}
                          className="absolute flex flex-col items-center gap-1 w-28"
                          style={{ left: strand.centerX, top: layout.strandY, transform: "translate(-50%, -50%)" }}
                        >
                          <div className={cn(cardStyles.default, "px-3 py-2 text-center w-full")}>
                            <p className="text-xs font-semibold leading-tight line-clamp-2">{strand.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {coveredCount}/{strand.topics.length} covered
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Topic nodes */}
                    {layout.strands.flatMap((strand) =>
                      strand.topicNodes.map(({ topic, x }) => {
                        const status = progress[topic.id]?.status ?? "not-started";
                        const isSelected = selectedTopic?.id === topic.id;
                        return (
                          <div
                            key={topic.id}
                            className="absolute flex flex-col items-center gap-1.5"
                            style={{ left: x, top: layout.topicY, transform: "translate(-50%, -50%)", width: TOPIC_GAP - 12 }}
                          >
                            <button
                              onClick={() => setSelectedTopic(isSelected ? null : topic)}
                              title={topic.topic}
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                                status === "covered" && "bg-growth border-growth bg-muted text-white",
                                status === "in-progress" && "bg-primary/10 border-primary bg-muted text-primary",
                                status === "not-started" && "bg-muted border-border text-muted-foreground",
                                isSelected && "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110",
                              )}
                            >
                              {status === "covered" ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                            </button>
                            <p className="text-[10px] text-center text-muted-foreground leading-tight line-clamp-2">
                              {topic.topic}
                            </p>
                          </div>
                        );
                      }),
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detail panel for the selected topic - full description plus
                elaborations, so the depth already in the curriculum data
                actually shows up instead of being discarded. */}
            {selectedTopic && (
              <div className={cn(cardStyles.default, "p-6")}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <p className="text-[11px] font-bold tracking-wide text-primary uppercase">{selectedTopic.strand}</p>
                    <p className="text-base font-semibold mt-0.5">{selectedTopic.topic}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="text-muted-foreground/60 hover:text-foreground shrink-0 p-1 -m-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                  {selectedTopic.contentDescription}
                </p>

                {selectedTopic.elaborations?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold tracking-wide text-foreground/70 mb-2">In this topic</p>
                    <ul className="space-y-1.5">
                      {selectedTopic.elaborations.map((el, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {el}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI-enriched depth: explanation, worked examples, common
                    misconceptions - generated once per topic and cached, see
                    /api/ai/curriculum-enrich. */}
                {enrichmentLoading && (
                  <div className="mt-5 space-y-2 animate-pulse">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-5/6" />
                    <div className="h-3 bg-muted rounded w-4/6" />
                  </div>
                )}

                {enrichment && !enrichmentLoading && (
                  <div className="mt-5 pt-5 border-t border-border space-y-5">
                    <div>
                      <p className="text-xs font-bold tracking-wide text-foreground/70 mb-2">Explained simply</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{enrichment.explanation}</p>
                    </div>

                    {enrichment.examples?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold tracking-wide text-foreground/70 mb-2">Worked examples</p>
                        <ul className="space-y-1.5">
                          {enrichment.examples.map((ex, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                              <span className="mt-1 h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {enrichment.misconceptions?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold tracking-wide text-foreground/70 mb-2">Common mistakes</p>
                        <ul className="space-y-1.5">
                          {enrichment.misconceptions.map((m, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                              <span className="mt-1.5 h-1 w-1 rounded-full bg-destructive/50 shrink-0" />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {enrichment.realWorld && (
                      <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-bold text-primary">Why it matters: </span>
                          {enrichment.realWorld}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-5">
                  <Button size="sm" variant="outline" onClick={() => handleExplain(selectedTopic)}>
                    <MessageCircle className="h-3.5 w-3.5" /> Explain this
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyTopicId === selectedTopic.id}
                    onClick={() => handleGenerateFlashcards(selectedTopic)}
                  >
                    {busyTopicId === selectedTopic.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate flashcards
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
