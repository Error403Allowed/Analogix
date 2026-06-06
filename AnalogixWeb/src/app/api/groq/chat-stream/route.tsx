import { callGroqChatStream, formatError, classifyTaskType } from "../_utils";
import { getFormulaSheetContext } from "@/data/formulaSheets";
import { createClient } from "@/lib/supabase/server";
import { buildCalendarContext } from "../_calendarContext";
import { listUserDocuments } from "@/lib/server/documents";
import { getUserAIPersonality, getRelevantMemories, buildMemoryContext, buildPersonalityInstructions } from "@/lib/aiMemory";
export const runtime = "nodejs";
// Token estimation: ~4 chars per token for English text
const estimateTokens = (text) => Math.ceil(text.length / 4);
// Truncate workspace documents to fit within token budget
const truncateWorkspaceDocs = (allDocs, maxTokens) => {
    const totalTokens = allDocs.reduce((sum, d) => sum + estimateTokens(d.preview + d.title + d.subjectId), 0);
    if (totalTokens <= maxTokens) {
        return { docs: allDocs, truncated: false };
    }
    const result = [];
    let runningTokens = 0;
    let truncated = false;
    for (const doc of allDocs) {
        const docTokens = estimateTokens(doc.preview + doc.title + doc.subjectId);
        if (runningTokens + docTokens <= maxTokens) {
            result.push(doc);
            runningTokens += docTokens;
        }
        else {
            // Try to truncate this doc's preview
            const remainingTokens = maxTokens - runningTokens - estimateTokens(doc.title + doc.subjectId);
            if (remainingTokens > 100) {
                const maxChars = remainingTokens * 4;
                if (doc.preview.length > maxChars) {
                    result.push({ ...doc, preview: truncate(doc.preview, maxChars) });
                    truncated = true;
                    runningTokens += estimateTokens(truncate(doc.preview, maxChars)) + estimateTokens(doc.title + doc.subjectId);
                    continue;
                }
            }
            truncated = true;
        }
    }
    return { docs: result, truncated };
};
const STUDY_GUIDE_PREFIX = "__STUDY_GUIDE_V2__";
const stripHtml = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const truncate = (text, max) => text.length > max ? text.slice(0, max) + "…" : text;
const getFirstSentence = (text) => {
    const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const firstPeriod = cleaned.indexOf(". ");
    if (firstPeriod > 0 && firstPeriod < 200) {
        return cleaned.slice(0, firstPeriod + 1);
    }
    return truncate(cleaned, 200);
};
const studyGuideToContext = (raw) => {
    try {
        const json = raw.slice(STUDY_GUIDE_PREFIX.length);
        const guide = JSON.parse(json);
        const parts = [];
        if (guide.title)
            parts.push(`Title: ${guide.title}`);
        if (guide.overview)
            parts.push(`Overview: ${guide.overview}`);
        if (Array.isArray(guide.keyPoints) && guide.keyPoints.length)
            parts.push(`Key Points:\n${guide.keyPoints.map(p => `  • ${p}`).join("\n")}`);
        if (Array.isArray(guide.keyConcepts) && guide.keyConcepts.length)
            parts.push(`Key Concepts:\n${guide.keyConcepts.map(c => `  • ${c.title}: ${c.content}`).join("\n")}`);
        if (guide.keyTable && Array.isArray(guide.keyTable.rows)) {
            const kt = guide.keyTable;
            parts.push(`Key Table headers: ${kt.headers.join(", ")}\n  rows:\n${kt.rows.map(r => "    " + r.join(" | ")).join("\n")}`);
        }
        if (Array.isArray(guide.practiceQuestions) && guide.practiceQuestions.length)
            parts.push(`Practice Questions:\n${guide.practiceQuestions.map((q, i) => `  Q${i + 1}: ${q.question}`).join("\n")}`);
        if (Array.isArray(guide.tips) && guide.tips.length)
            parts.push(`Tips:\n${guide.tips.map(t => `  • ${t}`).join("\n")}`);
        return parts.join("\n\n");
    }
    catch {
        return "(study guide — unreadable)";
    }
};
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
// Simple client-side summary compression for older messages
const compressToSummary = (msgs) => {
    if (msgs.length === 0)
        return "";
    // Extract key info from user messages: topics, goals, blockers
    const userMsgs = msgs.filter(m => m.role === "user");
    const topics = [];
    const goals = [];
    userMsgs.forEach(m => {
        const content = m.content;
        // Extract short topic markers
        if (content.length < 30) {
            topics.push(content);
        }
        else {
            // First sentence as topic
            const first = content.split(".")[0].slice(0, 50);
            if (first)
                topics.push(first);
        }
    });
    // Compress to summary
    const summaryParts = [];
    // Topic/direction
    if (topics.length > 0) {
        const uniqueTopics = [...new Set(topics)].slice(0, 3);
        summaryParts.push(`Topics: ${uniqueTopics.join(", ")}`);
    }
    // Message count as context
    summaryParts.push(`(${msgs.length} earlier messages)`);
    if (summaryParts.length === 0)
        return "";
    return `[Earlier] ${summaryParts.join(" | ")}`;
};
function buildSystemPrompt(userContext, messages, workspaceContext, calendarContext) {
    const analogyIntensity = userContext?.analogyIntensity ?? 1;
    const studentGrade = userContext?.grade || "7-12";
    const studentState = userContext?.state || null;
    const STATE_FULL_NAMES = {
        NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
        WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
        ACT: "Australian Capital Territory", NT: "Northern Territory",
    };
    const stateFullName = studentState ? (STATE_FULL_NAMES[studentState] || studentState) : null;
    const curriculumContext = stateFullName
        ? `The student is in Year ${studentGrade} in ${stateFullName} (${studentState}), Australia. Always align explanations, examples, terminology, and curriculum references to the ${stateFullName} syllabus and Australian educational standards for Year ${studentGrade}. Use Australian spelling and terminology (e.g. "maths" not "math", "Year" not "Grade").`
        : `The student is in Year ${studentGrade} in Australia. Always align explanations to the Australian curriculum for Year ${studentGrade}. Use Australian spelling and terminology.`;
    const interestList = userContext?.hobbies?.filter(Boolean) ?? [];
    const allowedInterests = interestList.length > 0 ? interestList.join(", ") : "General";
    const findExplicitInterest = (text, interests) => {
        const lower = text.toLowerCase();
        let best = null;
        for (const interest of interests) {
            const idx = lower.indexOf(interest.toLowerCase());
            if (idx >= 0 && (!best || idx < best.index))
                best = { interest, index: idx };
        }
        return best?.interest ?? null;
    };
    const latestUser = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const explicitFromContext = userContext?.analogyAnchor?.trim() || null;
    const explicitFromMessage = latestUser ? findExplicitInterest(latestUser, interestList) : null;
    const randomInterest = interestList.length > 0 ? interestList[Math.floor(Math.random() * interestList.length)] : null;
    const analogyAnchor = explicitFromContext || explicitFromMessage || randomInterest || undefined;
    const analogyGuidance = [
        "SCHOOL MODE: This student wants responses tailored for school/assessment purposes. Be formal, precise, and curriculum-aligned. Use correct subject-specific terminology. Structure answers the way a teacher or marker would expect. No analogies, no personal interests, no casual tone.",
        "SCHOOL MODE: Formal, precise responses for school. Use analogies only if they genuinely clarify a concept — don't force them. Let the explanation dictate the approach.",
        "STANDARD LEARNING: Use direct explanations first. Add an analogy only if it would genuinely help understanding — don't force it. Clear and curriculum-aligned beats creative.",
        "Use analogies when explaining concepts — they help make abstract ideas concrete. When you use an analogy, draw it from the student's listed interests and weave it through your explanation: map each part of the concept to a corresponding part of the analogy, and keep returning to it as you cover different aspects. Don't just state an analogy and drop it.",
        "Use analogies as a primary teaching tool. Build an extended analogy from the student's specific interests listed below, and thread it through your entire response. As you explain each part of the concept, show how it maps to the analogy. The analogy must be drawn from the student's actual interests — not generic examples. The analogy should run parallel to the technical explanation, with clear connections throughout.",
        "Maximum analogy integration: Every explanation should be anchored in a vivid, extended analogy drawn from the student's specific interests. Build the analogy from the start and develop it throughout — map concept elements to analogy elements, return to the analogy for each sub-point, and let the parallel story illuminate the concept step by step. NEVER use a generic analogy when the student's interests provide a better one.",
    ][Math.min(analogyIntensity, 5)];
    const hasExplicitSubject = (userContext?.subjects?.length ?? 0) > 0;
    const primarySubjectForFormulas = hasExplicitSubject ? userContext.subjects[0] : null;
    const formulaSheetContext = primarySubjectForFormulas ? getFormulaSheetContext(primarySubjectForFormulas) : "";
    const researchMode = Boolean(userContext?.researchMode);
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
    const selectedModel = userContext?.selectedModel || null;
    const isQwenModel = selectedModel ? selectedModel.toLowerCase().includes("qwen") : false;
    const actionInstructions = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLASHCARDS & QUIZZIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When creating flashcards or quizzes, place a JSON block wrapped in <internal>...</internal> tags at the VERY END of your message. This block is hidden from the student — never mention it in your visible text.

── FLASHCARDS ──
<internal>[{"type":"add_flashcards","subjectId":"SUBJECT","setName":"Topic name","cards":[{"front":"Q","back":"A"}]}]</internal>

── QUIZZES ──
<internal>[{"type":"start_quiz","subjectId":"SUBJECT","topic":"optional topic","difficulty":"foundational|intermediate|advanced","numberOfQuestions":5,"timeLimitMinutes":0}]</internal>

── RULES ──
- For flashcards: you MUST include AT LEAST 5 cards. If you cannot make 5 meaningful cards, do NOT use the action at all.
- For flashcards: your visible text should be 1 sentence only, e.g. "Done! Added 5 flashcards on quadratics." Then the <internal> block.
- For quizzes: your visible text should be "Starting your quiz now!" Then the <internal> block.
- Use flashcards when the student says "make flashcards", "create cards", "save these" etc.
- Use quizzes when the student says "quiz me", "test me", "start a quiz" etc.
- The <internal> block must contain ONLY a valid JSON array — no markdown, no code fences, no extra text.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    const workspaceSection = workspaceContext || calendarContext ? `
${calendarContext ? `━━━ CALENDAR & DEADLINES ━━━\n${calendarContext}\n━━━ END CALENDAR ━━━\n` : ""}
${workspaceContext ? `━━━ YOUR WORKSPACE ━━━
You have READ-ONLY access to this student's documents — you can see them for context but CANNOT edit or create documents directly. Do NOT tell the student you can edit their documents or offer to update them.

${workspaceContext}
━━━ END WORKSPACE ━━━
` : ""}` : "";
    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeOfDay = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 14 ? "midday" : hour >= 14 && hour < 18 ? "afternoon" : hour >= 18 && hour < 22 ? "evening" : "night";
    const timeString = now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
    const dayOfWeek = now.toLocaleDateString("en-AU", { weekday: "long" });
    const dateString = now.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
    const isSchoolHours = hour >= 8 && hour < 16 && dayOfWeek !== "Saturday" && dayOfWeek !== "Sunday";
    const isEveningStudy = hour >= 18 && hour < 22;
    const isWeekend = dayOfWeek === "Saturday" || dayOfWeek === "Sunday";
    const isLikelyFree = (hour >= 15 && hour < 18) || (hour >= 19 && hour < 21);
    // Less robotic time awareness — just note if it's a likely study time or not
    const timeAwareness = [
        isSchoolHours ? "It's during school hours — so you might be squeezing this in between classes." :
            isEveningStudy ? "It's evening — good study time." :
                isWeekend ? "It's the weekend — nice and relaxed." :
                    "It's outside typical school hours.",
        isLikelyFree ? "You probably have some time for a thorough explanation." : "Keep things concise — you seem busy.",
    ].join(" ");
    return `You are "Analogix AI", an AI tutor for Australian students. Your core job is to help students understand concepts and succeed in their studies.

Context: Year ${studentGrade}${stateFullName ? ` in ${stateFullName}` : ""}, Australia. ${curriculumContext}
${calendarContext ? `When the user asks about their schedule, events, deadlines, or what's coming up, use the CALENDAR & DEADLINES section below to give accurate, specific answers. Keep it conversational — just tell them what's next naturally.` : ''}

${analogyIntensity === 0 ? `MODE: School/Assessment — formal, precise, no analogies.` :
        `Learning Mode — ${analogyGuidance}
Student Interests (use these for analogies and examples): ${allowedInterests}`}

Rules:
- When user asks about schedule, classes, events, deadlines, or "what's next" — check the calendar context and give a natural, conversational answer (not a list).
- Make sure all your responses reflect the values and outcomes/requirements of the ACARA curriculum. Do not force the curriculum informaiton on the student, but make sure you frame your response to be ACARA-worthy. 
- LATEX FOR ALL MATHEMATICAL CONTENT: Use LaTeX ($...$ for inline, $$...$$ for display) for ALL mathematical expressions, equations, formulas, numbers used in calculations, mathematical operations, symbols, and scientific notation. This applies to EVERY subject — maths, physics, chemistry, biology, economics, engineering, and any other subject where numbers, formulas, or mathematical symbols appear. Examples: write $25$ not 25 when it's a value in a calculation, $x = 5$ not x = 5, $\\frac{1}{2}$ not 1/2, $\\times$ for multiplication, $\\div$ for division, $\\pm$, $\\approx$, $\\leq$, $\\geq$, $\\degree$C, $\\text{pH} = 7$, $E = mc^2$, $n = 3$ moles, $v = 30\\,\\text{m/s}$. ANY number that is part of a formula, equation, measurement, calculation, or mathematical relationship MUST be wrapped in $...$. Chemical equations, physics formulas, statistical values, percentages, ratios — all use LaTeX.
- CHARTS: If the user asks for a graph, chart, or visualisation of data, use the Recharts format described at the end of this prompt to create an interactive chart. Make sure this chart can render accurately and properly on the frontend. 
- DESMOS: If the user asks for a graph of a mathematical function, equation, or inequality, you MUST output a \`\`\`desmos code block with the equation(s). NEVER output a URL or just describe the graph.
- 3D VISUALISATIONS: For complex concepts, structures, systems, or relationships (e.g. solar system, atomic structure, biological processes, networks), use the Three.js format described at the end of this prompt to create an interactive 3D scene that illustrates the concept.
- NOTE: If asked to write something very long (essays, reports, etc.), explain that responses are capped at ~${isQwenModel ? '4000' : '1900'} tokens due to API rate limits, but offer to continue in a follow-up message.${actionInstructions}${workspaceSection}
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

IMPORTANT: If the user asks for a visual, diagram, or graph — use the right tool. Math functions → Desmos. Data/statistics → Recharts. Concepts/structures → Three.js. Don't just describe it — SHOW it.
— Analogix`;
}
export async function POST(request) {
    try {
        const body = await request.json();
        const messages = body.messages || [];
        const userContext = body.userContext || {};
        // Get personality and memory from database or localStorage
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        let aiPersonality = null;
        let memoryContext = "";
        // Client-side "x-client-data" is always sent by the chat UI (it contains localStorage
        // personality/memories). Even if the user is authenticated, merging these values ensures
        // the next response reflects the latest UI toggles immediately.
        const clientData = request.headers.get("x-client-data");
        let clientPersonality = null;
        let clientMemories = null;
        if (clientData) {
            try {
                const parsed = JSON.parse(clientData);
                clientPersonality = parsed.personality ?? null;
                clientMemories = parsed.memories ?? null;
            }
            catch (e) {
                console.warn("[chat-stream] Failed to parse x-client-data:", e instanceof Error ? e.message : e);
            }
        }
        console.log("[chat-stream] User authenticated:", user?.id || "none");
        // Extract latest user message for memory relevance filtering
        const latestUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
        if (user) {
            // Fetch from database
            console.log("[chat-stream] Fetching personality from database...");
            aiPersonality = await getUserAIPersonality(user.id);
            console.log("[chat-stream] Personality fetched:", aiPersonality ? "YES" : "NO");
            // Merge client personality over DB personality (client wins)
            if (clientPersonality) {
                aiPersonality = { ...aiPersonality, ...clientPersonality };
                console.log("[chat-stream] Personality merged from client overrides");
            }
            // Semantic relevance: only fetch memories relevant to current message
            const { memories, summaries } = await getRelevantMemories(user.id, {
                limit: 15,
                minImportance: 0.3,
                currentMessage: latestUserMsg
            });
            memoryContext = buildMemoryContext(memories, summaries);
            console.log("[chat-stream] Memories fetched (semantic):", memories?.length || 0, "| Summaries:", summaries?.length || 0);
        }
        else {
            // Fallback to localStorage from client headers
            console.log("[chat-stream] No user, checking localStorage from headers...");
            if (clientPersonality) {
                aiPersonality = clientPersonality;
                console.log("[chat-stream] Personality from localStorage: YES");
            }
            if (clientMemories && Array.isArray(clientMemories)) {
                memoryContext = buildMemoryContext(clientMemories, []);
                console.log("[chat-stream] Memories from localStorage:", clientMemories.length);
            }
        }
        // Detect simple/greeting messages early — skip workspace loading entirely for speed
        const isSimpleGreeting = (() => {
            const userMsgs = messages.filter(m => m.role === "user");
            if (userMsgs.length !== 1)
                return false;
            const c = userMsgs[0].content.toLowerCase().trim();
            if (c.length > 60)
                return false;
            return /^(hi|hello|hey|sup|yo|g'day|howdy|hiya|heya|thanks?|bye|good\s?(morning|evening|afternoon)|what'?s up|how are you)[\s!?.]*$/.test(c);
        })();
        // ── Load workspace context from Supabase (same as agent route) ──────────
        let workspaceContext;
        let calendarCtx;
        if (!isSimpleGreeting) {
            try {
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Load calendar in parallel with workspace docs
                    const [calendarResult, documents] = await Promise.all([
                        buildCalendarContext(supabase, user.id).catch(() => ""),
                        listUserDocuments(supabase, user.id),
                    ]);
                    if (calendarResult)
                        calendarCtx = calendarResult;
                    if (documents.length > 0) {
                        const allDocs = [];
                        for (const doc of documents) {
                            const isGuide = doc.content?.startsWith(STUDY_GUIDE_PREFIX);
                            if (isGuide) {
                                const readable = studyGuideToContext(doc.content);
                                allDocs.push({ subjectId: doc.subject_id, title: doc.title, type: "DOC", preview: readable });
                            }
                            else {
                                const summary = getFirstSentence(doc.content || "");
                                allDocs.push({
                                    subjectId: doc.subject_id,
                                    title: doc.title,
                                    type: "DOC",
                                    preview: summary + " (Full doc available on request)",
                                });
                            }
                        }
                        if (allDocs.length > 0) {
                            // Token budget for workspace context (leave room for system prompt, messages, and response)
                            const WORKSPACE_TOKEN_BUDGET = 2000;
                            const { docs: truncatedDocs, truncated } = truncateWorkspaceDocs(allDocs, WORKSPACE_TOKEN_BUDGET);
                            if (truncated) {
                                console.log(`[chat-stream] Workspace truncated: ${allDocs.length} → ${truncatedDocs.length} docs to fit token budget`);
                            }
                            const docContext = truncatedDocs.map(d => `[${d.subjectId.toUpperCase()} — ${d.type}: "${d.title}"]\n${d.preview}`).join("\n\n---\n\n");
                            const docIndex = truncatedDocs.map(d => `  • "${d.title}" [${d.type}] subjectId="${d.subjectId}"`).join("\n");
                            workspaceContext = `Document Index:\n${docIndex}\n\nDocument Contents:\n${docContext}`;
                        }
                    }
                }
            }
            catch (err) {
                // Workspace loading failed — continue without it (non-fatal)
                console.warn("[chat-stream] workspace load failed:", err instanceof Error ? err.message : err);
            }
        } // end !isSimpleGreeting
        // Reuse latestUserMsg from earlier for formal request detection
        const isFormalRequest = /^(write|essay|assignment|report|piece|report|article|paragraph|analysis|critique|review|composition)/.test(latestUserMsg.toLowerCase()) ||
            latestUserMsg.toLowerCase().includes("essay on") ||
            latestUserMsg.toLowerCase().includes("write an") ||
            latestUserMsg.toLowerCase().includes("assign") ||
            latestUserMsg.toLowerCase().includes("composition");
        // Build system prompt with personality and memory
        // Use client-side analogy intensity if set, otherwise fall back to personality
        // Prioritise the user's explicit setting over personality defaults
        // For formal requests (essays), force analogyIntensity to 0
        const effectiveUserContext = aiPersonality
            ? {
                ...userContext,
                // Only override if user hasn't explicitly set analogy intensity, or for formal requests
                analogyIntensity: userContext.analogyIntensity !== undefined
                    ? userContext.analogyIntensity
                    : isFormalRequest
                        ? 0
                        : Math.max(1, Math.min(5, aiPersonality.analogy_frequency ?? 3)),
            }
            : { ...userContext, analogyIntensity: isFormalRequest ? 0 : userContext.analogyIntensity };
        let systemPrompt = buildSystemPrompt(effectiveUserContext, messages, workspaceContext, calendarCtx);
        console.log("[chat-stream] Injecting memory context:", memoryContext ? "YES" : "NO");
        console.log("[chat-stream] Injecting personality:", aiPersonality ? "YES" : "NO");
        // FULL MESSAGES: Keep last 8 messages (recent conversation flow)
        // OLDER MESSAGES: Compress to summary instead of losing them
        const FULL_MESSAGE_WINDOW = 8;
        const recentMsgs = messages.slice(-FULL_MESSAGE_WINDOW);
        const olderMsgs = messages.slice(0, -FULL_MESSAGE_WINDOW);
        // Generate summary from older messages (simple compression)
        const conversationSummary = olderMsgs.length > 0
            ? compressToSummary(olderMsgs)
            : "";
        // Build context blocks to inject at the top of the system prompt
        const contextBlocks = [];
        if (memoryContext)
            contextBlocks.push(memoryContext);
        if (conversationSummary)
            contextBlocks.push(conversationSummary);
        // Inject all context blocks at once before personality
        if (contextBlocks.length > 0) {
            systemPrompt = contextBlocks.join("\n\n") + "\n\n" + systemPrompt;
        }
        // Inject personality instructions at the VERY BEGINNING so they set the tone
        // for the entire response and have maximum influence on the model.
        if (aiPersonality) {
            const personalityInstructions = buildPersonalityInstructions(aiPersonality, effectiveUserContext.analogyIntensity);
            systemPrompt = `--- PERSONALITY SETTINGS (HIGHEST PRIORITY) ---\n${personalityInstructions}\n--- END PERSONALITY ---\n\n${systemPrompt}`;
            console.log("[chat-stream] Personality instructions injected at top (highest priority)");
        }
        const fullSystemPrompt = systemPrompt;
        const primarySubject = userContext?.subjects?.[0];
        const isResearchMode = Boolean(userContext?.researchMode);
        // Smart task classification based on conversation content
        const chatTaskType = isSimpleGreeting
            ? "lightweight"
            : classifyTaskType(recentMsgs, primarySubject);
        // Token budgets — use model-specific limits for Qwen which supports longer outputs
        const selectedModelStr = userContext?.selectedModel || "";
        const isQwenModel = chatTaskType === "reasoning" || selectedModelStr.toLowerCase().includes("qwen");
        const OUTPUT_HARD_CAP = isQwenModel ? 4096 : 3000;
        const TOTAL_BUDGET = isQwenModel ? 16000 : 12000;
        const wantsLongResponse = isResearchMode || isFormalRequest ||
            /\b(detailed|comprehensive|essay|report|study guide|lesson plan|long answer)\b/i.test(latestUserMsg);
        const SYSTEM_BUDGET = 2200;
        const targetMaxTokens = isSimpleGreeting ? 300 : wantsLongResponse ? OUTPUT_HARD_CAP : (isQwenModel ? 4000 : 3000);
        // Build initial messages
        const finalMessages = [
            { role: "system", content: fullSystemPrompt },
            ...recentMsgs.filter(m => m.role !== "system"),
        ];
        const finalTotal = finalMessages.reduce((sum, m) => sum + m.content.length, 0);
        const finalEst = Math.ceil(finalTotal / 3.5) + targetMaxTokens;
        // Trim system prompt if over budget — preserve personality (at top), trim from end
        const systemPromptLength = fullSystemPrompt.length;
        const systemPromptTokens = Math.ceil(systemPromptLength / 3.5);
        if (finalEst > TOTAL_BUDGET && systemPromptTokens > SYSTEM_BUDGET) {
            console.log(`[chat-stream] Trimming system: ${systemPromptTokens}t → ${SYSTEM_BUDGET}t`);
            // Keep the first SYSTEM_BUDGET tokens (includes personality at top), truncate the rest
            const truncated = fullSystemPrompt.slice(0, SYSTEM_BUDGET * 3.5);
            finalMessages[0] = { role: "system", content: truncated + "\n[truncated]" };
        }
        // Final check. If a large conversation still exceeds budget after system
        // trimming, drop the oldest recent turns while preserving the latest user ask.
        let finalCheck = finalMessages.reduce((sum, m) => sum + m.content.length, 0);
        let finalCheckEst = Math.ceil(finalCheck / 3.5) + targetMaxTokens;
        let droppedRecentMessages = 0;
        while (finalCheckEst > TOTAL_BUDGET && finalMessages.length > 2) {
            finalMessages.splice(1, 1);
            droppedRecentMessages += 1;
            finalCheck = finalMessages.reduce((sum, m) => sum + m.content.length, 0);
            finalCheckEst = Math.ceil(finalCheck / 3.5) + targetMaxTokens;
        }
        if (droppedRecentMessages > 0) {
            console.log(`[chat-stream] Dropped ${droppedRecentMessages} old recent messages to fit token budget`);
        }
        const promptTokens = Math.ceil(finalCheck / 3.5);
        const maxAvailableOutputTokens = Math.max(300, TOTAL_BUDGET - promptTokens);
        const effectiveMaxTokens = Math.min(targetMaxTokens, maxAvailableOutputTokens);
        console.log(`[chat-stream] Final: ${finalCheckEst}t (budget: ${TOTAL_BUDGET}t, messages: ${recentMsgs.length} full + ${olderMsgs.length} summarized)`);
        const upstreamStream = await callGroqChatStream({
            messages: finalMessages,
            max_tokens: effectiveMaxTokens,
            temperature: isResearchMode ? 0.3 : 0.55,
        }, chatTaskType, userContext?.selectedModel || null);
        return new Response(upstreamStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        });
    }
    catch (error) {
        const message = formatError(error);
        console.error("[/api/groq/chat-stream] Error details:", {
            message,
            name: error instanceof Error ? error.name : "Unknown",
            stack: error instanceof Error ? error.stack : undefined,
        });
        // Determine appropriate status code based on error type
        const upstreamStatus = error && typeof error === "object" && "statusCode" in error
            ? Number(error.statusCode)
            : NaN;
        let statusCode = Number.isFinite(upstreamStatus) ? upstreamStatus : 500;
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
        else if (message.includes("AI service failed after trying all models")) {
            statusCode = 503;
            userMessage = "AI service unavailable. Please try again in a moment.";
        }
        else if (message.toLowerCase().includes("token") || message.toLowerCase().includes("length")) {
            statusCode = 400;
            userMessage = "Response limit reached - I'm capped at ~1900 tokens per response due to API rate limits (Groq's free tier allows ~6000 tokens/minute). This keeps responses fast and reliable. For longer content, try breaking your question into parts or ask me to continue in a follow-up message.";
        }
        return new Response(`data: ${JSON.stringify({ error: userMessage, code: statusCode })}\n\n`, { status: statusCode, headers: { "Content-Type": "text/event-stream" } });
    }
}
//# sourceMappingURL=route.js.map