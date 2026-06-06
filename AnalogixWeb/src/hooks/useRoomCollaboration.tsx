"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { loadRoomSurfaceYDoc, RoomCollabPersistenceManager } from "@/lib/rooms/collab-persistence";
import { RoomRealtimeProvider } from "@/lib/rooms/realtime-provider";
const USER_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
];
const resolveDisplayName = (fallback) => {
    if (fallback?.trim())
        return fallback.trim();
    if (typeof window === "undefined")
        return "Student";
    try {
        const preferences = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        if (typeof preferences.name === "string" && preferences.name.trim()) {
            return preferences.name.trim();
        }
    }
    catch {
        // ignore local storage parse failures
    }
    return "Student";
};
const pickColor = (seed) => {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    return USER_COLORS[hash % USER_COLORS.length];
};
export function useRoomCollaboration({ roomId, surfaceType, surfaceId, displayName, }) {
    const [provider, setProvider] = useState<any>(null);
    const [fragment, setFragment] = useState(() => new Y.Doc().getXmlFragment("blocknote"));
    const [status, setStatus] = useState("connecting");
    const [peerCount, setPeerCount] = useState(0);
    const managerRef = useRef<any>(null);
    const providerRef = useRef<any>(null);
    const awarenessRef = useRef<any>(null);
    const user = useMemo(() => {
        const name = resolveDisplayName(displayName);
        return {
            name,
            color: pickColor(name),
        };
    }, [displayName]);
    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            setStatus("connecting");
            try {
                const { ydoc, latestSeq } = await loadRoomSurfaceYDoc(roomId, surfaceType, surfaceId);
                if (cancelled)
                    return;
                const awareness = new Awareness(ydoc);
                awarenessRef.current = awareness;
                awareness.setLocalStateField("user", user);
                const nextProvider = new RoomRealtimeProvider(`analogix-room-${roomId}-${surfaceType}-${surfaceId}`, ydoc, awareness, crypto.randomUUID());
                providerRef.current = nextProvider;
                const manager = new RoomCollabPersistenceManager(roomId, surfaceType, surfaceId, ydoc, latestSeq);
                managerRef.current = manager;
                const handleDocUpdate = (update, origin) => {
                    if (origin === nextProvider || origin === "room-collab-bootstrap")
                        return;
                    manager.onUpdate(update).catch(console.warn);
                };
                const handleAwarenessChange = () => {
                    const states = Array.from(awareness.getStates().values()).filter((entry) => entry?.user);
                    setPeerCount(Math.max(0, states.length - 1));
                };
                ydoc.on("update", handleDocUpdate);
                awareness.on("change", handleAwarenessChange);
                handleAwarenessChange();
                setFragment(ydoc.getXmlFragment("blocknote"));
                setProvider(nextProvider);
                setStatus("ready");
                return () => {
                    ydoc.off("update", handleDocUpdate);
                    awareness.off("change", handleAwarenessChange);
                };
            }
            catch (error) {
                console.error("[useRoomCollaboration] init failed:", error);
                if (!cancelled) {
                    setStatus("error");
                }
            }
            return undefined;
        };
        let cleanup;
        init().then((dispose) => {
            cleanup = dispose;
        });
        return () => {
            cancelled = true;
            cleanup?.();
            managerRef.current = null;
            awarenessRef.current = null;
            providerRef.current?.destroy();
            providerRef.current = null;
            setProvider(null);
            setPeerCount(0);
        };
    }, [roomId, surfaceId, surfaceType, user]);
    return {
        fragment,
        user,
        provider,
        status,
        peerCount,
        ready: status === "ready",
        flush: async () => {
            await managerRef.current?.flush();
        },
    };
}
//# sourceMappingURL=useRoomCollaboration.js.map