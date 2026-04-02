"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import {
  BroadcastCollaborationProvider,
  type CollaborationStatus,
  type CollaborationUser,
} from "@/lib/local-collaboration";
import {
  loadYDoc,
  YDocPersistenceManager,
} from "@/lib/ydoc-persistence";

// ── Session identity ──────────────────────────────────────────────────────────
const COLORS = ["#0f766e", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#059669"];
const SESSION_KEY = "analogix-collab-session";

const hashString = (value: string) =>
  value.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

const getSessionIdentity = (name?: string): CollaborationUser => {
  const fallback = `Session ${Math.floor(Math.random() * 900 + 100)}`;
  if (typeof window === "undefined") {
    return { name: name?.trim() || fallback, color: COLORS[0], sessionId: "server" };
  }
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as CollaborationUser;
      if (parsed?.sessionId) {
        return { ...parsed, name: name?.trim() || parsed.name || fallback };
      }
    } catch { /* ignore */ }
  }
  const sessionId = crypto.randomUUID();
  const identity: CollaborationUser = {
    sessionId,
    name: name?.trim() || fallback,
    color: COLORS[hashString(sessionId) % COLORS.length],
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
  return identity;
};

// ── Fetch a short-lived JWT from our Next.js token endpoint ──────────────────
async function fetchRealtimeToken(docId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/groq/realtime-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    if (!res.ok) return null;
    const { token } = await res.json() as { token: string };
    return token ?? null;
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DocumentCollaborationRuntime {
  ydoc: Y.Doc;
  awareness: Awareness;
  fragment: Y.XmlFragment;
  user: CollaborationUser;
  peerCount: number;
  status: CollaborationStatus;
  flush: () => Promise<void>;
  provider: WebsocketProvider | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useDocumentCollaboration = ({
  documentId,
  displayName,
}: {
  documentId: string;
  displayName?: string;
}): DocumentCollaborationRuntime => {
  const user = useMemo(() => getSessionIdentity(displayName), [displayName]);
  const [status, setStatus] = useState<CollaborationStatus>("connecting");
  const [peerCount, setPeerCount] = useState(0);
  const runtimeRef = useRef<DocumentCollaborationRuntime | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let broadcastProvider: BroadcastCollaborationProvider | null = null;
    let wsProvider: WebsocketProvider | null = null;
    let persistence: YDocPersistenceManager | null = null;
    let ydoc: Y.Doc | null = null;
    let awareness: Awareness | null = null;

    const setup = async () => {
      // 1. Fetch JWT (best-effort — falls back to local-only if server down)
      const token = await fetchRealtimeToken(documentId);

      // 2. Load persisted Y.Doc from Supabase
      const { ydoc: loadedDoc, latestSeq } = await loadYDoc(documentId);
      if (cancelled) { loadedDoc.destroy(); return; }

      ydoc = loadedDoc;
      awareness = new Awareness(ydoc);
      awareness.setLocalStateField("user", {
        name: user.name,
        color: user.color,
      });

      const roomName = `analogix-doc-${documentId}`;
      const wsHost = process.env.NEXT_PUBLIC_REALTIME_URL ?? "";

      // 4a. BroadcastChannel — instant same-browser-tab sync (always on)
      broadcastProvider = new BroadcastCollaborationProvider(
        roomName,
        ydoc,
        awareness,
        user.sessionId,
        setStatus,
      );

      // 4b. WebSocket provider — cross-device real-time sync
      //     Only connects if we have both a host URL and a valid JWT.
      if (wsHost && token) {
        wsProvider = new WebsocketProvider(wsHost, roomName, ydoc, {
          awareness,
          params: { token },
          // Reconnect automatically on disconnect
          connect: true,
          resyncInterval: 3000,
        });

        wsProvider.on("status", ({ status: s }: { status: string }) => {
          if (s === "connected") setStatus("live");
          else if (s === "disconnected") setStatus("connecting");
        });

        wsProvider.on("sync", (synced: boolean) => {
          if (synced) setStatus("live");
        });
      } else {
        // No WS server configured — stay on BroadcastChannel only
        if (!wsHost) {
          console.info(
            "[collab] NEXT_PUBLIC_REALTIME_URL not set — using local-only sync",
          );
        }
      }

      // 5. Persistence — append every local update to Supabase
      persistence = new YDocPersistenceManager(documentId, ydoc, latestSeq);
      ydoc.on("update", (update: Uint8Array, origin: unknown) => {
        // Skip updates that arrived from the WS server (already persisted there)
        if (origin === wsProvider) return;
        persistence?.onUpdate(update).catch(console.warn);
      });

      // 6. Peer counting
      const syncPeers = () => {
        const peers = Array.from(awareness!.getStates().keys()).filter(
          (id) => id !== awareness!.clientID,
        );
        setPeerCount(peers.length);
      };
      awareness.on("change", syncPeers);
      syncPeers();

      if (cancelled) {
        broadcastProvider.destroy();
        wsProvider?.destroy();
        ydoc.destroy();
        return;
      }

      runtimeRef.current = {
        ydoc,
        awareness,
        fragment: ydoc.getXmlFragment("content"),
        user,
        peerCount: 0,
        status: "connecting",
        flush: () => persistence?.flush() ?? Promise.resolve(),
        provider: wsProvider,
      };

      setReady(true);
    };

    setup().catch(console.error);

    return () => {
      cancelled = true;
      broadcastProvider?.destroy();
      wsProvider?.destroy();
      ydoc?.destroy();
      runtimeRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, user]);

  const runtime = runtimeRef.current;
  return useMemo(() => {
    if (!runtime) {
      const dummyDoc = new Y.Doc();
      return {
        ydoc: dummyDoc,
        awareness: new Awareness(dummyDoc),
        fragment: dummyDoc.getXmlFragment("content"),
        user,
        peerCount: 0,
        status: "connecting" as CollaborationStatus,
        flush: async () => {},
        provider: null,
      };
    }

    return { ...runtime, peerCount, status };
  }, [runtime, peerCount, status, user]);
};
