"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, Plus, ChevronRight } from "lucide-react";
import { subjectStore } from "@/utils/subjectStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { cn } from "@/lib/utils";
import { isStudyGuideDocument } from "@/lib/document-content";

interface DocEntry {
  docId: string;
  subjectId: string;
  subjectLabel: string;
  title: string;
  lastUpdated: string;
  isGuide: boolean;
}

export default function RecentDocs() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await subjectStore.getAll();
        const entries: DocEntry[] = [];
        Object.entries(all).forEach(([subjectId, data]) => {
          const subjectLabel =
            SUBJECT_CATALOG.find(s => s.id === subjectId)?.label || subjectId;
          (data.notes.documents || []).forEach(doc => {
            if (!doc.title && !doc.content) return;
            entries.push({
              docId: doc.id,
              subjectId,
              subjectLabel,
              title: doc.title || "Untitled",
              lastUpdated: doc.lastUpdated,
              isGuide: isStudyGuideDocument(doc),
            });
          });
        });
        entries.sort(
          (a, b) =>
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
        setDocs(entries.slice(0, 5));
      } catch {
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    window.addEventListener("subjectDataUpdated", load);
    return () => window.removeEventListener("subjectDataUpdated", load);
  }, []);

  const ago = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Recent docs
          </span>
        </div>
        <button
          onClick={() => router.push("/subjects")}
          className="text-[10px] font-bold text-primary/70 hover:text-primary transition-colors"
        >
          All subjects →
        </button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <p className="text-xs text-muted-foreground/40">No documents yet</p>
            <button
              onClick={() => router.push("/subjects")}
              className="mt-2 flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" /> Create one
            </button>
          </div>
        ) : (
          docs.map(doc => (
            <button
              key={doc.docId}
              onClick={() =>
                router.push(`/subjects/${doc.subjectId}/document/${doc.docId}`)
              }
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group text-left border border-transparent hover:border-border/30"
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  doc.isGuide
                    ? "bg-primary/15"
                    : "bg-muted/60"
                )}
              >
                {doc.isGuide ? (
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {doc.title}
                </p>
                <p className="text-[10px] text-muted-foreground/50 truncate">
                  {doc.subjectLabel} · {ago(doc.lastUpdated)}
                </p>
              </div>

              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary/40 transition-colors shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
