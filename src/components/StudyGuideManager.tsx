"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Upload, FileText, Sparkles, Loader2,
  ChevronRight, Trash2, Plus, X, Check, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { subjectStore } from "@/utils/subjectStore";
import { toast } from "sonner";
import { extractFileText, ACCEPTED_FILE_TYPES, ACCEPTED_FILE_LABEL } from "@/utils/extractFileText";

export { studyGuideToHtml } from "@/utils/studyGuideHtml";

interface GuideEntry {
  docId: string;
  subjectId: string;
  title: string;
  lastUpdated: string;
}

// ── Loading overlay — Turbolearn style ───────────────────────────────────────

const LOADING_STEPS = [
  "Reading your document…",
  "Identifying key concepts…",
  "Mapping the assessment scope…",
  "Building your study schedule…",
  "Writing practice questions…",
  "Polishing your guide…",
];

function GeneratingOverlay({ fileName }: { fileName: string }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
    >
      <div className="flex flex-col items-center gap-6 max-w-sm w-full px-8 text-center">
        {/* Pulsing icon */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary/30"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          {/* Orbit ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-2xl border-2 border-primary/20 border-t-primary"
          />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-foreground">Building your guide</h2>
          <p className="text-xs text-muted-foreground truncate max-w-[220px]">{fileName}</p>
        </div>

        {/* Step indicator */}
        <div className="w-full space-y-3">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-semibold text-primary h-5"
            >
              {LOADING_STEPS[stepIdx]}
            </motion.p>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "5%" }}
              animate={{ width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5">
            {LOADING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i <= stepIdx ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/50">This usually takes about 30 seconds</p>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const StudyGuideManager = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userPrefs =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
  const subjects: string[] = userPrefs.subjects || [];

  const [guides, setGuides] = useState<GuideEntry[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || "");
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // ── Load guides ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingGuides(true);
      try {
        const all = await subjectStore.getAll();
        const entries: GuideEntry[] = [];
        Object.entries(all).forEach(([subjectId, data]) => {
          (data.notes.documents || []).forEach(doc => {
            const c = doc.content || "";
            if (
              c.startsWith("__STUDY_GUIDE_V2__") ||
              c.startsWith("__STUDY_GUIDE_JSON__") ||
              c.includes("📅 Study Schedule") ||
              c.includes("🧠 Key Concepts") ||
              c.includes("<h2>Study Schedule</h2>") ||
              c.includes("<h2>Key Concepts</h2>")
            ) {
              entries.push({ docId: doc.id, subjectId, title: doc.title || "Untitled Guide", lastUpdated: doc.lastUpdated });
            }
          });
        });
        entries.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        setGuides(entries);
      } catch {
        setGuides([]);
      } finally {
        setLoadingGuides(false);
      }
    };
    load();
    window.addEventListener("subjectDataUpdated", load);
    return () => window.removeEventListener("subjectDataUpdated", load);
  }, []);

  // ── File handler — extract text from any supported file type ───────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileError(null);
    try {
      const text = await extractFileText(file);
      setAttachedFile({ name: file.name, text });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to read file.");
    }
  };

  // ── Generate — redirect to full-page loading screen ─────────────────────
  const handleGenerate = async () => {
    if (!attachedFile || !selectedSubject) return;
    const userPrefs = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
    sessionStorage.setItem("studyGuideJob", JSON.stringify({
      assessmentText: attachedFile.text,
      fileName: attachedFile.name,
      subjectId: selectedSubject,
      grade: userPrefs.grade,
    }));
    setAttachedFile(null);
    setShowUpload(false);
    router.push("/study-guide-loading");
  };

  const handleDelete = async (entry: GuideEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    await subjectStore.removeDocument(entry.subjectId, entry.docId);
    setGuides(prev => prev.filter(g => g.docId !== entry.docId));
    toast.success("Guide deleted.");
  };

  const subjectLabel = (id: string) =>
    SUBJECT_CATALOG.find(s => s.id === id)?.label || id;

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Study Guides
          </h2>
          <Button size="sm" variant="ghost" className="text-primary gap-1 font-bold" onClick={() => setShowUpload(v => !v)}>
            {showUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showUpload ? "Cancel" : "New"}
          </Button>
        </div>

        {/* Upload panel */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-border/40 bg-card/60 p-4 space-y-3">
                {/* Subject picker */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Subject</label>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map(id => (
                      <button
                        key={id}
                        onClick={() => setSelectedSubject(id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                          selectedSubject === id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground bg-background"
                        }`}
                      >
                        {subjectLabel(id)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File picker */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Upload file</label>
                  <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept={ACCEPTED_FILE_TYPES} />
                  {attachedFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1 truncate">{attachedFile.name}</span>
                      <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground"
                    >
                      <Upload className="w-4 h-4" />
                      Choose file — {ACCEPTED_FILE_LABEL}
                    </button>
                  )}
                  {fileError && <p className="mt-1.5 text-xs text-destructive">{fileError}</p>}
                </div>

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!attachedFile || !selectedSubject}
                  className="w-full h-10 gradient-primary font-bold shadow-lg gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Generate Study Guide
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guide list */}
        <div className="space-y-2">
          {loadingGuides ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground/50">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Loading guides…</span>
            </div>
          ) : guides.length === 0 ? (
            <div className="text-center py-8 rounded-2xl border border-dashed border-border/40">
              <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-muted-foreground">No study guides yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Upload a file and we'll build one for you.</p>
            </div>
          ) : (
            guides.map(entry => (
              <motion.div
                key={entry.docId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex items-center gap-3 bg-card/50 border border-border/40 hover:border-primary/30 p-3 rounded-xl transition-all cursor-pointer"
                onClick={() => router.push(`/subjects/${entry.subjectId}/document/${entry.docId}`)}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate leading-none mb-0.5">{entry.title}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{subjectLabel(entry.subjectId)}</span>
                    <span>{new Date(entry.lastUpdated).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive rounded-full"
                    onClick={(e) => handleDelete(entry, e)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            ))
          )}
          {guides.length > 5 && (
            <button onClick={() => router.push("/subjects")} className="w-full text-center text-xs text-muted-foreground/50 hover:text-muted-foreground py-1 transition-colors">
              +{guides.length - 5} more guides — view in Subjects
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default StudyGuideManager;
