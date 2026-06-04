"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { subjectStore, type SubjectDocumentItem } from "@/utils/subjectStore";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SubjectDocumentIndex() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);

  const [documents, setDocuments] = useState<SubjectDocumentItem[]>([]);
  const [docDraft, setDocDraft] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!subjectId || !subject) {
        if (active) setStatus("missing");
        return;
      }
      const data = await subjectStore.getSubject(subjectId);
      if (!active) return;
      setDocuments(data.notes.documents || []);
      setStatus("ready");
    };
    load();
    const handler = () => load();
    window.addEventListener("subjectDataUpdated", handler);
    return () => {
      active = false;
      window.removeEventListener("subjectDataUpdated", handler);
    };
  }, [subjectId, subject]);

  const handleCreateDocument = async () => {
    const created = await subjectStore.createDocument(subjectId, docDraft.trim());
    setDocuments((prev) => [created, ...prev]);
    setDocDraft("");
    router.push(`/subjects/${subjectId}/document/${created.id}`);
  };

  if (status === "missing") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-black text-foreground mb-2">Subject not found</h2>
        <Button onClick={() => router.push("/subjects")}>Go back to subjects</Button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
        <div className="glass-card p-8 text-center">
          <h2 className="text-xl font-black text-foreground">Loading documents…</h2>
          <p className="text-sm text-muted-foreground mt-2">Hang tight while we fetch your notes.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          onClick={() => router.push(`/subjects/${subjectId}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Documents</p>
          <h1 className="text-2xl font-black text-foreground">{subject?.label || "Subject"}</h1>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="New document title (optional)"
            value={docDraft}
            onChange={(e) => setDocDraft(e.target.value)}
            className="bg-muted/30 border-none h-11 rounded-xl text-sm flex-1"
          />
          <Button onClick={handleCreateDocument} className="gradient-primary h-11 rounded-xl text-xs font-black uppercase tracking-widest">
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
        </div>

        <div className="border-t border-border/30 pt-4">
          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">No documents yet.</p>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => router.push(`/subjects/${subjectId}/document/${doc.id}`)}
                className={cn(
                  "w-full text-left py-3 px-4 rounded-xl hover:bg-muted/30 transition-all border border-transparent hover:border-border/30"
                )}
              >
                <p className="text-sm font-bold text-foreground truncate">{doc.title || "Untitled"}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mt-1.5">
                  Updated {new Date(doc.lastUpdated).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
