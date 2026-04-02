/**
 * lib/ydoc-persistence.ts
 *
 * Supabase-backed Yjs persistence layer.
 *
 * Think of this like a git log: every Yjs update is a commit appended
 * to `ydoc_updates`. Periodically we compact the whole log into a single
 * snapshot row (like `git gc`). On load we replay snapshot → remaining
 * updates to reconstruct the current document state in milliseconds.
 */

"use client";

import * as Y from "yjs";
import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/utils/authCache";

// How many updates to accumulate before triggering a compaction snapshot.
const COMPACT_AFTER = 20;

export interface LoadResult {
  /** The fully-rehydrated Yjs doc (snapshot + incremental updates applied). */
  ydoc: Y.Doc;
  /** The highest seq we loaded. Used to only subscribe to newer updates. */
  latestSeq: number;
}

// ── Load ──────────────────────────────────────────────────────────────────────

/**
 * Load a document from Supabase into a fresh Y.Doc.
 * Returns the doc and the latest seq number so the caller can subscribe
 * to realtime updates newer than latestSeq.
 */
/**
 * Wipe all persisted data for a doc. Called when we detect a binary
 * incompatibility (e.g. after a yjs version upgrade).
 */
async function clearYDocData(docId: string, userId: string): Promise<void> {
  const supabase = createClient();
  await Promise.all([
    supabase.from("ydoc_snapshots").delete().eq("doc_id", docId).eq("user_id", userId),
    supabase.from("ydoc_updates").delete().eq("doc_id", docId).eq("user_id", userId),
  ]);
  console.warn("[ydoc-persistence] Cleared stale data for doc", docId, "— likely a yjs version upgrade.");
}

export async function loadYDoc(docId: string): Promise<LoadResult> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return { ydoc: new Y.Doc(), latestSeq: 0 };

  // 1. Fetch the most recent snapshot (if any).
  const { data: snap } = await supabase
    .from("ydoc_snapshots")
    .select("snapshot, snapshot_seq")
    .eq("doc_id", docId)
    .eq("user_id", user.id)
    .order("snapshot_seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ydoc = new Y.Doc();
  let fromSeq = 0;

  if (snap?.snapshot) {
    try {
      // Uint8Array is returned as a Postgres bytea → parse it back.
      const bytes = toUint8Array(snap.snapshot);
      if (bytes.length > 0) {
        Y.applyUpdate(ydoc, bytes);
      }
      fromSeq = snap.snapshot_seq;
    } catch (e) {
      // Binary incompatibility — wipe stale data and start fresh.
      console.error("[ydoc-persistence] Snapshot decode failed (likely version mismatch), clearing data:", e);
      await clearYDocData(docId, user.id);
      return { ydoc: new Y.Doc(), latestSeq: 0 };
    }
  }

  // 2. Fetch incremental updates after the snapshot.
  const { data: updates } = await supabase
    .from("ydoc_updates")
    .select("seq, update")
    .eq("doc_id", docId)
    .eq("user_id", user.id)
    .gt("seq", fromSeq)
    .order("seq", { ascending: true });

  let latestSeq = fromSeq;
  let encounteredCorruption = false;
  for (const row of updates ?? []) {
    try {
      const bytes = toUint8Array(row.update);
      if (bytes.length > 0) {
        Y.applyUpdate(ydoc, bytes);
      }
    } catch (e) {
      console.warn("[ydoc-persistence] Corrupted update detected at seq:", row.seq, "— wiping doc");
      encounteredCorruption = true;
      break;
    }
    if (row.seq > latestSeq) latestSeq = row.seq;
  }

  // If any incremental update was corrupt, wipe everything and start fresh.
  if (encounteredCorruption) {
    console.warn("[ydoc-persistence] Corrupt updates detected — clearing all data for doc", docId);
    await clearYDocData(docId, user.id);
    return { ydoc: new Y.Doc(), latestSeq: 0 };
  }

  return { ydoc, latestSeq };
}

// ── Append update ─────────────────────────────────────────────────────────────

/**
 * Persist a single Yjs binary update to Supabase.
 * Returns the seq number assigned to this update.
 */
export async function appendYDocUpdate(
  docId: string,
  update: Uint8Array,
): Promise<number> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return 0;

  // Get the next seq atomically via RPC.
  const { data: seqData } = await supabase.rpc("next_ydoc_seq", {
    p_doc_id: docId,
  });
  if (!seqData) {
    throw new Error("[ydoc-persistence] Failed to fetch next seq");
  }
  const seq: number = seqData;

  await supabase.from("ydoc_updates").insert({
    doc_id: docId,
    user_id: user.id,
    seq,
    update, // Pass Uint8Array directly to Supabase for bytea column
  });

  return seq;
}

// ── Compact ───────────────────────────────────────────────────────────────────

/**
 * Compact all updates for a doc into a single snapshot row.
 * Call this after every COMPACT_AFTER updates.
 */
export async function compactYDoc(
  docId: string,
  ydoc: Y.Doc,
  latestSeq: number,
): Promise<void> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return;

  const snapshot = Y.encodeStateAsUpdate(ydoc);

  await supabase.from("ydoc_snapshots").insert({
    doc_id: docId,
    user_id: user.id,
    snapshot_seq: latestSeq,
    snapshot, // Pass Uint8Array directly to Supabase for bytea column
  });

  // Delete updates that are now covered by this snapshot.
  await supabase
    .from("ydoc_updates")
    .delete()
    .eq("doc_id", docId)
    .eq("user_id", user.id)
    .lte("seq", latestSeq);
}

// ── Manager class ─────────────────────────────────────────────────────────────

/**
 * YDocPersistenceManager wraps append + compaction logic so the caller
 * only needs to call `.onUpdate(update)` on each Yjs update event.
 */
export class YDocPersistenceManager {
  private updateCount = 0;
  private latestSeq = 0;

  constructor(
    private readonly docId: string,
    private readonly ydoc: Y.Doc,
    initialSeq: number,
  ) {
    this.latestSeq = initialSeq;
  }

  async onUpdate(update: Uint8Array): Promise<void> {
    const seq = await appendYDocUpdate(this.docId, update);
    if (seq > this.latestSeq) this.latestSeq = seq;
    this.updateCount++;

    if (this.updateCount >= COMPACT_AFTER) {
      this.updateCount = 0;
      // Fire-and-forget — don't block the editor.
      compactYDoc(this.docId, this.ydoc, this.latestSeq).catch(console.warn);
    }
  }

  /** Force a final snapshot on unmount so nothing is lost. */
  async flush(): Promise<void> {
    await compactYDoc(this.docId, this.ydoc, this.latestSeq);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;

  // Handle Postgres hex format (\x...)
  if (typeof value === "string" && value.startsWith("\\x")) {
    const hex = value.slice(2);

    // Guard against corrupted/odd-length hex strings
    if (hex.length % 2 !== 0) {
      console.warn("[ydoc-persistence] Invalid hex length:", hex.length);
      return new Uint8Array();
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.slice(i, i + 2), 16);
      if (Number.isNaN(byte)) {
        console.warn("[ydoc-persistence] Invalid hex byte at index:", i);
        return new Uint8Array();
      }
      bytes[i / 2] = byte;
    }
    return bytes;
  }

  // Handle base64 (expected format)
  if (typeof value === "string") {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  console.warn("[ydoc-persistence] Unsupported update format, returning empty array");
  return new Uint8Array();
}

export { COMPACT_AFTER };
