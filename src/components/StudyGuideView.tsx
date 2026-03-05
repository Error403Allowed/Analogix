"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedStudyGuide } from "@/services/groq";

// ── Serialisation ─────────────────────────────────────────────────────────────

export const STUDY_GUIDE_V2_PREFIX = "__STUDY_GUIDE_V2__";

export const encodeStudyGuide = (guide: GeneratedStudyGuide): string =>
  STUDY_GUIDE_V2_PREFIX + JSON.stringify(guide);

export const decodeStudyGuide = (raw: string): GeneratedStudyGuide | null => {
  if (!raw.startsWith(STUDY_GUIDE_V2_PREFIX)) return null;
  try {
    return JSON.parse(raw.slice(STUDY_GUIDE_V2_PREFIX.length));
  } catch {
    return null;
  }
};

// ── Grade colours ─────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<string, { topBorder: string; badge: string; dot: string }> = {
  A: { topBorder: "border-t-emerald-500", badge: "bg-emerald-500 text-white", dot: "text-emerald-500" },
  B: { topBorder: "border-t-blue-500",   badge: "bg-blue-500 text-white",    dot: "text-blue-500"   },
  C: { topBorder: "border-t-amber-500",  badge: "bg-amber-500 text-white",   dot: "text-amber-500"  },
  D: { topBorder: "border-t-red-500",    badge: "bg-red-500 text-white",     dot: "text-red-500"    },
  E: { topBorder: "border-t-rose-700",   badge: "bg-rose-700 text-white",    dot: "text-rose-700"   },
};
const gradeStyle = (g: string) =>
  GRADE_STYLES[g.toUpperCase()] ?? { topBorder: "border-t-primary", badge: "bg-primary text-primary-foreground", dot: "text-primary" };

// ── Inline editable text ──────────────────────────────────────────────────────

interface EditProps {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

function E({ value, onChange, multiline, placeholder, className }: EditProps) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const sharedClass = cn(
    "bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5 outline-none w-full",
    "text-foreground placeholder:text-muted-foreground/40 resize-none",
    className,
  );
  const sharedHandlers = {
    value,
    placeholder: placeholder ?? "…",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onBlur: () => setEditing(false),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!multiline && e.key === "Enter") { e.preventDefault(); setEditing(false); }
      if (e.key === "Escape") setEditing(false);
    },
  };

  if (editing) {
    return multiline
      ? <textarea ref={ref} {...sharedHandlers} rows={4} className={sharedClass} />
      : <input    ref={ref} {...sharedHandlers} className={sharedClass} />;
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={cn(
        "cursor-text rounded-sm px-0.5 hover:bg-primary/10 transition-colors break-words",
        !value && "italic text-muted-foreground/40",
        className,
      )}
    >
      {value || placeholder}
    </span>
  );
}

// ── Editable bullet list ──────────────────────────────────────────────────────

function BulletList({
  items, onChange, numbered, dotClass = "text-primary",
}: {
  items: string[]; onChange: (v: string[]) => void; numbered?: boolean; dotClass?: string;
}) {
  const update = (i: number, v: string) => onChange(items.map((x, idx) => (idx === i ? v : x)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 group/bullet">
          <span className={cn("shrink-0 mt-0.5 text-xs font-bold select-none w-4 text-right", dotClass)}>
            {numbered ? `${i + 1}.` : "•"}
          </span>
          <E value={item} onChange={(v) => update(i, v)} placeholder="Item…" className="flex-1 text-sm leading-relaxed" />
          {/* div wrapper prevents nested-button; uses div role=button pattern */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => remove(i)}
            onKeyDown={(e) => e.key === "Enter" && remove(i)}
            className="opacity-0 group-hover/bullet:opacity-100 shrink-0 text-muted-foreground/30 hover:text-destructive transition-all mt-0.5 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </div>
        </li>
      ))}
      <li>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onChange([...items, ""])}
          onKeyDown={(e) => e.key === "Enter" && onChange([...items, ""])}
          className="ml-6 flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-primary transition-colors mt-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> Add item
        </div>
      </li>
    </ul>
  );
}

// ── Section card (collapsible) ────────────────────────────────────────────────

function Card({
  emoji, title, children, defaultOpen = true,
}: {
  emoji: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm overflow-hidden">
      {/* header is a div, not a button, to allow nested interactive content safely */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left hover:bg-muted/20 transition-colors cursor-pointer select-none"
      >
        <span className="text-base leading-none">{emoji}</span>
        <span className="flex-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 pointer-events-none" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 pointer-events-none" />}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-border/30">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Accordion row (concepts / questions) — div-based to avoid nested buttons ─

function AccordionRow({
  header, children, onDelete,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer select-none"
      >
        {header}
        {/* stop-propagation wrapper so clicking delete doesn't toggle accordion */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") onDelete(); }}
          className="text-muted-foreground/20 hover:text-destructive transition-colors mr-1 shrink-0 cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
        </div>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 pointer-events-none" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 pointer-events-none" />}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-border/30">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StudyGuideView({
  guide, onChange,
}: {
  guide: GeneratedStudyGuide;
  onChange: (g: GeneratedStudyGuide) => void;
}) {
  const set = useCallback(
    <K extends keyof GeneratedStudyGuide>(k: K, v: GeneratedStudyGuide[K]) =>
      onChange({ ...guide, [k]: v }),
    [guide, onChange],
  );

  // safe arrays
  const keyPoints  = guide.keyPoints  ?? [];
  const topics     = guide.topics     ?? [];
  const materials  = guide.requiredMaterials ?? [];
  const schedule   = guide.studySchedule ?? [];
  const concepts   = guide.keyConcepts ?? [];
  const questions  = guide.practiceQuestions ?? [];
  const grades     = guide.gradeExpectations ?? [];
  const tips       = guide.tips ?? [];
  const mistakes   = guide.commonMistakes ?? [];
  const resources  = guide.resources ?? [];
  const glossary   = guide.glossary ?? [];

  return (
    <div className="space-y-3 pb-8">

      {/* ── HERO HEADER ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card/90 to-primary/5 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">📚</span>
          <h1 className="text-2xl font-black leading-tight text-foreground font-display flex-1">
            <E value={guide.title} onChange={(v) => set("title", v)} placeholder="Study Guide Title" />
          </h1>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          <E value={guide.overview ?? ""} onChange={(v) => set("overview", v)} multiline placeholder="Brief overview…" className="w-full" />
        </p>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          {(["assessmentType", "assessmentDate", "weighting", "totalMarks"] as const).map((k) => {
            const labels: Record<string, string> = { assessmentType: "Type", assessmentDate: "Due", weighting: "Weighting", totalMarks: "Marks" };
            const val = guide[k] as string | undefined;
            if (!val) return null;
            return (
              <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-xs font-bold text-muted-foreground">
                <span className="text-primary/60">{labels[k]}:</span>
                <E value={val} onChange={(v) => set(k, v)} placeholder={labels[k]} />
              </div>
            );
          })}
        </div>

        {/* Key points */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-2.5">Key Points</p>
          <BulletList items={keyPoints} onChange={(v) => set("keyPoints", v)} dotClass="text-primary" />
        </div>
      </div>

      {/* ── REQUIRED MATERIALS ───────────────────────────────────────────── */}
      {materials.length > 0 && (
        <Card emoji="🛒" title="Required Materials">
          <div className="pt-2">
            <BulletList items={materials} onChange={(v) => set("requiredMaterials", v)} />
          </div>
        </Card>
      )}

      {/* ── TASK STRUCTURE ───────────────────────────────────────────────── */}
      {guide.taskStructure && (
        <Card emoji="📋" title="Task Structure">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {(["practical", "written"] as const).map((side) => {
              const items = guide.taskStructure?.[side] ?? [];
              if (!items.length) return null;
              return (
                <div key={side} className="rounded-lg bg-muted/20 border border-border/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2.5 capitalize">
                    {side} Component
                  </p>
                  <BulletList
                    items={items}
                    onChange={(v) => set("taskStructure", { ...guide.taskStructure, [side]: v })}
                    dotClass="text-primary"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── TOPICS ───────────────────────────────────────────────────────── */}
      <Card emoji="🎯" title="Topics Covered">
        <div className="pt-2 flex flex-wrap gap-2">
          {topics.map((topic, i) => (
            <span key={i} className="group/chip flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <E value={topic} onChange={(v) => set("topics", topics.map((t, ti) => (ti === i ? v : t)))} placeholder="Topic" />
              <div
                role="button" tabIndex={0}
                onClick={() => set("topics", topics.filter((_, ti) => ti !== i))}
                onKeyDown={(e) => e.key === "Enter" && set("topics", topics.filter((_, ti) => ti !== i))}
                className="opacity-0 group-hover/chip:opacity-100 text-primary/40 hover:text-destructive transition-all cursor-pointer ml-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </div>
            </span>
          ))}
          <div
            role="button" tabIndex={0}
            onClick={() => set("topics", [...topics, "New topic"])}
            onKeyDown={(e) => e.key === "Enter" && set("topics", [...topics, "New topic"])}
            className="px-3 py-1.5 rounded-full border border-dashed border-primary/30 text-xs text-primary/50 hover:text-primary hover:border-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </div>
        </div>
      </Card>

      {/* ── STUDY SCHEDULE ───────────────────────────────────────────────── */}
      <Card emoji="📅" title="Study Schedule">
        <div className="space-y-3 pt-2">
          {schedule.map((week, wi) => (
            <div key={wi} className="rounded-lg border border-border/40 bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                  {week.week}
                </span>
                <E
                  value={week.label}
                  onChange={(v) => set("studySchedule", schedule.map((w, i) => (i === wi ? { ...w, label: v } : w)))}
                  placeholder="Week label"
                  className="text-sm font-bold text-foreground flex-1"
                />
                <div
                  role="button" tabIndex={0}
                  onClick={() => set("studySchedule", schedule.filter((_, i) => i !== wi))}
                  onKeyDown={(e) => e.key === "Enter" && set("studySchedule", schedule.filter((_, i) => i !== wi))}
                  className="text-muted-foreground/20 hover:text-destructive transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <BulletList
                items={week.tasks}
                onChange={(tasks) => set("studySchedule", schedule.map((w, i) => (i === wi ? { ...w, tasks } : w)))}
              />
            </div>
          ))}
          <div
            role="button" tabIndex={0}
            onClick={() => set("studySchedule", [...schedule, { week: schedule.length + 1, label: "New Week", tasks: [""] }])}
            onKeyDown={(e) => e.key === "Enter" && set("studySchedule", [...schedule, { week: schedule.length + 1, label: "New Week", tasks: [""] }])}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add week
          </div>
        </div>
      </Card>

      {/* ── KEY CONCEPTS ─────────────────────────────────────────────────── */}
      <Card emoji="🧠" title="Key Concepts">
        <div className="space-y-2 pt-2">
          {concepts.map((concept, ci) => (
            <AccordionRow
              key={ci}
              onDelete={() => set("keyConcepts", concepts.filter((_, i) => i !== ci))}
              header={
                <>
                  <span className="text-xs font-black text-primary shrink-0">#</span>
                  <E
                    value={concept.title}
                    onChange={(v) => set("keyConcepts", concepts.map((c, i) => (i === ci ? { ...c, title: v } : c)))}
                    placeholder="Concept title"
                    className="flex-1 text-sm font-bold text-foreground"
                  />
                </>
              }
            >
              <E
                value={concept.content}
                onChange={(v) => set("keyConcepts", concepts.map((c, i) => (i === ci ? { ...c, content: v } : c)))}
                multiline
                placeholder="Detailed explanation, formulas, worked examples…"
                className="text-sm leading-relaxed text-muted-foreground w-full"
              />
            </AccordionRow>
          ))}
          <div
            role="button" tabIndex={0}
            onClick={() => set("keyConcepts", [...concepts, { title: "New Concept", content: "" }])}
            onKeyDown={(e) => e.key === "Enter" && set("keyConcepts", [...concepts, { title: "New Concept", content: "" }])}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add concept
          </div>
        </div>
      </Card>

      {/* ── KEY TABLE ────────────────────────────────────────────────────── */}
      {guide.keyTable && guide.keyTable.headers.length > 0 && (
        <Card emoji="📊" title="Key Reference Table">
          <div className="pt-2 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {guide.keyTable.headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-primary-foreground bg-primary border-b border-primary/50 first:rounded-tl-lg last:rounded-tr-lg"
                    >
                      <E
                        value={h}
                        onChange={(v) => {
                          const headers = guide.keyTable!.headers.map((x, i) => (i === hi ? v : x));
                          set("keyTable", { ...guide.keyTable!, headers });
                        }}
                        placeholder="Column"
                        className="text-primary-foreground"
                      />
                    </th>
                  ))}
                  <th className="w-8 bg-primary border-b border-primary/50 rounded-tr-lg" />
                </tr>
              </thead>
              <tbody>
                {guide.keyTable.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-muted/10" : "bg-muted/25"}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2.5 border-b border-border/20 text-sm text-foreground/80 align-top">
                        <E
                          value={cell}
                          onChange={(v) => {
                            const rows = guide.keyTable!.rows.map((r, rri) =>
                              rri === ri ? r.map((c, cci) => (cci === ci ? v : c)) : r
                            );
                            set("keyTable", { ...guide.keyTable!, rows });
                          }}
                          placeholder="Cell"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 border-b border-border/20 text-center align-middle">
                      <div
                        role="button" tabIndex={0}
                        onClick={() => set("keyTable", { ...guide.keyTable!, rows: guide.keyTable!.rows.filter((_, i) => i !== ri) })}
                        onKeyDown={(e) => e.key === "Enter" && set("keyTable", { ...guide.keyTable!, rows: guide.keyTable!.rows.filter((_, i) => i !== ri) })}
                        className="text-muted-foreground/20 hover:text-destructive transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-2.5">
              <div
                role="button" tabIndex={0}
                onClick={() => {
                  const blankRow = new Array(guide.keyTable!.headers.length).fill("");
                  set("keyTable", { ...guide.keyTable!, rows: [...guide.keyTable!.rows, blankRow] });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const blankRow = new Array(guide.keyTable!.headers.length).fill("");
                    set("keyTable", { ...guide.keyTable!, rows: [...guide.keyTable!.rows, blankRow] });
                  }
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add row
              </div>
              <div
                role="button" tabIndex={0}
                onClick={() => {
                  const headers = [...guide.keyTable!.headers, "New column"];
                  const rows = guide.keyTable!.rows.map((r) => [...r, ""]);
                  set("keyTable", { headers, rows });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const headers = [...guide.keyTable!.headers, "New column"];
                    const rows = guide.keyTable!.rows.map((r) => [...r, ""]);
                    set("keyTable", { headers, rows });
                  }
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add column
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── PRACTICE QUESTIONS ───────────────────────────────────────────── */}
      <Card emoji="✏️" title="Practice Questions">
        <div className="space-y-2 pt-2">
          {questions.map((pq, qi) => (
            <AccordionRow
              key={qi}
              onDelete={() => set("practiceQuestions", questions.filter((_, i) => i !== qi))}
              header={
                <>
                  <span className="shrink-0 text-[10px] font-black text-primary mt-0.5 w-5 text-right">Q{qi + 1}</span>
                  <E
                    value={pq.question}
                    onChange={(v) => set("practiceQuestions", questions.map((q, i) => (i === qi ? { ...q, question: v } : q)))}
                    placeholder="Question…"
                    className="flex-1 text-sm font-semibold text-foreground"
                  />
                </>
              }
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">Answer</p>
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                <E
                  value={pq.answer}
                  onChange={(v) => set("practiceQuestions", questions.map((q, i) => (i === qi ? { ...q, answer: v } : q)))}
                  multiline
                  placeholder="Model answer…"
                  className="text-sm leading-relaxed text-muted-foreground w-full"
                />
              </div>
            </AccordionRow>
          ))}
          <div
            role="button" tabIndex={0}
            onClick={() => set("practiceQuestions", [...questions, { question: "", answer: "" }])}
            onKeyDown={(e) => e.key === "Enter" && set("practiceQuestions", [...questions, { question: "", answer: "" }])}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add question
          </div>
        </div>
      </Card>

      {/* ── GRADE EXPECTATIONS ───────────────────────────────────────────── */}
      {grades.length > 0 && (
        <Card emoji="📈" title="Assessment Criteria">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {grades.map((g, gi) => {
              const s = gradeStyle(g.grade);
              return (
                <div key={gi} className={cn("rounded-xl border border-border/40 bg-card/60 p-4 border-t-2", s.topBorder)}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("w-7 h-7 rounded-lg text-sm font-black flex items-center justify-center shrink-0", s.badge)}>
                      {g.grade}
                    </span>
                    <div
                      role="button" tabIndex={0}
                      onClick={() => set("gradeExpectations", grades.filter((_, i) => i !== gi))}
                      onKeyDown={(e) => e.key === "Enter" && set("gradeExpectations", grades.filter((_, i) => i !== gi))}
                      className="ml-auto text-muted-foreground/20 hover:text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </div>
                  </div>
                  <BulletList
                    items={g.criteria}
                    onChange={(criteria) =>
                      set("gradeExpectations", grades.map((x, i) => (i === gi ? { ...x, criteria } : x)))
                    }
                    dotClass={s.dot}
                  />
                </div>
              );
            })}
          </div>
          <div
            role="button" tabIndex={0}
            onClick={() => set("gradeExpectations", [...grades, { grade: String.fromCharCode(65 + grades.length), criteria: [""] }])}
            onKeyDown={(e) => e.key === "Enter" && set("gradeExpectations", [...grades, { grade: String.fromCharCode(65 + grades.length), criteria: [""] }])}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-primary transition-colors mt-3 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add grade
          </div>
        </Card>
      )}

      {/* ── TIPS + MISTAKES ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card emoji="💡" title="Study Tips">
          <div className="pt-2">
            <BulletList items={tips} onChange={(v) => set("tips", v)} dotClass="text-emerald-500" />
          </div>
        </Card>
        {mistakes.length > 0 && (
          <Card emoji="⚠️" title="Common Mistakes">
            <div className="pt-2">
              <BulletList items={mistakes} onChange={(v) => set("commonMistakes", v)} dotClass="text-amber-500" />
            </div>
          </Card>
        )}
      </div>

      {/* ── RESOURCES ────────────────────────────────────────────────────── */}
      <Card emoji="📖" title="Resources" defaultOpen={false}>
        <div className="pt-2">
          <BulletList items={resources} onChange={(v) => set("resources", v)} />
        </div>
      </Card>

      {/* ── GLOSSARY ─────────────────────────────────────────────────────── */}
      {glossary.length > 0 && (
        <Card emoji="📖" title="Glossary" defaultOpen={false}>
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {glossary.map((entry, gi) => (
              <div key={gi} className="group/gloss rounded-xl bg-muted/20 border border-border/30 p-3">
                <div className="flex items-start gap-1.5">
                  <div className="flex-1 min-w-0">
                    <E value={entry.term} onChange={(v) => set("glossary", glossary.map((g, i) => (i === gi ? { ...g, term: v } : g)))} placeholder="Term" className="text-xs font-black text-primary block" />
                    <E value={entry.definition} onChange={(v) => set("glossary", glossary.map((g, i) => (i === gi ? { ...g, definition: v } : g)))} multiline placeholder="Definition…" className="text-xs text-muted-foreground mt-1 block" />
                  </div>
                  <div
                    role="button" tabIndex={0}
                    onClick={() => set("glossary", glossary.filter((_, i) => i !== gi))}
                    onKeyDown={(e) => e.key === "Enter" && set("glossary", glossary.filter((_, i) => i !== gi))}
                    className="opacity-0 group-hover/gloss:opacity-100 text-muted-foreground/20 hover:text-destructive transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
            <div
              role="button" tabIndex={0}
              onClick={() => set("glossary", [...glossary, { term: "", definition: "" }])}
              onKeyDown={(e) => e.key === "Enter" && set("glossary", [...glossary, { term: "", definition: "" }])}
              className="rounded-xl border border-dashed border-border/30 p-3 text-xs text-muted-foreground/40 hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add term
            </div>
          </div>
        </Card>
      )}

      {/* Footer hint */}
      <p className="text-center text-[11px] text-muted-foreground/25 pb-2 flex items-center justify-center gap-1.5">
        <Pencil className="w-3 h-3" />
        Click any text to edit — changes save automatically
      </p>
    </div>
  );
}
