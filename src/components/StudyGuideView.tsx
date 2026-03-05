"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ChevronDown, ChevronUp, Pencil, Check, Plus, Trash2,
  GraduationCap, Calendar, Hash, Lightbulb, AlertTriangle,
  BookMarked, ClipboardList, Beaker, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedStudyGuide } from "@/services/groq";

// ── Serialisation helpers ────────────────────────────────────────────────────

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

// ── Grade colour map ──────────────────────────────────────────────────────────
const gradeColors: Record<string, string> = {
  A: "text-emerald-500 border-emerald-500 bg-emerald-500",
  B: "text-blue-500 border-blue-500 bg-blue-500",
  C: "text-amber-500 border-amber-500 bg-amber-500",
  D: "text-red-500 border-red-500 bg-red-500",
  E: "text-rose-700 border-rose-700 bg-rose-700",
};

// ── Tiny inline-editable text ────────────────────────────────────────────────

interface EditProps {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function EditableText({ value, onChange, multiline, placeholder, className, disabled }: EditProps) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (disabled) return <span className={className}>{value}</span>;

  if (editing) {
    const shared = {
      ref,
      value,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
      onBlur: () => setEditing(false),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); setEditing(false); }
        if (e.key === "Escape") setEditing(false);
      },
      className: cn(
        "bg-primary/10 border border-primary/40 rounded-md px-2 py-0.5 outline-none w-full",
        "text-foreground placeholder:text-muted-foreground/40 resize-none",
        className,
      ),
    };
    return multiline
      ? <textarea {...shared} rows={3} />
      : <input {...shared} />;
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={cn(
        "cursor-text rounded px-0.5 hover:bg-primary/10 transition-colors",
        !value && "italic text-muted-foreground/40",
        className,
      )}
    >
      {value || placeholder}
    </span>
  );
}

// ── Editable bullet list ──────────────────────────────────────────────────────

interface BulletListProps {
  items: string[];
  onChange: (items: string[]) => void;
  numbered?: boolean;
  accentClass?: string;
}

function EditableBulletList({ items, onChange, numbered, accentClass = "text-primary" }: BulletListProps) {
  const update = (i: number, val: string) => onChange(items.map((x, idx) => (idx === i ? val : x)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 group">
          <span className={cn("shrink-0 mt-0.5 text-xs font-bold w-4 text-right select-none", accentClass)}>
            {numbered ? `${i + 1}.` : "•"}
          </span>
          <EditableText
            value={item}
            onChange={(v) => update(i, v)}
            placeholder="Add text…"
            className="flex-1 text-sm leading-relaxed"
          />
          <button
            onClick={() => remove(i)}
            className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground/40 hover:text-destructive transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </li>
      ))}
      <li>
        <button
          onClick={add}
          className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors mt-1 ml-6"
        >
          <Plus className="w-3 h-3" /> Add item
        </button>
      </li>
    </ul>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}

function Section({ icon, title, children, defaultOpen = true, accent }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors",
          accent,
        )}
      >
        <span className="text-primary">{icon}</span>
        <span className="flex-1 text-sm font-black uppercase tracking-widest text-muted-foreground">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground/40" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/40" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface StudyGuideViewProps {
  guide: GeneratedStudyGuide;
  onChange: (guide: GeneratedStudyGuide) => void;
}

export default function StudyGuideView({ guide, onChange }: StudyGuideViewProps) {
  const upd = useCallback(
    <K extends keyof GeneratedStudyGuide>(key: K, val: GeneratedStudyGuide[K]) =>
      onChange({ ...guide, [key]: val }),
    [guide, onChange],
  );

  // ── Key concepts collapse state ──────────────────────────────────────────
  const [expandedConcept, setExpandedConcept] = useState<number | null>(0);

  // ── Practice questions collapse ──────────────────────────────────────────
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  return (
    <div className="space-y-5">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 to-primary/5 p-6 space-y-4">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 text-primary shrink-0 mt-1" />
          <h1 className="text-2xl font-black text-foreground leading-tight flex-1">
            <EditableText
              value={guide.title}
              onChange={(v) => upd("title", v)}
              placeholder="Study Guide Title"
              className="font-display"
            />
          </h1>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-xs font-bold text-muted-foreground">
            <Calendar className="w-3 h-3 text-primary" />
            <EditableText
              value={guide.assessmentDate}
              onChange={(v) => upd("assessmentDate", v)}
              placeholder="Due date"
            />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-xs font-bold text-muted-foreground">
            <GraduationCap className="w-3 h-3 text-primary" />
            <EditableText
              value={guide.assessmentType}
              onChange={(v) => upd("assessmentType", v)}
              placeholder="Assessment type"
            />
          </div>
        </div>

        {/* Topics chip cloud */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-2">Topics covered</p>
          <div className="flex flex-wrap gap-1.5">
            {guide.topics.map((topic, i) => (
              <span
                key={i}
                className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary"
              >
                <EditableText
                  value={topic}
                  onChange={(v) => upd("topics", guide.topics.map((t, ti) => (ti === i ? v : t)))}
                  placeholder="Topic"
                />
                <button
                  onClick={() => upd("topics", guide.topics.filter((_, ti) => ti !== i))}
                  className="opacity-0 group-hover:opacity-100 text-primary/50 hover:text-destructive transition-all"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <button
              onClick={() => upd("topics", [...guide.topics, "New topic"])}
              className="px-2.5 py-1 rounded-full border border-dashed border-primary/30 text-xs text-primary/50 hover:text-primary hover:border-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Study Schedule ───────────────────────────────────────────────── */}
      <Section icon={<Calendar className="w-4 h-4" />} title="Study Schedule">
        <div className="space-y-3 pt-2">
          {guide.studySchedule.map((week, wi) => (
            <div
              key={wi}
              className="rounded-xl border border-border/40 bg-muted/20 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-black flex items-center justify-center">
                  {week.week}
                </span>
                <EditableText
                  value={week.label}
                  onChange={(v) =>
                    upd("studySchedule", guide.studySchedule.map((w, i) => (i === wi ? { ...w, label: v } : w)))
                  }
                  placeholder="Week label"
                  className="text-sm font-bold text-foreground"
                />
                <button
                  onClick={() => upd("studySchedule", guide.studySchedule.filter((_, i) => i !== wi))}
                  className="ml-auto text-muted-foreground/30 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <EditableBulletList
                items={week.tasks}
                onChange={(tasks) =>
                  upd("studySchedule", guide.studySchedule.map((w, i) => (i === wi ? { ...w, tasks } : w)))
                }
              />
            </div>
          ))}
          <button
            onClick={() =>
              upd("studySchedule", [
                ...guide.studySchedule,
                { week: guide.studySchedule.length + 1, label: "New week", tasks: [""] },
              ])
            }
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-primary transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add week
          </button>
        </div>
      </Section>

      {/* ── Key Concepts ─────────────────────────────────────────────────── */}
      <Section icon={<Lightbulb className="w-4 h-4" />} title="Key Concepts">
        <div className="space-y-2 pt-2">
          {guide.keyConcepts.map((concept, ci) => (
            <div key={ci} className="rounded-xl border border-border/40 overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-muted/20 hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedConcept(expandedConcept === ci ? null : ci)}
              >
                <Hash className="w-3.5 h-3.5 text-primary shrink-0" />
                <EditableText
                  value={concept.title}
                  onChange={(v) =>
                    upd("keyConcepts", guide.keyConcepts.map((c, i) => (i === ci ? { ...c, title: v } : c)))
                  }
                  placeholder="Concept title"
                  className="flex-1 text-sm font-bold text-foreground"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    upd("keyConcepts", guide.keyConcepts.filter((_, i) => i !== ci));
                  }}
                  className="text-muted-foreground/30 hover:text-destructive transition-colors mr-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                {expandedConcept === ci
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
              </button>
              <AnimatePresence initial={false}>
                {expandedConcept === ci && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-3 border-t border-border/30">
                      <EditableText
                        value={concept.content}
                        onChange={(v) =>
                          upd("keyConcepts", guide.keyConcepts.map((c, i) => (i === ci ? { ...c, content: v } : c)))
                        }
                        multiline
                        placeholder="Explanation…"
                        className="text-sm leading-relaxed text-muted-foreground w-full"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          <button
            onClick={() =>
              upd("keyConcepts", [...guide.keyConcepts, { title: "New Concept", content: "" }])
            }
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-primary transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add concept
          </button>
        </div>
      </Section>

      {/* ── Practice Questions ────────────────────────────────────────────── */}
      <Section icon={<ClipboardList className="w-4 h-4" />} title="Practice Questions">
        <div className="space-y-2 pt-2">
          {guide.practiceQuestions.map((pq, qi) => (
            <div key={qi} className="rounded-xl border border-border/40 overflow-hidden">
              <button
                className="w-full flex items-start gap-3 px-4 py-3 text-left bg-muted/20 hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedQ(expandedQ === qi ? null : qi)}
              >
                <span className="shrink-0 mt-0.5 text-[10px] font-black text-primary w-5 text-right">Q{qi + 1}</span>
                <EditableText
                  value={pq.question}
                  onChange={(v) =>
                    upd("practiceQuestions", guide.practiceQuestions.map((q, i) => (i === qi ? { ...q, question: v } : q)))
                  }
                  placeholder="Question…"
                  className="flex-1 text-sm font-semibold text-foreground"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    upd("practiceQuestions", guide.practiceQuestions.filter((_, i) => i !== qi));
                  }}
                  className="text-muted-foreground/30 hover:text-destructive transition-colors mr-2 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                {expandedQ === qi
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
              </button>
              <AnimatePresence initial={false}>
                {expandedQ === qi && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-3 border-t border-border/30">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1.5">Answer</p>
                      <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                        <EditableText
                          value={pq.answer}
                          onChange={(v) =>
                            upd("practiceQuestions", guide.practiceQuestions.map((q, i) => (i === qi ? { ...q, answer: v } : q)))
                          }
                          multiline
                          placeholder="Model answer…"
                          className="text-sm leading-relaxed text-muted-foreground w-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          <button
            onClick={() =>
              upd("practiceQuestions", [...guide.practiceQuestions, { question: "", answer: "" }])
            }
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-primary transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add question
          </button>
        </div>
      </Section>

      {/* ── Two column: Tips + Common Mistakes ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section icon={<Beaker className="w-4 h-4" />} title="Study Tips" defaultOpen>
          <div className="pt-2">
            <EditableBulletList
              items={guide.tips}
              onChange={(items) => upd("tips", items)}
              accentClass="text-emerald-500"
            />
          </div>
        </Section>

        {guide.commonMistakes && guide.commonMistakes.length > 0 && (
          <Section icon={<AlertTriangle className="w-4 h-4" />} title="Common Mistakes" defaultOpen>
            <div className="pt-2">
              <EditableBulletList
                items={guide.commonMistakes}
                onChange={(items) => upd("commonMistakes", items)}
                accentClass="text-amber-500"
              />
            </div>
          </Section>
        )}
      </div>

      {/* ── Resources ────────────────────────────────────────────────────── */}
      <Section icon={<BookMarked className="w-4 h-4" />} title="Resources" defaultOpen={false}>
        <div className="pt-2">
          <EditableBulletList
            items={guide.resources}
            onChange={(items) => upd("resources", items)}
          />
        </div>
      </Section>

      {/* ── Glossary ─────────────────────────────────────────────────────── */}
      {guide.glossary && guide.glossary.length > 0 && (
        <Section icon={<BookOpen className="w-4 h-4" />} title="Glossary" defaultOpen={false}>
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guide.glossary.map((entry, gi) => (
              <div key={gi} className="group rounded-xl bg-muted/30 border border-border/40 p-3">
                <div className="flex items-start gap-1.5">
                  <div className="flex-1 min-w-0">
                    <EditableText
                      value={entry.term}
                      onChange={(v) =>
                        upd("glossary", guide.glossary!.map((g, i) => (i === gi ? { ...g, term: v } : g)))
                      }
                      placeholder="Term"
                      className="text-xs font-black text-primary block"
                    />
                    <EditableText
                      value={entry.definition}
                      onChange={(v) =>
                        upd("glossary", guide.glossary!.map((g, i) => (i === gi ? { ...g, definition: v } : g)))
                      }
                      multiline
                      placeholder="Definition…"
                      className="text-xs text-muted-foreground mt-1 block"
                    />
                  </div>
                  <button
                    onClick={() => upd("glossary", guide.glossary!.filter((_, i) => i !== gi))}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() =>
                upd("glossary", [...(guide.glossary ?? []), { term: "", definition: "" }])
              }
              className="rounded-xl border border-dashed border-border/40 p-3 text-xs text-muted-foreground/50 hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3 h-3" /> Add term
            </button>
          </div>
        </Section>
      )}

      {/* ── Edit hint footer ──────────────────────────────────────────────── */}
      <p className="text-center text-[11px] text-muted-foreground/30 pb-2">
        <Pencil className="w-3 h-3 inline mr-1 mb-0.5" />
        Click any text to edit it — changes save automatically
      </p>
    </div>
  );
}
