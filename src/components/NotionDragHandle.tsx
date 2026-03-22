"use client";

/**
 * NotionDragHandle
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a ⠿ drag handle + ＋ add-block button that appear when you hover
 * over any block in the TipTap editor.  Works by listening to mousemove over
 * the .ProseMirror container and finding the closest block-level DOM node.
 *
 * No Pro extension needed — pure DOM + React.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { GripVertical, Plus } from "lucide-react";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
}

export default function NotionDragHandle({ editor }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [hoveredEl, setHoveredEl] = useState<HTMLElement | null>(null);
  const dragSrcRef = useRef<HTMLElement | null>(null);
  const handleRef  = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);

  // ── Find the closest block ancestor inside ProseMirror ─────────────────
  const getBlock = useCallback((target: HTMLElement, pm: HTMLElement): HTMLElement | null => {
    let el: HTMLElement | null = target;
    while (el && el !== pm) {
      if (el.parentElement === pm) return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  // ── Mouse tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    const pm = document.querySelector(".ProseMirror") as HTMLElement | null;
    if (!pm) return;

    const onMove = (e: MouseEvent) => {
      // Skip if mouse is over the handle itself
      if (handleRef.current?.contains(e.target as Node)) return;

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (!el || !pm.contains(el)) { setPos(null); setHoveredEl(null); return; }

        const block = getBlock(el, pm);
        if (!block) { setPos(null); setHoveredEl(null); return; }

        const rect  = block.getBoundingClientRect();
        const pmRect = pm.getBoundingClientRect();

        setHoveredEl(block);
        setPos({
          top:  rect.top  - pmRect.top  + pm.scrollTop  + (rect.height / 2) - 12,
          left: pmRect.left - 52, // 52px left of the pm container
        });
      });
    };

    const onLeave = (e: MouseEvent) => {
      if (handleRef.current?.contains(e.relatedTarget as Node)) return;
      setPos(null);
      setHoveredEl(null);
    };

    pm.addEventListener("mousemove", onMove);
    pm.addEventListener("mouseleave", onLeave);
    return () => {
      pm.removeEventListener("mousemove", onMove);
      pm.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor, getBlock]);

  // ── Drag-and-drop ──────────────────────────────────────────────────────
  const onDragStart = useCallback((e: React.DragEvent) => {
    if (!hoveredEl || !editor) return;
    dragSrcRef.current = hoveredEl;
    hoveredEl.setAttribute("draggable", "true");
    e.dataTransfer.effectAllowed = "move";
    // Give the browser a frame to capture the ghost
    setTimeout(() => hoveredEl.classList.add("opacity-40"), 0);
  }, [hoveredEl, editor]);

  const onDragEnd = useCallback(() => {
    if (dragSrcRef.current) {
      dragSrcRef.current.removeAttribute("draggable");
      dragSrcRef.current.classList.remove("opacity-40");
      dragSrcRef.current = null;
    }
  }, []);

  // ── Add block below ────────────────────────────────────────────────────
  const addBlockBelow = useCallback(() => {
    if (!editor || !hoveredEl) return;
    // Find the ProseMirror position of the end of this block
    const pm = document.querySelector(".ProseMirror") as HTMLElement;
    if (!pm) return;

    // Walk all block children of pm to find the index of hoveredEl
    const children = Array.from(pm.children) as HTMLElement[];
    const idx = children.indexOf(hoveredEl);
    if (idx === -1) return;

    // Map to a doc position: insert a paragraph after this block
    let pos = 0;
    editor.state.doc.descendants((node, nodePos) => {
      const dom = editor.view.nodeDOM(nodePos) as HTMLElement | null;
      if (dom === hoveredEl) {
        pos = nodePos + node.nodeSize;
        return false;
      }
    });

    editor
      .chain()
      .focus()
      .insertContentAt(pos, { type: "paragraph" })
      .run();
  }, [editor, hoveredEl]);

  if (!pos) return null;

  return (
    <div
      ref={handleRef}
      className="fixed z-[100] flex items-center gap-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
      style={{ top: pos.top, left: pos.left }}
      onMouseEnter={() => {/* keep visible */}}
    >
      {/* Add block */}
      <button
        onClick={addBlockBelow}
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        title="Add block below"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {/* Drag handle */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
