export interface NormalizedQuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface NormalizedQuizQuestion {
  id: number | string;
  type: "multiple_choice" | "multiple_select" | "short_answer";
  question: string;
  analogy?: string;
  options: NormalizedQuizOption[];
  correctAnswer?: string;
  explanation?: string;
  hint?: string;
  reasoning?: string;
}

const normalizeType = (type?: string): NormalizedQuizQuestion["type"] => {
  const t = (type ?? "").toLowerCase().replace(/[-\s_]+/g, "");
  if (t === "multipleselect" || t === "multipleselection" || t === "checkbox") return "multiple_select";
  if (t === "shortanswer" || t === "text" || t === "write" || t === "written") return "short_answer";
  return "multiple_choice";
};

const asText = (opt: unknown): string => {
  if (typeof opt === "string") return opt;
  if (opt && typeof opt === "object") {
    const o = opt as { text?: unknown; label?: unknown };
    return typeof o.text === "string" ? o.text : typeof o.label === "string" ? o.label : "";
  }
  return String(opt ?? "");
};

const isCorrectForIndex = (correct: unknown, index: number): boolean => {
  if (typeof correct === "number") return index === correct;
  if (typeof correct === "string") {
    const n = Number(correct.trim());
    return Number.isFinite(n) && n === index;
  }
  return false;
};

const isCorrectForText = (correct: unknown, text: string): boolean => {
  if (typeof correct === "string") {
    return text.trim().toLowerCase() === correct.trim().toLowerCase();
  }
  return false;
};

export function normalizeQuizQuestions(raw: unknown): NormalizedQuizQuestion[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((q: any, qi: number): NormalizedQuizQuestion => {
    const correct = q?.correctAnswer;
    const rawOptions = Array.isArray(q?.options) ? q.options : [];

    const options: NormalizedQuizOption[] = rawOptions.map((opt: unknown, i: number) => {
      const text = asText(opt);
      const explicitCorrect = !!opt && typeof opt === "object" && (opt as { isCorrect?: unknown; correct?: unknown }).isCorrect === true;
      return {
        id: opt && typeof opt === "object" && typeof (opt as { id?: unknown }).id === "string"
          ? (opt as { id: string }).id
          : `opt-${qi}-${i}`,
        text,
        isCorrect: explicitCorrect || isCorrectForIndex(correct, i) || isCorrectForText(correct, text),
      };
    });

    const flagged = options.find((o) => o.isCorrect);
    const correctAnswer =
      flagged?.text ??
      (typeof correct === "string" ? correct : undefined) ??
      (typeof correct === "number" && options[correct] ? options[correct].text : undefined);

    return {
      ...q,
      id: q?.id ?? qi,
      type: normalizeType(q?.type),
      question: q?.question ?? "",
      options,
      correctAnswer,
      analogy: q?.analogy,
      explanation: q?.explanation,
      hint: q?.hint,
      reasoning: q?.reasoning,
    };
  });
}