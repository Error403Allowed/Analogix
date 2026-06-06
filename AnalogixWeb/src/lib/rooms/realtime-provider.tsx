"use client";
import * as Y from "yjs";
import { applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates, } from "y-protocols/awareness";
import { createClient } from "@/lib/supabase/client";
const base64ToUint8Array = (value) => {
    try {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }
    catch {
        return new Uint8Array();
    }
};
const toUint8Array = (value) => {
    if (!value)
        return new Uint8Array();
    if (value instanceof Uint8Array)
        return value;
    if (value instanceof ArrayBuffer)
        return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (typeof value === "string") {
        return base64ToUint8Array(value);
    }
    if (Array.isArray(value)) {
        const bytes = new Uint8Array(value.length);
        for (let index = 0; index < value.length; index += 1) {
            const num = Number(value[index]);
            if (!Number.isFinite(num))
                return new Uint8Array();
            bytes[index] = num;
        }
        return bytes;
    }
    return new Uint8Array();
};
export class RoomRealtimeProvider {
    roomName;
    ydoc;
    awareness;
    sessionId;
    channel = null;
    destroyed = false;
    constructor(roomName, ydoc, awareness, sessionId) {
        this.roomName = roomName;
        this.ydoc = ydoc;
        this.awareness = awareness;
        this.sessionId = sessionId;
        this.init();
    }
    init() {
        const supabase = createClient();
        this.channel = supabase.channel(this.roomName, {
            config: { broadcast: { self: false } },
        });
        this.channel.on("broadcast", { event: "doc-update" }, ({ payload }) => {
            if (!payload?.update)
                return;
            Y.applyUpdate(this.ydoc, toUint8Array(payload.update), this);
        });
        this.channel.on("broadcast", { event: "awareness-update" }, ({ payload }) => {
            if (!payload?.update)
                return;
            applyAwarenessUpdate(this.awareness, toUint8Array(payload.update), this);
        });
        this.channel.subscribe((status) => {
            if (status === "SUBSCRIBED" && !this.destroyed) {
                this.channel?.send({
                    type: "broadcast",
                    event: "sync-request",
                    payload: { from: this.sessionId },
                });
            }
        });
        this.channel.on("broadcast", { event: "sync-request" }, () => {
            if (this.destroyed)
                return;
            const update = Y.encodeStateAsUpdate(this.ydoc);
            this.broadcast("doc-update", { update: Array.from(update) });
            const awareness = encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()));
            this.broadcast("awareness-update", { update: Array.from(awareness) });
        });
        this.ydoc.on("update", this.handleDocUpdate);
        this.awareness.on("update", this.handleAwarenessUpdate);
    }
    broadcast(event, payload) {
        if (this.destroyed || !this.channel)
            return;
        this.channel.send({ type: "broadcast", event, payload });
    }
    handleDocUpdate = (update, origin) => {
        if (origin === this)
            return;
        this.broadcast("doc-update", { update: Array.from(update) });
    };
    handleAwarenessUpdate = ({ added, updated, removed, }, origin) => {
        if (origin === this)
            return;
        const changed = [...added, ...updated, ...removed];
        if (changed.length === 0)
            return;
        const encoded = encodeAwarenessUpdate(this.awareness, changed);
        this.broadcast("awareness-update", { update: Array.from(encoded) });
    };
    destroy() {
        if (this.destroyed)
            return;
        this.destroyed = true;
        const farewell = encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]);
        this.broadcast("awareness-update", { update: Array.from(farewell) });
        removeAwarenessStates(this.awareness, [this.awareness.clientID], this);
        this.ydoc.off("update", this.handleDocUpdate);
        this.awareness.off("update", this.handleAwarenessUpdate);
        if (this.channel) {
            createClient().removeChannel(this.channel);
        }
        this.channel = null;
    }
}
//# sourceMappingURL=realtime-provider.js.map