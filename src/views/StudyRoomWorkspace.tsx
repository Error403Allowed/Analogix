/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function StudyRoomWorkspace() {
  const params = useParams();
  const router = useRouter();
  const { updateTabLabelByPath } = useTabs();
  const roomId = String(params?.roomId || "");

  const [state, setState] = useState<RoomStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<"chat" | "workspace" | "documents">("chat");
  const [composerMode, setComposerMode] = useState<"chat" | "ai">("chat");
  const [composer, setComposer] = useState("");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<SharedDocumentRecord | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("<p></p>");
  const [timerMinutes, setTimerMinutes] = useState("25");
  const [tick, setTick] = useState(Date.now());
  const loadedDocumentIdRef = useRef<string | null>(null);
  const documentSaveTimerRef = useRef<number | null>(null);
  const flushDocumentRef = useRef<() => Promise<void>>(async () => {});

  const documentCollab = useRoomCollaboration({
    roomId,
    surfaceType: "document",
    surfaceId: activeDocumentId || "room-doc-placeholder",
  });

  useEffect(() => {
    flushDocumentRef.current = documentCollab.flush;
  }, [documentCollab.flush]);

  useEffect(() => {
    return () => {
      flushDocumentRef.current().catch(console.warn);
    };
  }, []);

  const loadRoom = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load room");
      }
      setState(payload as RoomStateResponse);

      if (!activeDocumentId && payload.sharedDocuments.length > 0) {
        setActiveDocumentId(payload.sharedDocuments[0].documentId);
      }

      updateTabLabelByPath(`/rooms/${roomId}`, payload.room.title, "👥");
    } catch (error) {
      console.error("[StudyRoomWorkspace] loadRoom failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load room");
    } finally {
      setLoading(false);
    }
  }, [activeDocumentId, roomId, updateTabLabelByPath]);

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

  useEffect(() => {
    if (!activeDocumentId) {
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
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load shared document");
        }
        if (cancelled) return;
        setSelectedDocument(payload.document as SharedDocumentRecord);
        loadedDocumentIdRef.current = activeDocumentId;
        setDocumentTitle(String(payload.document.title || "Untitled"));
        setDocumentContent(String(payload.document.content || "<p></p>"));
      } catch (error) {
        console.error("[StudyRoomWorkspace] loadDocument failed:", error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load shared document");
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [activeDocumentId, roomId]);

  useEffect(() => {
    if (!state?.room || state.room.timerState !== "running") return undefined;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state?.room?.timerState]);

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
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to join room");
      setState(payload as RoomStateResponse);
      toast.success("Joined room.");
    } catch (error) {
      console.error("[StudyRoomWorkspace] join failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setJoining(false);
    }
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
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to send message");
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
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update timer");
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
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update member");
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
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to leave room");
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

  return (
    <div className="mx-auto flex min-h-[100vh] max-w-[1680px] flex-col gap-6 px-6 py-4 lg:px-8 xl:px-10">
      <section className="rounded-[28px] border border-border/20 bg-background/95 p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-border/60 dark:bg-background/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <p className="text-2xl font-extrabold tracking-tight text-foreground">{state.room.title}</p>
                <Badge variant="secondary" className="capitalize">{state.room.visibility}</Badge>
                {canControlTimer ? <Badge variant="secondary">Timer controls enabled</Badge> : null}
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
              <Button variant="secondary" onClick={leaveRoom}>
                <DoorOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                Leave room
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
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
                  onChange={(event) => setTimerMinutes(event.target.value.replace(/[^\d]/g, ""))}
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
        </div>
      </section>

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
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border/30 bg-muted/50 p-2 dark:border-border/60 dark:bg-muted/40">
            {[
              { id: "chat", label: "Discussion" },
              { id: "workspace", label: "Workspace" },
              { id: "documents", label: "Documents" },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id as "chat" | "workspace" | "documents")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeSection === section.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40 dark:hover:bg-muted/40"}`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === "chat" && (
            <section className="rounded-[28px] border border-border/30 bg-background/95 shadow-sm dark:border-border/60 dark:bg-background/50">
              <div className="border-b border-border/30 px-6 py-3 dark:border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">Group conversation</p>
                    <p className="mt-1 text-sm text-muted-foreground">Chat with the room or ask AI in the same thread.</p>
                  </div>
                  <div className="flex rounded-lg border border-border/60 p-1 dark:border-border/60">
                    <button
                      className={`rounded-md px-3 py-1 text-sm transition ${composerMode === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                      onClick={() => setComposerMode("chat")}
                    >
                      Chat
                    </button>
                    <button
                      className={`rounded-md px-3 py-1 text-sm transition ${composerMode === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                      onClick={() => setComposerMode("ai")}
                    >
                      Ask AI
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex h-[calc(100vh-220px)] flex-col">
                <ScrollArea className="flex-1 overflow-auto px-6 py-4">
                  <div className="space-y-4 pb-28">
                    {state.messages.map((message) => {
                      const isCurrentUser = message.name === currentUserName && message.messageType === "chat";
                      const isAI = message.messageType === "ai";
                      return (
                        <div
                          key={message.id}
                          className={`rounded-2xl p-4 ${isAI ? "bg-accent dark:bg-accent" : isCurrentUser ? "bg-card dark:bg-muted/40" : "bg-card"} border border-border/50 dark:border-border/50`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isAI ? <Bot className="h-4 w-4 text-muted-foreground" /> : null}
                              <span className="font-semibold text-foreground">{message.name}</span>
                              <Badge variant="secondary" className="capitalize">{message.messageType}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{message.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="sticky bottom-0 bg-background/95 dark:bg-background/50 border-t border-border/30 px-6 py-3 dark:border-border/60">
                  <Textarea
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    rows={3}
                    placeholder={composerMode === "ai" ? "Ask the room AI to explain something to everyone..." : "Send a message to the room..."}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button disabled={submitting || !composer.trim()} onClick={() => void sendMessage()}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span className="ml-2">{composerMode === "ai" ? "Ask AI" : "Send"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
           )}

           {activeSection === "workspace" && (
             <section className="rounded-[32px] border border-border/30 bg-background/95 shadow-sm dark:border-border/60 dark:bg-background/50">
<div className="border-b border-border/30 px-6 py-4 dark:border-border/60">
                 <div className="space-y-2">
                   <p className="text-sm text-muted-foreground">
                     Collaborative workspace for the room. Edit documents together in real-time.
                   </p>
                 </div>
               </div>

              <div className="flex h-[calc(100vh-400px)] flex-col px-6 py-4">
                  <div className="flex-1 overflow-hidden rounded-3xl border border-border/30 bg-background p-4 dark:border-border/60 dark:bg-background/50">
                   {documentCollab.ready ? (
                     <BlockNoteEditor
                       key={`workspace-${roomId}-${documentCollab.ready}`}
                       initialContent={documentContent}
                       onChange={(raw) => {
                         setDocumentContent(raw);
                         queueDocumentSave(raw, documentTitle);
                       }}
                       collaboration={documentCollab}
                       documentTitle={documentTitle}
                       subjectLabel={state.room.title}
                     />
                   ) : (
                     <div className="flex flex-1 items-center justify-center rounded-3xl border border-border/50">
                       <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                     </div>
                   )}
                 </div>
               </div>
             </section>
           )}

          {activeSection === "documents" && (
            <section className="rounded-[32px] border border-border/30 bg-background/95 shadow-sm dark:border-border/60 dark:bg-background/50">
              <div className="border-b border-border/30 px-6 py-4 dark:border-border/60">
                <p className="text-lg font-semibold">Shared documents</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a document to view and collaborate.
                </p>
              </div>

              <div className="grid h-[calc(100vh-400px)] gap-6 lg:grid-cols-[240px_1fr] px-6 py-4">
                <div className="space-y-3 overflow-y-auto px-2">
                  {state.sharedDocuments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                      No documents shared.
                    </div>
                  ) : (
                    state.sharedDocuments.map((document) => (
                      <button
                        key={document.documentId}
                        onClick={() => setActiveDocumentId(document.documentId)}
                        className={`w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                          activeDocumentId === document.documentId
                            ? "bg-muted dark:bg-muted/70"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <p className="truncate font-medium">{document.title}</p>
                        <p className="text-xs text-muted-foreground">{document.role === "study-guide" ? "Study guide" : "Notes"}</p>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex flex-col overflow-hidden rounded-lg border border-border/30 dark:border-border/60">
                  {activeDocumentId && selectedDocument ? (
                    <>
                      <div className="border-b border-border/30 px-4 py-3 dark:border-border/60">
                        <div className="flex items-center justify-between gap-3">
                          <Input
                            value={documentTitle}
                            onChange={(event) => {
                              const nextTitle = event.target.value;
                              setDocumentTitle(nextTitle);
                              queueDocumentSave(documentContent, nextTitle);
                            }}
                            className="text-base font-semibold bg-transparent dark:bg-transparent"
                          />
                          <Button variant="secondary" onClick={() => void copyCurrentDocument()} size="sm">
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </Button>
                        </div>
                      </div>

                      {documentCollab.ready && loadedDocumentIdRef.current === activeDocumentId ? (
                        <div className="flex-1 overflow-hidden p-4">
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
                        <div className="flex flex-1 items-center justify-center p-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground p-6">
                      Select a document to view
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
