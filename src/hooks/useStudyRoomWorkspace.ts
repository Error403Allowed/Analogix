/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useTabs } from "@/context/TabsContext";
import { useRoomCollaboration } from "@/hooks/useRoomCollaboration";
import { subjectStore } from "@/utils/subjectStore";
import type { StudyRoomMember, StudyRoom } from "@/types/rooms";
import type { RoomStateResponse, SharedDocumentRecord } from "@/lib/room-utils";

const jsonHeaders = { "Content-Type": "application/json" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function useStudyRoomWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const myUserId = user?.id;
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
  const [canvasContent, setCanvasContent] = useState("<p></p>");
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loadedDocumentIdRef = useRef<string | null>(null);
  const documentSaveTimerRef = useRef<number | null>(null);
  const flushDocumentRef = useRef<() => Promise<void>>(async () => {});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [perms, setPerms] = useState({
    canShareDocuments: true,
    canInviteMembers: false,
    canManageRoles: false,
    canDeleteMessages: false,
    canControlTimer: false,
  });

  const canvasInitialContent = useMemo(
    () => state?.canvas?.contentJson || state?.canvas?.content || "<p></p>",
    [state?.canvas?.contentJson, state?.canvas?.content],
  );

  const documentCollab = useRoomCollaboration({
    roomId,
    surfaceType: "document",
    surfaceId: activeDocumentId || null,
    displayName: undefined,
  });

  const canvasCollab = useRoomCollaboration({
    roomId,
    surfaceType: "canvas",
    surfaceId: "room-canvas",
    displayName: documentCollab.user.name,
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
    if (!roomId) return;
    try {
      const data = await api<RoomStateResponse>(`/api/rooms/${roomId}`, { cache: "no-store" });
      const q = data.room;
      if (!q) throw new Error("Room not found");
      setState({
        room: q,
        members: data.members,
        messages: data.messages,
        canvas: data.canvas,
        sharedDocuments: data.sharedDocuments,
      });
      if (q?.title) {
        updateTabLabelByPath(`/rooms/${roomId}`, q.title, "👥");
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
      api(`/api/rooms/${roomId}/presence`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ online }),
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

  const roomJoined = Boolean(state?.room?.isOwner || state?.room?.viewerRole);

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
        const data = await api<{ document: SharedDocumentRecord }>(`/api/rooms/${roomId}/documents/${activeDocumentId}`, { cache: "no-store" });
        if (cancelled) return;
        const doc = data.document as SharedDocumentRecord;
        setSelectedDocument(doc);
        loadedDocumentIdRef.current = activeDocumentId;
        setDocumentTitle(String(doc.title || "Untitled"));
        setDocumentContent(String(doc.content || "<p></p>"));
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

  const currentUserName = documentCollab.user.name;
  const onlineMembers = useMemo(
    () => (state?.members || []).filter((member) => member.isOnline),
    [state?.members],
  );

  const canControlTimer = Boolean(
    state?.room?.isOwner ||
      state?.room?.viewerRole === "host" ||
      state?.room?.viewerRole === "cohost",
  );

  useEffect(() => {
    if (state?.room?.permissions) {
      setPerms((prev) => ({ ...prev, ...(typeof state.room.permissions === "object" ? state.room.permissions : {}) }));
    }
  }, [state?.room?.permissions]);

  const queueDocumentSave = useCallback((nextContent: string, nextTitle: string) => {
    if (!activeDocumentId || !selectedDocument) return;
    if (documentSaveTimerRef.current) window.clearTimeout(documentSaveTimerRef.current);
    documentSaveTimerRef.current = window.setTimeout(async () => {
      try {
        if (!activeDocumentId) return;
        await api(`/api/rooms/${roomId}/documents/${activeDocumentId}`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({
            title: nextTitle,
            content: nextContent,
          }),
        });
      } catch (error) {
        console.error("[StudyRoomWorkspace] document save failed:", error);
      }
    }, 900);
  }, [activeDocumentId, selectedDocument, roomId]);

  const handleJoinRoom = async () => {
    setJoining(true);
    try {
      await api(`/api/rooms/join`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ roomId }),
      });
      await loadRoom();
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
      if (composerMode === "ai") {
        const response = await fetch(`/api/rooms/${roomId}/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: content }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Failed to send message");
        }
        const payload = await response.json();
        setState((current) => current ? {
          ...current,
          messages: Array.isArray(payload.messages) ? payload.messages : current.messages,
        } : current);
      } else {
        const data = await api<{ messages: RoomStateResponse["messages"] }>(`/api/rooms/${roomId}/messages`, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ content }),
        });
        setState((current) => current ? { ...current, messages: data.messages } : current);
      }
      setComposer("");
    } catch (error) {
      console.error("[StudyRoomWorkspace] sendMessage failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const updateTimer = async (action: "start" | "pause" | "resume" | "reset") => {
    try {
      const durationSeconds = Number(timerMinutes || "25") * 60;
      const data = await api<{ room: StudyRoom }>(`/api/rooms/${roomId}/timer`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ action, durationSeconds }),
      });
      if (data?.room) {
        setState((current) => current ? { ...current, room: data.room } : current);
      }
    } catch (error) {
      console.error("[StudyRoomWorkspace] updateTimer failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update timer");
    }
  };

  const updateMemberRole = async (member: StudyRoomMember) => {
    try {
      const nextRole = member.role === "cohost" ? "member" : "cohost";
      await api(`/api/rooms/${roomId}/members`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ userId: member.userId, role: nextRole }),
      });
      await loadRoom();
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
      await api(`/api/rooms/${roomId}/leave`, {
        method: "POST",
        headers: jsonHeaders,
        body: "{}",
      });
      router.push("/rooms");
    } catch (error) {
      console.error("[StudyRoomWorkspace] leaveRoom failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to leave room");
    }
  };

  const deleteRoom = async () => {
    try {
      await api(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });
      router.push("/rooms");
    } catch (error) {
      console.error("[StudyRoomWorkspace] deleteRoom failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete room");
    }
  };

  const transferOwnership = async (newOwnerUserId: string) => {
    try {
      const data = await api<{ room: StudyRoom; members: RoomStateResponse["members"] }>(`/api/rooms/${roomId}/transfer`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ newOwnerUserId }),
      });
      if (data?.room) {
        setState((current) => current ? {
          ...current,
          room: { ...data.room, isOwner: false, viewerRole: "cohost" },
          members: data.members,
        } : current);
      }
      setShowTransferOwnership(false);
      toast.success("Ownership transferred.");
    } catch (error) {
      console.error("[StudyRoomWorkspace] transferOwnership failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to transfer ownership");
    }
  };

  const savePermissions = async () => {
    try {
      const data = await api<{ room: StudyRoom }>(`/api/rooms/${roomId}/permissions`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify(perms),
      });
      setState((current) => current ? { ...current, room: { ...current.room, permissions: perms } } : current);
      setShowPermissions(false);
      toast.success("Permissions saved.");
    } catch (error) {
      console.error("[StudyRoomWorkspace] savePermissions failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save permissions");
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

  const handleSaveCanvas = async () => {
    try {
      const subject = state?.room?.topic || "general";
      const title = `${state?.room?.title || "Room"} canvas notes`;
      const created = await subjectStore.createDocument(subject, title);
      await subjectStore.updateDocument(subject, created.id, {
        title,
        content: canvasContent,
      });
      toast.success("Canvas saved to your documents.");
    } catch (error) {
      console.error("[StudyRoomWorkspace] handleSaveCanvas failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save canvas");
    }
  };

  const handleCreateDocument = async () => {
    const title = newDocTitle.trim() || "Untitled";
    const content = newDocContent.trim() || "";
    try {
      const subject = state?.room?.topic || "general";
      const created = await subjectStore.createDocument(subject, title);
      if (content) {
        await subjectStore.updateDocument(subject, created.id, {
          title,
          content: `<p>${content.replace(/\n/g, "<br/>")}</p>`,
        });
      }
      setShowNewDoc(false);
      setNewDocTitle("");
      setNewDocContent("");
      router.push(`/documents/${subject}/${created.id}`);
      toast.success("Document created.");
    } catch (error) {
      console.error("[StudyRoomWorkspace] handleCreateDocument failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create document");
    }
  };

  const handleSectionChange = (section: "chat" | "workspace" | "documents") => {
    setActiveSection(section);
    if (section === "workspace" && activeDocumentId) {
      setSidebarOpen(false);
    }
  };

  return {
    state,
    loading,
    joining,
    submitting,
    activeSection,
    sidebarOpen,
    composerMode,
    composer,
    activeDocumentId,
    selectedDocument,
    documentTitle,
    documentContent,
    timerMinutes,
    showTimerControls,
    canvasContent,
    showNewDoc,
    newDocTitle,
    newDocContent,
    inRoom,
    roomId,
    myUserId,
    roomJoined,
    currentUserName,
    onlineMembers,
    canControlTimer,
    remainingSeconds,
    canvasInitialContent,
    documentCollab,
    canvasCollab,
    chatEndRef,
    perms,
    showDeleteConfirm,
    showTransferOwnership,
    showPermissions,
    setComposerMode,
    setComposer,
    setActiveSection,
    setSidebarOpen,
    setActiveDocumentId,
    setDocumentTitle,
    setDocumentContent,
    setTimerMinutes,
    setShowTimerControls,
    setCanvasContent,
    setShowNewDoc,
    setNewDocTitle,
    setNewDocContent,
    setShowDeleteConfirm,
    setShowTransferOwnership,
    setShowPermissions,
    setPerms,
    setInRoom,
    loadRoom,
    handleJoinRoom,
    handleEnterRoom,
    handleLeaveRoom,
    sendMessage,
    updateTimer,
    updateMemberRole,
    copyJoinCode,
    leaveRoom,
    deleteRoom,
    transferOwnership,
    savePermissions,
    copyCurrentDocument,
    handleSaveCanvas,
    handleCreateDocument,
    handleSectionChange,
    queueDocumentSave,
    loadedDocumentIdRef,
    router,
  };
}
