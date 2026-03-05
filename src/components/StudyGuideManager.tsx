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
import { subjectStore, type SubjectDocumentItem } from "@/utils/subjectStore";
import { generateStudyGuide, type GeneratedStudyGuide } from "@/services/groq";
import { encodeStudyGuide } from "@/components/StudyGuideView";
import { toast } from "sonner";

// Kept for backward compat but no longer used for new guides
export const studyGuideToHtml = (_guide: GeneratedStudyGuide): string => "";

// ── Types ────────────────────────────────────────────────────────────────────

interface GuideEntry {
  docId: string;
  subjectId: string;
  title: string;
  lastUpdated: string;
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
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // ── Load all saved study guide documents across subjects ─────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingGuides(true);
      try {
        const all = await subjectStore.getAll();
        const entries: GuideEntry[] = [];
        Object.entries(all).forEach(([subjectId, data]) => {
          (data.notes.documents || []).forEach(doc => {
            // Tag guides by looking for the study guide HTML marker in content
            if (doc.content.startsWith("__STUDY_GUIDE_V2__") || doc.content.includes("📅 Study Schedule") || doc.content.includes("🧠 Key Concepts")) {
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

  // ── File handler ─────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAttachedFile({
        name: file.name,
        type: file.type,
        content: result?.split(",")[1] || "",
      });
    };

    if (file.type === "application/pdf") {
      reader.readAsDataURL(file);
    } else {
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!attachedFile || !selectedSubject || generating) return;

    setGenerating(true);
    try {
      let textContent = `File: ${attachedFile.name}\n`;

      // Decode text files
      if (
        attachedFile.type.startsWith("text/") ||
        attachedFile.type === "application/json"
      ) {
        try {
          textContent += atob(attachedFile.content).slice(0, 8000);
        } catch {
          textContent += "[Could not decode file content]";
        }
      } else {
        textContent += "[Binary file uploaded]";
      }

      const subject = SUBJECT_CATALOG.find(s => s.id === selectedSubject);
      const result = await generateStudyGuide({
        assessmentDetails: textContent,
        fileName: attachedFile.name,
        subject: subject?.label,
        grade: userPrefs.grade,
      });

      if (!result) throw new Error("No result returned");

      const encoded = encodeStudyGuide(result);
      const doc = await subjectStore.createDocument(selectedSubject, result.title);
      await subjectStore.updateDocument(selectedSubject, doc.id, { content: encoded });

      setGenerated(true);
      setAttachedFile(null);
      setShowUpload(false);
      toast.success("Study guide created!");
      setTimeout(() => setGenerated(false), 3000);

      // Navigate straight to the new guide
      router.push(`/subjects/${selectedSubject}/document/${doc.id}`);
    } catch {
      toast.error("Couldn't generate guide. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Delete guide ─────────────────────────────────────────────────────────
  const handleDelete = async (entry: GuideEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    await subjectStore.removeDocument(entry.subjectId, entry.docId);
    setGuides(prev => prev.filter(g => g.docId !== entry.docId));
    toast.success("Guide deleted.");
  };

  const subjectLabel = (id: string) =>
    SUBJECT_CATALOG.find(s => s.id === id)?.label || id;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Study Guides
        </h2>
        <Button
          size="sm"
          variant="ghost"
          className="text-primary gap-1 font-bold"
          onClick={() => setShowUpload(v => !v)}
        >
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
            <div className="glass-card p-4 space-y-3 border-primary/20 bg-background/80 backdrop-blur-xl">
              {/* Subject picker */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                  Subject
                </label>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                  Upload file
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".txt,.pdf,.doc,.docx,text/*"
                />
                {attachedFile ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{attachedFile.name}</span>
                    <button
                      onClick={() => setAttachedFile(null)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground"
                  >
                    <Upload className="w-4 h-4" />
                    Choose file (PDF, TXT, DOC)
                  </button>
                )}
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!attachedFile || !selectedSubject || generating}
                className="w-full h-10 gradient-primary font-bold shadow-lg gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating guide…
                  </>
                ) : generated ? (
                  <>
                    <Check className="w-4 h-4" />
                    Guide created!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Study Guide
                  </>
                )}
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
          <div className="text-center py-8 glass-card border-dashed border-2">
            <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No study guides yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Upload a file and we'll build one for you.
            </p>
          </div>
        ) : (
          guides.slice(0, 5).map(entry => (
            <motion.div
              key={entry.docId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative flex items-center gap-3 glass p-3 rounded-2xl border-l-4 border-l-primary/60 hover:bg-muted/20 transition-all cursor-pointer"
              onClick={() => router.push(`/subjects/${entry.subjectId}/document/${entry.docId}`)}
            >
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm truncate leading-none mb-0.5">{entry.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {subjectLabel(entry.subjectId)}
                  </span>
                  <span>{new Date(entry.lastUpdated).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
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
          <button
            onClick={() => router.push("/subjects")}
            className="w-full text-center text-xs text-muted-foreground/50 hover:text-muted-foreground py-1 transition-colors"
          >
            +{guides.length - 5} more guides — view in Subjects
          </button>
        )}
      </div>
    </div>
  );
};

export default StudyGuideManager;
