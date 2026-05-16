"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { StudyRoom } from "@/types/rooms";

interface ShareToRoomDialogProps {
  documentId: string;
  documentTitle: string;
  trigger: React.ReactNode;
}

export function ShareToRoomDialog({
  documentId,
  documentTitle,
  trigger,
}: ShareToRoomDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingRoomId, setSharingRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/rooms", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load rooms");
        }
        if (!cancelled) {
          setRooms(Array.isArray(payload.memberRooms) ? payload.memberRooms : []);
        }
      } catch (error) {
        console.error("[ShareToRoomDialog] load failed:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load rooms");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const sortedRooms = useMemo(
    () => [...rooms].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [rooms],
  );

  const handleShare = async (roomId: string) => {
    setSharingRoomId(roomId);
    try {
      const response = await fetch(`/api/rooms/${roomId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to share document");
      }
      toast.success(`Shared "${documentTitle}" to the room.`);
      setOpen(false);
    } catch (error) {
      console.error("[ShareToRoomDialog] share failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to share document");
    } finally {
      setSharingRoomId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share to room</DialogTitle>
          <DialogDescription>
            Add this document to a study room so the group can open it inside the room workspace.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sortedRooms.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            You are not in any rooms yet.
            <div className="mt-3">
              <Button size="sm" onClick={() => router.push("/rooms")}>
                Open rooms
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{room.title}</p>
                    <Badge variant="secondary" className="capitalize">
                      {room.visibility}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {room.topic || "No topic set"}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{room.memberCount} members</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={sharingRoomId === room.id}
                  onClick={() => void handleShare(room.id)}
                >
                  {sharingRoomId === room.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
