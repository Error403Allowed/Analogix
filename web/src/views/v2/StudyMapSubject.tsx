"use client";

import { useParams, useRouter } from "next/navigation";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudyMapSubject() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params?.subjectId as string;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/study-map")}>
        <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to Study Map
      </Button>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Subject Workspace
        </p>
        <h1 className="text-3xl font-black tracking-tight">{subjectId ?? "Subject"}</h1>
      </div>

      <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-10 text-center space-y-4">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          This subject workspace is under construction. In the meantime, head to{" "}
          <button onClick={() => router.push("/subjects")} className="text-primary underline">
            Subjects
          </button>{" "}
          to access your content.
        </p>
      </div>
    </div>
  );
}
