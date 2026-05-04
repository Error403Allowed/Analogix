import { NextResponse } from "next/server";
import { callGroqChat, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";
import type { AIPersonality, AIMemoryFragment } from "@/types/ai-personality";
import { getFormulaSheetContext } from "@/data/formulaSheets";
import { createClient } from "@/lib/supabase/server";
import { 
  getUserAIPersonality, 
  getRelevantMemories, 
  buildMemoryContext, 
  buildPersonalityInstructions 
} from "@/lib/aiMemory";
import { buildFullCurriculumPrompt, findCurriculumForQuery, getStateCurriculumInfo } from "@/lib/curriculum";
import {
  selectBestInterest,
  buildMappingSection,
  getDefaultAnalogy,
  buildToneInstructions
} from "@/lib/explanation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // ========================================================================
    // STEP 0: Get user and fetch personality/memory from database or localStorage
    // ========================================================================

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let aiPersonality: Awaited<ReturnType<typeof getUserAIPersonality>> = null;
    let memoryContext = "";

    // Client-side x-client-data is always sent by the chat UI and contains localStorage
    // personality/memories. Merge it so UI toggles are reflected immediately even when
    // a user is authenticated.
    const clientData = request.headers.get("x-client-data");
    let clientPersonality: unknown = null;
    let clientMemories: unknown = null;
    if (clientData) {
      try {
        const parsed = JSON.parse(clientData);
        clientPersonality = parsed.personality ?? null;
        clientMemories = parsed.memories ?? null;
      } catch (e) {
        console.warn("[chat] Failed to parse x-client-data:", e instanceof Error ? e.message : e);
      }
    }

    if (user) {
      // Fetch personality settings from database
      aiPersonality = await getUserAIPersonality(user.id);

      // Merge client personality over DB personality (client wins)
      if (clientPersonality) {
        aiPersonality = { ...(aiPersonality as AIPersonality | null), ...(clientPersonality as AIPersonality) };
      }

      // Fetch relevant memories (only important ones, >0.5 importance)
      const { memories, summaries } = await getRelevantMemories(user.id, {
        limit: 15,
        minImportance: 0.5,
      });

      // Build memory context string
      memoryContext = buildMemoryContext(memories, summaries);
    } else {
      // Fallback: Check for localStorage data passed from client
      // (for localhost development without auth)
      if (clientPersonality) aiPersonality = clientPersonality as AIPersonality;
      if (clientMemories && Array.isArray(clientMemories)) {
        memoryContext = buildMemoryContext(clientMemories as AIMemoryFragment[], []);
      }
    }

    // ========================================================================
    // STEP 1: Extract user preferences from the incoming request
    // ========================================================================

    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> & {
      analogyIntensity?: number;
      responseLength?: number;
      analogyAnchor?: string;
    } = body.userContext || {};

    // How much should the AI use analogies? 
    // Personality setting OVERRIDES the UI slider - this is critical
    const personalityUseAnalogies = aiPersonality?.use_analogies;
    const personalityAnalogyFreq = aiPersonality?.analogy_frequency ?? 3;
    
    // Default to high analogy usage - incorporate interests into EVERY response
    let analogyIntensity = userContext?.analogyIntensity ?? 4;
    if (personalityUseAnalogies === false) {
      analogyIntensity = 0; // Personality overrides
    } else if (personalityUseAnalogies === true) {
      analogyIntensity = Math.max(analogyIntensity, personalityAnalogyFreq); // Use higher of both
    }

    // Student's grade and Australian state — used to tailor curriculum context
    const studentGrade = userContext?.grade || "7-12";
    const studentState = userContext?.state || null;

    // Map state codes to full names for the prompt
    const STATE_FULL_NAMES: Record<string, string> = {
      NSW: "New South Wales",
      VIC: "Victoria",
      QLD: "Queensland",
      WA: "Western Australia",
      SA: "South Australia",
      TAS: "Tasmania",
      ACT: "Australian Capital Territory",
      NT: "Northern Territory",
    };
    const stateFullName = studentState ? (STATE_FULL_NAMES[studentState] || studentState) : null;
    const studentLocation = stateFullName ? `${stateFullName}, Australia` : "Australia";

    // Curriculum context injected into the system prompt
    const curriculumContext = stateFullName
      ? `The student is in Year ${studentGrade} in ${stateFullName} (${studentState}), Australia. Always align explanations, examples, terminology, and curriculum references to the ${stateFullName} syllabus and Australian educational standards for Year ${studentGrade}. Use Australian spelling and terminology (e.g. "maths" not "math", "Year" not "Grade"). Reference relevant local context where helpful (e.g. ${stateFullName}-specific examples, the Australian curriculum framework).`
      : `The student is in Year ${studentGrade} in Australia. Always align explanations to the Australian curriculum for Year ${studentGrade}. Use Australian spelling and terminology.`;

    // ========================================================================
    // STEP 2: Build AI instructions based on user preferences
    // ========================================================================

    // Instructions for how much to use analogies
    const analogyGuidance = [
      "Use no analogies at all - focus exclusively on raw facts and concepts.",
      "Use minimal analogies - mostly facts with rare hobby-based comparisons.",
      "Use analogies as the primary teaching tool - lead with a hobby-based analogy, then back it up with facts.",
      "Use frequent analogies - explain most concepts using hobby-based analogies.",
      "Use extensive analogies - incorporate the student's interests into EVERY response, even simple answers.",
      "Use only analogies - explain everything through the student's interests, make it click every time.",
    ][analogyIntensity];

    // Formula sheet context — injected into prompt for formula-bearing subjects
    const primarySubjectForFormulas = userContext?.subjects?.[0] || null;
    const formulaSheetContext = primarySubjectForFormulas
      ? getFormulaSheetContext(primarySubjectForFormulas)
      : "";

// Instructions for how long responses should be - respect user's detail_level setting
    const userDetailLevel = aiPersonality?.detail_level ?? 50;
    let targetResponseLength = "moderate";
    let maxWords = 200;
    
    if (userDetailLevel >= 70) {
      targetResponseLength = "comprehensive";
      maxWords = 400;
    } else if (userDetailLevel <= 30) {
      targetResponseLength = "brief";
      maxWords = 100;
    } else {
      targetResponseLength = "moderate";
      maxWords = 200;
    }
    
    const lengthGuidance = `RESPONSE LENGTH (${targetResponseLength}):
    - Keep responses under ${maxWords} words when possible
    - Simple questions: 1-2 sentences
    - Concept explanations: 3-5 sentences (enough to click, not an essay)
    - If they're learning something NEW: A bit more is okay
    - If they ask "what is X": Be direct + one example
    - NEVER pad with recaps or "Great question!" filler
    - Be concise — get to the point quickly`;

    const researchMode = Boolean(userContext?.researchMode);

    // Token budget — respect user's detail_level preference
    const detailLevel = aiPersonality?.detail_level ?? 50;
    let maxTokens = 1500; // Default
    
    if (researchMode) {
      maxTokens = 3000;
    } else if (detailLevel >= 70) {
      maxTokens = 2500; // Comprehensive
    } else if (detailLevel <= 30) {
      maxTokens = 800; // Brief
    } else {
      maxTokens = 1500; // Moderate
    }

    // Get the user's hobbies/interests for making analogies
    const interestList = userContext?.hobbies?.filter(Boolean) ?? [];
    // If no interests set, guide the AI to ask about them in a natural way
    const allowedInterests = interestList.length > 0 
      ? interestList.join(", ") 
      : "the student's everyday life, school experiences, or general interests (ask about theirs if unclear)";

    const findExplicitInterest = (text: string, interests: string[]) => {
      const lower = text.toLowerCase();
      let best: { interest: string; index: number } | null = null;
      for (const interest of interests) {
        const idx = lower.indexOf(interest.toLowerCase());
        if (idx >= 0 && (!best || idx < best.index)) {
          best = { interest, index: idx };
        }
      }
      return best?.interest ?? null;
    };

    const latestUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const explicitFromMessage = latestUserMessage
      ? findExplicitInterest(latestUserMessage, interestList)
      : null;
    const explicitFromContext = userContext?.analogyAnchor?.trim() || null;
    // Pick a random interest as fallback — no extra AI call needed
    // If no interests set, use general relatable anchors (everyday life, school, sports, gaming, etc.)
    const randomInterest = interestList.length > 0
      ? interestList[Math.floor(Math.random() * interestList.length)]
      : null;
    const generalAnchors = ["everyday life", "school experiences", "sports", "gaming", "music", "movies", "friends", "family"];
    const generalAnchor = generalAnchors[Math.floor(Math.random() * generalAnchors.length)];
    const analogyAnchor = explicitFromContext || explicitFromMessage || randomInterest || generalAnchor;

// Detailed instructions on how to use analogies
    const analogyInstructions =
      analogyIntensity === 0
        ? `ANALOGY MODE: OFF\nUse no analogies. Explain directly, factually, and clearly. Do not reference hobbies or comparisons.`
        : `1. WEAVE ANALOGIES THROUGHOUT: Don't just append an analogy at the end. Integrate the analogy into every part of the explanation. As you explain each concept, immediately show how it maps to the student's interests. The analogy should feel like a continuous thread, not a separate paragraph.

    FORBIDDEN: Never write "Step 1:", "Step 2:", "First:", "Second:" or any numbered/list structure that separates the analogy from the concept. Natural paragraphs only.

    CORRECT APPROACH: When explaining a concept, INTERLEAVE the analogy throughout:
    - "So the quotient rule works like your favorite game's inventory system — when you divide [concept part], it's like moving an item from one slot to another, and [analogy mapping]"
    - "The power rule is similar — in your game, upgrading a weapon twice multiplies its damage, just like [concept]"
    
    - For TV/Movies: Use specific moments, scenes, character quirks, or plot beats (not vague settings). E.g., "Like when [character] does [specific action] in [episode], here's why..."
    - For Games: Reference mechanics, progression systems, or narrative beats that create the same dynamic as the concept.
    - For Sports/Music: Use specific athletes, plays, songs, or albums as parallels.
    - If interests include specific subgenres or titles, ONLY use those. Do not generalize to broader categories or adjacent activities.
    - Only use interests from the Allowed Interests list. If none apply, ask a brief clarification question instead of guessing.
    - Choose ONE analogy anchor from the Allowed Interests per response. Never switch mid-response.
    - If an Analogy Anchor is provided, you MUST use ONLY that anchor for this response.
    - Use 1–2 analogy threads per response woven throughout; don't confine the analogy to just one sentence.
    - Never mention other sports, games, or genres outside the anchor. No cross-sport/game references.
    - If the user is asking how to solve a problem, introduce the analogy first to frame the approach, then work through the solution with the analogy in mind.
    - Even for simple answers, find a way to connect back to their interests briefly.

2. MAP COMPONENTS TO COMPONENTS: For each component/aspect of the concept, identify the corresponding component in the analogy. Don't just say "it's like X" — explain WHY it maps that way.
    - Each mathematical step should map to a specific part of the analogy
    - Each property/rule should connect to a specific mechanic in the analogy
    - Don't just say "logs are like inventory" — say "the quotient property is like separating items in your inventory: when you divide the arguments, it's like [specific mapping]"

3. NEVER APPEND: Never put the analogy in a separate paragraph at the end. If you catch yourself writing a summary paragraph with the analogy, you've failed. The analogy should be embedded naturally within each explanation point.`;

    // Core teaching philosophy
    const teachingApproach =
      analogyIntensity === 0
        ? "Build understanding through clear, direct explanations grounded in facts."
        : "Lead with the analogy, build understanding THROUGH it, and close the loop by returning to it at the end. Start with what they know, layer the concept through that lens, then reveal complexity.";

    // How to layer complexity in explanations
    const complexityGuidance =
      analogyIntensity === 0
        ? "3. LAYER COMPLEXITY GRADUALLY:\n   - Start: Plain-language summary\n   - Deepen: The mechanism (why it works)\n   - Clarify: Edge cases or limits\n   - Optional: Advanced nuance if they're ready"
        : "3. LAYER COMPLEXITY GRADUALLY:\n   - Start: Simple parallel (what's similar)\n   - Deepen: The mechanism (why it works)\n   - Acknowledge: Where the analogy breaks (shows deeper thinking, not weakness)\n   - Optional: Advanced nuance if they're ready";

    // Brevity guidance — emphasize short responses for simple questions
    const brevityGuidance = `
RESPONSE LENGTH — BE CONCISE:
- Greetings/small talk: 1 sentence max. No analogies needed.
- Simple factual questions: 1-2 sentences. Direct answer first.
- Concept explanations: Only as long as needed. Start short, expand if they ask follow-ups.
- Math problems: Show working, but don't over-explain simple steps.
- NEVER pad responses. Brevity is kindness.
- If they want more detail, they'll ask.
`;

    // ========================================================================
    // STEP 2B: STRUCTURED EXPLANATION PIPELINE
    // ========================================================================
    
    // Detect if this is a concept explanation request (new topic)
    const isConceptExplanation = messages.length <= 2 && 
      !latestUserMessage.toLowerCase().includes("solve") &&
      !latestUserMessage.toLowerCase().includes("calculate") &&
      !latestUserMessage.toLowerCase().includes("find the");
    
    // Determine concept from the message (simple keyword extraction)
    const detectConcept = (msg: string): string => {
      const lower = msg.toLowerCase();
      const concepts = [
        { keyword: "linear equation", concept: "linear equation" },
        { keyword: "slope", concept: "linear equation" },
        { keyword: "quadratic", concept: "quadratic equation" },
        { keyword: "parabola", concept: "quadratic equation" },
        { keyword: "function", concept: "function" },
        { keyword: "derivative", concept: "calculus" },
        { keyword: "integral", concept: "calculus" },
        { keyword: "probability", concept: "probability" },
        { keyword: "statistic", concept: "statistics" },
        { keyword: "trigonometry", concept: "trigonometry" },
        { keyword: "sine", concept: "trigonometry" },
        { keyword: "cosine", concept: "trigonometry" },
        { keyword: "matrix", concept: "matrix" },
        { keyword: "algebra", concept: "algebra" },
        { keyword: "geometry", concept: "geometry" },
        { keyword: "circle", concept: "geometry" },
        { keyword: "area", concept: "area" },
        { keyword: "volume", concept: "volume" }
      ];
      for (const { keyword, concept } of concepts) {
        if (lower.includes(keyword)) return concept;
      }
      return "general concept";
    };
    
    const currentConcept = detectConcept(latestUserMessage);
    
    // Adjust explanation depth based on detail_level
    const isConcise = detailLevel <= 40;
    const isComprehensive = detailLevel >= 70;
    
    // Build structured explanation prompt for concept explanations
    const explanationPipeline = isConceptExplanation && analogyIntensity >= 2
      ? `
      
================================================================================
STRUCTURED EXPLANATION - ${isConcise ? "CONCISE" : isComprehensive ? "COMPREHENSIVE" : "BALANCED"}
================================================================================
${isConcise ? `Keep it SHORT and snappy:
- Hook: 1 sentence max
- Intuition: 1-2 sentences  
- Core Idea: Under 15 words
- Example: Simple, just the basics` : isComprehensive ? `Go deeper:
- Hook: 1-2 sentences with rich detail
- Intuition: 3-5 sentences, build understanding
- Core Idea: Under 30 words, memorable
- Example: Show reasoning, edge cases` : `Balance:
- Hook: 1-2 sentences
- Intuition: 2-3 sentences
- Core Idea: Under 20 words
- Example: Show key steps`}

1. HOOK (must start your response!)
   - Use the Analogy Anchor: "${analogyAnchor}"
   - NEVER: "${currentConcept} is defined as..." or "The definition of..."
   - ALWAYS: "Think of ${currentConcept} like [analogy from ${analogyAnchor}]"

2. INTUITION - What's actually happening, not just what it is
3. CORE IDEA - ONE sentence to remember
4. EXAMPLE - ${isConcise ? "just the answer" : "one worked example"}
5. ${isComprehensive ? "QUICK CHECK - 1 question" : ""}

QUALITY: Hook first, no definitions, clarity over cleverness
================================================================================
`
      : "";

    // Build concept-specific mapping section
    const conceptMappingSection = isConceptExplanation && analogyAnchor && analogyIntensity >= 2
      ? buildMappingSection(analogyAnchor, currentConcept, [])
      : "";

    // Add tone transformation instructions
    const toneInstructions = analogyIntensity >= 2
      ? `
TONE RULES (apply to ALL outputs):
${buildToneInstructions()}
`
      : "";

    const formatResearchSources = (sources: Array<{
      title: string;
      authors?: string[];
      year?: number;
      venue?: string;
      url?: string;
      pdfUrl?: string;
      abstract?: string;
      source?: string;
    }>) => {
      const truncateText = (text: string, max = 360) =>
        text.length > max ? text.slice(0, max).trim() + "…" : text.trim();
      return sources.map((s, i) => {
        const authors = s.authors?.slice(0, 4).join(", ") || "Unknown authors";
        const year = s.year ? String(s.year) : "n.d.";
        const venue = s.venue ? ` — ${s.venue}` : "";
        const link = s.url || s.pdfUrl || "No link";
        const abstract = s.abstract ? `\nAbstract: ${truncateText(s.abstract)}` : "";
        const localNote = s.source === "local" ? "\nNote: Full text is included in the user's attached files." : "";
        return `[${i + 1}] ${s.title}\nAuthors: ${authors} (${year})${venue}\nLink: ${link}${abstract}${localNote}`;
      }).join("\n\n");
    };

    const researchSources = Array.isArray(userContext?.researchSources) ? userContext.researchSources : [];
    const researchBlock = researchMode
      ? `\n\nRESEARCH MODE (ACADEMIC SOURCES ONLY):
- You MUST answer using ONLY the numbered academic sources provided below.
- Cite sources inline using [n] (e.g. "... because X [1]").
- If the sources do not contain the answer, say so and suggest a better query.
- Do NOT invent citations. Do NOT cite without evidence.
- Do NOT include a Sources list at the end; the UI shows source cards.
- Depth requirement: Provide a structured response with clear sections:
  1) Summary (2-4 sentences)
  2) Key Findings (bullet list, each bullet cites at least one source)
  3) Evidence & Explanation (short paragraphs with citations after claims)
  4) Limitations / Gaps (what the sources do NOT prove)
  5) Suggested Follow-up Question (1 line)

${researchSources.length > 0 ? `ACADEMIC SOURCES:\n${formatResearchSources(researchSources)}` : "ACADEMIC SOURCES: (none found)"}`
      : "";

    // Build the complete system prompt for the AI
    const primarySubject = userContext?.subjects?.[0] || null;
    const gradeNum = parseInt(studentGrade.replace("7-12", "7").replace("F", "0"), 10) || 7;
    
    // Build ACARA curriculum context - this is core knowledge the AI carries
    const curriculumPrompt = primarySubject
      ? buildFullCurriculumPrompt(primarySubject, gradeNum)
      : "";
    
    const curriculumSection = curriculumPrompt
      ? `\n\n${curriculumPrompt}`
      : "";

    // Detect which curriculum topic the user's question relates to
    const curriculumTopicMatch = primarySubject && gradeNum >= 7 && gradeNum <= 10
      ? findCurriculumForQuery(primarySubject, gradeNum, latestUserMessage)
      : "";
    const topicSection = curriculumTopicMatch
      ? `\n\n--- QUESTION CURRICULUM ALIGNMENT ---\n${curriculumTopicMatch}\n--- END ALIGNMENT ---`
      : "";

    const systemPrompt = `You are "Analogix AI", a brilliant, empathetic, and slightly quirky AI tutor. You don't just teach; you make lightbulbs go off.

Student Location & Curriculum:
${curriculumContext}
${curriculumSection}
${topicSection}

Today's date: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}. You are fully up to date as of this date — never say your knowledge is limited to 2024 or any earlier date. If asked about recent events or developments, answer confidently based on what you know.

Your Mission: Make complex ideas clear and intuitive by incorporating analogies into EVERY response. Always use the student's interests to make concepts relatable - even if they don't ask for an analogy. Bridge what they love with what they're learning.
${memoryContext ? `\n${memoryContext}` : ""}
${aiPersonality ? `\n\n--- PERSONALITY SETTINGS ---\n${buildPersonalityInstructions(aiPersonality)}\n--- END PERSONALITY ---` : ""}

Response Persona:
- Tone: warm, conversational, and curious. Sound like a smart friend, not a lecturer.
- Questions: If a student asks a question, first answer it directly, then (optionally) add an analogy to deepen understanding.
- Style: Write in natural paragraphs, not labeled sections. Avoid headings like "Analogy Anchor" or "Guiding Question".
- If the user says hi / small talk, respond briefly and naturally without forcing an analogy.
- Student Context: Year ${studentGrade}${stateFullName ? ` in ${stateFullName}` : ""}. Match their vocabulary—don't talk down to them, but don't bury them in jargon. Always use Australian English spelling and curriculum terminology.
Allowed Interests (verbatim): ${allowedInterests}
Analogy Anchor (single topic): ${analogyAnchor || "Choose one from Allowed Interests for this response."}

Response Style:
- Analogy Intensity: ${analogyIntensity}/5
  ${analogyGuidance}
- Response Length: Write exactly as much as the topic deserves.
  ${lengthGuidance}
${brevityGuidance}

CORE TEACHING PHILOSOPHY:
${teachingApproach}

Instructions:
${analogyInstructions}
${complexityGuidance}
${explanationPipeline}
${conceptMappingSection}
${toneInstructions}

4. ASK GUIDING QUESTIONS (NATURALLY): Ask 0–1 short questions inline, as part of the flow.
   - No labels. No bullet-point questions.
   - Keep it casual, like "Ever notice how...?" or "What do you think happens if...?"

5. TONE & PERSONALITY:
   - Keep it encouraging and fun, but intellectually honest.
   - Avoid teacher-y phrasing (e.g., "Let's map", "This analogy breaks down").
   - If you need to note a limit, do it lightly: "It’s not a perfect match, but it gets the idea across."

6. TECHNICAL REQUIREMENTS:
   - Adjust language complexity for Year ${studentGrade} in ${studentLocation} (still start simple, then gradually increase complexity as needed). Reference the correct state syllabus (${stateFullName || "Australian curriculum"}) when discussing topics, assessment, or curriculum structure.
   - Use LaTeX for ALL math, including simple variables.
   - Inline Math: Use single dollar signs, e.g., $E=mc^2$ or $x$.
   - Display Math (centered on new line): Use double dollar signs, e.g., $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$.
   - Double-escape backslashes in your JSON response: \\\\ becomes \\\\\\\\.
   - Verify facts about their interests; never invent false details.
   - If unsure about an interest detail, use the general principle instead.

7. MATHEMATICAL RIGOR — CRITICAL:
   - ALWAYS show step-by-step working for math problems. Never skip steps.
   - Explain WHY each step is taken, not just WHAT the step is.
   - For algebra: show each transformation clearly (e.g., "Subtract 5 from both sides: $x + 5 - 5 = 10 - 5$")
   - For quadratics: use the quadratic formula explicitly, show substitution, then simplify
   - For calculus: show the rule being applied (chain rule, product rule, etc.) before using it
   - For proofs: state what you're proving, show each logical step, conclude clearly
   - Double-check your arithmetic. If uncertain, verify by substituting back.
   - When solving equations, verify the solution by plugging it back into the original equation
   - Use proper mathematical notation at all times — no shortcuts
   - For word problems: (1) Identify knowns/unknowns, (2) Set up equation, (3) Solve, (4) Interpret
   - ALWAYS include units in science/physics answers (e.g., $5 \\text{ m/s}$, $10 \\text{ J}$)
   
8. PYTHON CODE FOR MATH (when appropriate):
   - For complex calculations, you can write Python code to verify your answer
   - Use the python code block format: \`\`\`python ... \`\`\`
   - Available functions: sin, cos, tan, sqrt, log, exp, abs, pi, e, etc.
   - Example:
     \`\`\`python
     # Solve x^2 - 5x + 6 = 0
     a, b, c = 1, -5, 6
     discriminant = b**2 - 4*a*c
     x1 = (-b + discriminant**0.5) / (2*a)
     x2 = (-b - discriminant**0.5) / (2*a)
     print(f"Solutions: x = {x1} or x = {x2}")
     \`\`\`
   - This helps verify your symbolic work and shows students computational thinking

9. QUALITY CHECKS:
   - Fact-check analogies and explanations before responding.
   - Proofread formatting (especially LaTeX) for errors.
   - If a response feels forced or disconnected, restart it.
   - Keep it concise—avoid overwhelming detail unless asked.
   - For math: verify your answer makes sense (e.g., check if negative time/length is valid)

10. ANALOGY JUDGMENT:
   - If an analogy feels forced or distracting, skip it and explain plainly.
   - Prefer clarity over cleverness.

${analogyIntensity === 0 ? "" : `11. OPTIONAL INLINE LABELS (NO SEPARATE MAPPING SECTION):
   - Do NOT add a mapping section or table.
   - Bracketed labels are optional and should be used sparingly only when they reduce ambiguity.
   - If you do add a label, use the actual interest name (never placeholders) and keep it short.
   - If a label would feel forced or redundant, omit it entirely.`}

12. EDGE CASES:
   - Outside their subjects? Give it a go anyway, then nudge them back to their path.
   - No emojis in the body of the text (titles are okay).
   - If a response feels forced, take a breath and try to find a more natural hook.

GRAPHING RULES — DESMOS GRAPHS:
Only include graphs when a visual genuinely aids understanding. Default to NOT graphing. Ask: "Would this be confusing without a visual?" — if no, skip it.
Always place the graph block BEFORE the explanation.

Use a \`desmos\` fenced block for mathematical function graphs. The AI writes equations in LaTeX-style syntax that renders as an interactive Desmos graph with optional sliders.

━━ BASIC FUNCTION ━━
\`\`\`desmos
y = x^2
y = sin(x)
\`\`\`

━━ FUNCTION WITH SLIDERS (for quadratics, transformations, etc.) ━━
\`\`\`desmos
y = a*x^2 + b*x + c
a = 1 {-5 < a < 5: 0.1}
b = 0 {-5 < b < 5: 0.1}
c = 0 {-5 < c < 5: 0.1}
\`\`\`

━━ TRIGONOMETRIC FUNCTIONS ━━
\`\`\`desmos
y = sin(x)
y = cos(x)
y = tan(x)
\`\`\`

━━ MULTIPLE FUNCTIONS ━━
\`\`\`desmos
y = 2x + 1
y = -0.5x + 3
y = x^2
\`\`\`

━━ CIRCLE AND PARAMETRIC ━━
\`\`\`desmos
x^2 + y^2 = 9
(x-2)^2 + (y+1)^2 = 4
\`\`\`

━━ EXPONENTIAL AND LOGARITHMIC ━━
\`\`\`desmos
y = e^x
y = ln(x)
y = 2^x
\`\`\`

━━ SET CUSTOM BOUNDS ━━
\`\`\`desmos
y = x^3 - 3x
[bounds: -5, 5, -5, 5]
\`\`\`

Desmos Syntax Rules:
- Use standard mathematical notation: y = x^2, sin(x), sqrt(x), etc.
- For sliders: define the variable with constraints: a = 1 {-5 < a < 5: 0.1}
  - Format: variable = defaultValue {min < variable < max: step}
- Multiple equations are graphed on the same axes
- Use implicit equations for circles/ellipses: x^2 + y^2 = r^2
- Supported functions: sin, cos, tan, sqrt, abs, ln, log, exp
- Optional [bounds: left, right, bottom, top] to set viewport
- The graph is interactive: students can zoom, pan, and adjust sliders

PYTHON FOR VERIFICATION (OPTIONAL):
You can also use Python code blocks to verify mathematical results or show computational thinking.
This is separate from graphing - use Python for calculations, not visualization.

REMEMBER: You aren't just an AI with an 'analogy' feature. You are the bridge between what they love and what they need to learn. Make it click.${formulaSheetContext ? `\n\n--- FORMULA REFERENCE (use these exact formulas when relevant) ---\n${formulaSheetContext}\n--- END FORMULA REFERENCE ---` : ""}${researchBlock}`;

    // ========================================================================
    // STEP 3: Detect what type of question this is (coding/reasoning/general)
    // ========================================================================
    
    // Get the primary subject if available
    const primarySubject = userContext?.subjects?.[0];
    const taskType = classifyTaskType(messages, primarySubject);
    console.log(`[/api/hf/chat] Classified as "${taskType}" question (Subject: ${primarySubject || "none"})`);

    // ========================================================================
    // STEP 4: Send to AI and return the response
    // ========================================================================

    const content = await callGroqChat(
      {
        messages: [
          {
            role: "system",
            content:
              systemPrompt +
              (aiPersonality
                ? `\n\n--- PERSONALITY SETTINGS (HIGH PRIORITY) ---\n${buildPersonalityInstructions(aiPersonality)}\n--- END PERSONALITY ---`
                : "") +
              (userContext?.pageContext
                ? `\n\n--- PAGE CONTEXT (read before answering) ---\n${userContext.pageContext}\n--- END PAGE CONTEXT ---`
                : ""),
          },
          // Strip out any system messages the client may have passed — we own the system prompt
          ...messages.filter(m => m.role !== "system"),
        ],
        max_tokens: maxTokens,
        temperature: researchMode ? 0.3 : 0.55,
      },
      taskType,
      userContext?.selectedModel || null
    );

    return NextResponse.json({ role: "assistant", content });

  } catch (error) {
    // If anything goes wrong, log it and return a friendly error message
    const message = formatError(error);
    console.error("[/api/hf/chat] Error details:", {
      message,
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Determine appropriate status code and user message based on error type
    let statusCode = 500;
    let userMessage = "AI service unavailable. Please try again in a moment.";

    if (message.includes("Missing GROQ_API_KEY")) {
      statusCode = 503;
      userMessage = "AI service not configured. Please contact support.";
    } else if (message.includes("timeout")) {
      statusCode = 504;
      userMessage = "Request timed out. Please try again.";
    } else if (message.includes("rate limit") || message.includes("429")) {
      statusCode = 429;
      userMessage = "Too many requests. Please wait a moment and try again.";
    } else if (message.includes("413") || message.includes("too large")) {
      statusCode = 413;
      userMessage = "Message too long. Please shorten your message.";
    } else if (message.includes("401") || message.includes("403")) {
      statusCode = 503;
      userMessage = "AI service authentication failed. Please contact support.";
    }

    return NextResponse.json(
      { role: "assistant", content: userMessage, error: message },
      { status: statusCode },
    );
  }
}
