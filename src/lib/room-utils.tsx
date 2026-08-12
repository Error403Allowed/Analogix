"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, PencilRuler, FileText } from "lucide-react";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import type {
  StudyRoom,
  StudyRoomMember,
  StudyRoomMessage,
  RoomSharedDocument,
} from "@/types/rooms";

export interface RoomCanvasData {
  title: string;
  content: string;
  contentJson: string | null;
}

export interface RoomStateResponse {
  room: StudyRoom;
  members: StudyRoomMember[];
  messages: StudyRoomMessage[];
  canvas: RoomCanvasData | null;
  sharedDocuments: RoomSharedDocument[];
}

export interface SharedDocumentRecord {
  id: string;
  subject_id: string;
  title: string;
  content: string;
  content_json?: string | null;
  content_text?: string | null;
  content_format?: string | null;
  role?: string | null;
}

export const formatClock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const parseThinkingContent = (content: string): { thinking: string | null; response: string } => {
  const trimmed = content.trimStart();
  const completeMatch = trimmed.match(/^<think>([\s\S]*?)<\/think>\s*/);
  if (completeMatch) {
    const response = trimmed.slice(completeMatch[0].length).trim();
    if (!response) {
      return { thinking: completeMatch[1].trim(), response: "" };
    }
    return { thinking: completeMatch[1].trim(), response };
  }
  const openOnly = trimmed.match(/^<think>([\s\S]*)$/);
  if (openOnly) {
    return { thinking: openOnly[1].trim(), response: "" };
  }
  return { thinking: null, response: content };
};

export const ThinkingBlock = ({ content }: { content: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors mb-1.5"
      >
        <motion.svg
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
        >
          <path d="M3 1.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </motion.svg>
        <span className="text-[11px] font-medium select-none tracking-wide">
          {open ? "Hide thinking" : "Show thinking"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="thinking-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 border-l-2 border-border/40">
              <div className="text-xs text-muted-foreground/55 italic leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
                <MarkdownRenderer content={content} className="text-xs" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const sections = [
  { id: "chat" as const, label: "Chat", icon: MessageSquare },
  { id: "workspace" as const, label: "Workspace", icon: PencilRuler },
  { id: "documents" as const, label: "Documents", icon: FileText },
];
