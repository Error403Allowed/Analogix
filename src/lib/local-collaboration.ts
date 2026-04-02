"use client";

import { Extension } from "@tiptap/core";
import type { Awareness } from "y-protocols/awareness";
import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import { yCursorPlugin, ySyncPlugin, yUndoPlugin, undo, redo } from "y-prosemirror";
import * as Y from "yjs";

export type CollaborationStatus = "connecting" | "live" | "unsupported";

export interface CollaborationUser {
  name: string;
  color: string;
  sessionId: string;
}

export interface CollaborationRuntime {
  fragment: Y.XmlFragment;
  awareness: Awareness;
  user: CollaborationUser;
}

type CollaborationMessage =
  | { type: "sync-request"; source: string }
  | { type: "sync-response"; source: string; update: number[]; awareness: number[] }
  | { type: "document-update"; source: string; update: number[] }
  | { type: "awareness-update"; source: string; update: number[] };

const renderCursor = (user: CollaborationUser) => {
  const cursor = document.createElement("span");
  cursor.className = "analogix-cursor";
  cursor.style.borderColor = user.color;

  const label = document.createElement("span");
  label.className = "analogix-cursor__label";
  label.style.backgroundColor = user.color;
  label.textContent = user.name;

  cursor.appendChild(label);
  return cursor;
};

export const LocalCollaborationExtension = Extension.create<CollaborationRuntime>({
  name: "localCollaboration",

  addOptions() {
    return {
      fragment: null as unknown as CollaborationRuntime["fragment"],
      awareness: null as unknown as CollaborationRuntime["awareness"],
      user: null as unknown as CollaborationRuntime["user"],
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-z": () => undo(this.editor.state),
      "Mod-y": () => redo(this.editor.state),
      "Shift-Mod-z": () => redo(this.editor.state),
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.fragment || !this.options.awareness) {
      return [];
    }

    return [
      ySyncPlugin(this.options.fragment),
      yCursorPlugin(this.options.awareness, {
        cursorBuilder: (user) => renderCursor(user as CollaborationUser),
      }),
      yUndoPlugin(),
    ];
  },
});

export class BroadcastCollaborationProvider {
  private channel: BroadcastChannel | null = null;

  constructor(
    private readonly roomName: string,
    private readonly ydoc: Y.Doc,
    public readonly awareness: Awareness,
    private readonly sessionId: string,
    private readonly onStatus?: (status: CollaborationStatus) => void,
  ) {
    if (typeof BroadcastChannel === "undefined") {
      this.onStatus?.("unsupported");
      return;
    }

    this.onStatus?.("connecting");
    this.channel = new BroadcastChannel(this.roomName);
    this.channel.onmessage = this.handleMessage;
    this.ydoc.on("update", this.handleDocUpdate);
    this.awareness.on("update", this.handleAwarenessUpdate);

    this.onStatus?.("live");
    this.post({
      type: "sync-request",
      source: this.sessionId,
    });
  }

  destroy() {
    const awareness = encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]);
    this.post({
      type: "awareness-update",
      source: this.sessionId,
      update: Array.from(awareness),
    });
    removeAwarenessStates(this.awareness, [this.awareness.clientID], this);
    this.ydoc.off("update", this.handleDocUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);
    this.channel?.close();
    this.channel = null;
  }

  private post(message: CollaborationMessage) {
    this.channel?.postMessage(message);
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return;

    this.post({
      type: "document-update",
      source: this.sessionId,
      update: Array.from(update),
    });
  };

  private handleAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) return;

    const changed = [...added, ...updated, ...removed];
    if (changed.length === 0) return;

    const awareness = encodeAwarenessUpdate(this.awareness, changed);
    this.post({
      type: "awareness-update",
      source: this.sessionId,
      update: Array.from(awareness),
    });
  };

  private handleMessage = (event: MessageEvent<CollaborationMessage>) => {
    const message = event.data;
    if (!message || message.source === this.sessionId) return;

    if (message.type === "sync-request") {
      const update = Y.encodeStateAsUpdate(this.ydoc);
      const awareness = encodeAwarenessUpdate(
        this.awareness,
        Array.from(this.awareness.getStates().keys()),
      );

      this.post({
        type: "sync-response",
        source: this.sessionId,
        update: Array.from(update),
        awareness: Array.from(awareness),
      });
      return;
    }

    if (message.type === "sync-response" || message.type === "document-update") {
      Y.applyUpdate(this.ydoc, Uint8Array.from(message.update), this);
    }

    if (message.type === "sync-response") {
      applyAwarenessUpdate(this.awareness, Uint8Array.from(message.awareness), this);
      return;
    }

    if (message.type === "awareness-update") {
      applyAwarenessUpdate(this.awareness, Uint8Array.from(message.update), this);
    }
  };
}
