"use client";

import MarkdownRenderer from "@/components/shared/MarkdownRenderer";

export function StreamingMessage({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <div className="text-sm leading-relaxed">
      <MarkdownRenderer content={content} className="text-sm leading-relaxed" streaming={isStreaming} />
    </div>
  );
}
