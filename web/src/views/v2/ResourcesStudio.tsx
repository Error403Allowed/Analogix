"use client";

import { useMemo, useState } from "react";
import { BookOpen, ExternalLink, Filter, MessageCircle, SquareStack } from "lucide-react";
import { WorkspaceScaffold, Panel } from "@/components/v2/WorkspaceScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RESOURCES from "@/data/resources";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { useRouter } from "next/navigation";

type ResourceType = "all" | "pastPapers" | "textbooks";

export default function ResourcesStudio() {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState("all");
  const [type, setType] = useState<ResourceType>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const items: Array<{ subjectId: string; title: string; url: string; description?: string; free?: boolean; type: ResourceType }> = [];
    for (const subject of RESOURCES) {
      for (const item of subject.pastPapers) {
        items.push({ subjectId: subject.subjectId, title: item.title, url: item.url, description: item.description, free: item.free, type: "pastPapers" });
      }
      for (const item of subject.textbooks) {
        items.push({ subjectId: subject.subjectId, title: item.title, url: item.url, description: item.description, free: item.free, type: "textbooks" });
      }
    }
    return items.filter((item) => {
      if (subjectId !== "all" && item.subjectId !== subjectId) return false;
      if (type !== "all" && item.type !== type) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q);
    });
  }, [subjectId, type, query]);

  return (
    <WorkspaceScaffold
      title="Resources Desk"
      subtitle="Discover, filter, and convert study resources into direct learning actions."
      rail={
        <>
          <Panel title="Quick Actions">
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start" onClick={() => router.push("/chat")}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Ask Tutor About Resource
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => router.push("/flashcards")}>
                <SquareStack className="mr-2 h-4 w-4" />
                Convert to Flashcards
              </Button>
            </div>
          </Panel>
          <Panel title="Visible Results">
            <p className="text-2xl font-semibold">{rows.length}</p>
            <p className="text-sm text-muted-foreground">Matching resources</p>
          </Panel>
        </>
      }
    >
      <Panel title="Filters" description="Faceted filtering by subject, type, and keyword.">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Subject id or all" />
          <Input value={type} onChange={(e) => setType((e.target.value as ResourceType) || "all")} placeholder="all | pastPapers | textbooks" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles and descriptions" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Try subject ids like {SUBJECT_CATALOG.slice(0, 6).map((s) => s.id).join(", ")}.
        </div>
      </Panel>

      <Panel title="Resource Results">
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((item, idx) => (
            <a
              key={`${item.url}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border/60 bg-background p-4 transition hover:border-primary/50"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-snug">{item.title}</p>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <Filter className="mr-1 inline h-3 w-3" />
                {item.subjectId} · {item.type}
              </p>
              {item.description ? <p className="mt-2 text-sm text-muted-foreground">{item.description}</p> : null}
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                {item.free ? "Free resource" : "Publisher resource"}
              </div>
            </a>
          ))}
        </div>
      </Panel>
    </WorkspaceScaffold>
  );
}
