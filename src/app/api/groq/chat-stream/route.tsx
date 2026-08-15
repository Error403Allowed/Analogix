import { callGroqChatStream, formatError, classifyTaskType, resolveModelForUser } from "../_utils";
import { createClient } from "@/lib/supabase/server";
import { buildCalendarContext } from "../_calendarContext";
import { listUserDocuments } from "@/lib/server/documents";
import { getUserAIPersonality, getRelevantMemories, buildMemoryContext, buildPersonalityInstructions } from "@/lib/aiMemory";
import type { AIPersonality } from "@/types/ai-personality";
import { buildValidSubjectsPrompt } from "@/lib/curriculum";
import { TOOL_LIST_DESCRIPTION } from "@/lib/tool-descriptions";
import { createCurriculumRetriever } from "@/lib/retrieval/curriculum";
import {
    detectContextIntents,
    fetchEnrolledSubjects,
    buildPerformanceContext,
    buildAchievementsContext,
    buildFlashcardContext,
    buildStudyStatsContext,
} from "@/lib/context/userContext";
export const runtime = "nodejs";
// Token estimation: ~4 chars per token for English text
const estimateTokens = (text: string) => Math.ceil(text.length / 4);
// Truncate workspace documents to fit within token budget
const truncateWorkspaceDocs = (allDocs: any[], maxTokens: number) => {
    const totalTokens = allDocs.reduce((sum: number, d: any) => sum + estimateTokens(d.preview + d.title + d.subjectId), 0);
    if (totalTokens <= maxTokens) {
        return { docs: allDocs, truncated: false };
    }
    const result: any[] = [];
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
const truncate = (text: string, max: number) => text.length > max ? text.slice(0, max) + "…" : text;
const getFirstSentence = (text: string) => {
    const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const firstPeriod = cleaned.indexOf(". ");
    if (firstPeriod > 0 && firstPeriod < 200) {
        return cleaned.slice(0, firstPeriod + 1);
    }
    return truncate(cleaned, 200);
};
const studyGuideToContext = (raw: string) => {
    try {
        const json = raw.slice(STUDY_GUIDE_PREFIX.length);
        const guide = JSON.parse(json);
        const parts: string[] = [];
        if (guide.title)
            parts.push(`Title: ${guide.title}`);
        if (guide.overview)
            parts.push(`Overview: ${guide.overview}`);
        if (Array.isArray(guide.keyPoints) && guide.keyPoints.length)
            parts.push(`Key Points:\n${guide.keyPoints.map((p: any) => `  • ${p}`).join("\n")}`);
        if (Array.isArray(guide.keyConcepts) && guide.keyConcepts.length)
            parts.push(`Key Concepts:\n${guide.keyConcepts.map((c: any) => `  • ${c.title}: ${c.content}`).join("\n")}`);
        if (guide.keyTable && Array.isArray(guide.keyTable.rows)) {
            const kt = guide.keyTable;
            parts.push(`Key Table headers: ${kt.headers.join(", ")}\n  rows:\n${kt.rows.map((r: any) => "    " + r.join(" | ")).join("\n")}`);
        }
        if (Array.isArray(guide.practiceQuestions) && guide.practiceQuestions.length)
            parts.push(`Practice Questions:\n${guide.practiceQuestions.map((q: any, i: number) => `  Q${i + 1}: ${q.question}`).join("\n")}`);
        if (Array.isArray(guide.tips) && guide.tips.length)
            parts.push(`Tips:\n${guide.tips.map((t: any) => `  • ${t}`).join("\n")}`);
        return parts.join("\n\n");
    }
    catch {
        return "(study guide - unreadable)";
    }
};
const formatResearchSources = (sources: any[]) => {
    const truncateText = (text: string, max = 360) => text.length > max ? text.slice(0, max).trim() + "…" : text.trim();
    return sources.map((s: any, i: number) => {
        const authors = s.authors?.slice(0, 4).join(", ") || "Unknown authors";
        const year = s.year ? String(s.year) : "n.d.";
        const venue = s.venue ? ` - ${s.venue}` : "";
        const link = s.url || s.pdfUrl || "No link";
        const abstract = s.abstract ? `\nAbstract: ${truncateText(s.abstract)}` : "";
        const localNote = s.source === "local" ? "\nNote: Full text is included in the user's attached files." : "";
        return `[${i + 1}] ${s.title}\nAuthors: ${authors} (${year})${venue}\nLink: ${link}${abstract}${localNote}`;
    }).join("\n\n");
};
// Simple client-side summary compression for older messages
const compressToSummary = (msgs: any[]) => {
    if (msgs.length === 0)
        return "";
    // Extract key info from user messages: topics, goals, blockers
    const userMsgs = msgs.filter((m: any) => m.role === "user");
    const topics: string[] = [];
    userMsgs.forEach((m: any) => {
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
    const summaryParts: string[] = [];
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
// The visualisation guide is a large (~1500 token) block describing the Desmos,
// Recharts, and Three.js output formats. It is ONLY needed when the student's
// latest message asks for a visual - omitting it keeps requests well under the
// Groq TPM cap (8000 tokens) and frees output budget for the actual answer.
const VISUAL_INTENT_RE = /\b(graphs?|plots?|charts?|visuali[sz]e|visuali[sz]ation|visuals?|diagrams?|3d|three-?dimensional|timeline|render|sketch)\b/i;
function wantsVisualisation(messages: any): boolean {
    const latestUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    return VISUAL_INTENT_RE.test(latestUserMsg);
}
function buildSystemPrompt(userContext: any, messages: any, workspaceContext: any, calendarContext: any, studentName?: string, extraDataContext?: string) {
    const analogyIntensity = userContext?.analogyIntensity ?? 1;
    const studentGrade = userContext?.grade || "7-12";
    const studentState = userContext?.state || null;
    const profileName = studentName || userContext?.name || null;
    const STATE_FULL_NAMES = {
        NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
        WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
        ACT: "Australian Capital Territory", NT: "Northern Territory",
    };
    const stateFullName = studentState ? ((STATE_FULL_NAMES as Record<string, string>)[studentState] || studentState) : null;
    const curriculumContext = stateFullName
        ? `The student is in Year ${studentGrade} in ${stateFullName} (${studentState}), Australia. Always align explanations, examples, terminology, and curriculum references to the ${stateFullName} syllabus and Australian educational standards for Year ${studentGrade}. Use Australian spelling and terminology (e.g. "maths" not "math", "Year" not "Grade").`
        : `The student is in Year ${studentGrade} in Australia. Always align explanations to the Australian curriculum for Year ${studentGrade}. Use Australian spelling and terminology.`;
    const interestList = userContext?.hobbies?.filter(Boolean) ?? [];
    const structuredInterests = (userContext?.interests && typeof userContext.interests === "object") ? userContext.interests : null;
    const interestsByCategory = structuredInterests?.byCategory;
    const structuredTags = structuredInterests?.tags;
    const hasStructuredInterests = !!(interestsByCategory && Object.keys(interestsByCategory).length > 0);
    // When the client sends the structured interests object, trust ONLY it - it
    // may be intentionally empty (student has no hobbies on file). Never layer
    // a flat-list fallback on top and invent interests for them.
    const usesStructured = !!structuredInterests;
    const hasInterests = usesStructured
        ? hasStructuredInterests || (structuredTags?.length ?? 0) > 0
        : interestList.length > 0;
    const interestsObjectBlock = usesStructured
        ? hasStructuredInterests
            ? JSON.stringify(interestsByCategory, null, 2)
            : (structuredTags?.length ?? 0) > 0
                ? JSON.stringify(structuredTags, null, 2)
                : ""
        : hasInterests
            ? JSON.stringify(interestList, null, 2)
            : "";
    const analogyAnchor = userContext?.analogyAnchor?.trim() || null;
    const anchorInstruction = analogyAnchor
        ? `\nACTIVE INTEREST: the student's question just referenced "${analogyAnchor}" - use that specific interest to make the explanation concrete and familiar. Map the concept onto it and keep returning to it.`
        : hasInterests
            ? "\nWhen an explanation needs an everyday comparison to land, pull it from the student's interests below - never invent a generic one if one of theirs fits."
            : "";
    const interestGuidance = [
        "SCHOOL MODE: This student wants responses tailored for school/assessment purposes. Be formal, precise, and curriculum-aligned. Use correct subject-specific terminology. Structure answers the way a teacher or marker would expect. No personal-interest asides, no casual tone.",
        "SCHOOL MODE: Formal, precise responses for school. Skip personal-interest framing; keep examples subject-based only.",
        "STANDARD LEARNING: Explain directly and clearly first. Bring in the student's interests only when a comparison genuinely makes a tricky idea click - light touch, never forced.",
        "Learning mode: make abstract ideas concrete by tying them to things the student already cares about. When relevant, frame the concept through their interests (a game mechanic, a sport moment, a song loop, a recipe) and carry that framing through the explanation.",
        "Learning mode: use the student's interests as your primary way to make concepts concrete. Pick ONE specific interest from the object below and run the explanation through it - map each part of the concept onto that interest and keep returning to it. Don't pad with generic examples.",
        "Maximum personalisation: anchor the entire explanation in one vivid, specific scene from the student's interests - a particular game, match, song, or moment. Map every part of the concept onto that scene, step by step. NEVER fall back to generic examples (landscapes, factories, libraries) when one of the student's interests fits better.",
    ][Math.min(analogyIntensity, 5)];
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
    const validSubjectsPrompt = buildValidSubjectsPrompt();
    const subjects = userContext?.subjects || [];
    const userSubjectsContext = subjects.length > 0
        ? `\n\nCRITICAL - USER'S ENROLLED SUBJECTS:\nThe user's subjects are: ${subjects.join(", ")}.\nYou MUST use ONLY these subject IDs when calling any tool that requires a subject_id. Never create new subjects or use subject IDs not in this list. If the user asks for something in a subject not in this list, respond conversationally and explain they need to add that subject first.`
        : "";

    const toolCapabilitiesSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CAPABILITIES (TOOLS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are connected to the Analogix MCP server - a set of tool servers that can read and write the student's REAL app data (flashcards, documents, quizzes, events, deadlines, subjects). These are working tools, not conversation topics. Detect when the student asks to DO something with their data and emit TOOL_CALLS accordingly.
When the user explicitly asks to CREATE, EDIT, UPDATE, MODIFY, CHANGE, ADD, REMOVE, DELETE, or VIEW their data, you MUST output TOOL_CALLS: at the end of your response with the correct tool name and all required arguments.

HARD RULE: NEVER generate a quiz, flashcards, or any interactive study content inside the chat. Always use the real create tool. The user wants actual data created in the app, not simulated content in the conversation.

RULES:
1. When the user explicitly asks to create, edit, update, modify, remove, delete, or view data - output ONLY TOOL_CALLS at the end. No conversational text before it.
2. "Create flashcards about X", "add cards to my mitosis set", "edit that flashcard", "remove that flashcard", "update my biology notes", "delete that document", "change my exam", "show my events", "list my documents" ARE explicit - emit TOOL_CALLS with no preamble.
3. "Quiz me on algebra", "start a quiz on derivatives", "test me on cell biology", "make a quiz about polynomials" ARE ALL explicit - emit TOOL_CALLS with create_quiz. Do NOT write quiz questions in the chat.
4. "I need to..." or "I have to..." are NOT explicit - just respond conversationally, no TOOL_CALLS.
5. Never mention tool names to the user. Never say "I'll use X", "you can use X", "let me X". The tool card is invisible to the user.
6. Always fill in ALL required arguments with real values. Never leave args empty.
7. CRITICAL: Use the EXACT tool name from below. Wrong names fail silently.
8. For reads (list, get, show): emit TOOL_CALLS the same way.

${TOOL_LIST_DESCRIPTION}
${validSubjectsPrompt}
${userSubjectsContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    const workspaceSection = workspaceContext || calendarContext || extraDataContext ? `
${calendarContext ? `━━━ CALENDAR & DEADLINES ━━━\n${calendarContext}\n━━━ END CALENDAR ━━━\n` : ""}
${extraDataContext ? `━━━ YOUR DATA (from your Analogix workspace) ━━━
This is real data from the student's account. Use it to answer instead of asking them for information you can look up. Do not invent numbers that aren't listed here; if the data doesn't cover the question, say so or ask only for what's genuinely missing.
 
${extraDataContext}
━━━ END YOUR DATA ━━━
` : ""}
${workspaceContext ? `━━━ YOUR WORKSPACE ━━━
You have access to this student's documents for context AND can create, edit, or delete documents when the student asks.

${workspaceContext}
━━━ END WORKSPACE ━━━
` : ""}` : "";
    const showVisualisations = wantsVisualisation(messages);
    const visualisationGuide = showVisualisations ? `Visualisations - you have THREE tools to make concepts visual and memorable:

  1. DESMOS GRAPHS (for any math visualisation):
    When the user asks to graph, plot, or visualise ANY equation, function, inequality, or mathematical concept, you MUST output a code block with language "desmos". Desmos supports:
    ─ Functions: y = x^2 - 4*x + 3, y = sin(x), y = 3*cos(2*x)
    ─ Implicit equations: x^2 + y^2 = 25
    ─ Inequalities: y > 2*x, x^2 + y^2 < 16, y >= x^2
    ─ Parametric: (cos(t), sin(t))  (Desmos auto-uses variable t for parametrics)
    ─ Points: (1, 2), (-3, 5)
    ─ Regression: y1 ~ m*x1 + b  (use x1/y1 or x2/y2 pattern for table regression)
    ─ Sliders: a = 3  (Defining a variable with no function creates an interactive slider)
    ─ Tables / lists: a = [1, 2, 3, 4, 5], plot: (n, n^2) for n=[1..10]  (Use [1..10] range syntax)
    ─ Drag points: DraggablePoint((h, k)) creates a draggable point on the graph
    ─ For any expression you write, you can assign it to a variable and reuse it later: f(x) = x^2, g(x) = f(x) + 5
    ─ Viewport: add [bounds: left, right, bottom, top] on its own line to zoom to a specific range
    Format: \`\`\`desmos
    y = x^2 - 4*x + 3
    y = 2*x + 1
    [bounds: -10, 10, -5, 15]
    \`\`\`
    Rules:
    - Put ONLY the expression(s) inside the code block - one per line.
    - Use * for multiplication (e.g. 2*x not 2x, 4*x^2 not 4x^2).
    - Use ^ for exponentiation, / for division.
    - Math functions: sin, cos, tan, arcsin, arccos, arctan, sinh, cosh, tanh, sqrt, ln, log, abs, floor, ceil, exp, sign, nthroot.
    - ALL expressions use Desmos syntax, NOT LaTeX. Write "1/2" not "\\frac{1}{2}", "sqrt(x)" not "\\sqrt{x}".
    - NEVER output a desmos.com URL. NEVER say "copy this link". NEVER describe the graph instead of showing it.
    - After the code block, you may briefly describe key features (vertex, intercepts, domain/range, etc.).
    Use for: any math function, equation, inequality, system of equations, transformation, parametric, conic sections, statistics plots.

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
     - The block MUST be valid JSON only - NO imports, NO React components, NO JSX, NO chart.js, NO function definitions.
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

` : "";
    return `You are "Analogix AI", an AI tutor for Australian students. Your core job is to help students understand concepts and succeed in their studies.

VOICE & STYLE - BE A HUMAN TUTOR, NOT A CHATBOT:
- Talk like a great real-life tutor: warm, friendly, and relaxed. Imagine you're helping them one-on-one at a desk, not writing a textbook. Never sound like a search engine or a corporate help-desk bot.
- Every reply should feel like natural conversation. Write the way you'd speak: casual contractions ("you'll", "that's", "let's"), short sentences, and a genuine, encouraging tone.
- Address the student in a natural, personal way. ${profileName ? `You know their name is ${profileName} - use it occasionally ("Let's break this down together, ${profileName}"), not in every message.` : ""} Weave in their interests naturally whenever it helps the idea land - a Rocket League fan gets a boost/positioning comparison, a football fan gets a match-day moment, a music fan gets a beat/loop idea. Don't force interests into every answer; only where they genuinely help. Show you remember who they are across messages.
- CONVERSATION FIRST, STRUCTURE SECOND: Do NOT structure every response the same way. Match the shape of your reply to the question. A quick question ("why is water wet?") gets a quick, friendly answer - not five headings. A hard concept they're stuck on gets a calm, clear walkthrough. Vary your format between messages so nothing feels templated.
- KEEP IT SIMPLE, MATCH THEIR LEVEL: This student is in Year ${studentGrade}. Talk to them exactly like a great high-school teacher who knows their year level - not like a university lecturer and not like a dictionary. Rules that matter more than anything else here:
  - Picture the student across from you. Every sentence should be something you'd actually say out loud to a Year ${studentGrade} student.
  - When you MUST use a technical term (integral, antiderivative, allele, enthalpy...), explain the word in plain everyday language THE FIRST TIME you use it, in the same breath: "an integral, which is just adding up a huge number of tiny slices".
  - Define how to measure: for a Year ${studentGrade}, that means short sentences, everyday vocabulary, one idea at a time, and simple concrete examples before any symbolism. Avoid "infinitesimal", "net accumulation", "asymptotically", "distributed continuous fields" and similar university wording unless the idea is impossible to express more simply.
  - If the student had to look up three words in your answer, you've done it wrong - simplify.
  - Formal notation ($\\int$, $dx$, $F'(x)$) only after the plain-language explanation has landed, and only when the maths genuinely needs it.
- Ask before dumping: when a topic is big, check in with the student ("Want me to go deeper on X, or would a quick example help more?") and let the conversation flow rather than force-feeding everything at once.
- Skip the robotic filler: no "Great question!", no "As an AI assistant...", no "I'd be happy to help you with that!", no bullet-point-everything reflex. NO decorative dividers ("━━━", "---", "***", "====") intro or between sections - this is a hard rule. Use plain flowing paragraphs and short headers only if structure genuinely helps. Over-structured replies look machine-written and kill learning. No "Let's work through this together!" canned openers - just answer naturally.
- Keep prose natural and readable. Short paragraphs over walls of text, but still go deep where the question deserves it. A little warmth and humour is fine and welcome.
- School work still needs to be clear and correct: conversational doesn't mean sloppy. Good structure when a topic genuinely needs it (steps, comparisons, a worked example) - just let the topic drive the structure instead of a fixed template.

Context: Year ${studentGrade}${stateFullName ? ` in ${stateFullName}` : ""}, Australia. ${curriculumContext}
${calendarContext ? `When the user asks about their schedule, events, deadlines, or what's coming up, use the CALENDAR & DEADLINES section below to give accurate, specific answers. Keep it conversational - just tell them what's next naturally.` : ''}

${analogyIntensity === 0 ? `MODE: School/Assessment - formal, precise, no personal-interest examples.` :
        `Learning Mode - ${interestGuidance}${anchorInstruction}`}
${interestsObjectBlock ? `STUDENT INTERESTS (structured object - your source for everyday examples and comparisons; pick from these, never invent):
${interestsObjectBlock}` : ""}

Rules:
- USE PROVIDED USER DATA: You are given real data about this student in the profile (subjects, year, state, interests), memory, CALENDAR & DEADLINES, YOUR DATA, and YOUR WORKSPACE sections. When the student asks about their own schedule, subjects, quiz results, weak areas, achievements, flashcards, or documents, answer from this data rather than asking them for it. Do not make up facts, numbers, or events that aren't in the sections - if the data is missing what you need, say so and offer to look it up (or use a read tool) instead of guessing or asking the student to re-supply it. Only ask the student for something when you genuinely cannot see it anywhere (e.g. personal preferences not on file).
- PERSONALISE WITH MEMORY: A "[Memory] ..." block at the very start of your system prompt lists facts about this student (their likes, goals, weak areas, study habits). Use it actively: address a preference when relevant, build examples around it, and avoid re-explaining things you know they already understand. If no [Memory] block is present, personalise using the profile context instead.
- When user asks about schedule, classes, events, deadlines, or "what's next" - check the calendar context and give a natural, conversational answer (not a list).
- Make sure all your responses reflect the values and outcomes/requirements of the ACARA curriculum. Do not force the curriculum informaiton on the student, but make sure you frame your response to be ACARA-worthy. 
- IMPORTANT: When the CURRICULUM CONTENT section above includes specific curriculum codes (e.g. AC9M8G03), topics, or descriptions, use them as authoritative references in your response to guide the level and terminology - but reference codes naturally and sparingly. Don't litter every answer with ACARA codes, notations, or syllabus jargon; weave the content in at a level the student will actually understand. Only name a curriculum code when it genuinely helps the student (e.g. they mention an exam, an assignment brief, or a syllabus dot point).
- LATEX WITH JUDGEMENT: Use LaTeX ($...$ for inline, $$...$$ for display) for proper mathematical expressions, equations, formulas, and scientific notation when maths is genuinely the point - e.g. solving an equation, showing working, physics/chemistry formulas, $\\frac{3}{4}$, $x^2 + 2x - 5 = 0$. Use PLAIN TEXT for conversational numbers and simple arithmetic that don't need typesetting - 25%, "x = 5", "6 hours", "half of 30 is 15", times like 8:30am. Do NOT wrap ordinary numbers, measurements, clock times, or simple amounts in LaTeX just because they're numeric - that makes simple answers look like a university paper and overwhelms a ${studentGrade === "7-12" ? `student` : `Year ${studentGrade} student`}. Only reach for display equations/system of notation when a concept genuinely needs the formal treatment.
- VALID LATEX ONLY (the renderer uses KaTeX): Never hallucinate or guess LaTeX commands. Only output well-formed, standard LaTeX that KaTeX actually supports. You MUST follow these rules or the maths will render as raw broken text:
  - Always balance delimiters: every $ must be closed with $, every $$ with $$. Never leave an unclosed $ or $$.
  - NEVER use the alignment character & or the line-break \\\\ OUTSIDE a proper math environment. The & and \\\\ ONLY work inside \\begin{aligned}, \\begin{cases}, \\begin{matrix}, \\begin{pmatrix}, etc. Inside a bare $$...$$ block they will fail to render. To write multi-line or multi-column equations, wrap them in \\begin{aligned}...\\end{aligned} or \\begin{cases}...\\end{cases} INSIDE the $$ block.
  - NEVER write \\begin{align}, \\begin{equation}, \\begin{align*} etc. directly - use \\begin{aligned} (supported inside $$) instead. Unsupported environments render as raw text.
  - Use standard commands only: \\frac, \\sqrt, \\times, \\div, \\pm, \\approx, \\leq, \\geq, \\sum, \\int, \\pi, \\theta, \\Delta, \\alpha, \\beta, \\rightarrow, \\text{...}, \\cdot, \\cdot, ^{}, _{}, \\, \\left(...\\right), \\overline, \\bar. If you're not sure a command exists in KaTeX, don't use it - find a simpler valid alternative.
  - Never paste a raw formula you were given without checking it is valid. If the student pastes broken LaTeX, silently fix it to valid, renderable LaTeX and present it properly - do NOT lecture them about LaTeX syntax rules.
  - For subscripts/superscripts with multiple characters, always group them: x^{2}, v_{final}, not x^2 (fine for single char) - prefer explicit braces for clarity.
- CHARTS: If the user asks for a graph, chart, or visualisation of data, use the Recharts format described at the end of this prompt to create an interactive chart. Make sure this chart can render accurately and properly on the frontend. 
- DESMOS: If the user asks for a graph of a mathematical function, equation, or inequality, you MUST output a \`\`\`desmos code block with the equation(s). NEVER output a URL or just describe the graph.
- 3D VISUALISATIONS: For complex concepts, structures, systems, or relationships (e.g. solar system, atomic structure, biological processes, networks), use the Three.js format described at the end of this prompt to create an interactive 3D scene that illustrates the concept.
- NOTE: If asked to write something very long (essays, reports, etc.), explain that responses are capped at roughly ${isQwenModel ? '8000' : '4000'} tokens per reply, but offer to continue in a follow-up message.${workspaceSection}${toolCapabilitiesSection}
${researchBlock}

${visualisationGuide}
IMPORTANT: If the user asks for a visual, diagram, or graph - use the right tool. Math functions → Desmos. Data/statistics → Recharts. Concepts/structures → Three.js. Don't just describe it - SHOW it.
- Analogix`;
}
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const messages = body.messages || [];
        let userContext = body.userContext || {};

        // Get personality and memory from database or localStorage
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // ========================================================================
        // INTENT DETECTION: Check if this is a tool intent before streaming
        let aiPersonality: AIPersonality | null = null;
        let memoryContext = "";
        let studentName: string | null = null;
        // Client-side "x-client-data" is always sent by the chat UI (it contains localStorage
        // personality/memories). Even if the user is authenticated, merging these values ensures
        // the next response reflects the latest UI toggles immediately.
        const ALLOWED_PERSONALITY_OVERRIDES = new Set([
            "analogy_frequency", "detail_level", "verbosity", "creativity", "tone", "focus"
        ]);
        const clientData = request.headers.get("x-client-data");
        let clientPersonality: any = null;
        let clientMemories: any[] | null = null;
        if (clientData) {
            try {
                const parsed = JSON.parse(clientData);
                const safePersonality: Record<string, unknown> = {};
                if (parsed.personality && typeof parsed.personality === "object") {
                    for (const key of Object.keys(parsed.personality)) {
                        if (ALLOWED_PERSONALITY_OVERRIDES.has(key)) {
                            safePersonality[key] = (parsed.personality as Record<string, unknown>)[key];
                        }
                    }
                    clientPersonality = safePersonality;
                }
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
            // Fetch student's display name from profile so the tutor can address them personally
            try {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("name")
                    .eq("id", user.id)
                    .single();
                studentName = profile?.name || null;
            }
            catch (e) {
                console.warn("[chat-stream] Failed to fetch profile name:", e instanceof Error ? e.message : e);
            }
            // Merge client personality over DB personality (client wins)
            if (clientPersonality) {
                aiPersonality = { ...(aiPersonality ?? {}), ...clientPersonality };
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
        // Detect simple/greeting messages early - skip workspace loading entirely for speed
        const isSimpleGreeting = (() => {
            const userMsgs = messages.filter((m: any) => m.role === "user");
            if (userMsgs.length !== 1)
                return false;
            const c = userMsgs[0].content.toLowerCase().trim();
            if (c.length > 60)
                return false;
            return /^(hi|hello|hey|sup|yo|g'day|howdy|hiya|heya|thanks?|bye|good\s?(morning|evening|afternoon)|what'?s up|how are you)[\s!?.]*$/.test(c);
        })();
        // ── Load workspace context from Supabase (same as agent route) ──────────
        // Context is loaded ON DEMAND: we classify the latest user message and only
        // fetch the data scopes it actually needs (calendar, documents, quiz
        // performance, achievements, flashcards). The student's enrolled subjects
        // are always resolved so the tutor never has to ask what they study.
        let workspaceContext;
        let calendarCtx;
        let extraDataContext = "";
        let enrolledSubjects: string[] = [];
        if (!isSimpleGreeting) {
            try {
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const intents = detectContextIntents(latestUserMsg);
                    // Always resolve the full enrolled subject list so the prompt's
                    // "USER'S ENROLLED SUBJECTS" block reflects reality, not just the
                    // chat's currently-selected subject.
                    try {
                        const clientSubjects = Array.isArray(userContext?.subjects) ? userContext.subjects : [];
                        enrolledSubjects = await fetchEnrolledSubjects(supabase, user.id, clientSubjects);
                    }
                    catch (e) {
                        console.warn("[chat-stream] Failed to resolve enrolled subjects:", e instanceof Error ? e.message : e);
                    }
                    // Calendar only when the message is about schedule/events/deadlines
                    if (intents.calendar) {
                        calendarCtx = await buildCalendarContext(supabase, user.id).catch(() => "");
                    }
                    // Documents only when the message references their notes/workspace
                    if (intents.documents) {
                        const documents = await listUserDocuments(supabase, user.id);
                        if (documents.length > 0) {
                            const allDocs: any[] = [];
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
                                const docContext = truncatedDocs.map((d: any) => `[${d.subjectId.toUpperCase()} - ${d.type}: "${d.title}"]\n${d.preview}`).join("\n\n---\n\n");
                                const docIndex = truncatedDocs.map((d: any) => `  • "${d.title}" [${d.type}] subjectId="${d.subjectId}"`).join("\n");
                                workspaceContext = `Document Index:\n${docIndex}\n\nDocument Contents:\n${docContext}`;
                            }
                        }
                    }
                    // On-demand data blocks: quiz performance, achievements, flashcards,
                    // study stats. Each is built ONLY when the message needs it.
                    const dataParts: string[] = [];
                    const [performanceCtx, achievementsCtx, flashcardsCtx, statsCtx] = await Promise.all([
                        intents.performance ? buildPerformanceContext(supabase, user.id).catch(() => "") : Promise.resolve(""),
                        intents.achievements ? buildAchievementsContext(supabase, user.id).catch(() => "") : Promise.resolve(""),
                        intents.flashcards ? buildFlashcardContext(supabase, user.id).catch(() => "") : Promise.resolve(""),
                        (intents.performance || intents.achievements) ? buildStudyStatsContext(supabase, user.id).catch(() => "") : Promise.resolve(""),
                    ]);
                    if (performanceCtx) dataParts.push(performanceCtx);
                    if (achievementsCtx) dataParts.push(achievementsCtx);
                    if (flashcardsCtx) dataParts.push(flashcardsCtx);
                    if (statsCtx) dataParts.push(statsCtx);
                    extraDataContext = dataParts.join("\n\n");
                    // ── Curriculum RAG ───────────────────────────────────────
                    try {
                        console.log("[chat-stream] curriculum RAG: retrieving for query:", latestUserMsg.slice(0, 60));
                        const curriculumRetriever = createCurriculumRetriever();
                        const curriculumResults = await curriculumRetriever.retrieve(latestUserMsg, {}, 5);
                        console.log("[chat-stream] curriculum RAG: got", curriculumResults.length, "results");
                        if (curriculumResults.length > 0) {
                            const curriculumSection = curriculumRetriever.formatContext(curriculumResults);
                            const curriculumBlock = `\n\n━━━ CURRICULUM CONTENT ━━━\n${curriculumSection}\n━━━ END CURRICULUM ━━━`;
                            workspaceContext = workspaceContext
                                ? workspaceContext + curriculumBlock
                                : `Curriculum Content:\n${curriculumSection}`;
                        }
                    } catch (curriculumErr) {
                        console.warn("[chat-stream] curriculum RAG failed:", curriculumErr instanceof Error ? curriculumErr.message : curriculumErr);
                    }
                }
            }
            catch (err) {
                // Workspace loading failed - continue without it (non-fatal)
                console.warn("[chat-stream] workspace load failed:", err instanceof Error ? err.message : err);
            }
        } // end !isSimpleGreeting
        // Reuse latestUserMsg from earlier for formal request detection
        const isFormalRequest = /^(write|essay|assignment|report|piece|report|article|paragraph|analysis|critique|review|composition)/.test(latestUserMsg.toLowerCase()) ||
            latestUserMsg.toLowerCase().includes("essay on") ||
            latestUserMsg.toLowerCase().includes("write an") ||
            latestUserMsg.toLowerCase().includes("assign") ||
            latestUserMsg.toLowerCase().includes("composition");
        // Subjects sent from the user's enrolled list (onboarding + client-selected)
        // power the "USER'S ENROLLED SUBJECTS" block below. Merge the full enrolled
        // list (resolved server-side) with the chat's currently-selected subject so
        // the tutor knows everything the student studies, while keeping the active
        // chat subject first for task classification.
        if (enrolledSubjects.length > 0) {
            const clientSubjects = Array.isArray(userContext.subjects) ? userContext.subjects : [];
            const merged = [...clientSubjects, ...enrolledSubjects.filter((s: string) => !clientSubjects.includes(s))];
            if (merged.length > 0) {
                userContext = { ...userContext, subjects: merged };
            }
        }
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
        let systemPrompt = buildSystemPrompt(effectiveUserContext, messages, workspaceContext, calendarCtx, studentName ?? undefined, extraDataContext);
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
        const contextBlocks: string[] = [];
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
        // Token budgets - use model-specific limits for Qwen which supports longer outputs
        const selectedModelStr = userContext?.selectedModel || "";
        const resolvedModel = resolveModelForUser(selectedModelStr || null);
        // Qwen is a reasoning model: its <think> block and the final answer share the
        // output budget, so give it room (8k) or the answer gets truncated mid-thought.
        const isQwenModel = chatTaskType === "reasoning" || resolvedModel.toLowerCase().includes("qwen");
        const OUTPUT_HARD_CAP = isQwenModel ? 8192 : 4096;
        // NOTE: the Groq org TPM cap is 8000, so the total request (input + output)
        // must stay well under that. The system prompt alone is ~5k tokens, leaving
        // little room - never budget for more than ~7000 tokens total.
        const TOTAL_BUDGET = 7000;
        const wantsLongResponse = isResearchMode || isFormalRequest ||
            /\b(detailed|comprehensive|essay|report|study guide|lesson plan|long answer)\b/i.test(latestUserMsg);
        const SYSTEM_BUDGET = 2200;
        const targetMaxTokens = isSimpleGreeting ? 300 : wantsLongResponse ? OUTPUT_HARD_CAP : (isQwenModel ? 8000 : 4096);
        // NOTE: the Groq org TPM cap is 8000. Every estimate below uses ~4.5
        // chars/token, which is deliberately conservative (the prompt measures
        // ~5.6 chars/token in practice), so staying under TOTAL_BUDGET keeps the
        // real request comfortably under the hard cap. Output is budgeted FIRST -
        // only if even a small reply does not fit do we start stripping input.
        const systemPromptTokens = Math.ceil(fullSystemPrompt.length / 4.5);
        const estimateTotal = (messages: { content: string }[], outputTokens: number) =>
            Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4.5) + outputTokens;
        // Thinking models (Qwen) spend their output budget on BOTH the hidden
        // reasoning pass and the visible answer. When that budget is tight the
        // model can use it all thinking and the final answer is truncated without
        // any error signal. Reserve a floor for the answer and free up input room
        // to reach it so reasoning never silently swallows the response.
        const thinkingAnswerFloor = isQwenModel ? 2000 : 512;
        const stripTailBlocks = (prompt: string) => {
            const importantIdx = prompt.indexOf("\nIMPORTANT: If the user asks for a visual");
            if (importantIdx === -1)
                return prompt;
            let cutStart = -1;
            const researchMarker = prompt.lastIndexOf("\n\nRESEARCH MODE (ACADEMIC SOURCES ONLY):", importantIdx);
            const visualMarker = prompt.lastIndexOf("Visualisations - you have THREE tools", importantIdx);
            if (researchMarker !== -1)
                cutStart = cutStart === -1 ? researchMarker : Math.min(cutStart, researchMarker);
            if (visualMarker !== -1 && !wantsVisualisation(recentMsgs))
                cutStart = cutStart === -1 ? visualMarker : Math.min(cutStart, visualMarker);
            if (cutStart === -1)
                return prompt;
            return prompt.slice(0, cutStart) + prompt.slice(importantIdx);
        };
        // 1) For reasoning models, strip expendable system tail blocks FIRST so
        //    the output budget (reasoning + answer) has as much room as possible.
        //    Do NOT strip the visualisation guide when the user explicitly asked
        //    for a visual - it is the point of the request.
        let workingSystemPrompt = fullSystemPrompt;
        if (isQwenModel && systemPromptTokens > SYSTEM_BUDGET) {
            const stripped = stripTailBlocks(fullSystemPrompt);
            if (stripped.length < fullSystemPrompt.length) {
                console.log(`[chat-stream] System trimmed for thinking model: ${systemPromptTokens}t → ${Math.ceil(stripped.length / 4.5)}t (stripped optional blocks)`);
                workingSystemPrompt = stripped;
            }
        }
        const finalMessages = [
            { role: "system", content: workingSystemPrompt },
            ...recentMsgs.filter((m: any) => m.role !== "system"),
        ];
        let effectiveMaxTokens = targetMaxTokens;
        let currentEst = estimateTotal(finalMessages, targetMaxTokens);
        // 2) Cap output to fit the hard request budget, but never drop below the
        //    answer floor. If the prompt alone is too big for even a floor-sized
        //    reply, the drop-old-turns loop below reclaims input room.
        if (currentEst > TOTAL_BUDGET) {
            const availableForOutput = TOTAL_BUDGET - (currentEst - targetMaxTokens);
            effectiveMaxTokens = Math.max(thinkingAnswerFloor, Math.min(targetMaxTokens, availableForOutput));
            currentEst = estimateTotal(finalMessages, effectiveMaxTokens);
        }
        // 3) If the conversation is still over budget, drop the oldest recent
        //    turns while preserving the latest user ask. For thinking models keep
        //    dropping until the answer floor actually fits in the request budget.
        let droppedRecentMessages = 0;
        while (finalMessages.length > 2 &&
               (estimateTotal(finalMessages, effectiveMaxTokens) > TOTAL_BUDGET ||
                (isQwenModel && effectiveMaxTokens < thinkingAnswerFloor))) {
            finalMessages.splice(1, 1);
            droppedRecentMessages += 1;
            const availableForOutput = TOTAL_BUDGET - estimateTotal(finalMessages, 0);
            effectiveMaxTokens = Math.max(thinkingAnswerFloor, Math.min(targetMaxTokens, availableForOutput));
            currentEst = estimateTotal(finalMessages, effectiveMaxTokens);
        }
        if (droppedRecentMessages > 0) {
            console.log(`[chat-stream] Dropped ${droppedRecentMessages} old recent messages to fit token budget`);
        }
        const promptTokens = Math.ceil(finalMessages.reduce((sum, m) => sum + m.content.length, 0) / 4.5);
        effectiveMaxTokens = Math.min(effectiveMaxTokens, Math.max(thinkingAnswerFloor, TOTAL_BUDGET - promptTokens));
        console.log(`[chat-stream] Final: ${currentEst}t (budget: ${TOTAL_BUDGET}t, output cap: ${effectiveMaxTokens}t, messages: ${recentMsgs.length} full + ${olderMsgs.length} summarized)`);
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
            userMessage = "Request too large - this request exceeds the AI provider's per-minute token limit. Try shortening your question, attaching fewer files, or starting a new chat.";
        }
        return new Response(`data: ${JSON.stringify({ error: userMessage, code: statusCode })}\n\n`, { status: statusCode, headers: { "Content-Type": "text/event-stream" } });
    }
}
//# sourceMappingURL=route.js.map