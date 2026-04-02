import { useEffect, useRef, useState } from "react";
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  type BlockConfig,
} from "@blocknote/core";
import katex from "katex";

const mathPropSchema = { formula: { default: "" } } as const;

const mathBlockConfig = {
  type: "math" as const,
  propSchema: mathPropSchema,
  content: "none" as const,
} satisfies BlockConfig;

type MathBlockRenderProps = ReactCustomBlockRenderProps<typeof mathBlockConfig>;

function MathBlockView({ block, editor }: MathBlockRenderProps) {
  const [editing, setEditing] = useState(!block.props.formula);
  const [input, setInput] = useState<string>(block.props.formula ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const commit = () => {
    editor.updateBlock(block, { props: { formula: input } });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="my-2 rounded-xl border border-primary/30 bg-muted/20 p-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
          LaTeX / KaTeX equation
        </p>
        <textarea
          ref={textareaRef}
          className="w-full text-sm font-mono bg-transparent outline-none resize-none text-foreground placeholder:text-muted-foreground/30"
          rows={3}
          placeholder={String.raw`e.g. \frac{-b \pm \sqrt{b^2-4ac}}{2a}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={commit}
            className="text-xs font-bold px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Render
          </button>
          {block.props.formula && (
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/40">⌘↵ to render</span>
        </div>
      </div>
    );
  }

  let html = "";
  try {
    html = katex.renderToString(input, { displayMode: true, throwOnError: false });
  } catch {
    html = `<span class="text-destructive text-sm">Invalid LaTeX: ${input}</span>`;
  }

  return (
    <div
      className="my-3 px-4 py-3 rounded-xl bg-muted/10 border border-border/30 cursor-pointer hover:bg-muted/20 transition-colors overflow-x-auto"
      onClick={() => {
        setInput(block.props.formula ?? "");
        setEditing(true);
      }}
      title="Click to edit"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const createMathBlockSpec = createReactBlockSpec(
  { type: "math" as const, propSchema: mathPropSchema, content: "none" },
  { render: MathBlockView },
);

export function createBlockNoteEditorSchema() {
  return BlockNoteSchema.create({
    blockSpecs: { ...defaultBlockSpecs, math: createMathBlockSpec() },
    inlineContentSpecs: defaultInlineContentSpecs,
    styleSpecs: defaultStyleSpecs,
  });
}

export type BlockNoteEditorSchema = ReturnType<typeof createBlockNoteEditorSchema>;
export type BlockNoteEditorBlock = BlockNoteEditorSchema["Block"];
export type BlockNoteEditorPartialBlock = BlockNoteEditorSchema["PartialBlock"];
