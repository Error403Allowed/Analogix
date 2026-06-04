"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ClipboardList, MessageCircle, SquareStack } from "lucide-react";
import { WorkspaceScaffold, Panel } from "@/components/v2/WorkspaceScaffold";
import { subjectStore, type SubjectData } from "@/utils/subjectStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StudyMapSubject() {
  const router = useRouter();
  const params = useParams();
  const subjectId = String(params?.subjectId || "");
  const subject = SUBJECT_CATALOG.find((row) => row.id === subjectId);

  const [data, setData] = useState<SubjectData | null>(null);
  const [task, setTask] = useState("");

  useEffect(() => {
    const load = async () => {
      const next = await subjectStore.getSubject(subjectId);
      setData(next);
    };
    if (subjectId) load();
  }, [subjectId]);

  const pending = useMemo(() => (data?.notes.homework ?? []).filter((item) => !item.completed), [data]);

  const addTask = async () => {
    if (!task.trim()) return;
    const next = [
      {
        id: crypto.randomUUID(),
        title: task.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      },
      ...(data?.notes.homework ?? []),
    ];
    await subjectStore.updateHomework(subjectId, next);
    setTask("");
    const refreshed = await subjectStore.getSubject(subjectId);
    setData(refreshed);
  };

  const toggleTask = async (id: string) => {
    const current = data?.notes.homework ?? [];
    const next = current.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
    await subjectStore.updateHomework(subjectId, next);
    const refreshed = await subjectStore.getSubject(subjectId);
    setData(refreshed);
  };

  return (
    <WorkspaceScaffold
      title={subject ? `${subject.label} Workspace` : "Subject Workspace"}
      subtitle="Action-first subject page with direct transitions to tutor, quizzes, flashcards, and resources."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => router.push("/chat")}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Tutor
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/quiz")}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Quiz
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/flashcards")}>
            <SquareStack className="mr-2 h-4 w-4" />
            Flashcards
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/resources")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Resources
          </Button>
        </>
      }
      rail={
        <Panel title="Subject Health">
          <p className="text-sm text-muted-foreground">Pending tasks: <span className="text-foreground">{pending.length}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Documents: <span className="text-foreground">{data?.notes.documents?.length ?? 0}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: <span className="text-foreground">{data?.notes.lastUpdated ? new Date(data.notes.lastUpdated).toLocaleDateString() : "—"}</span></p>
        </Panel>
      }
    >
      <Panel title="Current Priorities" description="Capture and resolve tasks directly from this workspace.">
        <div className="mb-4 flex gap-2">
          <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a next study action" />
          <Button onClick={addTask}>Add</Button>
        </div>
        <div className="space-y-2">
          {pending.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleTask(item.id)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-left text-sm transition hover:border-primary/50"
            >
              {item.title}
            </button>
          ))}
          {pending.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
              No pending tasks. Add your next milestone.
            </div>
          ) : null}
        </div>
      </Panel>
    </WorkspaceScaffold>
  );
}
