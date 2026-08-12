export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface DesmosConfig {
  expressions: Array<{ id: string; latex: string }>;
  bounds?: { left: number; right: number; bottom: number; top: number };
}

export interface QuizQuestion {
  id: number | string;
  type?: "multiple_choice" | "short_answer" | "multiple_select";
  question: string;
  analogy?: string;
  options?: QuizOption[];
  correctAnswer?: string;
  explanation?: string;
  hint?: string;
  python_solution?: string;
  reasoning?: string;
  desmos?: DesmosConfig;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface QuizAnswerInput {
  id: number | string;
  type: "multiple_choice" | "multiple_select" | "short_answer";
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface QuizReviewItem {
  id: number | string;
  feedback: string;
}

export interface QuizReview {
  summary: string;
  questions: QuizReviewItem[];
}
