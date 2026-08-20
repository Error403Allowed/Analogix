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

const EXPLAIN = (topic: string): string[] => [
  `Understand ${topic} step by step with clear examples`,
  `Break down ${topic} into easy-to-understand pieces`,
  `Walk through ${topic} from the basics with practical examples`,
];

const QUIZ = (topic: string): string[] => [
  `Test what you know about ${topic} with a short quiz`,
  `Quiz yourself on ${topic} and review the answers`,
  `Try a quick quiz covering ${topic} with explanations`,
];

const STUDY_PLAN = (topic?: string, grade?: string): string[] => {
  const focus = topic ? ` for ${topic}` : "";
  if (grade) {
    return [
      `Build a study plan${focus} to prepare for your Year ${grade} exams`,
      `Create a revision schedule${focus} ahead of your Year ${grade} exams`,
      `Plan how to cover everything before the Year ${grade} exams${topic ? `, starting with ${topic}` : ""}`,
    ];
  }
  return [
    `Create a weekly study plan${focus} to prepare for my exams`,
    `Build a study schedule${focus} for the week`,
    `Plan my revision${focus} for upcoming assessments`,
  ];
};

const PRACTICE = (topic: string): string[] => [
  `Practice questions on ${topic} with worked solutions`,
  `Work through problems on ${topic} with step-by-step solutions`,
  `Get practice exercises for ${topic} with full solutions`,
];

/**
 * Builds 4 dynamic chat prompt suggestions from a user's profile.
 *
 * The first (main) suggestion is framed around the user's interest — the
 * label is the interest only (e.g. "Practice with Formula 1") and the subtext
 * is what they will learn (the subject). Each suggestion pairs a different
 * interest with a different subject when the profile allows it.
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

  const rawSubjects = (profile.subjects ?? []).filter(Boolean);
  const hobbies = (profile.hobbies ?? []).map(cleanHobby).filter(Boolean);
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

  const currentSubject = (options.currentSubject ?? "").trim();
  const shuffledSubjects = seededShuffle(rawSubjects, rand);
  const topics = [
    currentSubject,
    ...shuffledSubjects.filter((s) => s !== currentSubject),
  ].filter(Boolean);
  const shuffledHobbies = seededShuffle(hobbies, rand);

  const hobbyAt = (i: number): string | undefined =>
    shuffledHobbies.length ? shuffledHobbies[i % shuffledHobbies.length] : undefined;
  const topicAt = (i: number): string | undefined =>
    topics.length ? topics[i % topics.length] : undefined;

  const pick = pickTemplate(rand);

  return [
    {
      label: hobbyAt(0) ? `Practice with ${hobbyAt(0)}` : "Practice questions",
      prompt: pick(PRACTICE(topicAt(0) || "your current topics")),
    },
    {
      label: hobbyAt(1) ? `Learn with ${hobbyAt(1)}` : "Break down a concept",
      prompt: pick(EXPLAIN(topicAt(1) || "a concept")),
    },
    {
      label: hobbyAt(2) ? `Quiz with ${hobbyAt(2)}` : "Test your knowledge",
      prompt: pick(QUIZ(topicAt(2) || "your current topics")),
    },
    {
      label: hobbyAt(3) ? `Study with ${hobbyAt(3)}` : "Study plan",
      prompt: pick(STUDY_PLAN(topicAt(3), hasGrade ? grade : undefined)),
    },
  ];
}