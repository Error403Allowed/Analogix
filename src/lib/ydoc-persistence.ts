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
 * Migrate or clear stale ydoc data. Called when we detect a binary
 * incompatibility or corruption (e.g. after a yjs version upgrade or malformed data).
 */
async function migrateYDocData(docId: string, userId: string, reason: string): Promise<void> {
  const supabase = createClient();
  
  try {
    // Archive corrupted data to a separate table for debugging
    const { data: snapshots } = await supabase
      .from("ydoc_snapshots")
      .select("*")
      .eq("doc_id", docId)
      .eq("user_id", userId);

    const { data: updates } = await supabase
      .from("ydoc_updates")
      .select("*")
      .eq("doc_id", docId)
      .eq("user_id", userId);

    // Insert into archive if table exists, otherwise just delete
    if (snapshots && snapshots.length > 0) {
      try {
        await supabase.from("ydoc_snapshots_archive").insert(
          snapshots.map(s => ({ ...s, archived_reason: reason, archived_at: new Date() }))
        );
      } catch { /* ignore if archive table doesn't exist */ }
    }

    // Delete the corrupt data
    await Promise.all([
      supabase.from("ydoc_snapshots").delete().eq("doc_id", docId).eq("user_id", userId),
      supabase.from("ydoc_updates").delete().eq("doc_id", docId).eq("user_id", userId),
    ]);
    
    console.warn(`[ydoc-persistence] Cleared stale data for doc ${docId}: ${reason}`);
  } catch (e) {
    console.error("[ydoc-persistence] Error during data migration:", e);
    // Attempt basic deletion anyway
    try {
      await Promise.all([
        supabase.from("ydoc_snapshots").delete().eq("doc_id", docId).eq("user_id", userId),
        supabase.from("ydoc_updates").delete().eq("doc_id", docId).eq("user_id", userId),
      ]);
    } catch (deleteErr) {
      console.error("[ydoc-persistence] Failed to delete corrupted data:", deleteErr);
    }
  }
}

export async function loadYDoc(docId: string): Promise<LoadResult> {
  // Skip persistence entirely for non-UUID placeholder doc IDs
  const isRealDoc = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docId);
  if (!isRealDoc) return { ydoc: new Y.Doc(), latestSeq: 0 };

  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return { ydoc: new Y.Doc(), latestSeq: 0 };

  // 1. Fetch the most recent snapshot (if any).
  const { data: snap, error: snapError } = await supabase
    .from("ydoc_snapshots")
    .select("snapshot, snapshot_seq")
    .eq("doc_id", docId)
    .eq("user_id", user.id)
    .order("snapshot_seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapError) {
    console.error("[ydoc-persistence] Error fetching snapshot:", snapError);
  }

  const ydoc = new Y.Doc();
  let fromSeq = 0;

  if (snap?.snapshot) {
    try {
      // Debug what we're retrieving
      const rawLength = typeof snap.snapshot === "string" ? snap.snapshot.length : snap.snapshot?.length;
      if (typeof snap.snapshot === "string") {
        console.info("[ydoc-persistence] Loading snapshot as string, length:", snap.snapshot.length);
      } else {
        console.info("[ydoc-persistence] Loading snapshot as", snap.snapshot?.constructor?.name, "length:", snap.snapshot?.length);
      }

      // **CRITICAL: Reject obviously corrupted snapshots**
      // A valid Yjs snapshot should be at least 30+ bytes. Anything less is almost certainly corrupt.
      // Even valid base64 strings of 10-15 chars decode to < 20 bytes.
      if (rawLength < 30) {
        console.warn("[ydoc-persistence] Snapshot too short to be valid (" + rawLength + " bytes), clearing corrupted data");
        await migrateYDocData(docId, user.id, `Snapshot too short: ${rawLength} bytes`);
        return { ydoc: new Y.Doc(), latestSeq: 0 };
      }

      // Convert to Uint8Array with proper error handling
      const bytes = toUint8Array(snap.snapshot);
      // After decoding, validate the result is also substantial (at least 30 bytes)
      if (bytes.length < 30) {
        console.error("[ydoc-persistence] Snapshot decoded to undersized array (" + bytes.length + " bytes), clearing corrupted data");
        await migrateYDocData(docId, user.id, `Snapshot decoded to ${bytes.length} bytes (too short)`);
        return { ydoc: new Y.Doc(), latestSeq: 0 };
      }

      // Validate it's a reasonable Yjs update (should start with certain markers)
      // Yjs updates are protobuf-encoded, typically start with 0x00 (read var) or small values
      if (bytes[0] === undefined) {
        console.error("[ydoc-persistence] Snapshot bytes empty after conversion");
        await migrateYDocData(docId, user.id, "Snapshot bytes empty after toUint8Array");
        return { ydoc: new Y.Doc(), latestSeq: 0 };
      }

      console.info("[ydoc-persistence] Snapshot decoded successfully, byte length:", bytes.length, "first bytes:", Array.from(bytes.slice(0, 4)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      
      try {
        Y.applyUpdate(ydoc, bytes);
      } catch (yError) {
        console.error("[ydoc-persistence] Yjs rejected update as invalid:", yError);
        await migrateYDocData(docId, user.id, `Yjs rejected snapshot: ${yError}`);
        return { ydoc: new Y.Doc(), latestSeq: 0 };
      }
      
      fromSeq = snap.snapshot_seq;
    } catch (e) {
      // Binary incompatibility or corrupted data — wipe stale data and start fresh.
      console.error("[ydoc-persistence] Snapshot decode failed, clearing data:", e);
      await migrateYDocData(docId, user.id, `Snapshot decode error: ${e}`);
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
      if (bytes.length === 0) {
        console.warn("[ydoc-persistence] Empty update at seq:", row.seq);
        continue; // Skip empty updates
      }
      
      try {
        Y.applyUpdate(ydoc, bytes);
      } catch (yError) {
        console.warn("[ydoc-persistence] Yjs rejected update at seq", row.seq, ":", yError);
        encounteredCorruption = true;
        break;
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
    await migrateYDocData(docId, user.id, "Incremental update corruption detected");
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
  const isRealDoc = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docId);
  if (!isRealDoc) return 0;
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

  // Encode as base64 for reliable storage
  const updateBase64 = uint8ArrayToBase64(update);

  await supabase.from("ydoc_updates").insert({
    doc_id: docId,
    user_id: user.id,
    seq,
    update: updateBase64, // Store as base64 string in bytea column
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
  const isRealDoc = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docId);
  if (!isRealDoc) return;
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return;

  const snapshot = Y.encodeStateAsUpdate(ydoc);
  // Encode as base64 for reliable storage/retrieval
  const snapshotBase64 = uint8ArrayToBase64(snapshot);

  await supabase.from("ydoc_snapshots").insert({
    doc_id: docId,
    user_id: user.id,
    snapshot_seq: latestSeq,
    snapshot: snapshotBase64, // Store as base64 string in bytea column
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

/**
 * Convert Uint8Array to base64 string for safe transmission/storage
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string back to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    // Validate base64 format first (should only contain valid chars)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      console.debug("[ydoc-persistence] Invalid base64 characters in snapshot");
      return new Uint8Array();
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.debug("[ydoc-persistence] base64 decode failed, trying other formats");
    return new Uint8Array(); // Return empty on failure, don't throw
  }
}

function toUint8Array(value: unknown): Uint8Array {
  // Already correct format
  if (value instanceof Uint8Array) return value;

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value) && !(value instanceof Uint8Array)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  if (Array.isArray(value)) {
    try {
      if (value.length === 0 || value.length > 10_000_000) {
        console.warn("[ydoc-persistence] Invalid array length:", value.length);
        return new Uint8Array();
      }
      const result = new Uint8Array(value.length);
      for (let i = 0; i < value.length; i++) {
        const byte = Number(value[i]);
        if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
          console.warn("[ydoc-persistence] Invalid byte at index", i, ":", byte);
          return new Uint8Array();
        }
        result[i] = byte;
      }
      return result;
    } catch (e) {
      console.warn("[ydoc-persistence] Failed to convert array to Uint8Array:", e);
      return new Uint8Array();
    }
  }

  if (typeof value === "string") {
    // Try base64 first (our preferred encoding for Supabase)
    const bytes = base64ToUint8Array(value);
    // base64ToUint8Array now returns empty array on failure instead of throwing
    if (bytes.length > 0 && bytes.length <= 10_000_000) {
      return bytes;
    }
    if (bytes.length > 10_000_000) {
      console.warn("[ydoc-persistence] Decoded data too large:", bytes.length);
      return new Uint8Array();
    }
    // Base64 failed or produced empty, try hex format
    if (value.startsWith("\\x")) {
        const hex = value.slice(2);
        if (hex.length % 2 !== 0) {
          console.warn("[ydoc-persistence] Invalid hex string (odd length)");
          return new Uint8Array();
        }
        try {
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) {
            const byte = parseInt(hex.substring(i, i + 2), 16);
            if (Number.isNaN(byte)) {
              console.warn("[ydoc-persistence] Invalid hex pair at index", i);
              return new Uint8Array();
            }
            bytes[i / 2] = byte;
          }
          return bytes;
        } catch (hexError) {
          console.error("[ydoc-persistence] Hex decode error:", hexError);
          return new Uint8Array();
        }
      }

      // Neither worked
      console.error("[ydoc-persistence] Could not decode string as base64 or hex:", {
        firstChars: value.substring(0, 50),
        length: value.length,
      });
      return new Uint8Array();
    }

  console.error("[ydoc-persistence] Unrecognized value type:", {
    type: typeof value,
    constructor: value?.constructor?.name,
    value: String(value).substring(0, 100),
  });
  return new Uint8Array();
}

export { COMPACT_AFTER };
