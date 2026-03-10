import { callHfChatStream, formatError, classifyTaskType } from "../_utils";
import type { ChatMessage, UserContext } from "@/types/chat";
import { getFormulaSheetContext } from "@/data/formulaSheets";
import { createClient } from "@/lib/supabase/server";
import { buildCalendarContext } from "../_calendarContext";

export const runtime = "nodejs";

const STUDY_GUIDE_PREFIX = "__STUDY_GUIDE_V2__";

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const truncate = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) + "…" : text;

const studyGuideToContext = (raw: string): { readable: string; json: string } => {
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
    return { readable: parts.join("\n\n"), json };
  } catch {
    return { readable: "(study guide — unreadable)", json: "{}" };
  }
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
    "SCHOOL MODE: This student wants responses tailored for school/assessment purposes. Be formal, precise, and curriculum-aligned. Use correct subject-specific terminology. Structure answers the way a teacher or marker would expect — clear thesis, supporting points, topic sentences, textual evidence where relevant. No analogies, no personal interests, no casual tone. Write as if preparing the student to ace an exam or assignment.",
    "Use minimal analogies.",
    "Use analogies as the primary teaching tool — lead with a hobby-based analogy.",
    "Use frequent analogies.",
    "Use extensive analogies.",
    "Use only analogies.",
  ][analogyIntensity];

  const hasExplicitSubject = (userContext?.subjects?.length ?? 0) > 0;
  const primarySubjectForFormulas = hasExplicitSubject ? userContext!.subjects![0] : null;
  const formulaSheetContext = primarySubjectForFormulas ? getFormulaSheetContext(primarySubjectForFormulas) : "";

  const workspaceSection = workspaceContext || calendarContext ? `
${calendarContext ? `━━━ CALENDAR & DEADLINES ━━━\n${calendarContext}\n━━━ END CALENDAR ━━━\n` : ""}
${workspaceContext ? `━━━ YOUR WORKSPACE ━━━
You have read AND write access to this student's Analogix workspace. You can create documents, update study guides, and add flashcards during tutoring.

${workspaceContext}
━━━ END WORKSPACE ━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO EDIT THE WORKSPACE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Put an <ACTIONS>...</ACTIONS> block at the VERY END of your message when making workspace changes.
The block contains a single JSON object OR a JSON array of objects.

── ACTION 1: create_document ──
{"type":"create_document","subjectId":"SUBJECT","title":"Title","content":"<p>HTML</p>"}

── ACTION 2: update_document ──
{"type":"update_document","subjectId":"SUBJECT","docTitle":"EXACT TITLE","content":"<p>Full HTML</p>","mode":"replace"}

── ACTION 3: replace_study_guide ──
For [STUDY-GUIDE] docs ONLY. Send the COMPLETE new study guide JSON.
{"type":"replace_study_guide","subjectId":"SUBJECT","docTitle":"EXACT TITLE","guide":{...complete guide object...}}

── ACTION 4: add_flashcards ──
{"type":"add_flashcards","subjectId":"SUBJECT","cards":[{"front":"Q","back":"A"}]}

── RULES ──
- Only include <ACTIONS> when actually making a change.
- Use EXACT docTitle from the workspace above.
- For [STUDY-GUIDE] docs: ALWAYS use replace_study_guide (never update_document).
- When using replace_study_guide: start from the FULL JSON shown in the workspace, apply changes, include EVERYTHING.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ""}` : "";

  return `You are "Analogix AI", a brilliant AI tutor for Australian secondary students.

Student Location & Curriculum: ${curriculumContext}
Today's date: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.

${analogyIntensity === 0 ? `MODE: SCHOOL / ASSESSMENT ("This is for school!")
The student wants help succeeding in formal academic contexts — exams, essays, assignments.
- Formal, precise tone. Write like a model answer a teacher would give top marks.
- Use correct subject-specific terminology and ${stateFullName || "Australian"} syllabus language.
- Structure responses clearly: thesis, topic sentences, supporting evidence, logical flow.
- For English/Humanities: model analytical paragraphs (TEEL, PEEL, etc.) and use proper literary terminology.
- For Maths/Science: show working clearly, label every step, use correct notation.
- Reference assessment criteria and marking standards where helpful.
- No analogies. No hobby references. No casual filler.` : `MODE: REAL LEARNING ("Real learning enabled")
Allowed Interests (verbatim): ${allowedInterests}
Analogy Anchor: ${analogyAnchor || "Choose one from Allowed Interests."}
Analogy Intensity: ${analogyIntensity}/5 — ${analogyGuidance}
- Warm, conversational tone. Sound like a brilliant, slightly quirky friend who makes lightbulbs go off.
- Lead with an analogy from the student's interests. Build understanding through it, then close the loop.`}

Core rules:
- Match Year ${studentGrade} vocabulary. Australian English always.
- Use LaTeX for ALL maths: inline $x$, display $\\frac{a}{b}$.
- No emojis in body text.
- IMPORTANT: If the student says something casual like "hi", "hello", or anything not related to a subject, just greet them warmly and ask what they'd like to study. Do NOT launch into a subject or analogy unprompted.
- IMPORTANT: Only discuss a specific subject if the student has clearly brought it up. Never assume or invent a subject.
${workspaceSection}
GRAPHING RULE: When explaining any plottable function or equation, include a Desmos block BEFORE the explanation:
\`\`\`desmos
y=x^2
[bounds: -10,10,-6,6]
\`\`\`
One expression per line. Only when it genuinely helps.

REMEMBER: You are the bridge between what they love and what they need to learn.${formulaSheetContext ? `\n\n--- FORMULA REFERENCE ---\n${formulaSheetContext}\n--- END FORMULA REFERENCE ---` : ""}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const userContext: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string } = body.userContext || {};

    // ── Load workspace context from Supabase (same as agent route) ──────────
    let workspaceContext: string | undefined;
    let calendarCtx: string | undefined;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Load calendar in parallel with workspace docs
        const [calendarResult, subjectRowsResult] = await Promise.all([
          buildCalendarContext(supabase, user.id).catch(() => ""),
          supabase.from("subject_data").select("subject_id, notes").eq("user_id", user.id),
        ]);

        if (calendarResult) calendarCtx = calendarResult;

        const subjectRows = subjectRowsResult.data;
        if (subjectRows) {
          type DocRow = { id?: string; title: string; content: string };
          type SubjectRow = { subject_id: string; notes: { documents?: DocRow[] } };

          const allDocs: Array<{ subjectId: string; title: string; type: string; preview: string; fullJson?: string }> = [];
          for (const row of (subjectRows as SubjectRow[])) {
            for (const doc of (row.notes?.documents || [])) {
              const isGuide = doc.content?.startsWith(STUDY_GUIDE_PREFIX);
              if (isGuide) {
                const { readable, json } = studyGuideToContext(doc.content);
                allDocs.push({ subjectId: row.subject_id, title: doc.title, type: "STUDY-GUIDE", preview: readable, fullJson: json });
              } else {
                allDocs.push({ subjectId: row.subject_id, title: doc.title, type: "DOC", preview: truncate(stripHtml(doc.content || ""), 3000) });
              }
            }
          }

          if (allDocs.length > 0) {
            const docContext = allDocs.map(d =>
              `[${d.subjectId.toUpperCase()} — ${d.type}: "${d.title}"]\n${d.preview}`
            ).join("\n\n---\n\n");

            const docIndex = allDocs.map(d =>
              `  • "${d.title}" [${d.type}] subjectId="${d.subjectId}"`
            ).join("\n");

            const studyGuideJsonSection = allDocs
              .filter(d => d.type === "STUDY-GUIDE" && d.fullJson)
              .map(d => `FULL JSON for "${d.title}" (subjectId="${d.subjectId}"):\n${d.fullJson}`)
              .join("\n\n---\n\n");

            workspaceContext = `Document Index:\n${docIndex}\n\nDocument Contents:\n${docContext}${studyGuideJsonSection ? `\n\nFull Study Guide JSON (use when editing):\n${studyGuideJsonSection}` : ""}`;
          }
        } // end if (subjectRows)
      }
    } catch (err) {
      // Workspace loading failed — continue without it (non-fatal)
      console.warn("[chat-stream] workspace load failed:", err instanceof Error ? err.message : err);
    }

    const systemPrompt = buildSystemPrompt(userContext, messages, workspaceContext, calendarCtx);
    const primarySubject = userContext?.subjects?.[0];
    const taskType = classifyTaskType(messages, primarySubject);

    const upstreamStream = await callHfChatStream(
      {
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.filter(m => m.role !== "system"),
        ],
        max_tokens: 4096,
        temperature: 0.55,
      },
      taskType,
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
    console.error("[/api/groq/chat-stream]", message);
    return new Response(
      `data: ${JSON.stringify({ error: message })}\n\n`,
      { status: 500, headers: { "Content-Type": "text/event-stream" } },
    );
  }
}
