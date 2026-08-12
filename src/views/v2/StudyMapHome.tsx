"use client";

import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudyMapHome() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Study Map
        </p>
        <h1 className="text-3xl font-black tracking-tight">Your learning journey</h1>
        <p className="text-sm text-muted-foreground">
          Select a subject to explore topics, resources, and progress.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-10 text-center space-y-4">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Study Map is coming soon. In the meantime, head to{" "}
          <button onClick={() => router.push("/subjects")} className="text-primary underline">
            Subjects
          </button>{" "}
          to manage your content.
        </p>
        <Button variant="secondary" size="sm" onClick={() => router.push("/subjects")}>
          Go to Subjects <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
