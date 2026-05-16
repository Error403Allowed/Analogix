"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CopyPlus, DoorOpen, Loader2, Lock, Plus, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StudyRoom } from "@/types/rooms";

type RoomsPayload = {
  rooms: StudyRoom[];
  publicRooms: StudyRoom[];
  memberRooms: StudyRoom[];
};

export default function RoomsPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<RoomsPayload>({
    rooms: [],
    publicRooms: [],
    memberRooms: [],
  });
  const [loading, setLoading] = useState(true);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createTopic, setCreateTopic] = useState("");
  const [createVisibility, setCreateVisibility] = useState<"public" | "private">("public");

  const loadRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const nextPayload = await response.json();
      if (!response.ok) throw new Error(nextPayload.error || "Failed to load rooms");
      setPayload(nextPayload as RoomsPayload);
    } catch (error) {
      console.error("[RoomsPage] load failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRooms();
  }, []);

  const joinedRoomIds = useMemo(
    () => new Set(payload.memberRooms.map((room) => room.id)),
    [payload.memberRooms],
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle,
          topic: createTopic,
          visibility: createVisibility,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create room");
      toast.success("Room created.");
      setCreateOpen(false);
      setCreateTitle("");
      setCreateTopic("");
      router.push(`/rooms/${result.room.id}`);
    } catch (error) {
      console.error("[RoomsPage] create failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (roomId?: string, code?: string) => {
    setJoiningRoomId(roomId ?? "join-code");
    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomId ? { roomId } : { joinCode: code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to join room");
      toast.success("Joined room.");
      router.push(`/rooms/${result.room.id}`);
    } catch (error) {
      console.error("[RoomsPage] join failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setJoiningRoomId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Rooms
          </p>
          <h1 className="text-4xl font-black tracking-tight">Group tutoring, but things actually make sense. </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create a study room, bring the group into one shared timer and workspace, and keep AI in the same conversation as the rest of the room.
          </p>
          <div className="flex flex-wrap gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create room
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create study room</DialogTitle>
                  <DialogDescription>
                    Pick a topic, choose whether the room is public or private, and start the shared workspace.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Room name</label>
                    <Input
                      value={createTitle}
                      onChange={(event) => setCreateTitle(event.target.value)}
                      placeholder="e.g. Chemistry revision sprint"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Topic</label>
                    <Textarea
                      value={createTopic}
                      onChange={(event) => setCreateTopic(event.target.value)}
                      placeholder="What is the group working on?"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Visibility</label>
                    <Select
                      value={createVisibility}
                      onValueChange={(value) => setCreateVisibility(value === "private" ? "private" : "public")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public room</SelectItem>
                        <SelectItem value="private">Private room</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button disabled={creating} onClick={() => void handleCreate()}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create room"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="secondary" onClick={() => void loadRooms()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold">Join with code</p>
            <p className="text-sm text-muted-foreground">
              Private rooms stay out of the directory. Use the invite code to join directly.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
            />
            <Button
              disabled={!joinCode.trim() || joiningRoomId === "join-code"}
              onClick={() => void handleJoin(undefined, joinCode)}
            >
              {joiningRoomId === "join-code" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">Your rooms</p>
                <p className="text-sm text-muted-foreground">Rooms you own or have already joined.</p>
              </div>
              <Badge variant="secondary">{payload.memberRooms.length}</Badge>
            </div>
            {payload.memberRooms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
                No rooms yet. Create one or join with a code.
              </div>
            ) : (
              payload.memberRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  actionLabel="Open room"
                  actionIcon={<DoorOpen className="h-4 w-4" />}
                  onAction={() => router.push(`/rooms/${room.id}`)}
                />
              ))
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">Public directory</p>
                <p className="text-sm text-muted-foreground">Find active study groups and join them.</p>
              </div>
              <Badge variant="secondary">{payload.publicRooms.length}</Badge>
            </div>
            {payload.publicRooms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
                No public rooms are live right now.
              </div>
            ) : (
              payload.publicRooms.map((room) => {
                const isJoined = joinedRoomIds.has(room.id);
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    actionLabel={isJoined ? "Open room" : "Join room"}
                    actionIcon={isJoined ? <DoorOpen className="h-4 w-4" /> : <CopyPlus className="h-4 w-4" />}
                    loading={joiningRoomId === room.id}
                    onAction={() => {
                      if (isJoined) {
                        router.push(`/rooms/${room.id}`);
                        return;
                      }
                      void handleJoin(room.id);
                    }}
                  />
                );
              })
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function RoomCard({
  room,
  actionLabel,
  actionIcon,
  onAction,
  loading = false,
}: {
  room: StudyRoom;
  actionLabel: string;
  actionIcon: React.ReactNode;
  onAction: () => void;
  loading?: boolean;
}) {
  const onlineHint = room.timerState === "running"
    ? "Session live now"
    : room.timerState === "paused"
      ? "Timer paused"
      : "Ready to start";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/60 bg-card p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold">{room.title}</p>
            <Badge variant="secondary" className="capitalize">
              {room.visibility === "private" ? <Lock className="mr-1 h-3 w-3" /> : null}
              {room.visibility}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{room.topic || "No topic set yet."}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {room.memberCount} members
            </span>
            <span>{onlineHint}</span>
            <span>Code {room.joinCode}</span>
          </div>
        </div>

        <Button size="sm" onClick={onAction} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : actionIcon}
          <span className="ml-2">{actionLabel}</span>
        </Button>
      </div>
    </motion.div>
  );
}
