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
    } else {
      // Fallback: Check for localStorage data passed from client
      // (for localhost development without auth)
      if (clientPersonality) aiPersonality = clientPersonality as AIPersonality;
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

    // Fetch relevant memories with semantic relevance to current message
    if (user) {
      const latestUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
      const { memories, summaries } = await getRelevantMemories(user.id, {
        limit: 15,
        minImportance: 0.3,
        currentMessage: latestUserMsg,
      });
      memoryContext = buildMemoryContext(memories, summaries);
    } else if (clientMemories && Array.isArray(clientMemories)) {
      memoryContext = buildMemoryContext(clientMemories as AIMemoryFragment[], []);
    }

    // How much should the AI use analogies? 
    // Personality setting OVERRIDES the UI slider - this is critical
    const personalityUseAnalogies = aiPersonality?.use_analogies;
    const personalityAnalogyFreq = aiPersonality?.analogy_frequency ?? 3;
    
    // Default to moderate - AI uses judgment for when analogies make sense
    let analogyIntensity = userContext?.analogyIntensity ?? 2;
    if (personalityUseAnalogies === false) {
      analogyIntensity = 0; // Personality overrides
    } else if (personalityUseAnalogies === true) {
      analogyIntensity = Math.max(analogyIntensity, personalityAnalogyFreq); // Use higher of both
    }

    // Student's grade and Australian state — used to tailor curriculum context
    const studentGrade = String(userContext?.grade || "7-12");
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

    // Instructions for how much to use analogies - AI uses judgment
    const analogyGuidance = [
      "Use no analogies - focus on clear, direct explanations.",
      "Use analogies sparingly - only when they genuinely clarify the concept.",
      "Use analogies when helpful - integrate naturally into explanations where they add clarity.",
      "Use analogies frequently - explain concepts using the student's interests when it helps.",
      "Use extensive analogies - weave the student's interests throughout explanations.",
      "Use analogies as the primary tool - make concepts click through the student's interests.",
    ][analogyIntensity];

    // Formula sheet context — injected into prompt for formula-bearing subjects
    const primarySubjectForFormulas = userContext?.subjects?.[0] || null;
    const formulaSheetContext = primarySubjectForFormulas
      ? getFormulaSheetContext(primarySubjectForFormulas)
      : "";

// Instructions for how long responses should be - respect user's detail_level setting
    const userDetailLevel = aiPersonality?.detail_level ?? 50;
    let targetResponseLength = "balanced";
    let minWords = 100;
    let maxWords = 300;
    
    if (userDetailLevel >= 70) {
      targetResponseLength = "comprehensive";
      minWords = 200;
      maxWords = 500;
    } else if (userDetailLevel <= 30) {
      targetResponseLength = "concise";
      minWords = 50;
      maxWords = 150;
    } else {
      targetResponseLength = "balanced";
      minWords = 100;
      maxWords = 300;
    }
    
    const selectedModel = userContext?.selectedModel || null;
    const isQwenModel = selectedModel ? selectedModel.toLowerCase().includes("qwen") : false;
    
    const lengthGuidance = `RESPONSE LENGTH (${targetResponseLength}):
    - Minimum ${minWords} words for substantive answers
    - Maximum ${maxWords} words - go longer only when topic truly demands it
    - Simple questions: 2-3 sentences
    - Complex topics: Use full paragraphs, multiple examples, thorough coverage
    - Don't hold back on detail when students need to understand something deeply
    - NOTE: If asked to write something very long (essays, reports, etc.), explain that responses are capped at ~1900 tokens due to API rate limits, but offer to continue in a follow-up message`;

    const researchMode = Boolean(userContext?.researchMode);

    // Token budget — respect user's detail_level preference but hard cap at 1900
    // due to Groq's ~6k TPM rate limit (leaving ~4000 for input)
    const detailLevel = aiPersonality?.detail_level ?? 50;
    const HARD_CAP = 1900;
    let maxTokens = 1500; // Default
    
    if (researchMode) {
      maxTokens = HARD_CAP;
    } else if (detailLevel >= 70) {
      maxTokens = HARD_CAP; // Comprehensive
    } else if (detailLevel <= 30) {
      maxTokens = 600; // Brief
    } else {
      maxTokens = 1500; // Balanced
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
        : `1. ANALOGY-OPTIONAL: Use an analogy only when it genuinely helps clarify. Don't force it if a direct explanation works better.
    
    GUIDANCE:
    - Use analogies to make abstract concepts concrete, but skip if the concept is already clear
    - Choose ONE interest to anchor to, but acknowledge if a direct explanation is better
    - If forcing the analogy feels awkward, explain directly instead
    - Natural paragraphs only — no "Step 1:" structures`;

    // Core teaching philosophy
    const teachingApproach =
      analogyIntensity === 0
        ? "Build understanding through clear, direct explanations grounded in facts."
        : "Explain directly when clear, use analogies to make abstract concepts concrete when helpful.";

    // TEACHING METHODOLOGY
    const methodology = `
    YOUR ROLE:
    - Guide students to understand concepts, don't just give answers
    - For homework/task questions: ask "What have you tried?" or give hints first
    - Help them figure it out — don't do the work for them

    RESPONSE BALANCE:
    - Brief is fine for greetings: 1-2 sentences
    - Substantive for learning: cover concept + one example
    - Skip essays unless explicitly asked
    - Match your answer length to the question`;

    // How to layer complexity in explanations
    const complexityGuidance = `EXPLANATION DEPTH:
    - Start: Plain-language summary anyone can understand
    - Deepen: Explain the mechanism (why it works)
    - Extend: Edge cases, common mistakes, advanced nuances
    - Connect: Link to related concepts and real-world applications`;

// Brevity guidance
    const brevityGuidance = `
DEPTH VS BREVITY:
- Brief is fine for greetings: 1-2 sentences
- Simple questions: 2-3 sentences
- Complex concepts: Full paragraphs with examples - go deep
- Math problems: Show all working with explanations
- Quality over brevity - students need thorough explanations to learn`;

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

const systemPrompt = `You are "Analogix AI", an expert tutor. Provide clear, thorough, well-structured explanations.

Student Context: Year ${studentGrade}${stateFullName ? ` in ${stateFullName}, Australia` : ", Australia"}. Use Australian curriculum standards and terminology.
${memoryContext ? `\nMemory: ${memoryContext}` : ""}

Response Guidelines:
- Use markdown headings (## for sections, ### for subsections)
- Format key points as bullet lists; steps as numbered lists
- Use \`code\` for technical terms, \`\`\`language for code blocks
- Format math with LaTeX: $inline$ and $$display$$
- Be comprehensive - explain thoroughly with examples
- Never give one-sentence answers to complex topics

Analogy Usage: ${analogyIntensity === 0 ? "Don't use analogies" : `Use analogies when they genuinely help clarify concepts. Let the explanation dictate when an analogy adds value - don't force it. Interests (${allowedInterests}) can provide relatable anchors when useful.`}
${analogyIntensity === 0 ? "" : `\n${analogyInstructions}`}

Math Requirements:
- Show all steps with explanations
- Use proper notation ($x$, $\\frac{dy}{dx}$, etc.)
- Verify solutions by plugging back in

${formulaSheetContext ? `\nFormulas: ${formulaSheetContext}` : ""}
${researchBlock}

Visualisations — you have THREE tools to make concepts visual and memorable:

1. DESMOS GRAPHS (for math functions):
   Use a code block with language "desmos" to render interactive graphs.
   Format: \`\`\`desmos
   y = x^2
   y = 2x + 1
   \`\`\`
   Use for: any math function, equation, inequality, parametric curve.

2. RECHARTS (for data & statistics):
   When presenting numerical data, comparisons, trends, distributions, statistics, or percentages, ALWAYS generate a chart using a JSON code block with language "recharts".
   Supported types: "bar" (comparisons), "line" (trends over time), "pie" (part-to-whole), "area" (cumulative trends).
   Format:
   \`\`\`recharts
   {
     "type": "bar",
     "title": "Chart Title",
     "xKey": "name",
     "categories": ["value1", "value2"],
     "data": [
       {"name": "Label 1", "value1": 10, "value2": 20},
       {"name": "Label 2", "value1": 15, "value2": 25}
     ]
   }
   \`\`\`

3. THREE.JS 3D SCENES (for concepts & structures):
   When explaining abstract concepts, structures, systems, or relationships, generate a 3D scene using a JSON code block with language "three".
   Use for: atoms/molecules, solar systems, biological structures, networks, hierarchies, timelines, ecosystems, flow diagrams, or ANY concept that benefits from a visual spatial representation.
   Format:
   \`\`\`three
   {
     "title": "Short display title",
     "description": "1-2 sentence explanation",
     "sceneType": "atom" | "solar" | "molecule" | "wave" | "dna" | "cell" | "graph" | "geometry" | "network" | "timeline" | "hierarchy" | "flow" | "ecosystem" | "generic",
     "primaryColor": "#hexcolor",
     "secondaryColor": "#hexcolor",
     "objects": [
       {
         "id": "unique_id",
         "shape": "sphere" | "torus" | "box" | "cylinder" | "cone" | "helix" | "ring" | "pyramid",
         "label": "short label",
         "color": "#hexcolor",
         "size": 1.0,
         "position": {"x": 0, "y": 0, "z": 0},
         "orbitRadius": null,
         "orbitSpeed": null,
         "pulsates": false
       }
     ],
     "connections": [
       {"from": "object_id", "to": "object_id", "color": "#hexcolor"}
     ],
     "analogyHint": "A fun one-liner analogy or memory tip"
   }
   \`\`\`
   Rules for 3D scenes:
   - Include 4-10 objects spread across the full position range (x: -3 to 3, y: -2 to 2, z: -2 to 2)
   - Layout should reflect the concept's structure (timeline = left to right, hierarchy = top to bottom)
   - Use orbitRadius/orbitSpeed for objects that should animate (electrons, planets)
   - Use pulsates: true for living things, energy, or active processes
   - Use meaningful, distinct colours
   - Keep labels short (2-3 words max)

IMPORTANT: If the user asks for a visual, diagram, or graph — use the right tool. Math functions → Desmos. Data/statistics → Recharts. Concepts/structures → Three.js. Don't just describe it — SHOW it.`;

    // ========================================================================
    // STEP 3: Detect what type of question this is (coding/reasoning/general)
    // ========================================================================
    
    // Get the primary subject if available (already defined earlier)
    const taskType = classifyTaskType(messages, primarySubject || undefined);
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
        temperature: researchMode ? 0.3 : 0.7,
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
