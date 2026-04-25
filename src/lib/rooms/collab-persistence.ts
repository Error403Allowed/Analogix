"use client";

import * as Y from "yjs";
import { createClient } from "@/lib/supabase/client";

const COMPACT_AFTER = 20;

export type RoomSurfaceType = "canvas" | "document";

export interface LoadRoomSurfaceResult {
  ydoc: Y.Doc;
  latestSeq: number;
}

const uint8ArrayToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

const base64ToUint8Array = (value: string) => {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return new Uint8Array();
  }
};

const toUint8Array = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value.map((entry) => Number(entry)));
  }
  if (typeof value === "string") {
    return base64ToUint8Array(value);
  }
  return new Uint8Array();
};

export async function loadRoomSurfaceYDoc(
  roomId: string,
  surfaceType: RoomSurfaceType,
  surfaceId: string,
): Promise<LoadRoomSurfaceResult> {
  const supabase = createClient();
  const ydoc = new Y.Doc();

  const { data: snapshot } = await supabase
    .from("study_room_collab_snapshots")
    .select("snapshot, snapshot_seq")
    .eq("room_id", roomId)
    .eq("surface_type", surfaceType)
    .eq("surface_id", surfaceId)
    .order("snapshot_seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  let latestSeq = 0;
  if (snapshot?.snapshot) {
    const bytes = toUint8Array(snapshot.snapshot);
    if (bytes.length > 0) {
      Y.applyUpdate(ydoc, bytes, "room-collab-bootstrap");
      latestSeq = Number(snapshot.snapshot_seq ?? 0);
    }
  }

  const { data: updates } = await supabase
    .from("study_room_collab_updates")
    .select("seq, update")
    .eq("room_id", roomId)
    .eq("surface_type", surfaceType)
    .eq("surface_id", surfaceId)
    .gt("seq", latestSeq)
    .order("seq", { ascending: true });

  for (const row of updates ?? []) {
    const bytes = toUint8Array(row.update);
    if (bytes.length === 0) continue;
    Y.applyUpdate(ydoc, bytes, "room-collab-bootstrap");
    latestSeq = Number(row.seq ?? latestSeq);
  }

  return { ydoc, latestSeq };
}

export async function appendRoomSurfaceUpdate(
  roomId: string,
  surfaceType: RoomSurfaceType,
  surfaceId: string,
  update: Uint8Array,
) {
  const supabase = createClient();
  const { data: seqData, error: seqError } = await supabase.rpc("next_study_room_collab_seq", {
    p_room_id: roomId,
    p_surface_type: surfaceType,
    p_surface_id: surfaceId,
  });

  if (seqError || typeof seqData !== "number") {
    throw new Error(seqError?.message || "Failed to allocate collaboration sequence");
  }

  const { error } = await supabase.from("study_room_collab_updates").insert({
    room_id: roomId,
    surface_type: surfaceType,
    surface_id: surfaceId,
    seq: seqData,
    update: uint8ArrayToBase64(update),
  });

  if (error) {
    throw new Error(error.message);
  }

  return seqData;
}

export async function compactRoomSurfaceYDoc(
  roomId: string,
  surfaceType: RoomSurfaceType,
  surfaceId: string,
  ydoc: Y.Doc,
  latestSeq: number,
) {
  const supabase = createClient();
  const snapshot = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));

  const { error } = await supabase.from("study_room_collab_snapshots").upsert(
    {
      room_id: roomId,
      surface_type: surfaceType,
      surface_id: surfaceId,
      snapshot_seq: latestSeq,
      snapshot,
    },
    { onConflict: "room_id,surface_type,surface_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("study_room_collab_updates")
    .delete()
    .eq("room_id", roomId)
    .eq("surface_type", surfaceType)
    .eq("surface_id", surfaceId)
    .lte("seq", latestSeq);
}

export class RoomCollabPersistenceManager {
  private latestSeq = 0;

  private updateCount = 0;

  constructor(
    private readonly roomId: string,
    private readonly surfaceType: RoomSurfaceType,
    private readonly surfaceId: string,
    private readonly ydoc: Y.Doc,
    initialSeq: number,
  ) {
    this.latestSeq = initialSeq;
  }

  async onUpdate(update: Uint8Array) {
    const nextSeq = await appendRoomSurfaceUpdate(
      this.roomId,
      this.surfaceType,
      this.surfaceId,
      update,
    );
    this.latestSeq = Math.max(this.latestSeq, nextSeq);
    this.updateCount += 1;

    if (this.updateCount >= COMPACT_AFTER) {
      this.updateCount = 0;
      compactRoomSurfaceYDoc(
        this.roomId,
        this.surfaceType,
        this.surfaceId,
        this.ydoc,
        this.latestSeq,
      ).catch(console.warn);
    }
  }

  async flush() {
    await compactRoomSurfaceYDoc(
      this.roomId,
      this.surfaceType,
      this.surfaceId,
      this.ydoc,
      this.latestSeq,
    );
  }
}
