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
