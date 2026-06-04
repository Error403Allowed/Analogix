export interface ToneRule {
  find: string | RegExp;
  replace: string;
  reason: string;
  severity: "essential" | "preferred";
}

const TONE_RULES: ToneRule[] = [
  {
    find: /\b(you must|one must|it is necessary to|you have to)\b/gi,
    replace: "think about",
    reason: "removes imperative/command tone",
    severity: "essential"
  },
  {
    find: /\b(clearly|obviously|of course|naturally|as we know)\b/gi,
    replace: "notice that",
    reason: "removes dismissive assumptions",
    severity: "preferred"
  },
  {
    find: /\b(it should be noted that|it is worth noting that|it is important to note)\b/gi,
    replace: "here's the thing",
    reason: "friendlier lead-in",
    severity: "preferred"
  },
  {
    find: /\b(this is simple|this is easy|straightforward|basic concept)\b/gi,
    replace: "this clicks once you see it",
    reason: "less condescending",
    severity: "essential"
  },
  {
    find: /\b(as you know|you already know|youve seen this)\b/gi,
    replace: "just to be sure we are on the same page",
    reason: "doesn't assume knowledge",
    severity: "essential"
  },
  {
    find: /\bI would like to|we would like to|id like to discuss\b/gi,
    replace: "let's look at",
    reason: "more conversational",
    severity: "preferred"
  },
  {
    find: /\b(in order to|to accomplish this|for the purpose of)\b/gi,
    replace: "to",
    reason: "simpler language",
    severity: "preferred"
  },
  {
    find: /\b(therefore|thus|consequently)\b/gi,
    replace: "so",
    reason: "friendlier",
    severity: "preferred"
  },
  {
    find: /\b(additionally|furthermore|moreover)\b/gi,
    replace: "also",
    reason: "simpler",
    severity: "preferred"
  },
  {
    find: /\b(however|nevertheless|notwithstanding)\b/gi,
    replace: "but",
    reason: "friendlier",
    severity: "preferred"
  },
  {
    find: /\b(the aforementioned|the following|the aforementioned aspect)\b/gi,
    replace: "this",
    reason: "simpler",
    severity: "preferred"
  },
  {
    find: /\b(refer to|consult|examine)\b/gi,
    replace: "look at",
    reason: "less formal",
    severity: "preferred"
  },
  {
    find: /\b(it is crucial|it is vital|it is essential)\b/gi,
    replace: "it helps to",
    reason: "less alarming",
    severity: "preferred"
  },
  {
    find: /\b(demonstrate|illustrate|show)\b/gi,
    replace: "see",
    reason: "friendlier",
    severity: "preferred"
  },
  {
    find: /\b(essentially|fundamentally|at its core)\b/gi,
    replace: "basically",
    reason: "friendlier",
    severity: "preferred"
  },
  {
    find: /\b(note that|be aware that|keep in mind)\b/gi,
    replace: "remember",
    reason: "less formal",
    severity: "preferred"
  },
  {
    find: /\b(bear in mind|keep in mind)\b/gi,
    replace: "remember",
    reason: "friendlier",
    severity: "preferred"
  },
  {
    find: /\b(to summarise|to sum up|in summary)\b/gi,
    replace: "so basically",
    reason: "friendlier wrap-up",
    severity: "preferred"
  },
  {
    find: /\b(let us consider|let us examine)\b/gi,
    replace: "let's look at",
    reason: "more conversational",
    severity: "preferred"
  },
  {
    find: /\b(your task is to|you need to find|you are required to)\b/gi,
    replace: "figure out",
    reason: "less formal",
    severity: "preferred"
  },
  {
    find: /\b(attempt to|endeavor to)\b/gi,
    replace: "try to",
    reason: "simpler",
    severity: "preferred"
  },
  {
    find: /\b(utilize|make use of)\b/gi,
    replace: "use",
    reason: "simpler word",
    severity: "preferred"
  },
  {
    find: /\b(following this|after this)\b/gi,
    replace: "next",
    reason: "friendlier",
    severity: "preferred"
  },
  {
    find: /\b(prior to|previous to)\b/gi,
    replace: "before",
    reason: "simpler",
    severity: "preferred"
  },
  {
    find: /\b(in the event that)\b/gi,
    replace: "if",
    reason: "simpler",
    severity: "preferred"
  },
  {
    find: /\b(with respect to|in regards to)\b/gi,
    replace: "about",
    reason: "friendlier",
    severity: "preferred"
  },
  {
    find: /\b(it is interesting to note)\b/gi,
    replace: "here's a cool thing",
    reason: "more engaging",
    severity: "preferred"
  }
];

const AGGRESSIVE_PHRASES = [
  "you must",
  "you have to",
  "always",
  "never",
  "impossible",
  "definitely",
  "absolutely must",
  "make sure to",
  "don't forget to",
  "must remember"
];

const DISMISSIVE_PHRASES = [
  "as you know",
  "obviously",
  "clearly",
  "of course",
  "it's simple",
  "this is easy",
  "you should know",
  "this is basic"
];

export function transformTone(text: string): string {
  let result = text;

  for (const rule of TONE_RULES) {
    if (typeof rule.find === "string") {
      result = result.split(rule.find).join(rule.replace);
    } else {
      result = result.replace(rule.find, rule.replace);
    }
  }

  result = convertToFriendly(text);
  result = enforceBrevity(result);
  result = convertAustralian(text);

  return result;
}

function convertToFriendly(text: string): string {
  let result = text;

  result = result.replace(/\bI am\b/gi, "I'm");
  result = result.replace(/\bI will\b/gi, "I'll");
  result = result.replace(/\bdo not\b/gi, "don't");
  result = result.replace(/\bdoes not\b/gi, "doesn't");
  result = result.replace(/\bcan not\b/gi, "can't");
  result = result.replace(/\bwill not\b/gi, "won't");
  result = result.replace(/\bwould not\b/gi, "wouldn't");
  result = result.replace(/\bshould not\b/gi, "shouldn't");
  result = result.replace(/\bwe have\b/gi, "we've");
  result = result.replace(/\byou have\b/gi, "you've");
  result = result.replace(/\bthey have\b/gi, "they've");
  result = result.replace(/\bit is\b/gi, "it's");
  result = result.replace(/\bthat is\b/gi, "that's");
  result = result.replace(/\bthis is\b/gi, "this's".replace("this's", "this is"));
  result = result.replace(/\bthere is\b/gi, "there's");
  result = result.replace(/\bthere are\b/gi, "there are");
  result = result.replace(/\bwe are\b/gi, "we're");
  result = result.replace(/\byou are\b/gi, "you're");
  result = result.replace(/\bthey are\b/gi, "they're");
  result = result.replace(/\bI have\b/gi, "I've");
  result = result.replace(/\bhe has\b/gi, "he's");
  result = result.replace(/\bshe has\b/gi, "she's");

  return result;
}

function enforceBrevity(text: string): string {
  return text;
}

function convertAustralian(text: string): string {
  let result = text;

  const auReplacements = [
    { from: /color/gi, to: "colour" },
    { from: /center/gi, to: "centre" },
    { from: /meter/gi, to: "metre" },
    { from: /liter/gi, to: "litre" },
    { from: /neighbor/gi, to: "neighbour" },
    { from: /favor/gi, to: "favour" },
    { from: /behavior/gi, to: "behaviour" },
    { from: /honor/gi, to: "honour" },
    { from: /humor/gi, to: "humour" },
    { from: /labor/gi, to: "labour" },
    { from: /favorite/gi, to: "favourite" },
    { from: /analyze/gi, to: "analyse" },
    { from: /defense/gi, to: "defence" },
    { from: /license/gi, to: "licence" },
    { from: /offense/gi, to: "offence" },
    { from: /pretense/gi, to: "pretence" },
    { from: /expense/gi, to: "expense" },
    { from: /math\s/gi, to: "maths " },
    { from: /grade\s?!(\d)/gi, to: "Year $1" }
  ];

  for (const { from, to } of auReplacements) {
    result = result.replace(from, to);
  }

  return result;
}

export function getToneReport(text: string): {
  score: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  for (const phrase of AGGRESSIVE_PHRASES) {
    if (text.toLowerCase().includes(phrase)) {
      issues.push(`Aggressive phrase: "${phrase}"`);
      recommendations.push(`Replace with friendlier language`);
    }
  }

  for (const phrase of DISMISSIVE_PHRASES) {
    if (text.toLowerCase().includes(phrase)) {
      issues.push(`Dismissive phrase: "${phrase}"`);
      recommendations.push(`Remove or soften this assumption`);
    }
  }

  const wordCount = text.split(/\s+/).length;
  const longSentences = text.match(/[^.]*[.!?]{50,}/g) || [];
  if (longSentences.length > 0) {
    issues.push(`${longSentences.length} sentences over 50 words`);
    recommendations.push("Break into shorter sentences");
  }

  const score = Math.max(0, 100 - issues.length * 15);

  return { score, issues, recommendations };
}

export function buildToneInstructions(): string {
  return `
TONE RULES (ENFORCE THESE):
- Replace ALL commands with invites: "you must" → "think about"
- Remove ALL dismissive phrases: "obviously", "clearly", "as you know" → remove or soften
- Remove ALL condescending assumptions: "this is simple" → "this clicks once you see it"
- Use contractions: "don't", "it's", "you're", "can't"
- Use "so" not "therefore" as connector
- Use "also" not "additionally"
- Use "but" not "however"
- Use "like" not "such as" where natural
- Use simple words: "use" not "utilize", "look at" not "consult"

EXAMPLE TRANSFORMATIONS:
- "You must understand the slope" → "Think about the slope like this:"
- "As you clearly know, the slope..." → "The slope works like this:"
- "This is a simple concept" → "This clicks once you see it"
- "Therefore, we can conclude" → "So the answer is"
- "Additionally, we need to consider" → "Also worth knowing:"`;
}