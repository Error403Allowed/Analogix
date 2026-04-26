export interface ExplanationSection {
  name: string;
  required: boolean;
  maxSentences: number;
  content: string;
}

export interface PromptTemplateConfig {
  useStructuredFormat: boolean;
  includeHook: boolean;
  includeIntuition: boolean;
  includeCoreIdea: boolean;
  includeFormal: boolean;
  includeWorkedExample: boolean;
  includeQuickCheck: boolean;
  exampleDifficulty: "simple" | "moderate" | "complex";
  coreIdeaMaxLength: number;
}

export const DEFAULT_CONFIG: PromptTemplateConfig = {
  useStructuredFormat: true,
  includeHook: true,
  includeIntuition: true,
  includeCoreIdea: true,
  includeFormal: true,
  includeWorkedExample: true,
  includeQuickCheck: true,
  exampleDifficulty: "simple",
  coreIdeaMaxLength: 30
};

export function buildStructuredPrompt(
  concept: string,
  interest: string,
  studentYear: string = "10",
  config: Partial<PromptTemplateConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const yearStr = studentYear || "10";
  
  return `IMPORTANT: Your response must follow a STRUCTURED EXPLANATION FORMAT.
This is MANDATORY, not optional.

${buildHookInstruction(cfg.includeHook, interest, concept)}
${buildIntuitionInstruction(cfg.includeIntuition, yearStr)}
${buildCoreIdeaInstruction(cfg.includeCoreIdea, cfg.coreIdeaMaxLength)}
${buildFormalInstruction(cfg.includeFormal)}
${buildWorkedExampleInstruction(cfg.includeWorkedExample, cfg.exampleDifficulty)}
${buildQuickCheckInstruction(cfg.includeQuickCheck)}

${buildQualityCheckSection()}`;
}

function buildHookInstruction(required: boolean, interest: string, concept: string): string {
  return `1. HOOK (1-2 sentences, MUST START your response)
   ${required ? `
   - Start with a relatable analogy from ${interest}
   - NEVER begin with definitions like "${concept} is defined as..." or "The definition of ${concept}..."
   - ALWAYS use this format: "Think of ${concept} like [familiar thing from ${interest}]..."
   - Example GOOD: "Think of slopes like the speedometer in an F1 car — they tell you how fast you're going."
   - Example BAD: "A slope is the measure of the steepness of a line."` : `
   - Start naturally with a brief hook if helpful, or directly if cleaner.`}`;
}

function buildIntuitionInstruction(required: boolean, studentYear: string = "10"): string {
  return `2. INTUITION (2-4 sentences)
   ${required ? `
   - Explain what's actually happening, not just what it is
   - Use simple words a Year ${studentYear} student would use
   - Skip jargon — if you need it, explain it first
   - Build understanding from what they know to what they're learning` : ""}`;
}

function buildCoreIdeaInstruction(required: boolean, maxLength: number): string {
  return `3. CORE IDEA (1 sentence, bold the key takeaway)
   ${required ? `
   - This is THE single most important thing to remember
   - Keep it under ${maxLength} words — tweet-length
   - Format: "The key idea is: [one sentence that captures everything]"
   - This should be memorable and something they can repeat to a friend` : ""}`;
}

function buildFormalInstruction(required: boolean): string {
  return `4. FORMAL DEFINITION (minimal, technical)
   ${required ? `
   - Only if genuinely needed for accuracy
   - Keep it 1-2 sentences maximum
   - Use this lead-in: "Here's the formal way to say it:"
   - Prefer intuition over formal — if Hook + Intuition + Core Idea are clear, skip this` : ""}`;
}

function buildWorkedExampleInstruction(
  required: boolean,
  difficulty: "simple" | "moderate" | "complex"
): string {
  const numberRules = {
    simple: "Use single digits: 1, 2, 3, 5, 10",
    moderate: "Use small numbers: up to 20",
    complex: "Use realistic numbers if needed"
  };

  return `5. WORKED EXAMPLE (step-by-step problem)
   ${required ? `
   - Use ${numberRules[difficulty]}
   - NEVER use: decimals like 7.34, 0.007, or 3.14159
   - NEVER use: large numbers like 1000+ unless genuinely needed
   - Steps must be EXPLICIT: "Step 1: [do this], Step 2: [do this], Step 3: [do this]"
   - No logical jumps — a classmate should be able to follow each step
   - Show the ANSWER at the end clearly
   - Example format:
     Equation: y = 2x + 1
     Step 1: Identify the slope (2) and intercept (1)
     Step 2: Take the x value and multiply by the slope
     Step 3: Add the intercept
     Answer: y = [number]` : ""}`;
}

function buildQuickCheckInstruction(required: boolean): string {
  return `6. QUICK CHECK (1 question, optional engagement)
   ${required ? `
   - One simple question to test understanding
   - Should be answerable in 1-2 words
   - Format: "Quick check: [question]?"
   - Example: "Quick check: What's the slope if y = 3x + 2?"
   - Only include if the concept is explainable in one line` : ""}`;
}

function buildQualityCheckSection(): string {
  return `

QUALITY VERIFICATION (MANDATORY — do this BEFORE outputting):
□ HOOK exists AND starts with an analogy from [their interest]
□ Hook does NOT start with "The definition" or "[concept] is..."
□ INTUITION explains what's happening, not just what it is
□ CORE IDEA is one sentence or less
□ EXAMPLE uses simple numbers (single digits for easy concepts)
□ EXAMPLE steps are explicit with no jumps
□ QUICK CHECK (if included) is answerable in 1-2 words

IF ANY CHECK FAILS:
- Regenerate with corrections
- "Clarity over cleverness" — always choose clarity`;
}

export function getSectionTemplate(section: string): string {
  const templates: Record<string, string> = {
    hook: "Think of [concept] like [familiar thing from their interest]...",
    intuition: "Here's what's actually happening...",
    coreIdea: "The key idea is: [one sentence]",
    formal: "Here's the formal way to say it: [technical definition]",
    workedExample: "Step 1: [simple step]\nStep 2: [simple step]\nAnswer: [clear answer]",
    quickCheck: "Quick check: [test question]?"
  };
  return templates[section] || "";
}

export function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  const minutes = words / 200;
  return Math.max(1, Math.round(minutes * 10) / 10);
}