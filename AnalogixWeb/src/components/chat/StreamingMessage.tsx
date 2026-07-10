"use client";

import MarkdownRenderer from "@/components/MarkdownRenderer";

export function StreamingMessage({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <div className="text-sm leading-relaxed">
      <MarkdownRenderer content={content} className="text-sm leading-relaxed" streaming={isStreaming} />
      {isStreaming && <span className="inline-block w-[2px] h-[1.2em] bg-foreground/80 ml-[2px] -mb-[2px] align-middle animate-[blink_1s_ease-in-out_infinite]" />}
    </div>
  );
}
