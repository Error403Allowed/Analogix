import { createClient } from "@/lib/supabase/server";
import { buildCalendarContext } from "@/lib/ai/calendar-context";
import { listUserDocuments } from "@/lib/server/documents";
import {
  detectContextIntents,
  fetchEnrolledSubjects,
  buildPerformanceContext,
  buildAchievementsContext,
  buildFlashcardContext,
  buildStudyStatsContext,
} from "@/lib/context/userContext";
import { createCurriculumRetriever } from "@/lib/retrieval/curriculum";

// ============================================================================
// CONTEXT LOADER
// ----------------------------------------------------------------------------
// Ported from the legacy chat-stream route. Loads workspace context ON DEMAND:
// the latest user message is classified and only the data scopes it actually
// needs are fetched (calendar, documents, quiz performance, achievements,
// flashcards, study stats, curriculum RAG). Enrolled subjects are always
// resolved so the tutor knows what the student studies.
// ============================================================================

const STUDY_GUIDE_PREFIX = "__STUDY_GUIDE_V2__";

const truncate = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) + "…" : text;

const getFirstSentence = (text: string): string => {
  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const firstPeriod = cleaned.indexOf(". ");
  if (firstPeriod > 0 && firstPeriod < 200) {
    return cleaned.slice(0, firstPeriod + 1);
  }
  return truncate(cleaned, 200);
};

const studyGuideToContext = (raw: string): string => {
  try {
    const json = raw.slice(STUDY_GUIDE_PREFIX.length);
    const guide = JSON.parse(json);
    const parts: string[] = [];
    if (guide.title) parts.push(`Title: ${guide.title}`);
    if (guide.overview) parts.push(`Overview: ${guide.overview}`);
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
  } catch {
    return "(study guide - unreadable)";
  }
};

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const truncateWorkspaceDocs = (allDocs: any[], maxTokens: number) => {
  const totalTokens = allDocs.reduce(
    (sum: number, d: any) => sum + estimateTokens(d.preview + d.title + d.subjectId),
    0,
  );
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
    } else {
      const remainingTokens = maxTokens - runningTokens - estimateTokens(doc.title + doc.subjectId);
      if (remainingTokens > 100) {
        const maxChars = remainingTokens * 4;
        if (doc.preview.length > maxChars) {
          const preview = truncate(doc.preview, maxChars);
          result.push({ ...doc, preview });
          truncated = true;
          runningTokens += estimateTokens(preview) + estimateTokens(doc.title + doc.subjectId);
          continue;
        }
      }
      truncated = true;
    }
  }
  return { docs: result, truncated };
};

export interface AIContext {
  workspaceContext: string;
  calendarContext: string;
  extraDataContext: string;
  enrolledSubjects: string[];
}

const SIMPLE_GREETING_RE =
  /^(hi|hello|hey|sup|yo|g'day|howdy|hiya|heya|thanks?|bye|good\s?(morning|evening|afternoon)|what'?s up|how are you)[\s!?.]*$/;

export const isSimpleGreetingMessage = (messages: any[]): boolean => {
  const userMsgs = messages.filter((m: any) => m.role === "user");
  if (userMsgs.length !== 1) return false;
  const c = userMsgs[0].content.toLowerCase().trim();
  if (c.length > 60) return false;
  return SIMPLE_GREETING_RE.test(c);
};

export const loadAIContext = async (
  messages: any[],
  userContext: { subjects?: string[] } = {},
): Promise<AIContext> => {
  const empty: AIContext = {
    workspaceContext: "",
    calendarContext: "",
    extraDataContext: "",
    enrolledSubjects: [],
  };

  const latestUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

  if (isSimpleGreetingMessage(messages)) {
    return empty;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return empty;

  let workspaceContext = "";
  let calendarContext = "";
  let extraDataContext = "";
  let enrolledSubjects: string[] = [];

  try {
    const intents = detectContextIntents(latestUserMsg);
    try {
      const clientSubjects = Array.isArray(userContext?.subjects) ? userContext.subjects : [];
      enrolledSubjects = await fetchEnrolledSubjects(supabase, user.id, clientSubjects);
    } catch (e) {
      console.warn("[AI context] Failed to resolve enrolled subjects:", e instanceof Error ? e.message : e);
    }

    if (intents.calendar) {
      calendarContext = await buildCalendarContext(supabase, user.id).catch(() => "");
    }

    if (intents.documents) {
      const documents = await listUserDocuments(supabase, user.id);
      if (documents.length > 0) {
        const allDocs: any[] = [];
        for (const doc of documents) {
          const isGuide = doc.content?.startsWith(STUDY_GUIDE_PREFIX);
          if (isGuide) {
            const readable = studyGuideToContext(doc.content);
            allDocs.push({ subjectId: doc.subject_id, title: doc.title, type: "DOC", preview: readable });
          } else {
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
          const WORKSPACE_TOKEN_BUDGET = 2000;
          const { docs: truncatedDocs, truncated } = truncateWorkspaceDocs(allDocs, WORKSPACE_TOKEN_BUDGET);
          if (truncated) {
            console.log(`[AI context] Workspace truncated: ${allDocs.length} → ${truncatedDocs.length} docs`);
          }
          const docContext = truncatedDocs
            .map((d: any) => `[${d.subjectId.toUpperCase()} - ${d.type}: "${d.title}"]\n${d.preview}`)
            .join("\n\n---\n\n");
          const docIndex = truncatedDocs
            .map((d: any) => `  • "${d.title}" [${d.type}] subjectId="${d.subjectId}"`)
            .join("\n");
          workspaceContext = `Document Index:\n${docIndex}\n\nDocument Contents:\n${docContext}`;
        }
      }
    }

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

    try {
      const curriculumRetriever = createCurriculumRetriever();
      const curriculumResults = await curriculumRetriever.retrieve(latestUserMsg, {}, 5);
      if (curriculumResults.length > 0) {
        const curriculumSection = curriculumRetriever.formatContext(curriculumResults);
        const curriculumBlock = `\n\n━━━ CURRICULUM CONTENT ━━━\n${curriculumSection}\n━━━ END CURRICULUM ━━━`;
        workspaceContext = workspaceContext
          ? workspaceContext + curriculumBlock
          : `Curriculum Content:\n${curriculumSection}`;
      }
    } catch (curriculumErr) {
      console.warn("[AI context] curriculum RAG failed:", curriculumErr instanceof Error ? curriculumErr.message : curriculumErr);
    }
  } catch (err) {
    console.warn("[AI context] workspace load failed:", err instanceof Error ? err.message : err);
  }

  return { workspaceContext, calendarContext, extraDataContext, enrolledSubjects };
};