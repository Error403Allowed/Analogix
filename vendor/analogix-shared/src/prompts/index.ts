export interface PromptSuggestion {
  label: string;
  prompt: string;
}

export interface PromptSuggestionProfile {
  subjects?: string[];
  grade?: string | number | null;
  hobbies?: string[];
}

export interface PromptSuggestionOptions {
  currentSubject?: string | null;
  seed?: number;
}

const cleanHobby = (hobby: string): string => hobby.split("(")[0].trim();

type Rand = () => number;

function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rand: Rand): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const pickTemplate = (rand: Rand) => <T,>(items: T[]): T =>
  items[Math.floor(rand() * items.length)];

const EXPLAIN = (topic: string, hobby?: string): string[] => [
  `Teach me about ${topic} step by step with simple examples${hobby ? `, using ${hobby} analogies` : ""}`,
  `Break down ${topic} into easy-to-understand pieces${hobby ? ` through the lens of ${hobby}` : ""}`,
  `Walk me through ${topic} like I've never seen it before${hobby ? `, tying it to ${hobby}` : ""}`,
];

const QUIZ = (topic: string, hobby?: string): string[] => [
  `Test me with a quiz on ${topic} and explain the answers${hobby ? ` using ${hobby} examples` : ""}`,
  `Quiz me on ${topic} with answer explanations${hobby ? ` framed around ${hobby}` : ""}`,
  `Create a quick quiz on ${topic} to test what I know${hobby ? ` with ${hobby}` : ""}`,
];

const STUDY_PLAN = (grade?: string): string[] =>
  grade
    ? [
        `Create a study plan to prepare for my Year ${grade} exams`,
        `Help me build a study schedule for Year ${grade}`,
        `Plan my revision for the Year ${grade} exam period`,
      ]
    : [
        "Create a weekly study plan to prepare for my exams",
        "Help me build a study schedule for the week",
        "Plan my revision schedule for upcoming assessments",
      ];

const HOBBY = (topic: string, hobby: string): string[] => [
  `Teach me about ${topic} using ${hobby} analogies`,
  `Explain ${topic} through the lens of ${hobby} with concrete examples`,
  `Help me understand ${topic} using examples from ${hobby}`,
];

const PRACTICE = (topic: string, hobby?: string): string[] => [
  `Give me practice questions on ${topic} with worked solutions${hobby ? ` inspired by ${hobby}` : ""}`,
  `Set me some problems on ${topic} to work through${hobby ? ` using ${hobby} scenarios` : ""}`,
  `Create practice exercises for ${topic} with solutions${hobby ? ` based on ${hobby}` : ""}`,
];

/**
 * Builds 4 dynamic chat prompt suggestions from a user's profile.
 *
 * Results vary across visits: pass a fresh `seed` (e.g. generated on mount)
 * to get a different set of prompts each time. Without a seed, a random one
 * is used. `currentSubject` (e.g. the subject selected in the chat header)
 * takes precedence over the user's subjects list when personalising.
 */
export function buildPromptSuggestions(
  profile: PromptSuggestionProfile = {},
  options: PromptSuggestionOptions = {},
): PromptSuggestion[] {
  const seed = options.seed ?? Math.floor(Math.random() * 0x7fffffff);
  const rand = mulberry32(seed);

  const subjects = seededShuffle((profile.subjects ?? []).filter(Boolean), rand);
  const hobbies = seededShuffle((profile.hobbies ?? []).filter(Boolean), rand);
  const rawGrade = profile.grade;
  // Grade can arrive as a string or a number (older localStorage / DB rows).
  // Coerce to a trimmed string so `.trim()` never throws on a non-string, and
  // treat falsy/reserved values like "0" or "" as "no grade".
  const grade =
    typeof rawGrade === "number"
      ? String(rawGrade)
      : typeof rawGrade === "string"
        ? rawGrade.trim()
        : "";
  const hasGrade = grade !== "" && grade !== "0";
  const topic = (options.currentSubject ?? "").trim() || subjects[0] || "";
  const hobby = hobbies[0] ? cleanHobby(hobbies[0]) : undefined;

  const pick = pickTemplate(rand);

  const candidates: PromptSuggestion[] = [
    hobby
      ? { label: `Learn with ${hobby}`, prompt: pick(HOBBY(topic || "a concept", hobby)) }
      : { label: "Break down a concept", prompt: pick(EXPLAIN(topic || "a concept")) },
    { label: "Test your knowledge", prompt: pick(QUIZ(topic || "today's topics", hobby)) },
    { label: "Study plan", prompt: pick(STUDY_PLAN(hasGrade ? grade : undefined)) },
    hobby
      ? { label: `Practice with ${hobby}`, prompt: pick(PRACTICE(topic || "your current topics", hobby)) }
      : { label: "Practice questions", prompt: pick(PRACTICE(topic || "your current topics")) },
  ];

  return seededShuffle(candidates, rand);
}
