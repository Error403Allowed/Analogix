/**
 * realtime/src/persistence.js
 *
 * Supabase/Postgres persistence for Yjs documents.
 * Load = latest snapshot + incremental updates after it.
 * Save = append update row; compact every COMPACT_AFTER updates.
 */

import * as Y from "yjs";

const COMPACT_AFTER = 200;

// per-doc update counters (in-memory, reset on restart — fine)
const updateCounters = new Map();

// ── Load ──────────────────────────────────────────────────────────────────────

export async function loadDoc(pool, docId) {
  const ydoc = new Y.Doc();

  // 1. Latest snapshot
  const snapRes = await pool.query(
    `SELECT snapshot, snapshot_seq FROM ydoc_snapshots
     WHERE doc_id = $1 ORDER BY snapshot_seq DESC LIMIT 1`,
    [docId],
  );

  let fromSeq = 0;
  if (snapRes.rows.length > 0) {
    const { snapshot, snapshot_seq } = snapRes.rows[0];
    Y.applyUpdate(ydoc, toUint8Array(snapshot));
    fromSeq = Number(snapshot_seq);
  }

  // 2. Incremental updates after snapshot
  const updRes = await pool.query(
    `SELECT seq, update FROM ydoc_updates
     WHERE doc_id = $1 AND seq > $2 ORDER BY seq ASC`,
    [docId, fromSeq],
  );

  let latestSeq = fromSeq;
  for (const row of updRes.rows) {
    Y.applyUpdate(ydoc, toUint8Array(row.update));
    const s = Number(row.seq);
    if (s > latestSeq) latestSeq = s;
  }

  return { ydoc, latestSeq };
}

// ── Append ────────────────────────────────────────────────────────────────────

export async function appendUpdate(pool, docId, update, userId) {
  // Atomic next seq via a simple MAX+1 — good enough for single-server.
  const seqRes = await pool.query(
    `SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM ydoc_updates WHERE doc_id = $1`,
    [docId],
  );
  const seq = Number(seqRes.rows[0].next_seq);

  await pool.query(
    `INSERT INTO ydoc_updates (doc_id, seq, update, user_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [docId, seq, Buffer.from(update), userId],
  );

  // Increment counter and compact if threshold reached
  const count = (updateCounters.get(docId) ?? 0) + 1;
  updateCounters.set(docId, count);

  return seq;
}

// ── Compact ───────────────────────────────────────────────────────────────────

export async function compactDoc(pool, docId, ydoc, latestSeq, userId) {
  const snapshot = Buffer.from(Y.encodeStateAsUpdate(ydoc));

  await pool.query(
    `INSERT INTO ydoc_snapshots (doc_id, snapshot_seq, snapshot, user_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (doc_id) DO UPDATE
       SET snapshot_seq = EXCLUDED.snapshot_seq,
           snapshot     = EXCLUDED.snapshot,
           user_id      = EXCLUDED.user_id,
           created_at   = EXCLUDED.created_at`,
    [docId, latestSeq, snapshot, userId],
  );

  // Delete updates now covered by snapshot
  await pool.query(
    `DELETE FROM ydoc_updates WHERE doc_id = $1 AND seq <= $2`,
    [docId, latestSeq],
  );

  updateCounters.set(docId, 0);
  console.log(`[persist] compacted doc=${docId} at seq=${latestSeq}`);
}

export function shouldCompact(docId) {
  return (updateCounters.get(docId) ?? 0) >= COMPACT_AFTER;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (Buffer.isBuffer(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return new Uint8Array(value);
  return new Uint8Array();
}
