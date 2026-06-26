"use client";

import { useMemo, useState } from "react";
import { Brain, CheckCircle2, Circle, Play } from "lucide-react";
import { WorkspaceScaffold, Panel } from "@/components/v2/WorkspaceScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateQuiz, generateQuizReview } from "@/services/groq";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { statsStore } from "@/utils/statsStore";
import type { QuizAnswerInput, QuizQuestion } from "@/types/quiz";

type Stage = "builder" | "attempt" | "results";

export default function QuizStudio() {
  const [stage, setStage] = useState<Stage>("builder");
  const [subjectId, setSubjectId] = useState<string>(SUBJECT_CATALOG[0]?.id ?? "math");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(6);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Array<QuizAnswerInput | null>>([]);
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState<string>("");

  const current = questions[index];
  const score = useMemo(() => answers.filter((answer) => answer?.isCorrect).length, [answers]);

  const build = async () => {
    setLoading(true);
    try {
      const data = await generateQuiz(topic || subjectId, { subject: subjectId, difficulty, hobbies: [] }, count);
      const nextQuestions = data?.questions ?? [];
      setQuestions(nextQuestions);
      setAnswers(Array(nextQuestions.length).fill(null));
      setIndex(0);
      setStage("attempt");
      setReview("");
    } finally {
      setLoading(false);
    }
  };

  const answerQuestion = (selected: string) => {
    if (!current) return;
    const correct = current.options?.find((option) => option.isCorrect)?.text ?? "";
    const entry: QuizAnswerInput = {
      id: current.id,
      type: current.type || "multiple_choice",
      question: current.question,
      userAnswer: selected,
      correctAnswer: correct,
      isCorrect: selected === correct,
    };
    const next = [...answers];
    next[index] = entry;
    setAnswers(next);
  };

  const next = async () => {
    if (index + 1 < questions.length) {
      setIndex((prev) => prev + 1);
      return;
    }
    const nonNullAnswers = answers.filter(Boolean) as QuizAnswerInput[];
    const reviewData = await generateQuizReview({
      subject: subjectId,
      difficulty,
      answers: nonNullAnswers,
    });
    setReview(reviewData?.summary || "Review complete.");
    setStage("results");

    // Save quiz stats
    const pct = questions.length > 0 ? (score / questions.length) * 100 : 0;
    statsStore.addQuiz(pct);
  };

  return (
    <WorkspaceScaffold
      title="Quiz Studio"
      subtitle="Guided quiz builder, focused attempt mode, and diagnostics-driven review."
      rail={
        <Panel title="Progress">
          <p className="text-sm text-muted-foreground">Stage: <span className="text-foreground">{stage}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Question: <span className="text-foreground">{Math.min(index + 1, questions.length)} / {questions.length || 0}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Score: <span className="text-foreground">{score}</span></p>
        </Panel>
      }
    >
      {stage === "builder" ? (
        <Panel title="Builder" description="Set scope and pace before you begin.">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Subject id" />
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)" />
            <Input value={String(count)} onChange={(e) => setCount(Number(e.target.value) || 6)} placeholder="Question count" />
            <Input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Difficulty" />
          </div>
          <div className="mt-4">
            <Button onClick={build} disabled={loading}>
              <Play className="mr-2 h-4 w-4" />
              {loading ? "Generating…" : "Start Quiz"}
            </Button>
          </div>
        </Panel>
      ) : null}

      {stage === "attempt" && current ? (
        <Panel title={`Question ${index + 1}`} description={current.analogy || current.hint || "Answer, then continue."}>
          <p className="mb-4 text-lg font-semibold">{current.question}</p>
          <div className="grid gap-2">
            {(current.options || []).map((option) => {
              const selected = answers[index]?.userAnswer === option.text;
              return (
                <button
                  key={option.text}
                  onClick={() => answerQuestion(option.text)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${selected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:border-primary/50"}`}
                >
                  {option.text}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={next} disabled={!answers[index]}>
              Next
            </Button>
          </div>
        </Panel>
      ) : null}

      {stage === "results" ? (
        <Panel title="Diagnostics" description="Use this analysis to drive your next study action.">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Brain className="h-5 w-5" />
            {score}/{questions.length} correct
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review}</p>
          <div className="mt-5 space-y-2">
            {(answers.filter(Boolean) as QuizAnswerInput[]).map((answer, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                {answer.isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-rose-500" />}
                <span className="truncate">{answer.question}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </WorkspaceScaffold>
  );
}
