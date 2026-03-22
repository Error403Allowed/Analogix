"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Volume2, VolumeX, Pause, Play, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { subjectStore } from "@/utils/subjectStore";
import { motion } from "framer-motion";
import { useTabs } from "@/context/TabsContext";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import dynamic from "next/dynamic";
import {
  type BlockNoteHandle,
  isBNContent,
} from "@/components/BlockNoteEditor";

type BlockNoteEditorComponent = typeof import("@/components/BlockNoteEditor").BlockNoteEditor;
type BlockNoteEditorProps = React.ComponentPropsWithoutRef<BlockNoteEditorComponent>;

// Dynamically import BlockNoteEditor with ssr:false — required because
// @blocknote's ProseMirror node specs break under Turbopack's SSR evaluation.
const BlockNoteEditor = dynamic<BlockNoteEditorProps>(
  () => import("@/components/BlockNoteEditor").then(m => m.BlockNoteEditor as React.ComponentType<BlockNoteEditorProps>),
  { ssr: false }
) as BlockNoteEditorComponent;

interface SubjectDataUpdateResult {
  type: string;
  success?: boolean;
  docId?: string;
  subjectId?: string;
  newContent?: string;
}

interface SubjectDataUpdatedDetail {
  results?: SubjectDataUpdateResult[];
}

// ── Save label ────────────────────────────────────────────────────────────────
function formatSaved(iso?: string | null) {
  if (!iso) return "Not saved";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(s) || s < 10) return "Saved";
  if (s < 60) return `Saved ${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `Saved ${m}m ago`;
  return `Saved ${Math.floor(m / 60)}h ago`;
}

// Normalise any stored format → something BlockNoteEditor accepts
function normaliseContent(raw: string): string {
  if (!raw) return "__BN__[]";
  if (isBNContent(raw)) return raw;
  // Legacy HTML or study guide JSON — pass as-is; BlockNoteEditor will convert
  return raw;
}

export default function SubjectDocument() {
  const params   = useParams();
  const router   = useRouter();
  const subjectId = (params?.id as string) || "";
  const docId     = (params?.docId as string) || "";
  const subject   = SUBJECT_CATALOG.find(s => s.id === subjectId);

  const [title, setTitle]           = useState("");
  const [rawContent, setRawContent] = useState<string | null>(null); // null = loading
  const [isSaving, setIsSaving]     = useState(false);
  const [lastSaved, setLastSaved]   = useState<string | null>(null);
  const [docMissing, setDocMissing] = useState(false);

  const bnRef         = useRef<BlockNoteHandle>(null);
  const lastSavedRef  = useRef<{ title: string; content: string }>({ title: "", content: "" });
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRemoteRef = useRef<string | null>(null);

  const { updateTabLabelByPath } = useTabs();
  const { isSpeaking, isPaused, supported: ttsOk, speak, pause, resume, stop } = useTextToSpeech();

  // ── Load doc ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const load = async (external = false) => {
      const data = await subjectStore.getSubject(subjectId);
      if (!active) return;

      const doc = (data.notes.documents || []).find(d => d.id === docId);
      if (!doc) { setDocMissing(true); setRawContent("__BN__[]"); return; }

      const storedRaw = doc.content || "__BN__[]";
      if (external && storedRaw === lastRemoteRef.current) return;
      lastRemoteRef.current = storedRaw;

      const normTitle = doc.title || "";
      setTitle(normTitle);
      setLastSaved(doc.lastUpdated || null);
      setDocMissing(false);

      // Normalise to BlockNote format
      const normalised = normaliseContent(storedRaw);
      setRawContent(normalised);
      lastSavedRef.current = { title: normTitle, content: normalised };

      if (normTitle) {
        await new Promise(r => setTimeout(r, 0));
        updateTabLabelByPath(`/subjects/${subjectId}/document/${docId}`, normTitle, "📄");
      }
    };

    load(false);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SubjectDataUpdatedDetail>).detail;
      if (detail?.results) {
        const hit = detail.results.find((r) =>
          ["update_document","replace_study_guide"].includes(r.type) &&
          r.success &&
          (r.docId ? r.docId === docId : r.subjectId === subjectId)
        );
        if (hit?.newContent) {
          const norm = normaliseContent(hit.newContent);
          setRawContent(norm);
          lastSavedRef.current.content = norm;
          lastRemoteRef.current = hit.newContent;
          bnRef.current?.setContent(norm);
          toast.success("Document updated by AI");
          return;
        }
      }
      load(true);
    };

    window.addEventListener("subjectDataUpdated", handler);
    return () => { active = false; window.removeEventListener("subjectDataUpdated", handler); };
  }, [subjectId, docId, updateTabLabelByPath]);

  // ── Autosave ─────────────────────────────────────────────────────────────────
  const handleChange = useCallback((raw: string) => {
    setRawContent(raw);
    if (!docId || docMissing) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSaving(true);
    saveTimer.current = setTimeout(async () => {
      if (title === lastSavedRef.current.title && raw === lastSavedRef.current.content) {
        setIsSaving(false); return;
      }
      await subjectStore.updateDocument(subjectId, docId, { title, content: raw });
      lastSavedRef.current = { title, content: raw };
      setIsSaving(false);
      setLastSaved(new Date().toISOString());
    }, 1000);
  }, [title, subjectId, docId, docMissing]);

  // Save on title change too
  useEffect(() => {
    if (!title || !rawContent || !docId || docMissing) return;
    if (title === lastSavedRef.current.title) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSaving(true);
    saveTimer.current = setTimeout(async () => {
      await subjectStore.updateDocument(subjectId, docId, { title, content: rawContent });
      lastSavedRef.current = { title, content: rawContent };
      setIsSaving(false);
      setLastSaved(new Date().toISOString());
    }, 800);
  }, [title, rawContent, docId, docMissing, subjectId]);

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const handleListen = useCallback(() => {
    if (isSpeaking && !isPaused) { pause(); return; }
    if (isPaused) { resume(); return; }
    const text = bnRef.current?.getPlainText() || "";
    if (text) speak(text, { rate: 1.0, pitch: 1.0 });
  }, [isSpeaking, isPaused, pause, resume, speak]);

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (!subject) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
      <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
      <p className="text-xl font-black">Subject not found</p>
      <Button onClick={() => router.push("/subjects")} size="sm" className="mt-4">Back to subjects</Button>
    </div>
  );

  if (docMissing) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
      <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
      <p className="text-xl font-black">Document not found</p>
      <Button onClick={() => router.push(`/subjects/${subjectId}`)} size="sm" className="mt-4">Go back</Button>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex min-h-full flex-col bg-background">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <button
            onClick={() => router.push(`/subjects/${subjectId}`)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {subject.label}
          </button>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
            {isSaving ? "Saving…" : formatSaved(lastSaved)}
          </span>
        </div>
      </div>

      {/* ── Document body ── */}
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 px-4 pb-28 pt-10 sm:px-6">
        <div className="w-full rounded-[30px] border border-border/50 bg-card/35 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
          <div className="border-b border-border/50 px-6 py-7 sm:px-8 sm:py-8">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/60">
              <span className="rounded-full border border-border/60 bg-muted/45 px-2.5 py-1 font-semibold">
                {subject.label}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 font-medium text-primary/75">
                <Sparkles className="h-3 w-3" /> Autosave
              </span>
              {ttsOk && (
                <button
                  onClick={isSpeaking ? (isPaused ? resume : pause) : handleListen}
                  className="flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground/70 transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
                >
                  {isSpeaking ? (isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />) : <Volume2 className="w-3 h-3" />}
                  <span>{isSpeaking ? (isPaused ? "Resume" : "Pause") : "Listen"}</span>
                </button>
              )}
              {isSpeaking && (
                <button
                  onClick={() => stop()}
                  className="flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground/70 transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
                >
                  <VolumeX className="w-3 h-3" />
                  <span>Stop</span>
                </button>
              )}
            </div>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Untitled"
              className="w-full bg-transparent text-[clamp(2.4rem,5vw,4.3rem)] font-black tracking-[-0.05em] text-foreground outline-none placeholder:text-muted-foreground/20"
            />
          </div>

          <div className="px-3 py-4 sm:px-5 sm:py-6">
            {rawContent === null ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            ) : (
              <BlockNoteEditor
                ref={bnRef}
                key={docId}
                initialContent={rawContent}
                onChange={handleChange}
                placeholder="Start writing… or type / for block types"
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
