/**
 * realtime/src/rooms.js
 *
 * In-memory room manager.
 * One room = one docId = one server-side Y.Doc + set of connected clients.
 *
 * Analogy: a room is like a Google Doc session — everyone in the same
 * room shares one Y.Doc on the server, and the server is the source of truth.
 */

import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { appendUpdate, compactDoc, shouldCompact } from "./persistence.js";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// Map<docId, Room>
const rooms = new Map();

class Room {
  constructor(docId, ydoc, latestSeq) {
    this.docId = docId;
    this.ydoc = ydoc;
    this.latestSeq = latestSeq;
    /** @type {Set<import("ws").WebSocket>} */
    this.clients = new Set();
    this.awareness = new awarenessProtocol.Awareness(ydoc);

    // When the server-side Y.Doc updates, broadcast to all clients.
    this.ydoc.on("update", (update, origin) => {
      this.broadcast(encodeSyncUpdate(update), origin);
    });
  }

  broadcast(message, origin) {
    for (const client of this.clients) {
      if (client !== origin && client.readyState === 1 /* OPEN */) {
        client.send(message);
      }
    }
  }
}

export async function getOrCreateRoom(pool, docId) {
  if (rooms.has(docId)) return rooms.get(docId);

  const { loadDoc } = await import("./persistence.js");
  const { ydoc, latestSeq } = await loadDoc(pool, docId);
  const room = new Room(docId, ydoc, latestSeq);
  rooms.set(docId, room);
  console.log(`[room] created room for doc=${docId} latestSeq=${latestSeq}`);
  return room;
}

// ── Handle a new WebSocket connection for a room ──────────────────────────────

export function handleConnection(ws, room, pool, userId, userName, userColor) {
  room.clients.add(ws);
  console.log(`[room] doc=${room.docId} clients=${room.clients.size}`);

  // 1. Send full doc state sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, room.ydoc);
  ws.send(encoding.toUint8Array(encoder));

  // 2. Send current awareness states
  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(awarenessStates.keys()),
      ),
    );
    ws.send(encoding.toUint8Array(enc));
  }

  ws.on("message", async (data) => {
    try {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const decoder = decoding.createDecoder(new Uint8Array(buf));
      const msgType = decoding.readVarUint(decoder);

      if (msgType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        const syncMessageType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          room.ydoc,
          ws,
        );

        // If we wrote a sync step 2 reply, send it back to this client only.
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }

        // After a sync update (type 2), persist + maybe compact.
        if (syncMessageType === syncProtocol.messageYjsSyncStep2 ||
            syncMessageType === syncProtocol.messageYjsUpdate) {
          // The update was already applied to room.ydoc by readSyncMessage.
          // Re-encode and persist the raw update.
          const update = Y.encodeStateAsUpdate(room.ydoc);
          const seq = await appendUpdate(pool, room.docId, update, userId);
          room.latestSeq = seq;

          if (shouldCompact(room.docId)) {
            compactDoc(pool, room.docId, room.ydoc, room.latestSeq, userId).catch(console.error);
          }
        }
      } else if (msgType === MESSAGE_AWARENESS) {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
        // Broadcast awareness to all other clients in the room.
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(enc, update);
        room.broadcast(encoding.toUint8Array(enc), ws);
      }
    } catch (err) {
      console.error("[room] message error:", err);
    }
  });

  ws.on("close", () => {
    room.clients.delete(ws);
    awarenessProtocol.removeAwarenessStates(room.awareness, [room.awareness.clientID], ws);
    console.log(`[room] doc=${room.docId} clients=${room.clients.size}`);

    // Clean up empty rooms after a delay (allow reconnects).
    if (room.clients.size === 0) {
      setTimeout(() => {
        if (room.clients.size === 0) {
          rooms.delete(room.docId);
          console.log(`[room] evicted empty room doc=${room.docId}`);
        }
      }, 30_000);
    }
  });
}

// ── Encode helpers ────────────────────────────────────────────────────────────

function encodeSyncUpdate(update) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}
