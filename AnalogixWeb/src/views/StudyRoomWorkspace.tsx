/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Clock3,
  Copy,
  Crown,
  DoorOpen,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Users,
  MessageSquare,
  PencilRuler,
  FileText,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useTabs } from "@/context/TabsContext";
import { useRoomCollaboration } from "@/hooks/useRoomCollaboration";
import { subjectStore } from "@/utils/subjectStore";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type {
  RoomSharedDocument,
  StudyRoom,
  StudyRoomMember,
  StudyRoomMessage,
} from "@/types/rooms";

type BlockNoteEditorComponent = typeof import("@/components/BlockNoteEditor").BlockNoteEditor;
type BlockNoteEditorProps = React.ComponentPropsWithoutRef<BlockNoteEditorComponent>;

const BlockNoteEditor = dynamic<BlockNoteEditorProps>(
  () => import("@/components/BlockNoteEditor").then((module) => module.BlockNoteEditor),
  { ssr: false },
) as BlockNoteEditorComponent;

interface RoomStateResponse {
  room: StudyRoom;
  members: StudyRoomMember[];
  messages: StudyRoomMessage[];
  sharedDocuments: RoomSharedDocument[];
}

interface SharedDocumentRecord {
  id: string;
  subject_id: string;
  title: string;
  content: string;
  content_json?: string | null;
  content_text?: string | null;
  content_format?: string | null;
  role?: string | null;
}

const formatClock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const roleLabel = (role: StudyRoomMember["role"]) => {
  if (role === "host") return "Host";
  if (role === "cohost") return "Co-host";
  return "Member";
};

const parseThinkingContent = (content: string): { thinking: string | null; response: string } => {
  const trimmed = content.trimStart();
  const completeMatch = trimmed.match(/^<think>([\s\S]*?)<\/think>\s*/);
  if (completeMatch) {
    const response = trimmed.slice(completeMatch[0].length).trim();
    if (!response) {
      return { thinking: completeMatch[1].trim(), response: "" };
    }
    return { thinking: completeMatch[1].trim(), response };
  }
  const openOnly = trimmed.match(/^<think>([\s\S]*)$/);
  if (openOnly) {
    return { thinking: openOnly[1].trim(), response: "" };
  }
  return { thinking: null, response: content };
};

const ThinkingBlock = ({ content }: { content: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors mb-1.5"
      >
        <motion.svg
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
        >
          <path d="M3 1.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </motion.svg>
        <span className="text-[11px] font-medium select-none tracking-wide">
          {open ? "Hide thinking" : "Show thinking"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="thinking-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 border-l-2 border-border/40">
              <div className="text-xs text-muted-foreground/55 italic leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
                <MarkdownRenderer content={content} className="text-xs" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const sections = [
  { id: "chat" as const, label: "Chat", icon: MessageSquare },
  { id: "workspace" as const, label: "Workspace", icon: PencilRuler },
  { id: "documents" as const, label: "Documents", icon: FileText },
];

export default function StudyRoomWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const { updateTabLabelByPath } = useTabs();
  const roomId = pathname?.split("/rooms/")[1] || "";

  const [state, setState] = useState<RoomStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<"chat" | "workspace" | "documents">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"chat" | "ai">("chat");
  const [composer, setComposer] = useState("");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<SharedDocumentRecord | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("<p></p>");
  const [timerMinutes, setTimerMinutes] = useState("25");
  const [tick, setTick] = useState(Date.now());
  const [showTimerControls, setShowTimerControls] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loadedDocumentIdRef = useRef<string | null>(null);
  const documentSaveTimerRef = useRef<number | null>(null);
  const flushDocumentRef = useRef<() => Promise<void>>(async () => {});

  const documentCollab = useRoomCollaboration({
    roomId,
    surfaceType: "document",
    surfaceId: activeDocumentId || "room-doc-placeholder",
  } as any);

  useEffect(() => {
    flushDocumentRef.current = documentCollab.flush;
  }, [documentCollab.flush]);

  useEffect(() => {
    return () => {
      flushDocumentRef.current().catch(console.warn);
    };
  }, []);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const response = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
      if (!response.ok) {
        let errorMsg = "Failed to load room";
        try {
          const ct = response.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const p = await response.json();
            errorMsg = p?.error || errorMsg;
          } else {
            const t = await response.text();
            console.error("[StudyRoomWorkspace] loadRoom non-JSON response:", response.status, t.slice(0, 300));
          }
        } catch { /* ignore parse errors */ }
        console.error("[StudyRoomWorkspace] loadRoom HTTP error:", response.status);
        throw new Error(errorMsg);
      }
      const payload = await response.json();
      setState(payload as RoomStateResponse);

      if (payload.room?.title) {
        updateTabLabelByPath(`/rooms/${roomId}`, payload.room.title, "👥");
      }
    } catch (error) {
      console.error("[StudyRoomWorkspace] loadRoom failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load room");
    } finally {
      setLoading(false);
    }
  }, [roomId, updateTabLabelByPath]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadRoom();
    }, 8000);
    return () => window.clearInterval(interval);
  }, [loadRoom]);

  useEffect(() => {
    if (!roomId) return undefined;

    const sendPresence = (online: boolean) =>
      fetch(`/api/rooms/${roomId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online }),
        keepalive: !online,
      }).catch(() => undefined);

    void sendPresence(true);
    const interval = window.setInterval(() => {
      void sendPresence(true);
    }, 20000);

    const handlePageHide = () => {
      void sendPresence(false);
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", handlePageHide);
      void sendPresence(false);
    };
  }, [roomId]);

  const onlineMembers = useMemo(
    () => (state?.members || []).filter((member) => member.isOnline),
    [state?.members],
  );

  const canControlTimer = Boolean(
    state?.room?.isOwner ||
      state?.room?.viewerRole === "host" ||
      state?.room?.viewerRole === "cohost",
  );

  const roomJoined = Boolean(state?.room?.isOwner || state?.room?.viewerRole);
  const currentUserName = documentCollab.user.name;

  useEffect(() => {
    if (!activeDocumentId || !roomJoined) {
      setSelectedDocument(null);
      setDocumentTitle("");
      setDocumentContent("<p></p>");
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/documents/${activeDocumentId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          let errorMsg = "Failed to load shared document";
          // Try to parse error response as JSON, fall back to text or status-based message
          try {
            const ct = response.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const payload = await response.json();
              if (payload?.error) errorMsg = payload.error;
            } else {
              const text = await response.text();
              // If it's HTML, use a status-based message instead
              if (text.includes("<!DOCTYPE") || text.includes("<html")) {
                errorMsg = response.status === 404 ? "Document not found" : `Server error (${response.status})`;
              } else if (text) {
                errorMsg = text.slice(0, 200);
              }
            }
          } catch {
            // Response body not parseable at all
            errorMsg = response.status === 404 ? "Document not found" : response.status === 403 ? "Access denied" : `Server error (${response.status})`;
          }
          throw new Error(errorMsg);
        }
        const payload = await response.json();
        if (cancelled) return;
        setSelectedDocument(payload.document as SharedDocumentRecord);
        loadedDocumentIdRef.current = activeDocumentId;
        setDocumentTitle(String(payload.document.title || "Untitled"));
        setDocumentContent(String(payload.document.content || "<p></p>"));
      } catch (error) {
        console.error("[StudyRoomWorkspace] loadDocument failed:", error);
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [activeDocumentId, roomId, roomJoined]);

  useEffect(() => {
    if (!state?.room || state.room.timerState !== "running") return undefined;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state?.room?.timerState]);

  useEffect(() => {
    if (inRoom && state?.messages) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [state?.messages, inRoom]);

  useEffect(() => {
    if (roomJoined && state?.sharedDocuments.length && !activeDocumentId) {
      setActiveDocumentId(state.sharedDocuments[0].documentId);
    }
  }, [roomJoined, state?.sharedDocuments]);

  const elapsedSeconds = useMemo(() => {
    if (!state?.room) return 0;
    const base = state.room.timerElapsedSeconds;
    if (state.room.timerState !== "running" || !state.room.timerStartedAt) return base;
    const startedAt = new Date(state.room.timerStartedAt).getTime();
    if (!Number.isFinite(startedAt)) return base;
    return base + Math.max(0, Math.floor((tick - startedAt) / 1000));
  }, [state?.room, tick]);

  const remainingSeconds = state?.room
    ? Math.max(0, state.room.timerDurationSeconds - elapsedSeconds)
    : 0;

  const queueDocumentSave = useCallback((nextContent: string, nextTitle: string) => {
    if (!activeDocumentId) return;
    if (documentSaveTimerRef.current) window.clearTimeout(documentSaveTimerRef.current);
    documentSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch(`/api/rooms/${roomId}/documents/${activeDocumentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nextTitle,
            content: nextContent,
          }),
        });
      } catch (error) {
        console.error("[StudyRoomWorkspace] document save failed:", error);
      }
    }, 900);
  }, [activeDocumentId, roomId]);

  const handleJoinRoom = async () => {
    setJoining(true);
    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to join room");
      }
      const payload = await response.json();
      setState(payload as RoomStateResponse);
      toast.success("Joined room.");
    } catch (error) {
      console.error("[StudyRoomWorkspace] join failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setJoining(false);
    }
  };

  const handleEnterRoom = () => {
    setInRoom(true);
  };

  const handleLeaveRoom = () => {
    setInRoom(false);
  };

  const sendMessage = async () => {
    const content = composer.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const endpoint = composerMode === "ai"
        ? `/api/rooms/${roomId}/ai`
        : `/api/rooms/${roomId}/messages`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          composerMode === "ai"
            ? { prompt: content }
            : { content },
        ),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to send message");
      }
      const payload = await response.json();
      setComposer("");
      setState((current) => current ? {
        ...current,
        messages: Array.isArray(payload.messages) ? payload.messages : current.messages,
      } : current);
    } catch (error) {
      console.error("[StudyRoomWorkspace] sendMessage failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const updateTimer = async (action: "start" | "pause" | "resume" | "reset") => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/timer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          durationSeconds: Number(timerMinutes || "25") * 60,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update timer");
      }
      const payload = await response.json();
      setState((current) => current ? { ...current, room: payload.room } : current);
    } catch (error) {
      console.error("[StudyRoomWorkspace] updateTimer failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update timer");
    }
  };

  const updateMemberRole = async (member: StudyRoomMember) => {
    try {
      const nextRole = member.role === "cohost" ? "member" : "cohost";
      const response = await fetch(`/api/rooms/${roomId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.userId,
          role: nextRole,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update member");
      }
      const payload = await response.json();
      setState((current) => current ? { ...current, members: payload.members } : current);
    } catch (error) {
      console.error("[StudyRoomWorkspace] updateMemberRole failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update member");
    }
  };

  const copyJoinCode = async () => {
    if (!state?.room?.joinCode) return;
    try {
      await navigator.clipboard.writeText(state.room.joinCode);
      toast.success("Join code copied.");
    } catch {
      toast.error("Could not copy join code");
    }
  };

  const leaveRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to leave room");
      }
      router.push("/rooms");
    } catch (error) {
      console.error("[StudyRoomWorkspace] leaveRoom failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to leave room");
    }
  };

  const copyCurrentDocument = async () => {
    if (!selectedDocument) return;
    try {
      const created = await subjectStore.createDocument(
        selectedDocument.subject_id,
        `${documentTitle || selectedDocument.title} (Copy)`,
      );
      await subjectStore.updateDocument(selectedDocument.subject_id, created.id, {
        title: `${documentTitle || selectedDocument.title} (Copy)`,
        content: documentContent,
      });
      toast.success("Copied to your personal documents.");
    } catch (error) {
      console.error("[StudyRoomWorkspace] copyCurrentDocument failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to copy document");
    }
  };

  const handleSectionChange = (section: "chat" | "workspace" | "documents") => {
    setActiveSection(section);
    if (section === "workspace" && activeDocumentId) {
      setSidebarOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!state?.room) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">Room not found</p>
        <Button onClick={() => router.push("/rooms")}>Back to rooms</Button>
      </div>
    );
  }

  /* ─── Room Overview (before entering) ─── */
  if (!inRoom) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-6 px-6 py-6 lg:px-8">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="text-2xl font-extrabold tracking-tight text-foreground">{state.room.title}</p>
              <Badge variant="secondary" className="capitalize">{state.room.visibility}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{state.room.topic || "No topic set yet."}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {state.room.memberCount} members
              </span>
              <span>{onlineMembers.length} studying now</span>
              <span>Code {state.room.joinCode}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={copyJoinCode}>
              <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
              Copy code
            </Button>
            <Button variant="secondary" onClick={() => void loadRoom()}>
              <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Timer + Members grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Timer */}
          <div className="rounded-[24px] border border-border/30 bg-muted/30 p-4 dark:border-border/60 dark:bg-muted/20">
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Synced timer
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Clock3 className="h-5 w-5 text-muted-foreground" />
                <span className="text-4xl font-black tabular-nums text-foreground">{formatClock(remainingSeconds)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {state.room.timerState === "running"
                  ? "The room is in a live focus block."
                  : state.room.timerState === "paused"
                    ? "The timer is paused for everyone."
                    : "Set the next focus block and start together."}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Input
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value.replace(/[^\d]/g, ""))}
                className="w-20"
                disabled={!canControlTimer}
              />
              <Button size="sm" disabled={!canControlTimer} onClick={() => void updateTimer("start")}>
                <Play className="mr-1 h-3.5 w-3.5" />
                Start
              </Button>
              <Button size="sm" variant="secondary" disabled={!canControlTimer} onClick={() => void updateTimer("pause")}>
                <Pause className="mr-1 h-3.5 w-3.5" />
                Pause
              </Button>
              <Button size="sm" variant="secondary" disabled={!canControlTimer} onClick={() => void updateTimer("resume")}>
                <Play className="mr-1 h-3.5 w-3.5" />
                Resume
              </Button>
              <Button size="sm" variant="secondary" disabled={!canControlTimer} onClick={() => void updateTimer("reset")}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>

          {/* Members */}
          <div className="rounded-[24px] border border-border/30 bg-muted/30 p-4 dark:border-border/60 dark:bg-muted/20">
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Active members
              </p>
              <div className="space-y-2">
                {state.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-background/50 px-3 py-2 dark:border-border/50 dark:bg-muted/20">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{member.name}</p>
                          {member.role === "host" ? <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" /> : null}
                          {member.role === "cohost" ? <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.isOnline ? "Online" : "Away"}</p>
                      </div>
                    </div>
                    {state.room.isOwner && member.role !== "host" ? (
                      <Button size="sm" variant="ghost" onClick={() => void updateMemberRole(member)}>
                        {member.role === "cohost" ? "Remove" : "Make"}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Join / Enter */}
        {!roomJoined ? (
          <div className="rounded-[28px] border border-border/30 bg-muted/30 p-6 shadow-sm dark:border-border/60 dark:bg-muted/20">
            <p className="text-lg font-bold">Join this room to participate.</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Public rooms can be joined directly. Private rooms need an invite code from the host.
            </p>
            <div className="mt-5">
              <Button disabled={joining || state.room.visibility === "private"} onClick={() => void handleJoinRoom()}>
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join room"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center pt-2">
            <Button size="lg" onClick={handleEnterRoom} className="px-8">
              Enter room
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  /* ─── In-Room Workspace ─── */
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Compact Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/30 px-4 py-2 dark:border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
            onClick={handleLeaveRoom}
          >
            <ChevronLeft className="h-4 w-4" />
            <p className="text-sm font-bold truncate">{state.room.title}</p>
          </button>
          <Badge variant="secondary" className="capitalize text-xs">{state.room.visibility}</Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Compact Timer */}
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-bold tabular-nums">{formatClock(remainingSeconds)}</span>
            {canControlTimer && (
              <div className="flex items-center gap-0.5">
                {state.room.timerState === "running" ? (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void updateTimer("pause")}>
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void updateTimer(state.room.timerState === "paused" ? "resume" : "start")}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowTimerControls(!showTimerControls)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Timer expanded controls */}
          <AnimatePresence>
            {showTimerControls && canControlTimer && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-1 overflow-hidden"
              >
                <Input
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-14 h-7 text-xs"
                />
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void updateTimer("reset")}>
                  Reset
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Online Members */}
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {onlineMembers.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium"
                  title={m.name}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{onlineMembers.length} online</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 border-l border-border/30 pl-3 dark:border-border/60">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyJoinCode} title="Copy join code">
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void loadRoom()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={leaveRoom} title="Leave room">
              <DoorOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Timer status bar */}
      {state.room.timerState === "running" && (
        <div className="shrink-0 bg-primary/5 px-4 py-1 text-center text-xs text-muted-foreground">
          Focus block in progress
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 200 : 56 }}
          className="shrink-0 border-r border-border/30 bg-muted/20 dark:border-border/60 dark:bg-muted/10 flex flex-col overflow-hidden"
        >
          {/* Section nav */}
          <div className="flex flex-col gap-1 p-2">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSectionChange(id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  activeSection === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </button>
            ))}
          </div>

          {/* Document list (shown when workspace or documents is active) */}
          {(activeSection === "workspace" || activeSection === "documents") && state.sharedDocuments.length > 0 && (
            <>
              <div className="mx-2 mt-2 border-t border-border/20 dark:border-border/40" />
              <div className="flex items-center justify-between px-3 py-2">
                {sidebarOpen && <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</span>}
                <button
                  className="ml-auto rounded p-1 hover:bg-muted/60 text-muted-foreground"
                  title="Toggle sidebar"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
              <ScrollArea className="flex-1 px-2 pb-2">
                <div className="flex flex-col gap-0.5">
                  {state.sharedDocuments.map((doc) => (
                    <button
                      key={doc.documentId}
                      onClick={() => {
                        setActiveDocumentId(doc.documentId);
                        if (activeSection === "documents") setActiveSection("workspace");
                      }}
                      className={`w-full rounded-md px-3 py-2 text-left text-xs transition ${
                        activeDocumentId === doc.documentId
                          ? "bg-muted dark:bg-muted/70 font-medium"
                          : "text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {sidebarOpen ? (
                        <>
                          <p className="truncate">{doc.title}</p>
                          <p className="text-[10px] text-muted-foreground/70">{doc.role === "study-guide" ? "Study guide" : "Notes"}</p>
                        </>
                      ) : (
                        <div className="flex justify-center">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Toggle button - always shown */}
          <div className="mt-auto p-2">
            <button
              className="w-full rounded p-1.5 hover:bg-muted/60 text-muted-foreground flex justify-center"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Chat Section */}
          {activeSection === "chat" && (
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <div className="border-b border-border/30 px-4 py-2 dark:border-border/60 flex items-center justify-between">
                <p className="text-sm font-semibold">Group conversation</p>
                <div className="flex rounded-lg border border-border/60 p-0.5">
                  <button
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${composerMode === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                    onClick={() => setComposerMode("chat")}
                  >
                    Chat
                  </button>
                  <button
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${composerMode === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                    onClick={() => setComposerMode("ai")}
                  >
                    AI
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col min-h-0">
                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-4 pb-4">
                    {state.messages.map((message) => {
                      const isCurrentUser = message.name === currentUserName && message.messageType === "chat";
                      const isAI = message.messageType === "ai";
                      const { thinking, response } = isAI ? parseThinkingContent(message.content) : { thinking: null, response: message.content };

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[80%] ${isCurrentUser ? "" : "w-full"}`}>
                            {!isCurrentUser && (
                              <div className="flex items-center gap-1.5 mb-1.5">
                                {isAI && <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {message.name}
                                </span>
                              </div>
                            )}
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isAI
                                  ? "bg-accent/40 border border-border/30"
                                  : isCurrentUser
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted border border-border/20"
                              }`}
                            >
                              {thinking && <ThinkingBlock content={thinking} />}
                              {isCurrentUser ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{response}</p>
                              ) : (
                                <MarkdownRenderer
                                  content={response}
                                  className={`text-sm leading-relaxed ${isAI ? "text-foreground" : ""}`}
                                />
                              )}
                            </div>
                            <p className={`text-[10px] mt-1 ${isCurrentUser ? "text-right" : ""} text-muted-foreground/60`}>
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                <div className="shrink-0 border-t border-border/30 px-4 py-3 dark:border-border/60">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Textarea
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        rows={2}
                        placeholder={composerMode === "ai" ? "Ask AI to explain something..." : "Send a message..."}
                        className="resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendMessage();
                          }
                        }}
                      />
                    </div>
                    <Button size="sm" disabled={submitting || !composer.trim()} onClick={() => void sendMessage()} className="h-8 self-end">
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Section */}
          {activeSection === "workspace" && (
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              {/* Document header */}
              <div className="shrink-0 border-b border-border/30 px-4 py-2 dark:border-border/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PencilRuler className="h-4 w-4 text-muted-foreground shrink-0" />
                  {activeDocumentId && selectedDocument ? (
                    <Input
                      value={documentTitle}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDocumentTitle(next);
                        queueDocumentSave(documentContent, next);
                      }}
                      className="text-sm font-semibold h-7 bg-transparent border-0 focus-visible:ring-0 px-0"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">Select a document</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeDocumentId && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => void copyCurrentDocument()}>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </Button>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 min-h-0 overflow-hidden p-3">
                {activeDocumentId && documentCollab.ready ? (
                  <div className="h-full rounded-xl border border-border/30 bg-background dark:border-border/60 overflow-hidden">
                    <BlockNoteEditor
                      key={`workspace-${roomId}-${activeDocumentId}-${documentCollab.ready}`}
                      initialContent={documentContent}
                      onChange={(raw) => {
                        setDocumentContent(raw);
                        queueDocumentSave(raw, documentTitle);
                      }}
                      collaboration={documentCollab}
                      documentTitle={documentTitle}
                      subjectLabel={state.room.title}
                    />
                  </div>
                ) : activeDocumentId ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/30">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p className="text-sm">Select a document from the sidebar to start editing</p>
                    <Button size="sm" variant="outline" onClick={() => setSidebarOpen(true)}>
                      <ChevronRight className="mr-1 h-3.5 w-3.5" />
                      Open sidebar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {activeSection === "documents" && (
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <div className="shrink-0 border-b border-border/30 px-4 py-2 dark:border-border/60">
                <p className="text-sm font-semibold">Shared documents</p>
                <p className="text-xs text-muted-foreground">Select a document to view and collaborate</p>
              </div>

              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Document list */}
                <div className="w-64 shrink-0 border-r border-border/30 overflow-y-auto dark:border-border/60">
                  {state.sharedDocuments.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4 text-center">
                      <p className="text-xs text-muted-foreground">No documents shared yet</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {state.sharedDocuments.map((doc) => (
                        <button
                          key={doc.documentId}
                          onClick={() => setActiveDocumentId(doc.documentId)}
                          className={`w-full rounded-lg px-3 py-3 text-left transition ${
                            activeDocumentId === doc.documentId
                              ? "bg-muted dark:bg-muted/70"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <p className="truncate text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{doc.role === "study-guide" ? "Study guide" : "Notes"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Document preview */}
                <div className="flex-1 min-h-0 overflow-hidden p-3">
                  {activeDocumentId && selectedDocument ? (
                    <div className="h-full rounded-xl border border-border/30 bg-background dark:border-border/60 overflow-hidden flex flex-col">
                      <div className="shrink-0 border-b border-border/30 px-4 py-2 dark:border-border/60 flex items-center justify-between">
                        <Input
                          value={documentTitle}
                          onChange={(e) => {
                            const next = e.target.value;
                            setDocumentTitle(next);
                            queueDocumentSave(documentContent, next);
                          }}
                          className="text-sm font-semibold h-7 bg-transparent border-0 focus-visible:ring-0 px-0"
                        />
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => void copyCurrentDocument()}>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                      {documentCollab.ready && loadedDocumentIdRef.current === activeDocumentId ? (
                        <div className="flex-1 overflow-hidden">
                          <BlockNoteEditor
                            key={`document-${roomId}-${activeDocumentId}-${documentCollab.ready}`}
                            initialContent={documentContent}
                            onChange={(raw) => {
                              setDocumentContent(raw);
                              queueDocumentSave(raw, documentTitle);
                            }}
                            collaboration={documentCollab}
                            documentTitle={documentTitle}
                            subjectLabel={state.room.title}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Select a document to view
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
