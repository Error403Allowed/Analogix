"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, ListChecks, TrendingUp } from "lucide-react";
import { WorkspaceScaffold, Panel } from "@/components/v2/WorkspaceScaffold";
import { subjectStore, type SubjectData } from "@/utils/subjectStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { useRouter } from "next/navigation";

type SubjectPriority = {
  id: string;
  label: string;
  pendingTasks: number;
  documents: number;
  momentum: number;
};

export default function StudyMapHome() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectPriority[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await subjectStore.getAll();
      const next = SUBJECT_CATALOG.map((subject) => {
        const row: SubjectData | undefined = data[subject.id];
        const pendingTasks = (row?.notes?.homework ?? []).filter((item) => !item.completed).length;
        const documents = row?.notes?.documents?.length ?? 0;
        const momentum = Math.max(0, 100 - pendingTasks * 18 + documents * 6);
        return {
          id: subject.id,
          label: subject.label,
          pendingTasks,
          documents,
          momentum,
        };
      });
      next.sort((a, b) => (b.pendingTasks - a.pendingTasks) || (a.momentum - b.momentum));
      setSubjects(next);
    };
    load();
  }, []);

  const summary = useMemo(() => {
    const totalPending = subjects.reduce((sum, subject) => sum + subject.pendingTasks, 0);
    const avgMomentum = subjects.length ? Math.round(subjects.reduce((sum, subject) => sum + subject.momentum, 0) / subjects.length) : 0;
    return { totalPending, avgMomentum };
  }, [subjects]);

  return (
    <WorkspaceScaffold
      title="Study Map"
      subtitle="A workflow-first subject system that prioritizes what to tackle next."
      rail={
        <>
          <Panel title="Urgency">
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground"><ListChecks className="mr-2 inline h-4 w-4" />Pending tasks: <span className="text-foreground">{summary.totalPending}</span></p>
              <p className="text-muted-foreground"><TrendingUp className="mr-2 inline h-4 w-4" />Average momentum: <span className="text-foreground">{summary.avgMomentum}%</span></p>
              <p className="text-muted-foreground"><Clock3 className="mr-2 inline h-4 w-4" />Prioritized by urgency + momentum</p>
            </div>
          </Panel>
        </>
      }
    >
      <Panel title="Subject Priorities" description="Top cards show where your next study block should go.">
        <div className="grid gap-3 md:grid-cols-2">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => router.push(`/study-map/${subject.id}`)}
              className="group rounded-lg border border-border/60 bg-background p-4 text-left transition hover:border-primary/50"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold">{subject.label}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{subject.pendingTasks} pending</span>
                <span>•</span>
                <span>{subject.documents} docs</span>
                <span>•</span>
                <span>{subject.momentum}% momentum</span>
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </WorkspaceScaffold>
  );
}
