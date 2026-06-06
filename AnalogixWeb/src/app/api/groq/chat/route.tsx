import { NextResponse } from "next/server";
import { callGroqChat, formatError, classifyTaskType } from "../_utils";
import { getFormulaSheetContext } from "@/data/formulaSheets";
import { createClient } from "@/lib/supabase/server";
import { getUserAIPersonality, getRelevantMemories, buildMemoryContext, buildPersonalityInstructions } from "@/lib/aiMemory";
import type { AIPersonality } from "@/types/ai-personality";
import { buildFullCurriculumPrompt, findCurriculumForQuery } from "@/lib/curriculum";
import { buildMappingSection, buildToneInstructions } from "@/lib/explanation";
export const runtime = "nodejs";
export async function POST(request) {
    try {
        // ========================================================================
        // STEP 0: Get user and fetch personality/memory from database or localStorage
        // ========================================================================
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        let aiPersonality: AIPersonality | null = null;
        let memoryContext = "";
        // Client-side x-client-data is always sent by the chat UI and contains localStorage
        // personality/memories. Merge it so UI toggles are reflected immediately even when
        // a user is authenticated.
        const clientData = request.headers.get("x-client-data");
        let clientPersonality: any = null;
        let clientMemories: any = null;
        if (clientData) {
            try {
                const parsed = JSON.parse(clientData);
                clientPersonality = parsed.personality ?? null;
                clientMemories = parsed.memories ?? null;
            }
            catch (e) {
                console.warn("[chat] Failed to parse x-client-data:", e instanceof Error ? e.message : e);
            }
        }
        if (user) {
            // Fetch personality settings from database
            aiPersonality = await getUserAIPersonality(user.id);
            // Merge client personality over DB personality (client wins)
            if (clientPersonality) {
                aiPersonality = { ...(aiPersonality ?? {}), ...clientPersonality };
            }
        }
        else {
            // Fallback: Check for localStorage data passed from client
            // (for localhost development without auth)
            if (clientPersonality)
                aiPersonality = clientPersonality;
        }
        // ========================================================================
        // STEP 1: Extract user preferences from the incoming request
        // ========================================================================
        const body = await request.json();
        const messages = body.messages || [];
        const userContext = body.userContext || {};
        // Fetch relevant memories with semantic relevance to current message
        if (user) {
            const latestUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
            const { memories, summaries } = await getRelevantMemories(user.id, {
                limit: 15,
                minImportance: 0.3,
                currentMessage: latestUserMsg,
            });
            memoryContext = buildMemoryContext(memories, summaries);
        }
        else if (clientMemories && Array.isArray(clientMemories)) {
            memoryContext = buildMemoryContext(clientMemories, []);
        }
        // How much should the AI use analogies? 
        // Personality setting OVERRIDES the UI slider - this is critical
        const personalityUseAnalogies = aiPersonality?.use_analogies;
        const personalityAnalogyFreq = aiPersonality?.analogy_frequency ?? 3;
        // Default to moderate - AI uses judgment for when analogies make sense
        let analogyIntensity = userContext?.analogyIntensity ?? 2;
        if (personalityUseAnalogies === false) {
            analogyIntensity = 0; // Personality overrides
        }
        else if (personalityUseAnalogies === true) {
            analogyIntensity = Math.max(analogyIntensity, personalityAnalogyFreq); // Use higher of both
        }
        // Student's grade and Australian state — used to tailor curriculum context
        const studentGrade = String(userContext?.grade || "7-12");
        const studentState = userContext?.state || null;
        // Map state codes to full names for the prompt
        const STATE_FULL_NAMES = {
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
            "Use analogies when helpful - when you do, weave the analogy through your explanation by mapping parts of the concept to parts of the analogy. Don't just state it and drop it.",
            "Use analogies frequently - build an extended analogy and thread it through your response. Map each part of the concept to a corresponding part of the analogy, and keep returning to it.",
            "Use extensive analogies - every explanation should be anchored in a vivid, extended analogy. Build it from the start, develop it throughout, and map concept elements to analogy elements at every step.",
            "Use analogies as the primary tool - every concept should be explained through a rich, extended analogy. Weave the analogy through your entire response, showing how each piece of the concept maps to the analogy.",
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
        }
        else if (userDetailLevel <= 30) {
            targetResponseLength = "concise";
            minWords = 50;
            maxWords = 150;
        }
        else {
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
        const HARD_CAP = isQwenModel ? 4000 : 3000;
        let maxTokens = isQwenModel ? 2500 : 1500; // Default
        if (researchMode) {
            maxTokens = HARD_CAP;
        }
        else if (detailLevel >= 70) {
            maxTokens = HARD_CAP; // Comprehensive
        }
        else if (detailLevel <= 30) {
            maxTokens = 800; // Brief
        }
        else {
            maxTokens = isQwenModel ? 2500 : 1500; // Balanced
        }
        // Get the user's hobbies/interests for making analogies
        const interestList = userContext?.hobbies?.filter(Boolean) ?? [];
        // If no interests set, guide the AI to ask about them in a natural way
        const allowedInterests = interestList.length > 0
            ? interestList.join(", ")
            : "the student's everyday life, school experiences, or general interests (ask about theirs if unclear)";
        const findExplicitInterest = (text, interests) => {
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
        const analogyInstructions = analogyIntensity === 0
            ? `ANALOGY MODE: OFF\nUse no analogies. Explain directly, factually, and clearly. Do not reference hobbies or comparisons.`
            : analogyIntensity >= 4
                ? `ANALOGY MODE: EXTENDED — Analogies are your primary teaching method.
    
HOW TO WEAVE ANALOGIES:
1. Pick ONE relatable scenario (from "${analogyAnchor}" or everyday life) that parallels the concept.
2. As you explain each part of the concept, map it to a corresponding part of the analogy. For example, if explaining a function using a recipe: "The inputs are your ingredients, the function body is the cooking process — you mix, heat, transform — and the output is the finished dish."
3. Keep returning to the analogy throughout your response. When you introduce a new sub-concept, show how it fits into the analogy you've already established.
4. The analogy should feel like a parallel story running alongside the technical explanation, with clear connections drawn between the two.
5. NEVER just say "Think of it like X" and then drop the analogy. Extend it, develop it, and use it to illuminate each piece of the concept.`
                : analogyIntensity >= 3
                    ? `ANALOGY MODE: FREQUENT — Use analogies regularly and weave them into your explanations.
    
HOW TO WEAVE ANALOGIES:
1. Choose a familiar scenario from "${analogyAnchor}" that parallels the concept.
2. As you explain each part of the concept, map it to a corresponding part of the analogy.
3. Return to the analogy as you cover different aspects. Let it run alongside your technical explanation.
4. The goal is for the student to see how each piece of the concept corresponds to something they already understand.`
                    : `ANALOGY MODE: OPTIONAL — Use an analogy only when it genuinely helps clarify.
    
GUIDANCE:
- Use analogies to make abstract concepts concrete, but skip if the concept is already clear
- When you do use an analogy, weave it in — map parts of the concept to parts of the analogy
- Natural paragraphs only — no "Step 1:" structures`;
        // Core teaching philosophy
        const teachingApproach = analogyIntensity === 0
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
        const detectConcept = (msg) => {
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
                if (lower.includes(keyword))
                    return concept;
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
- Opening: 1 sentence max
- Intuition: 1-2 sentences  
- Core Idea: Under 15 words
- Example: Simple, just the basics` : isComprehensive ? `Go deeper:
- Opening: 1-2 sentences with rich detail
- Intuition: 3-5 sentences, build understanding
- Core Idea: Under 30 words, memorable
- Example: Show reasoning, edge cases` : `Balance:
- Opening: 1-2 sentences
- Intuition: 2-3 sentences
- Core Idea: Under 20 words
- Example: Show key steps`}

1. OPENING — Start with an engaging hook using "${analogyAnchor}".
   NEVER: "${currentConcept} is defined as..." or "The definition of..."
   Instead, draw the reader in with a relatable scenario or question.

2. INTUITION — What's actually happening, not just what it is.
   ${analogyIntensity >= 3 ? 'WEAVE YOUR ANALOGY HERE: As you explain the intuition, map parts of the concept to parts of your analogy. Show how the pieces correspond.' : ''}

3. CORE IDEA — ONE sentence to remember.

4. EXAMPLE — ${isConcise ? "just the answer" : "one worked example"}
   ${analogyIntensity >= 3 ? 'Return to your analogy: Show how the example plays out in both the concept and the analogy, reinforcing the connection.' : ''}

5. ${isComprehensive ? "QUICK CHECK - 1 question" : ""}

QUALITY: Engaging opening, no dry definitions, clarity over cleverness
${analogyIntensity >= 3 ? `\nANALOGY WEAVING: Don't just state an analogy and abandon it. Thread it through your entire explanation — map concept elements to analogy elements at each step, and keep returning to the comparison so the student sees how the pieces fit together.` : ''}
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
        const formatResearchSources = (sources) => {
            const truncateText = (text, max = 360) => text.length > max ? text.slice(0, max).trim() + "…" : text.trim();
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
- LATEX FOR ALL MATHEMATICAL CONTENT: Use LaTeX ($...$ for inline, $$...$$ for display) for ALL mathematical expressions, equations, formulas, numbers used in calculations, mathematical operations, symbols, and scientific notation. This applies to EVERY subject — maths, physics, chemistry, biology, economics, engineering, and any other subject where numbers, formulas, or mathematical symbols appear. Examples: write $25$ not 25 when it's a value in a calculation, $x = 5$ not x = 5, $\\frac{1}{2}$ not 1/2, $\\times$ for multiplication, $\\div$ for division, $\\pm$, $\\approx$, $\\leq$, $\\geq$, $\\degree$C, $\\text{pH} = 7$, $E = mc^2$, $n = 3$ moles, $v = 30\\,\\text{m/s}$. ANY number that is part of a formula, equation, measurement, calculation, or mathematical relationship MUST be wrapped in $...$. Chemical equations, physics formulas, statistical values, percentages, ratios — all use LaTeX.
- Be comprehensive - explain thoroughly with examples
- Never give one-sentence answers to complex topics

Analogy Usage: ${analogyIntensity === 0 ? "Don't use analogies" : `Use analogies when they genuinely help clarify concepts. Let the explanation dictate when an analogy adds value - don't force it. Interests (${allowedInterests}) can provide relatable anchors when useful.`}
${analogyIntensity === 0 ? "" : `\n${analogyInstructions}`}

Math Requirements:
- Show all steps with explanations
- Use proper LaTeX notation for ALL math: $x$, $\\frac{dy}{dx}$, $\\int$, $\\sum$, etc.
- ALL numbers in equations, formulas, and calculations must be in LaTeX: $x = 5$, not x = 5
- Verify solutions by plugging back in

${formulaSheetContext ? `\nFormulas: ${formulaSheetContext}` : ""}
${researchBlock}

Visualisations — you have THREE tools to make concepts visual and memorable:

 1. DESMOS GRAPHS (for math functions):
    When the user asks to graph, plot, or visualise ANY equation, function, or inequality, you MUST output a code block with language "desmos" containing the raw equation(s).
    Format: \`\`\`desmos
    y = x^2 - 4*x + 3
    \`\`\`
    Rules:
    - Put ONLY the equation(s) inside the code block — one per line.
    - Use * for multiplication (e.g. 2*x not 2x, 4*x^2 not 4x^2).
    - NEVER output a desmos.com URL. NEVER say "copy this link". NEVER describe the graph instead of showing it.
    - After the code block, you may briefly describe key features (vertex, intercepts, etc.).
    Use for: any math function, equation, inequality, parametric curve.

 2. RECHARTS (for data & statistics):
     When the user asks for a chart, graph, or visualisation of NUMERICAL DATA or STATISTICS, you MUST output a code block with language "recharts" containing a JSON object.
     Format: \`\`\`recharts
     {
       "type": "line",
       "title": "World Population (billions)",
       "xKey": "name",
       "categories": ["population"],
       "data": [
         {"name": "1950", "population": 2.5},
         {"name": "1975", "population": 4.0},
         {"name": "2000", "population": 6.1},
         {"name": "2020", "population": 7.8}
       ]
     }
     \`\`\`
     Rules:
     - The block MUST be valid JSON only — NO imports, NO React components, NO JSX, NO chart.js, NO function definitions.
     - "type" must be one of: "line", "bar", "pie", "area".
     - "xKey" is the data key for the x-axis (e.g. "name", "year", "label").
     - "categories" is an array of data keys for the y-axis values to plot.
     - "data" is an array of objects where each object has the xKey field and one field per category.
     - NEVER output JavaScript, React code, or chart.js code. The frontend expects ONLY JSON.
     Types: "bar" for comparisons, "line" for trends over time, "pie" for parts of a whole, "area" for cumulative trends.
     Use for: any numerical data, comparisons, trends, distributions, statistics, or percentages.

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
        const content = await callGroqChat({
            messages: [
                {
                    role: "system",
                    content: systemPrompt +
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
        }, taskType, userContext?.selectedModel || null);
        return NextResponse.json({ role: "assistant", content });
    }
    catch (error) {
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
        }
        else if (message.includes("timeout")) {
            statusCode = 504;
            userMessage = "Request timed out. Please try again.";
        }
        else if (message.includes("rate limit") || message.includes("429")) {
            statusCode = 429;
            userMessage = "Too many requests. Please wait a moment and try again.";
        }
        else if (message.includes("413") || message.includes("too large")) {
            statusCode = 413;
            userMessage = "Message too long. Please shorten your message.";
        }
        else if (message.includes("401") || message.includes("403")) {
            statusCode = 503;
            userMessage = "AI service authentication failed. Please contact support.";
        }
        return NextResponse.json({ role: "assistant", content: userMessage, error: message }, { status: statusCode });
    }
}
//# sourceMappingURL=route.js.map