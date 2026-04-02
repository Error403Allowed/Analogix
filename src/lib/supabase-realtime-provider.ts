/**
 * lib/supabase-realtime-provider.ts
 *
 * Yjs transport backed by Supabase Realtime (Broadcast).
 *
 * Architecture analogy: BroadcastChannel = walkie-talkie in the same room
 * (same browser, different tabs). Supabase Realtime = radio tower that works
 * across devices and browsers for the same user.
 *
 * This provider runs ALONGSIDE BroadcastCollaborationProvider so local-tab
 * sync stays instant (BroadcastChannel) while cross-device sync goes through
 * Supabase. Both providers share the same Y.Doc — Yjs CRDT merges are
 * idempotent, so receiving the same update twice is harmless.
 */

"use client";

import * as Y from "yjs";
import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
  type Awareness,
} from "y-protocols/awareness";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type DocUpdatePayload = { update: number[] };
type AwarenessPayload = { update: number[] };

export class SupabaseRealtimeProvider {
  private channel: RealtimeChannel | null = null;
  private destroyed = false;

  constructor(
    /** Room name — use `analogix-doc-{docId}` so it matches BroadcastChannel. */
    private readonly roomName: string,
    private readonly ydoc: Y.Doc,
    public readonly awareness: Awareness,
    private readonly sessionId: string,
  ) {
    this.init();
  }

  private init() {
    const supabase = createClient();

    this.channel = supabase.channel(this.roomName, {
      config: { broadcast: { self: false } },
    });

    // ── Receive doc updates from other devices ────────────────────────────
    this.channel.on<DocUpdatePayload>(
      "broadcast",
      { event: "doc-update" },
      ({ payload }) => {
        if (!payload?.update) return;
        Y.applyUpdate(this.ydoc, new Uint8Array(payload.update), this);
      },
    );

    // ── Receive awareness updates (cursors, presence) ─────────────────────
    this.channel.on<AwarenessPayload>(
      "broadcast",
      { event: "awareness-update" },
      ({ payload }) => {
        if (!payload?.update) return;
        applyAwarenessUpdate(
          this.awareness,
          new Uint8Array(payload.update),
          this,
        );
      },
    );

    // ── Subscribe and request current state once connected ────────────────
    this.channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && !this.destroyed) {
        // Ask peers to send their current state.
        this.channel?.send({
          type: "broadcast",
          event: "sync-request",
          payload: { from: this.sessionId },
        });
      }
    });

    // ── Sync-request: respond with our full state ─────────────────────────
    this.channel.on(
      "broadcast",
      { event: "sync-request" },
      () => {
        if (this.destroyed) return;
        const update = Y.encodeStateAsUpdate(this.ydoc);
        this.broadcast("doc-update", { update: Array.from(update) });

        const awareness = encodeAwarenessUpdate(
          this.awareness,
          Array.from(this.awareness.getStates().keys()),
        );
        this.broadcast("awareness-update", { update: Array.from(awareness) });
      },
    );

    // ── Outbound: forward local Yjs updates to Supabase ───────────────────
    this.ydoc.on("update", this.handleDocUpdate);
    this.awareness.on("update", this.handleAwarenessUpdate);
  }

  private broadcast(event: string, payload: Record<string, unknown>) {
    if (this.destroyed || !this.channel) return;
    this.channel.send({ type: "broadcast", event, payload });
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    // Skip updates that came from THIS provider (avoid echo).
    if (origin === this) return;
    this.broadcast("doc-update", { update: Array.from(update) });
  };

  private handleAwarenessUpdate = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) return;
    const changed = [...added, ...updated, ...removed];
    if (changed.length === 0) return;
    const encoded = encodeAwarenessUpdate(this.awareness, changed);
    this.broadcast("awareness-update", { update: Array.from(encoded) });
  };

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    // Broadcast awareness removal so peers remove our cursor.
    const farewell = encodeAwarenessUpdate(this.awareness, [
      this.awareness.clientID,
    ]);
    this.broadcast("awareness-update", { update: Array.from(farewell) });
    removeAwarenessStates(this.awareness, [this.awareness.clientID], this);

    this.ydoc.off("update", this.handleDocUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);

    createClient().removeChannel(this.channel!);
    this.channel = null;
  }
}
