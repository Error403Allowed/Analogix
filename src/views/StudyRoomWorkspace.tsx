"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Users,
  PencilRuler,
  FileText,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Trash2,
  Pencil,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetDescription,
} from "@/components/ui/responsive-sheet";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { useStudyRoomWorkspace } from "@/hooks/useStudyRoomWorkspace";
import { formatClock, parseThinkingContent, ThinkingBlock, sections } from "@/lib/room-utils";

type BlockNoteEditorComponent = typeof import("@/components/shared/BlockNoteEditor").BlockNoteEditor;
type BlockNoteEditorProps = React.ComponentPropsWithoutRef<BlockNoteEditorComponent>;

const BlockNoteEditor = dynamic<BlockNoteEditorProps>(
  () => import("@/components/shared/BlockNoteEditor").then((module) => module.BlockNoteEditor),
  { ssr: false },
) as BlockNoteEditorComponent;

export default function StudyRoomWorkspace() {
  const {
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
    showNewDoc,
    newDocTitle,
    newDocContent,
    inRoom,
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
    showRoomDetails,
    roomTitle,
    roomTopic,
    roomVisibility,
    setActiveSection,
    setComposerMode,
    setComposer,
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
    setShowRoomDetails,
    setRoomTitle,
    setRoomTopic,
    setRoomVisibility,
    setPerms,
    setSidebarOpen,
    loadedDocumentIdRef,
    roomId,
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
    openRoomDetails,
    saveRoomDetails,
    copyCurrentDocument,
    handleSaveCanvas,
    handleCreateDocument,
    handleSectionChange,
    queueDocumentSave,
    loadRoom,
    router,
  } = useStudyRoomWorkspace();

  const [showDocsSheet, setShowDocsSheet] = useState(false);

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-extrabold tracking-tight text-foreground break-words">{state.room.title}</p>
              <Badge variant="secondary" className="capitalize shrink-0">{state.room.visibility}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{state.room.topic || "No topic set yet."}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {state.room.memberCount} members
              </span>
              <span>{onlineMembers.length} studying now</span>
              <span>Code {state.room.joinCode}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(state.room.isOwner || state.room.viewerRole === "cohost") && (
              <Button variant="secondary" size="sm" onClick={openRoomDetails} className="flex-1 sm:flex-none">
                <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="sm:hidden">Edit</span>
                <span className="hidden sm:inline">Edit details</span>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={copyJoinCode} className="flex-1 sm:flex-none">
              <Copy className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span className="sm:hidden">Code</span>
              <span className="hidden sm:inline">Copy code</span>
            </Button>
            <Button variant="secondary" size="icon" onClick={() => void loadRoom()} aria-label="Refresh" className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-background/50 px-3.5 py-2.5 dark:border-border/50 dark:bg-muted/20">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{member.name}</p>
                          {member.role === "host" ? <Crown className="h-3.5 w-3.5 flex-shrink-0 text-primary" /> : null}
                          {member.role === "cohost" ? <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.isOnline ? "Online" : "Away"}</p>
                      </div>
                    </div>
                    {state.room.isOwner && member.role !== "host" ? (
                      <Button size="sm" variant="ghost" onClick={() => void updateMemberRole(member)}>
                        {member.role === "cohost" ? "Remove" : "Make co-host"}
                      </Button>
                    ) : state.room.viewerRole === "cohost" && member.role === "cohost" ? (
                      <Button size="sm" variant="ghost" onClick={() => void updateMemberRole(member)}>
                        Remove
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
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/30 px-3 py-2.5 dark:border-border/60">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition shrink-0"
            onClick={handleLeaveRoom}
            aria-label="Back to room overview"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-bold truncate min-w-0">{state.room.title}</p>
          <Badge variant="secondary" className="capitalize text-sm hidden sm:inline-flex shrink-0">{state.room.visibility}</Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Compact Timer */}
          <div className="flex items-center gap-1.5">
            <Clock3 className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">{formatClock(remainingSeconds)}</span>
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
                <Button size="icon" variant="ghost" className="hidden sm:inline-flex h-7 w-7" onClick={() => setShowTimerControls(!showTimerControls)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Timer expanded controls - desktop only, avoids crowding the mobile header */}
          <AnimatePresence>
            {showTimerControls && canControlTimer && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="hidden sm:flex items-center gap-1 overflow-hidden"
              >
                <Input
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-14 h-8 text-sm"
                />
                <Button size="sm" variant="outline" className="h-8 text-sm" onClick={() => void updateTimer("reset")}>
                  Reset
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Online Members - avatar stack on wide screens, count-only below that */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {onlineMembers.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-medium"
                  title={m.name}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{onlineMembers.length} online</span>
          </div>
          <div className="flex lg:hidden items-center gap-1 text-sm text-muted-foreground" title={`${onlineMembers.length} online`}>
            <Users className="h-3.5 w-3.5" />
            {onlineMembers.length}
          </div>

          {/* Actions - full icon row on desktop */}
          <div className="hidden md:flex items-center gap-1 border-l border-border/30 pl-3 dark:border-border/60">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyJoinCode} title="Copy join code">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void loadRoom()} title="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {(state.room.isOwner || state.room.viewerRole === "cohost") && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={openRoomDetails} title="Edit room details">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {state.room.isOwner && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowTransferOwnership(true)} title="Transfer ownership">
                <Crown className="h-3.5 w-3.5 text-primary" />
              </Button>
            )}
            {(state.room.isOwner || state.room.viewerRole === "cohost") && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowPermissions(true)} title="Room permissions">
                <ShieldCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {state.room.isOwner ? (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)} title="Delete room">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={leaveRoom} title="Leave room">
                <DoorOpen className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Actions - overflow menu on mobile so the header doesn't overflow */}
          <div className="flex md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Room actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={copyJoinCode}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy join code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void loadRoom()}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Refresh
                </DropdownMenuItem>
                {canControlTimer && (
                  <DropdownMenuItem onClick={() => void updateTimer("reset")}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Reset timer
                  </DropdownMenuItem>
                )}
                {(state.room.isOwner || state.room.viewerRole === "cohost") && (
                  <DropdownMenuItem onClick={openRoomDetails}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit room details
                  </DropdownMenuItem>
                )}
                {state.room.isOwner && (
                  <DropdownMenuItem onClick={() => setShowTransferOwnership(true)}>
                    <Crown className="mr-2 h-3.5 w-3.5 text-primary" />
                    Transfer ownership
                  </DropdownMenuItem>
                )}
                {(state.room.isOwner || state.room.viewerRole === "cohost") && (
                  <DropdownMenuItem onClick={() => setShowPermissions(true)}>
                    <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                    Room permissions
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {state.room.isOwner ? (
                  <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete room
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={leaveRoom} className="text-destructive focus:text-destructive">
                    <DoorOpen className="mr-2 h-3.5 w-3.5" />
                    Leave room
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Timer status bar */}
      {state.room.timerState === "running" && (
        <div className="shrink-0 bg-primary/5 px-4 py-1 text-center text-sm text-muted-foreground">
          Focus block in progress
        </div>
      )}

      {/* Mobile section pills */}
      <div className="md:hidden shrink-0 flex items-center gap-1  border-b border-border/30 px-3.5 py-2.5 dark:border-border/60">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleSectionChange(id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 min-h-12 text-sm font-semibold transition ${
              activeSection === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground bg-muted/40 hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
        {(activeSection === "workspace" || activeSection === "documents") && (
          <button
            type="button"
            onClick={() => setShowDocsSheet(true)}
            className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 min-h-12 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition"
          >
            <FileText className="h-4 w-4 shrink-0" />
            Documents
          </button>
        )}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 200 : 56 }}
          className="hidden md:flex shrink-0 border-r border-border/30 bg-muted/20 dark:border-border/60 dark:bg-muted/10 flex-col overflow-hidden"
        >
          {/* Section nav */}
          <div className="flex flex-col gap-1 p-2">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSectionChange(id)}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5.5 text-sm font-medium transition ${
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
              <div className="flex items-center justify-between px-3.5 py-2.5">
                {sidebarOpen && <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Documents</span>}
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
                      className={`w-full rounded-md px-3.5 py-2.5 text-left text-sm transition ${
                        activeDocumentId === doc.documentId
                          ? "bg-muted dark:bg-muted/70 font-medium"
                          : "text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {sidebarOpen ? (
                        <>
                          <p className="truncate">{doc.title}</p>
                          <p className="text-[12px] text-muted-foreground/70">{doc.role === "study-guide" ? "Study guide" : "Notes"}</p>
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
              <div className="border-b border-border/30 px-3 py-1.5 dark:border-border/60 flex items-center justify-between">
                <p className="text-sm font-semibold">Group conversation</p>
                <div className="flex rounded-lg border border-border/60 p-0.5">
                  <button
                    className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${composerMode === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                    onClick={() => setComposerMode("chat")}
                  >
                    Chat
                  </button>
                  <button
                    className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${composerMode === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
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
                              <div className="flex items-center gap-2 mb-1.5">
                                {isAI && <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="text-sm font-semibold text-muted-foreground">
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
                            <p className={`text-[12px] mt-1 ${isCurrentUser ? "text-right" : ""} text-muted-foreground/60`}>
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
                    <Button size="sm" disabled={submitting || !composer.trim()} onClick={() => void sendMessage()} className="h-10 self-end">
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
              <div className="shrink-0 border-b border-border/30 px-3 py-1.5 dark:border-border/60 flex items-center justify-between gap-3">
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
                    <span className="text-sm font-semibold">Room Canvas</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeDocumentId ? (
                    <Button variant="outline" size="sm" className="h-8 text-sm" onClick={() => void copyCurrentDocument()}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="h-8 text-sm" onClick={() => void handleSaveCanvas()}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Save as my doc
                    </Button>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 min-h-0 overflow-hidden p-2">
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
                ) : canvasCollab.ready ? (
                  <div className="h-full rounded-xl border border-border/30 bg-background dark:border-border/60 overflow-hidden">
                    <BlockNoteEditor
                      key={`canvas-${roomId}-${canvasCollab.ready}`}
                      initialContent={canvasInitialContent}
                      onChange={(raw) => {
                        setCanvasContent(raw);
                      }}
                      collaboration={canvasCollab}
                      documentTitle="Room canvas"
                      subjectLabel={state.room.title}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/30">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {activeSection === "documents" && (
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <div className="shrink-0 border-b border-border/30 px-3 py-1.5 dark:border-border/60">
                <p className="text-sm font-semibold">Shared documents</p>
                <p className="text-sm text-muted-foreground">Select a document to view and collaborate</p>
              </div>

              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Document list */}
                <div className="hidden md:block w-64 shrink-0 border-r border-border/30 overflow-y-auto dark:border-border/60">
                  {state.sharedDocuments.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4 text-center flex-col gap-3">
                      <p className="text-sm text-muted-foreground">No documents shared yet</p>
                      <Button size="sm" variant="outline" onClick={() => setShowNewDoc(true)}>
                        <Plus className="mr-1 h-3 w-3" />
                        New document
                      </Button>
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
                          <p className="text-sm text-muted-foreground mt-0.5">{doc.role === "study-guide" ? "Study guide" : "Notes"}</p>
                        </button>
                      ))}
                      <div className="pt-2">
                        <Button size="sm" variant="outline" className="w-full" onClick={() => setShowNewDoc(true)}>
                          <Plus className="mr-1 h-3 w-3" />
                          New
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Document preview */}
                <div className="flex-1 min-h-0 overflow-hidden p-2">
                  {activeDocumentId && selectedDocument ? (
                    <div className="h-full rounded-xl border border-border/30 bg-background dark:border-border/60 overflow-hidden flex flex-col">
                      <div className="shrink-0 border-b border-border/30 px-3 py-1.5 dark:border-border/60 flex items-center justify-between">
                        <Input
                          value={documentTitle}
                          onChange={(e) => {
                            const next = e.target.value;
                            setDocumentTitle(next);
                            queueDocumentSave(documentContent, next);
                          }}
                          className="text-sm font-semibold h-7 bg-transparent border-0 focus-visible:ring-0 px-0"
                        />
                        <Button variant="outline" size="sm" className="h-8 text-sm" onClick={() => void copyCurrentDocument()}>
                          <Copy className="mr-1 h-3.5 w-3.5" />
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

      <ResponsiveSheet open={showNewDoc} onOpenChange={setShowNewDoc}>
        <ResponsiveSheetContent>
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>New document</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              Create a personal document. It will be saved to your subject documents.
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Document title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
            />
            <Textarea
              placeholder="Start writing..."
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewDoc(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreateDocument()}>
                Create
              </Button>
            </div>
          </div>
        </ResponsiveSheetContent>
      </ResponsiveSheet>

      <ResponsiveSheet open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <ResponsiveSheetContent>
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Delete room?</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              This will permanently delete the room and all its messages and documents. This action cannot be undone.
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { setShowDeleteConfirm(false); void deleteRoom(); }}>
              Delete room
            </Button>
          </div>
        </ResponsiveSheetContent>
      </ResponsiveSheet>

      {/* Transfer ownership dialog */}
      <ResponsiveSheet open={showTransferOwnership} onOpenChange={setShowTransferOwnership}>
        <ResponsiveSheetContent>
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Transfer ownership</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              Choose a new host. You will become a co-host.
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <div className="space-y-2 pt-2">
            {state?.members?.filter((m) => m.userId !== myUserId).map((member) => (
              <button
                key={member.id}
                onClick={() => void transferOwnership(member.userId)}
                className="w-full text-left rounded-lg border border-border/30 px-3.5 py-2.5 hover:bg-muted/50 transition text-sm font-medium"
              >
                {member.name}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTransferOwnership(false)}>
              Cancel
            </Button>
          </div>
        </ResponsiveSheetContent>
      </ResponsiveSheet>

      {/* Permissions dialog */}
      <ResponsiveSheet open={showPermissions} onOpenChange={setShowPermissions}>
        <ResponsiveSheetContent>
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Room permissions</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              Configure what members can do in this room.
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <div className="space-y-3 pt-2">
            {([
              { key: "canShareDocuments", label: "Share documents" },
              { key: "canInviteMembers", label: "Invite new members" },
              { key: "canManageRoles", label: "Manage member roles" },
              { key: "canDeleteMessages", label: "Delete messages" },
              { key: "canControlTimer", label: "Control timer" },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms[key]}
                  onChange={() => setPerms((p) => ({ ...p, [key]: !p[key] }))}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPermissions(false)}>
              Cancel
            </Button>
            <Button onClick={() => void savePermissions()}>
              Save
            </Button>
          </div>
        </ResponsiveSheetContent>
      </ResponsiveSheet>

      {/* Edit room details dialog */}
      <ResponsiveSheet open={showRoomDetails} onOpenChange={setShowRoomDetails}>
        <ResponsiveSheetContent>
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Edit room details</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              Update the room name, topic and visibility. Members will see these changes immediately.
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-2">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Room name</p>
              <Input
                id="room-title"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder="Study room"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Topic</p>
              <Input
                id="room-topic"
                value={roomTopic}
                onChange={(e) => setRoomTopic(e.target.value)}
                placeholder="e.g. VCE Maths Methods"
                maxLength={120}
              />
              <p className="text-[12px] text-muted-foreground/60">Leave empty to clear the topic.</p>
            </div>
            <div className="grid gap-2">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Visibility</p>
              <div className="flex gap-2">
                {(["public", "private"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRoomVisibility(v)}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-bold capitalize transition-all ${
                      roomVisibility === v
                        ? "border-primary bg-primary/10"
                        : "border-border glass hover:border-primary/50"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-muted-foreground/60">
                {roomVisibility === "private"
                  ? "Only members with the join code can enter."
                  : "Anyone on Analogix can find and join this room."}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowRoomDetails(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveRoomDetails()}>
                Save changes
              </Button>
            </div>
          </div>
        </ResponsiveSheetContent>
      </ResponsiveSheet>

      {/* Mobile documents bottom sheet */}
      <ResponsiveSheet open={showDocsSheet} onOpenChange={setShowDocsSheet}>
        <ResponsiveSheetContent>
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Shared documents</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              Select a document to view and collaborate
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <div className="space-y-1 pt-2">
            {state.sharedDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-sm text-muted-foreground">No documents shared yet</p>
                <Button size="sm" variant="outline" onClick={() => { setShowDocsSheet(false); setShowNewDoc(true); }}>
                  <Plus className="mr-1 h-3 w-3" />
                  New document
                </Button>
              </div>
            ) : (
              state.sharedDocuments.map((doc) => (
                <button
                  key={doc.documentId}
                  onClick={() => {
                    setActiveDocumentId(doc.documentId);
                    if (activeSection === "documents") setActiveSection("workspace");
                    setShowDocsSheet(false);
                  }}
                  className={`w-full rounded-lg px-3 py-3 text-left transition ${
                    activeDocumentId === doc.documentId
                      ? "bg-muted dark:bg-muted/70"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{doc.role === "study-guide" ? "Study guide" : "Notes"}</p>
                </button>
              ))
            )}
            {state.sharedDocuments.length > 0 && (
              <div className="pt-2">
                <Button size="sm" variant="outline" className="w-full" onClick={() => setShowNewDoc(true)}>
                  <Plus className="mr-1 h-3 w-3" />
                  New
                </Button>
              </div>
            )}
          </div>
        </ResponsiveSheetContent>
      </ResponsiveSheet>
    </div>
  );
}
