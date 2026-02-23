export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number | string;
  type?: "multiple_choice" | "short_answer";
  question: string;
  analogy?: string; // Optional explanation/analogy
  options?: QuizOption[];
  correctAnswer?: string; // For short answer
  hint?: string;
  python_solution?: string;
  reasoning?: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface QuizAnswerInput {
  id: number | string;
  type: "multiple_choice" | "short_answer";
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
