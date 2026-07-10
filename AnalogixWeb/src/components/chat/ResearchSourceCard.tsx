"use client";

import { ExternalLink } from "lucide-react";
import type { ResearchSource } from "@/types/research";
import { formatAuthors, formatDisplayUrl } from "@/utils/research-format";

export function ResearchSourceCard({ source, index, compact = false }: { source: ResearchSource; index: number; compact?: boolean }) {
  const displayUrl = source.url || source.pdfUrl;
  return (
    <div className={`rounded-xl border border-border/40 bg-muted/20 p-3 ${compact ? "text-[10px]" : "text-xs"}`}>
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-black text-primary shrink-0">[{index}]</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground leading-snug">{source.title}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {formatAuthors(source.authors)}{source.year ? ` · ${source.year}` : ""}{source.venue ? ` · ${source.venue}` : ""}
          </p>
        </div>
      </div>
      {source.abstract && !compact && (
        <p className="text-[10px] text-muted-foreground/70 mt-2 leading-snug">{source.abstract}</p>
      )}
      <div className="mt-2">
        {displayUrl ? (
          <a href={displayUrl} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            {formatDisplayUrl(displayUrl)}
          </a>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">Local file</span>
        )}
      </div>
    </div>
  );
}
