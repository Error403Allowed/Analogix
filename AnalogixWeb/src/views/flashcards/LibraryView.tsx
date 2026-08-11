"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check, FolderOpen, Loader2, Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/IconPicker";
import { subjectIconName, subjectLabel, type CardSet } from "./types";

export interface LibraryViewProps {
  totalCards: number;
  setsCount: number;
  duplicateCount: number;
  loading: boolean;
  userSubjects: string[];
  librarySubjects: string[];
  setsBySubject: Record<string, CardSet[]>;
  subjectOptions: string[];
  uploadingFile: boolean;
  isDragOver: boolean;
  pasteText: string;
  pasteExpanded: boolean;
  showSubjectPicker: boolean;
  pickerSubject: string;
  pendingFile: File | null;
  pendingPasteText: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenSubject: (subjectId: string) => void;
  onCreateSet: () => void;
  onFileUpload: (file: File) => void;
  onPasteGenerate: () => void;
  onConfirmGenerate: () => void;
  onSetPasteText: (text: string) => void;
  onSetPasteExpanded: (expanded: boolean) => void;
  onSetShowSubjectPicker: (show: boolean) => void;
  onSetPickerSubject: (subject: string) => void;
  onSetIsDragOver: (over: boolean) => void;
}

export function LibraryView(props: LibraryViewProps) {
  const localFileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = props.fileInputRef ?? localFileInputRef;

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Cards", value: props.totalCards, color: "text-primary" },
          { label: "Sets", value: props.setsCount, color: "text-blue-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className={cn("text-3xl font-black", color)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {props.duplicateCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-600">Cleaned up {props.duplicateCount} orphaned/duplicate cards</p>
            <p className="text-xs text-muted-foreground">Cards without a valid set are automatically removed.</p>
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-black">Generate from content</p>
            <p className="text-xs text-muted-foreground">Upload a file or paste text - AI builds a flashcard set.</p>
          </div>
        </div>

        <div className="p-5 border-b border-border/50">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3">Upload file</p>
          <div
            onDragOver={e => { e.preventDefault(); props.onSetIsDragOver(true); }}
            onDragLeave={() => props.onSetIsDragOver(false)}
            onDrop={e => { e.preventDefault(); props.onSetIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) props.onFileUpload(f); }}
            onClick={() => !props.uploadingFile && inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
              props.isDragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30",
              props.uploadingFile && "pointer-events-none opacity-60",
            )}
          >
            <input ref={inputRef} type="file" className="hidden" accept=".txt,.pdf,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) props.onFileUpload(f); }} />
            {props.uploadingFile ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-sm font-bold">Generating flashcards...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground">Supports .txt, .pdf, .doc, .docx</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          <button
            onClick={() => props.onSetPasteExpanded(!props.pasteExpanded)}
            className="flex items-center justify-between w-full text-left group"
          >
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Paste text</p>
            <span className={cn("text-xs text-muted-foreground transition-transform duration-200", props.pasteExpanded && "rotate-180")}>▾</span>
          </button>
          <AnimatePresence>
            {props.pasteExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  <textarea
                    value={props.pasteText}
                    onChange={e => props.onSetPasteText(e.target.value)}
                    placeholder="Paste your notes, textbook excerpts, or any study content here..."
                    rows={5}
                    className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm resize-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button
                    onClick={props.onPasteGenerate}
                    disabled={!props.pasteText.trim() || props.uploadingFile}
                    className="w-full gap-2"
                  >
                    {props.uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate flashcards from text
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {props.showSubjectPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) props.onSetShowSubjectPicker(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5"
            >
              <div>
                <h3 className="text-lg font-black">Which subject is this for?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {props.pendingFile ? `Generating from "${props.pendingFile.name}"` : "Generating from pasted text"}
                </p>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {props.subjectOptions.map(id => (
                  <button
                    key={id}
                    onClick={() => props.onSetPickerSubject(id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all border",
                      props.pickerSubject === id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/60 hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                      props.pickerSubject === id ? "border-primary bg-primary" : "border-muted-foreground/40",
                    )}>
                      {props.pickerSubject === id && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                    </span>
                    {subjectLabel(id)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => props.onSetShowSubjectPicker(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" onClick={props.onConfirmGenerate} disabled={!props.pickerSubject}>
                  <Sparkles className="w-4 h-4" /> Generate
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Your subjects</h2>
        {props.loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        ) : props.userSubjects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/25" />
            <p className="font-black text-lg mb-1">No subjects yet</p>
            <p className="text-sm text-muted-foreground">Add subjects in your profile to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {props.librarySubjects.map(subId => {
              const subSets = props.setsBySubject[subId] || [];
              const totalSubCards = subSets.reduce((n, s) => n + s.cards.length, 0);
              const dueSubCards = subSets.reduce((n, s) => n + s.dueCount, 0);
              return (
                <motion.div key={subId}
                  whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                  onClick={() => props.onOpenSubject(subId)}
                  className="rounded-2xl border border-border bg-card p-5 cursor-pointer hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DynamicIcon name={subjectIconName(subId)} className="w-5 h-5 text-primary" />
                    </div>
                    {dueSubCards > 0 && (
                      <span className="text-[10px] font-black bg-amber-500/15 text-amber-600 border border-amber-500/30 rounded-full px-2 py-0.5">
                        {dueSubCards} due
                      </span>
                    )}
                  </div>
                  <p className="font-black text-base mb-0.5">{subjectLabel(subId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {subSets.length} set{subSets.length !== 1 ? "s" : ""} · {totalSubCards} card{totalSubCards !== 1 ? "s" : ""}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
