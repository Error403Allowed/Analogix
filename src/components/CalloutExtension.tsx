import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import React from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";

// ── Callout node view ──────────────────────────────────────────────────────
function CalloutView({ node, updateAttributes }: any) {
  const emoji = node.attrs.emoji || "💡";
  const color  = node.attrs.color || "blue";

  const colors: Record<string, string> = {
    blue:   "bg-blue-500/10 border-blue-500/20",
    yellow: "bg-yellow-500/10 border-yellow-500/20",
    red:    "bg-red-500/10 border-red-500/20",
    green:  "bg-green-500/10 border-green-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
    gray:   "bg-muted/40 border-border/60",
  };

  const cycleEmoji = () => {
    const emojis = ["💡", "⚠️", "📌", "✅", "❌", "🔥", "📝", "🎯", "💬", "🧠"];
    const idx = emojis.indexOf(emoji);
    updateAttributes({ emoji: emojis[(idx + 1) % emojis.length] });
  };

  return (
    <NodeViewWrapper>
      <div className={`flex gap-3 rounded-lg border p-3.5 my-1 ${colors[color] || colors.blue}`}>
        <button
          onClick={cycleEmoji}
          className="text-lg shrink-0 mt-0.5 hover:scale-110 transition-transform cursor-pointer select-none"
          contentEditable={false}
          title="Click to change icon"
        >
          {emoji}
        </button>
        <NodeViewContent className="flex-1 text-sm leading-relaxed outline-none min-h-[1.5em]" />
      </div>
    </NodeViewWrapper>
  );
}

// ── Callout extension ──────────────────────────────────────────────────────
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      emoji: { default: "💡" },
      color: { default: "blue" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
