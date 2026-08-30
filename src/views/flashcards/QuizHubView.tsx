"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, BookOpen, ChevronRight, Clock, Loader2,
  RotateCcw, Sparkles, Target, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, cardStyles } from "@/lib/utils";
import QuizCard from "@/components/shared/QuizCard";
import { subjectLabel } from "./types";
import type { QuizQuestion } from "@/types/quiz";
import type { QuizAnswerInput } from "@/types/quiz";

type QuizAnswerRecord = QuizAnswerInput & {
  options?: import("@/types/quiz").QuizOption[];
  feedback?: string;
};

export interface QuizHubViewProps {
  quizSubject: string;
  quizTopics: string;
  quizNumQ: number;
  quizDifficulty: string;
  quizTimeLimit: number;
  subjectOptions: string[];
  quizStarted: boolean;
  quizLoading: boolean;
  quizQuestions: QuizQuestion[];
  quizComplete: boolean;
  quizCurrentQ: number;
  quizAnswers: Array<QuizAnswerRecord | null>;
  quizTimeLeft: number | null;
  quizScore: number;
  onSetQuizSubject: (subject: string) => void;
  onSetQuizTopics: (topics: string) => void;
  onSetQuizNumQ: (n: number) => void;
  onSetQuizDifficulty: (d: string) => void;
  onSetQuizTimeLimit: (t: number) => void;
  onRunQuizHub: () => void;
  onHandleQuizAnswer: (payload: { isCorrect: boolean; userAnswer: string; feedback?: string }) => void;
  onHandleQuizNext: () => void;
  onResetQuiz: () => void;
  onBack: () => void;
}

export function QuizHubView(props: QuizHubViewProps) {
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div
      key="quiz-hub"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="space-y-6 max-w-5xl mx-auto w-full"
    >
      {!props.quizStarted && !props.quizLoading && (
        <div className={cn(cardStyles.default, "p-8 space-y-6")}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Quiz Hub</h2>
              <p className="text-sm text-muted-foreground">Build a custom quiz on any topic</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</label>
            <select value={props.quizSubject} onChange={e => props.onSetQuizSubject(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {props.subjectOptions.map(id => <option key={id} value={id}>{subjectLabel(id)}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Topic outline <span className="text-muted-foreground/50 normal-case font-medium">(optional)</span>
            </label>
            <textarea
              value={props.quizTopics}
              onChange={e => props.onSetQuizTopics(e.target.value)}
              placeholder={"e.g. Quadratic equations, factorising, the quadratic formula\nor: World War 1 causes, the Western Front, Treaty of Versailles"}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[10px] text-muted-foreground">Describe the specific topics, chapters, or concepts you want tested. Leave blank to let the AI choose.</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Questions</label>
              <span className="text-sm font-black text-primary">{props.quizNumQ}</span>
            </div>
            <Slider value={[props.quizNumQ]} onValueChange={([v]) => props.onSetQuizNumQ(v)} min={3} max={20} step={1} />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Difficulty</label>
              <Select value={props.quizDifficulty} onValueChange={props.onSetQuizDifficulty}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="foundational">Foundational</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time limit</label>
                <span className="text-sm font-black text-primary">{props.quizTimeLimit === 0 ? "Untimed" : `${props.quizTimeLimit}m`}</span>
              </div>
              <Slider value={[props.quizTimeLimit]} onValueChange={([v]) => props.onSetQuizTimeLimit(v)} min={0} max={30} step={1} />
            </div>
          </div>

          <Button size="lg" className="w-full gradient-primary text-white border-0 h-14 text-base font-bold" onClick={props.onRunQuizHub}>
            <Sparkles className="w-5 h-5 mr-2" /> Generate Quiz
          </Button>
        </div>
      )}

      {props.quizLoading && (
        <div className="text-center py-20 space-y-3">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generating your quiz{props.quizTopics ? " on your topics" : ""}...</p>
        </div>
      )}

      {props.quizStarted && !props.quizLoading && props.quizQuestions.length > 0 && !props.quizComplete && (
        <div className="space-y-4">
          <div className={cn(cardStyles.default, "flex items-center justify-between px-5 py-3")}>
            <span className="text-sm font-bold">{props.quizCurrentQ + 1} / {props.quizQuestions.length}</span>
            {props.quizTimeLeft !== null && (
              <span className={cn("font-mono font-bold text-sm", props.quizTimeLeft < 30 ? "text-destructive animate-pulse" : "text-primary")}>
                <Clock className="inline w-3.5 h-3.5 mr-1" />{formatTime(props.quizTimeLeft)}
              </span>
            )}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={props.quizCurrentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <QuizCard
                type={props.quizQuestions[props.quizCurrentQ]?.type}
                question={props.quizQuestions[props.quizCurrentQ]?.question}
                options={props.quizQuestions[props.quizCurrentQ]?.options}
                correctAnswer={props.quizQuestions[props.quizCurrentQ]?.correctAnswer}
                questionNumber={props.quizCurrentQ + 1}
                totalQuestions={props.quizQuestions.length}
                onAnswer={props.onHandleQuizAnswer}
                hint={props.quizQuestions[props.quizCurrentQ]?.hint}
              />
            </motion.div>
          </AnimatePresence>
          {props.quizAnswers[props.quizCurrentQ] && (
            <div className="flex justify-end">
              <Button onClick={props.onHandleQuizNext} className="gap-2">
                {props.quizCurrentQ + 1 >= props.quizQuestions.length ? "Finish" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {props.quizStarted && !props.quizLoading && props.quizQuestions.length === 0 && !props.quizComplete && (
        <div className="text-center py-16 space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive/50" />
          <p className="text-sm text-muted-foreground">Couldn't generate questions. Check your connection.</p>
          <Button variant="outline" onClick={props.onResetQuiz}>Try again</Button>
        </div>
      )}

      {props.quizComplete && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className={cn(cardStyles.default, "p-8 text-center space-y-5")}
        >
          <Trophy className="w-14 h-14 mx-auto text-primary" />
          <h3 className="text-2xl font-black">Quiz complete!</h3>
          <p className="text-muted-foreground">Score: <span className="text-2xl font-black text-primary">{props.quizScore}/{props.quizQuestions.length}</span></p>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {props.quizAnswers.map((a, i) => (
              <div key={i} className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                a?.isCorrect ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
              )}>
                {a?.isCorrect ? "\u2713" : "\u2717"}
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={props.onResetQuiz}>
              <RotateCcw className="w-4 h-4 mr-2" /> New quiz
            </Button>
            <Button onClick={props.onBack}>
              <BookOpen className="w-4 h-4 mr-2" /> Library
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
