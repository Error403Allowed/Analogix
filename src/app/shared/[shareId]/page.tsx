"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Loader2, ArrowLeft, Volume2, Pause, Play, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { getDocumentPlainText } from "@/lib/document-content";
import type { DocumentRole } from "@/lib/document-content";

type BlockNoteEditorComponent = typeof import("@/components/BlockNoteEditor").BlockNoteEditor;
type BlockNoteEditorProps = React.ComponentPropsWithoutRef<BlockNoteEditorComponent>;

const BlockNoteEditor = dynamic<BlockNoteEditorProps>(
  () => import("@/components/BlockNoteEditor").then((module) => module.BlockNoteEditor),
  { ssr: false }
) as BlockNoteEditorComponent;

interface SharedDocumentData {
  id: string;
  title: string;
  content: string;
  contentJson?: string;
  contentText?: string;
  contentFormat?: string;
  role?: DocumentRole;
  studyGuideData?: any;
  icon?: string | null;
  cover?: string | null;
  createdAt: string;
  lastUpdated: string;
}

interface ShareInfo {
  id: string;
  permission: "view" | "edit";
  expires_at: string | null;
}

export default function PublicSharedDocument() {
  const params = useParams();
  const router = useRouter();
  const shareId = params?.shareId as string;

  const [document, setDocument] = useState<SharedDocumentData | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const editorRef = useRef<any>(null);
  const { isSpeaking, isPaused, supported: ttsOk, speak, pause, resume } = useTextToSpeech();

  // No-op handler for shared documents (changes aren't saved in this view)
  const handleEditorChange = useCallback(() => {}, []);

  useEffect(() => {
    loadSharedDocument();
  }, [shareId]);

  const loadSharedDocument = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/shares/access/${shareId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load document");
        return;
      }

      if (data.success) {
        setDocument(data.document);
        setShareInfo(data.share);
        setIsAuthenticated(data.isAuthenticated);
      } else {
        setError(data.error || "Invalid share link");
      }
    } catch (error) {
      console.error("[PublicSharedDocument] load failed:", error);
      setError("Failed to load document");
    } finally {
      setIsLoading(false);
    }
  };

  const handleListen = useCallback(() => {
    if (!document) return;
    const text = editorRef.current?.getPlainText() || getDocumentPlainText(document);
    if (text) {
      if (isSpeaking && !isPaused) {
        pause();
      } else if (isPaused) {
        resume();
      } else {
        speak(text, { rate: 1, pitch: 1 });
      }
    }
  }, [document, isSpeaking, isPaused, pause, resume, speak]);

  const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
  const plainText = document ? getDocumentPlainText(document) : "";
  const stats = {
    words: wordCount(plainText),
    characters: plainText.length,
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-8">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary/50" />
        <p className="text-muted-foreground">Loading shared document...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <p className="text-xl font-black mb-2">
          {error || "Document not found"}
        </p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => router.push("/")} size="sm">
            Go Home
          </Button>
          <Button onClick={() => router.push("/login")} variant="outline" size="sm">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const isReadOnly = shareInfo?.permission !== "edit";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="document-shell notion-ui fade-in"
    >
      {/* Header */}
      <header className="document-header">
        <div className="flex items-center gap-2 overflow-hidden mr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm font-medium truncate text-foreground/70 px-2">
            {document.title || "Untitled"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-medium">
            <span>{isReadOnly ? "👁️ Viewing" : "✏️ Editing"}</span>
          </div>

          {!isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/login")}
              className="h-8"
            >
              <LogIn className="h-3 w-3 mr-1.5" />
              Sign in
            </Button>
          )}
        </div>
      </header>

      <main className="document-content-area">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="document-container">
            {/* Document Icon & Title */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl">
                {document.icon || "📄"}
              </div>

              <h1 className="text-4xl font-black tracking-tight">
                {document.title || "Untitled Document"}
              </h1>

              {/* Share Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Shared via link</span>
                {shareInfo?.expires_at && (
                  <span>
                    • Expires {new Date(shareInfo.expires_at).toLocaleDateString()}
                  </span>
                )}
                {!isAuthenticated && (
                  <span className="text-amber-600">
                    • Sign in to edit
                  </span>
                )}
              </div>
            </div>

            {/* Editor Area */}
            <div className="min-h-[70vh]">
              <BlockNoteEditor
                key={`shared-${shareId}`}
                ref={editorRef}
                initialContent={document.content}
                onChange={handleEditorChange}
                editable={!isReadOnly && isAuthenticated}
                subjectLabel="Shared"
                documentTitle={document.title}
              />
            </div>

            {/* Footer Stats */}
            <div className="mt-24 pt-8 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground/40 font-medium tracking-wide uppercase">
              <div className="flex items-center gap-6">
                <span>{stats.words} words</span>
                <span>{stats.characters} characters</span>
                <span>{document.role === "study-guide" ? "Study Guide" : "Notes"}</span>
              </div>
              {ttsOk && (
                <button
                  onClick={handleListen}
                  className="hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  {isSpeaking ? (isPaused ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />) : <Volume2 className="h-3 w-3" />}
                  {isSpeaking ? (isPaused ? "Resume" : "Pause") : "Listen"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="fixed bottom-6 right-6 max-w-sm p-4 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-sm shadow-lg">
          <p className="text-sm font-medium">
            👁️ This document is in view-only mode.
          </p>
        </div>
      )}

      {!isAuthenticated && (
        <div className="fixed bottom-6 left-6 max-w-sm p-4 rounded-lg border border-amber-500/20 bg-amber-500/10 backdrop-blur-sm shadow-lg">
          <p className="text-sm font-medium text-amber-700">
            🔒 Sign in to edit this document
          </p>
        </div>
      )}
    </motion.div>
  );
}
