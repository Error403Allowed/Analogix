import { callGroqChatStream, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";
import { getFormulaSheetContext } from "@/data/formulaSheets";
import { createClient } from "@/lib/supabase/server";
import { buildCalendarContext } from "../_calendarContext";
import { listUserDocuments } from "@/lib/server/documents";
import type { ResearchSource } from "@/types/research";
import { getUserAIPersonality, getRelevantMemories, buildMemoryContext, buildPersonalityInstructions } from "@/lib/aiMemory";
import type { AIPersonality, AIMemoryFragment } from "@/types/ai-personality";

export const runtime = "nodejs";

// Token estimation: ~4 chars per token for English text
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Truncate workspace documents to fit within token budget
const truncateWorkspaceDocs = (
  allDocs: Array<{ subjectId: string; title: string; type: string; preview: string }>,
  maxTokens: number
): { docs: typeof allDocs; truncated: boolean } => {
  const totalTokens = allDocs.reduce((sum, d) => sum + estimateTokens(d.preview + d.title + d.subjectId), 0);
  
  if (totalTokens <= maxTokens) {
    return { docs: allDocs, truncated: false };
  }

  const result: typeof allDocs = [];
  let runningTokens = 0;
  let truncated = false;

  for (const doc of allDocs) {
    const docTokens = estimateTokens(doc.preview + doc.title + doc.subjectId);
    
    if (runningTokens + docTokens <= maxTokens) {
      result.push(doc);
      runningTokens += docTokens;
    } else {
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

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const truncate = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) + "…" : text;

const studyGuideToContext = (raw: string): string => {
  try {
    const json = raw.slice(STUDY_GUIDE_PREFIX.length);
    const guide = JSON.parse(json) as Record<string, unknown>;
    const parts: string[] = [];
    if (guide.title) parts.push(`Title: ${guide.title}`);
    if (guide.overview) parts.push(`Overview: ${guide.overview}`);
    if (Array.isArray(guide.keyPoints) && guide.keyPoints.length)
      parts.push(`Key Points:\n${(guide.keyPoints as string[]).map(p => `  • ${p}`).join("\n")}`);
    if (Array.isArray(guide.keyConcepts) && guide.keyConcepts.length)
      parts.push(`Key Concepts:\n${(guide.keyConcepts as { title: string; content: string }[]).map(c => `  • ${c.title}: ${c.content}`).join("\n")}`);
    if (guide.keyTable && Array.isArray((guide.keyTable as Record<string, unknown>).rows)) {
      const kt = guide.keyTable as { headers: string[]; rows: string[][] };
      parts.push(`Key Table headers: ${kt.headers.join(", ")}\n  rows:\n${kt.rows.map(r => "    " + r.join(" | ")).join("\n")}`);
    }
    if (Array.isArray(guide.practiceQuestions) && guide.practiceQuestions.length)
      parts.push(`Practice Questions:\n${(guide.practiceQuestions as { question: string }[]).map((q, i) => `  Q${i + 1}: ${q.question}`).join("\n")}`);
    if (Array.isArray(guide.tips) && guide.tips.length)
      parts.push(`Tips:\n${(guide.tips as string[]).map(t => `  • ${t}`).join("\n")}`);
    return parts.join("\n\n");
  } catch {
    return "(study guide — unreadable)";
  }
};

const formatResearchSources = (sources: ResearchSource[]) => {
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

function buildSystemPrompt(
  userContext: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string },
  messages: ChatMessage[],
  workspaceContext?: string,
  calendarContext?: string,
): string {
  const analogyIntensity = userContext?.analogyIntensity ?? 1;
  const studentGrade = userContext?.grade || "7-12";
  const studentState = userContext?.state || null;

  const STATE_FULL_NAMES: Record<string, string> = {
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

  const findExplicitInterest = (text: string, interests: string[]) => {
    const lower = text.toLowerCase();
    let best: { interest: string; index: number } | null = null;
    for (const interest of interests) {
      const idx = lower.indexOf(interest.toLowerCase());
      if (idx >= 0 && (!best || idx < best.index)) best = { interest, index: idx };
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
    "Use analogies sparingly — only when they genuinely help clarify a specific point.",
    "Use analogies as the primary teaching tool — lead with a hobby-based analogy before any explanation.",
    "MANDATORY: Open EVERY explanation with an analogy from the student's interests. Build the entire explanation around the analogy. Never start with 'X is defined as...' or give definitions first.",
    "MANDATORY: Your FIRST SENTENCE for ANY concept explanation must be an analogy from the student's interests. Then explain through the analogy, then reveal the formal concept. Example: 'Think of [hobby analogy]... that's exactly like [concept]... here's why...'",
    "MANDATORY: For EVERY concept you explain, you MUST use a distinct analogy from the student's interests. Map each concept piece to analogy piece. If no good analogy exists, explicitly say 'Let me find a better analogy...' before giving up.",
  ][Math.min(analogyIntensity, 5)];

  const hasExplicitSubject = (userContext?.subjects?.length ?? 0) > 0;
  const primarySubjectForFormulas = hasExplicitSubject ? userContext!.subjects![0] : null;
  const formulaSheetContext = primarySubjectForFormulas ? getFormulaSheetContext(primarySubjectForFormulas) : "";

  const researchMode = Boolean(userContext?.researchMode);
  const researchSources = Array.isArray(userContext?.researchSources) ? (userContext!.researchSources as ResearchSource[]) : [];
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

  const workspaceSection = workspaceContext || calendarContext ? `
${calendarContext ? `━━━ CALENDAR & DEADLINES ━━━\n${calendarContext}\n━━━ END CALENDAR ━━━\n` : ""}
${workspaceContext ? `━━━ YOUR WORKSPACE ━━━
You have READ-ONLY access to this student's documents — you can see them for context but CANNOT edit or create documents directly. Do NOT tell the student you can edit their documents or offer to update them.

You CAN create flashcard sets and start quizzes via the <ACTIONS> block.

${workspaceContext}
━━━ END WORKSPACE ━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE ACTIONS (flashcards & quizzes only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Put an <ACTIONS>...</ACTIONS> block at the VERY END of your message ONLY for flashcards or quizzes.

── ACTION: add_flashcards ──
{"type":"add_flashcards","subjectId":"SUBJECT","setName":"Topic name","cards":[{"front":"Q","back":"A"}]}

── ACTION: start_quiz ──
{"type":"start_quiz","subjectId":"SUBJECT","topic":"optional topic focus","difficulty":"foundational|intermediate|advanced","numberOfQuestions":5,"timeLimitMinutes":0}

── RULES ──
- NEVER use create_document or update_document — you do not have write access to documents.
- For add_flashcards: always include a descriptive setName (e.g. "Quadratic equations", "Chapter 3 vocab"). Say "Done! Added X flashcards on [topic]." — nothing else.
- For start_quiz: say "Starting your quiz now!" then the <ACTIONS> block. NEVER write quiz questions in your text response.
- CRITICAL: When using add_flashcards or start_quiz, your text response must be 1 sentence MAX. Do NOT write out flashcard content or quiz questions in the chat — they go in the <ACTIONS> block only.
- Use add_flashcards when student says "make flashcards", "create cards", "save these as flashcards" etc.
- Use start_quiz when student says "quiz me", "test me", "start a quiz" etc.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ""}` : "";

return `You are "Analogix AI", a brilliant and friendly AI tutor for Australian secondary students.

Student Location & Curriculum: ${curriculumContext}
Today's date: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.

${analogyIntensity === 0 ? `MODE: SCHOOL / ASSESSMENT ("Schoolwork!")
The student wants help succeeding in formal academic contexts — exams, essays, assignments.
- Formal, precise tone. Write like a model answer a teacher would give top marks.
- Use correct subject-specific terminology and ${stateFullName || "Australian"} syllabus language.
- Structure responses clearly but CONVERSATIONALLY. No essay-style headers like "## Step 1:" or "## Conclusion".
- NO $\\boxed{}$ answers. Never output boxed answers like $\\boxed{0}$ or $\\boxed{x}$ unless the student explicitly asks for a specific numerical answer to a math problem.
- For English/Humanities: conversational analysis, not formal essays.
- For Maths/Science: conversational explanation, not step-by-step headers.
- No analogies. No hobby references.` : `MODE: REAL LEARNING ("Learning Mode")
Allowed Interests (verbatim): ${allowedInterests}
Analogy Anchor: ${analogyAnchor || "Choose one from Allowed Interests."}
Analogy Intensity: ${analogyIntensity}/5 — ${analogyGuidance}
- ALWAYS start your response with an analogy from the student's interests (${allowedInterests}). Even if they ask a simple question, weave in a relevant analogy from their hobbies.
- NO essay-style headers like "## Step 1:" or "## Conclusion:" — write in natural paragraphs.
- NO $\\boxed{}$ answers. Never output boxed answers like $\\boxed{0}$ unless it's an actual math calculation the student explicitly requested.
- Conversational, friendly tone. Like a smart friend explaining something.`}

Core rules:
- Match Year ${studentGrade} vocabulary. Australian English always.
- Use LaTeX for ALL maths: inline $x$, display $\\frac{a}{b}$.
- No emojis in body text.
- IMPORTANT: If the student says something casual like "hi", "hello", or anything not related to a subject, just greet them warmly and ask what they'd like to study. Do NOT launch into a subject or analogy unprompted.
- IMPORTANT: Only discuss a specific subject if the student has clearly brought it up. Never assume or invent a subject.

━━ CONVERSATIONAL INTELLIGENCE — READ THE ROOM ━━
Match your response LENGTH and FORMAT to the student's message. This is the most important rule.

SHORT conversational messages → SHORT replies (1–3 sentences). No headers. No steps.
- "is it not x + 13?" → Just say yes/no and briefly why. One paragraph max.
- "wait so what's the inverse?" → Quick direct answer, conversational.
- "oh I get it now" → Acknowledge and move on or ask what's next.
- "can you explain that again?" → Re-explain naturally, no formal structure.
- "huh?" / "what?" / "why?" → One clear sentence or two.

ONLY use Step-by-step / headers / long structure when:
- The student explicitly asks for full working ("show me all the steps", "walk me through it")
- It's a brand-new multi-part concept they haven't seen before
- A worked example genuinely requires it

DEFAULT behaviour: be conversational. Talk like a smart tutor sitting next to them, not a textbook.

NEVER use essay-style formatting:
- Do NOT use "## Step 1:", "## Step 2:", "## Conclusion:" 
- Do NOT use numbered lists for explanations unless explicitly asked
- Do NOT structure responses like an essay with headers
- Write in natural flowing paragraphs

Do NOT pad with recaps, summaries, or "great question!" filler.

RESPONSE LENGTH GUIDE:
- Quick check / yes-no question → 1–3 sentences
- Concept clarification → 1 short paragraph
- New concept introduction → 2–3 paragraphs max, or a graph + brief explanation
- Full worked example (only when asked) → structured steps are fine here
${workspaceSection}
${researchBlock}
━━ GRAPHING — USE THESE BLOCKS PROACTIVELY ━━
You have THREE rendering engines. Choose the right one and place the block BEFORE your explanation.

1. DESMOS (interactive graphing calculator) — use for any 2D equation or function the student should explore interactively:
\`\`\`desmos
y=x^{2}
y=2x+1
\\sin(x)
[bounds: -10,10,-6,6]
\`\`\`
One expression per line. Optional [bounds: left,right,bottom,top].

CRITICAL DESMOS SYNTAX — follow exactly or the graph will be blank:
- Trig/log MUST have backslash: \\sin(x)  \\cos(x)  \\tan(x)  \\ln(x)  \\log(x)  \\sqrt{x}
- Exponents use braces: x^{2}  e^{-x^{2}}  NOT x^(2) or x**2
- Multiplication: 2\\cdot x  NOT 2*x
- Fractions: \\frac{1}{x}
- Sliders: put a=2 on its own line, then reference a in other expressions
- No semicolons, no comments, expressions only
WRONG: sin(x), sqrt(x), x**2, 2*x, y==x^2
RIGHT: \\sin(x), \\sqrt{x}, x^{2}, 2\\cdot x, y=x^{2}

WHEN TO USE:
- Any equation, function, or curve → desmos (default choice, supports sliders for parameters too)
- Simple greetings or non-mathematical questions → NO graph
Always place the block BEFORE the explanation so the student sees it first.

REMEMBER: You are the bridge between what they love and what they need to learn.${formulaSheetContext ? `\n\n--- FORMULA REFERENCE ---\n${formulaSheetContext}\n--- END FORMULA REFERENCE ---` : ""}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string } = body.userContext || {};

    // Get personality and memory from database or localStorage
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let aiPersonality: Awaited<ReturnType<typeof getUserAIPersonality>> = null;
    let memoryContext = "";

    // Client-side "x-client-data" is always sent by the chat UI (it contains localStorage
    // personality/memories). Even if the user is authenticated, merging these values ensures
    // the next response reflects the latest UI toggles immediately.
    const clientData = request.headers.get("x-client-data");
    let clientPersonality: unknown = null;
    let clientMemories: unknown = null;
    if (clientData) {
      try {
        const parsed = JSON.parse(clientData);
        clientPersonality = parsed.personality ?? null;
        clientMemories = parsed.memories ?? null;
      } catch (e) {
        console.warn("[chat-stream] Failed to parse x-client-data:", e instanceof Error ? e.message : e);
      }
    }
    
    console.log("[chat-stream] User authenticated:", user?.id || "none");
    
    if (user) {
      // Fetch from database
      console.log("[chat-stream] Fetching personality from database...");
      aiPersonality = await getUserAIPersonality(user.id);
      console.log("[chat-stream] Personality fetched:", aiPersonality ? "YES" : "NO");

      // Merge client personality over DB personality (client wins)
      if (clientPersonality) {
        aiPersonality = { ...(aiPersonality as AIPersonality | null), ...(clientPersonality as AIPersonality) };
        console.log("[chat-stream] Personality merged from client overrides");
      }
      
      const { memories } = await getRelevantMemories(user.id, { limit: 15, minImportance: 0.5 });
      memoryContext = buildMemoryContext(memories, []);
      console.log("[chat-stream] Memories fetched:", memories?.length || 0);
    } else {
      // Fallback to localStorage from client headers
      console.log("[chat-stream] No user, checking localStorage from headers...");

      if (clientPersonality) {
        aiPersonality = clientPersonality as AIPersonality;
        console.log("[chat-stream] Personality from localStorage: YES");
      }
if (clientMemories && Array.isArray(clientMemories)) {
        memoryContext = buildMemoryContext(clientMemories as AIMemoryFragment[], []);
        console.log("[chat-stream] Memories from localStorage:", clientMemories.length);
      }
    }

    // Detect simple/greeting messages early — skip workspace loading entirely for speed
    const isSimpleGreeting = (() => {
      const userMsgs = messages.filter(m => m.role === "user");
      if (userMsgs.length !== 1) return false;
      const c = userMsgs[0].content.toLowerCase().trim();
      if (c.length > 60) return false;
      return /^(hi|hello|hey|sup|yo|g'day|howdy|hiya|heya|thanks?|bye|good\s?(morning|evening|afternoon)|what'?s up|how are you)[\s!?.]*$/.test(c);
    })();

    // ── Load workspace context from Supabase (same as agent route) ──────────
    let workspaceContext: string | undefined;
    let calendarCtx: string | undefined;
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

        if (calendarResult) calendarCtx = calendarResult;

        if (documents.length > 0) {
          const allDocs: Array<{ subjectId: string; title: string; type: string; preview: string }> = [];
          for (const doc of documents) {
            const isGuide = doc.content?.startsWith(STUDY_GUIDE_PREFIX);
            if (isGuide) {
              const readable = studyGuideToContext(doc.content);
              allDocs.push({ subjectId: doc.subject_id, title: doc.title, type: "DOC", preview: readable });
            } else {
              allDocs.push({
                subjectId: doc.subject_id,
                title: doc.title,
                type: "DOC",
                preview: truncate(stripHtml(doc.content || ""), 3000),
              });
            }
          }

          if (allDocs.length > 0) {
            // Token budget for workspace context (leave room for system prompt, messages, and response)
            // Model limit is 12000 TPM, reserve ~4000 for response + ~2000 for messages = ~6000 for context
            const WORKSPACE_TOKEN_BUDGET = 5000;
            const { docs: truncatedDocs, truncated } = truncateWorkspaceDocs(allDocs, WORKSPACE_TOKEN_BUDGET);

            if (truncated) {
              console.log(`[chat-stream] Workspace truncated: ${allDocs.length} → ${truncatedDocs.length} docs to fit token budget`);
            }

            const docContext = truncatedDocs.map(d =>
              `[${d.subjectId.toUpperCase()} — ${d.type}: "${d.title}"]\n${d.preview}`
            ).join("\n\n---\n\n");

            const docIndex = truncatedDocs.map(d =>
              `  • "${d.title}" [${d.type}] subjectId="${d.subjectId}"`
            ).join("\n");

            workspaceContext = `Document Index:\n${docIndex}\n\nDocument Contents:\n${docContext}`;
          }
        }
      }
    } catch (err) {
      // Workspace loading failed — continue without it (non-fatal)
      console.warn("[chat-stream] workspace load failed:", err instanceof Error ? err.message : err);
    }
    } // end !isSimpleGreeting

    // Build system prompt with personality and memory
    // Use client-side analogy intensity if set, otherwise fall back to personality
    // Prioritise the user's explicit setting over personality defaults
    const effectiveUserContext = aiPersonality
      ? {
          ...userContext,
          // Only override if user hasn't explicitly set analogy intensity
          analogyIntensity: userContext.analogyIntensity !== undefined
            ? userContext.analogyIntensity
            : Math.max(1, Math.min(5, aiPersonality.analogy_frequency ?? 3)),
        }
      : userContext;

    let systemPrompt = buildSystemPrompt(effectiveUserContext, messages, workspaceContext, calendarCtx);
    
    console.log("[chat-stream] Injecting memory context:", memoryContext ? "YES" : "NO");
    console.log("[chat-stream] Injecting personality:", aiPersonality ? "YES" : "NO");
    
    // Inject memory context
    if (memoryContext) {
      systemPrompt = systemPrompt.replace(
        "Today's date:",
        `${memoryContext}\n\nToday's date:`
      );
    }
    
    // Inject personality instructions at the VERY END so they override earlier system rules.
    if (aiPersonality) {
      const personalityInstructions = buildPersonalityInstructions(aiPersonality);
      systemPrompt = `${systemPrompt}\n\n--- PERSONALITY SETTINGS (HIGH PRIORITY) ---\n${personalityInstructions}\n--- END PERSONALITY ---`;
      console.log("[chat-stream] Personality instructions injected (high priority)");
    }
    const primarySubject = userContext?.subjects?.[0];
    const isResearchMode = Boolean(userContext?.researchMode);
    // Use highToken model for streaming since we need more output tokens
    const chatTaskType = isSimpleGreeting ? "default" : "highToken";

    const upstreamStream = await callGroqChatStream(
      {
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.filter(m => m.role !== "system"),
        ],
        max_tokens: isSimpleGreeting ? 150 : isResearchMode ? 3000 : 2048,
        temperature: isResearchMode ? 0.3 : 0.55,
      },
      chatTaskType,
      userContext?.selectedModel || null
    );

    return new Response(upstreamStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/chat-stream] Error details:", {
      message,
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Determine appropriate status code based on error type
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
    } else if (message.toLowerCase().includes("token") || message.toLowerCase().includes("length")) {
      statusCode = 400;
      userMessage = "Response too long - the AI generated more content than allowed. Please try a shorter request or break it into parts.";
    }

    return new Response(
      `data: ${JSON.stringify({ error: userMessage, code: statusCode })}\n\n`,
      { status: statusCode, headers: { "Content-Type": "text/event-stream" } },
    );
  }
}
