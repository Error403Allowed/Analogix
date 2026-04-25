import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";
import { extractYouTubeVideoId, fetchYouTubeTranscript } from "@/lib/youtube";
import type { GeneratedStudyGuide } from "@/services/groq";
import { studyGuideToMarkdown } from "@/utils/studyGuideMarkdown";

export const runtime = "nodejs";

const DATE_KEYWORDS = ["due", "deadline", "submit", "submission", "assessment date", "exam date", "test date"];

const scoreContext = (text: string, index: number) => {
  const window = text.slice(Math.max(0, index - 60), index + 60).toLowerCase();
  let score = 0;
  for (const kw of DATE_KEYWORDS) {
    if (window.includes(kw)) score += kw.includes("date") ? 3 : 2;
  }
  if (window.includes("due")) score += 2;
  return score;
};

const toIsoDate = (year: number, month: number, day: number): string | null => {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const extractAssessmentDate = (text: string): string | null => {
  const candidates: Array<{ value: string; score: number; index: number }> = [];

  // ISO dates
  const isoRegex = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
  for (const match of text.matchAll(isoRegex)) {
    const iso = toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (iso) candidates.push({ value: iso, score: scoreContext(text, match.index ?? 0), index: match.index ?? 0 });
  }

  // AU-style numeric dates: DD/MM/YYYY or DD-MM-YYYY
  const numericRegex = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g;
  for (const match of text.matchAll(numericRegex)) {
    let year = Number(match[3]);
    if (year < 100) year = 2000 + year;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const iso = toIsoDate(year, month, day);
    if (iso) candidates.push({ value: iso, score: scoreContext(text, match.index ?? 0), index: match.index ?? 0 });
  }

  // "12 March 2026" or "March 12, 2026"
  const months: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };
  const dmyRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*,?\s*(\d{4}))?\b/gi;
  for (const match of text.matchAll(dmyRegex)) {
    const day = Number(match[1]);
    const month = months[(match[2] || "").toLowerCase()] || 0;
    const year = Number(match[3]) || new Date().getFullYear();
    const iso = toIsoDate(year, month, day);
    if (iso) candidates.push({ value: iso, score: scoreContext(text, match.index ?? 0), index: match.index ?? 0 });
  }
  const mdyRegex = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/gi;
  for (const match of text.matchAll(mdyRegex)) {
    const month = months[(match[1] || "").toLowerCase()] || 0;
    const day = Number(match[2]);
    const year = Number(match[3]) || new Date().getFullYear();
    const iso = toIsoDate(year, month, day);
    if (iso) candidates.push({ value: iso, score: scoreContext(text, match.index ?? 0), index: match.index ?? 0 });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates[0].value;
};

const extractWeighting = (text: string): string | null => {
  const regex = /(\d{1,3}(?:\.\d+)?)\s*%/g;
  const candidates: Array<{ value: string; score: number; index: number }> = [];
  for (const match of text.matchAll(regex)) {
    const num = Number(match[1]);
    if (!Number.isFinite(num) || num <= 0 || num > 100) continue;
    const idx = match.index ?? 0;
    const window = text.slice(Math.max(0, idx - 60), idx + 60).toLowerCase();
    let score = 0;
    if (window.includes("weight")) score += 3;
    if (window.includes("worth")) score += 2;
    if (window.includes("contribut")) score += 2;
    candidates.push({ value: `${match[1]}%`, score, index: idx });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates[0].value;
};

const extractTotalMarks = (text: string): string | null => {
  const candidates: Array<{ value: string; score: number; index: number }> = [];

  const totalRegex = /total\s+marks?\s*[:-]?\s*(\d{1,4})/gi;
  for (const match of text.matchAll(totalRegex)) {
    candidates.push({ value: match[1], score: 3, index: match.index ?? 0 });
  }

  const outOfRegex = /\bout\s+of\s+(\d{1,4})\s*(?:marks|pts|points)?/gi;
  for (const match of text.matchAll(outOfRegex)) {
    candidates.push({ value: match[1], score: 2, index: match.index ?? 0 });
  }

  const marksRegex = /\b(\d{1,4})\s*(?:marks|pts|points)\b/gi;
  for (const match of text.matchAll(marksRegex)) {
    candidates.push({ value: match[1], score: 1, index: match.index ?? 0 });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates[0].value;
};

const extractExamDuration = (text: string): string | null => {
  const regex = /\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|minutes?|mins?|min)\b/gi;
  const candidates: Array<{ value: string; score: number; index: number }> = [];
  for (const match of text.matchAll(regex)) {
    const num = match[1];
    const unitRaw = match[2].toLowerCase();
    const unit = unitRaw.startsWith("h") ? (Number(num) === 1 ? "hour" : "hours") : "minutes";
    const value = `${num} ${unit}`;
    const idx = match.index ?? 0;
    const window = text.slice(Math.max(0, idx - 60), idx + 60).toLowerCase();
    let score = 0;
    if (window.includes("duration")) score += 3;
    if (window.includes("time allowed")) score += 3;
    if (window.includes("exam")) score += 1;
    candidates.push({ value, score, index: idx });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates[0].value;
};

export async function POST(request: Request) {
  try {
    type StudyGuideRecord = GeneratedStudyGuide & Record<string, unknown>;
    const body = await request.json();
    let assessmentDetails: string = body.assessmentDetails || "";
    let fileName: string = body.fileName || "Assessment";
    const subject: string = body.subject || "";
    const grade: string = body.grade || "7-12";
    const youtubeUrl: string | undefined = body.youtubeUrl;

    // Handle YouTube URL - fetch transcript
    if (youtubeUrl) {
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }

      const transcriptData = await fetchYouTubeTranscript(videoId);
      if (!transcriptData) {
        return NextResponse.json({ 
          error: "Could not fetch YouTube transcript. This video may not have captions enabled." 
        }, { status: 404 });
      }

      assessmentDetails = transcriptData.transcript;
      fileName = transcriptData.title || "YouTube Video";
    }

    if (!assessmentDetails.trim()) {
      return NextResponse.json({ error: "Assessment details are required" }, { status: 400 });
    }

    // ── Extract obvious metadata up front so the model doesn't miss it ──
    const extractedDate = extractAssessmentDate(assessmentDetails);
    const extractedWeighting = extractWeighting(assessmentDetails);
    const extractedMarks = extractTotalMarks(assessmentDetails);
    const extractedDuration = extractExamDuration(assessmentDetails);

    const extractedMeta = [
      extractedDate ? `assessmentDate: ${extractedDate}` : null,
      extractedWeighting ? `weighting: ${extractedWeighting}` : null,
      extractedMarks ? `totalMarks: ${extractedMarks}` : null,
      extractedDuration ? `examDuration: ${extractedDuration}` : null,
    ].filter(Boolean).join(" | ");

    // ── STAGE 1: Analyse the document to determine the best guide structure ──
    const analysisPrompt = `You are an expert educational analyst. Analyse the following assessment document and return a JSON object describing the best study guide structure for it.

Document: "${fileName}"
Content:
${assessmentDetails.slice(0, 3000)}

Return ONLY valid JSON (no markdown, no preamble):
{
  "documentType": "exam|assignment|practical|project|essay|case_study|other",
  "subjectArea": "detected subject area",
  "complexity": "low|medium|high",
  "hasFormulas": true/false,
  "hasTimeline": true/false,
  "hasCaseSudies": true/false,
  "hasSources": true/false,
  "hasExperiment": true/false,
  "hasRubric": true/false,
  "isTimedExam": true/false,
  "examDuration": "e.g. '3 hours' or null if not a timed exam",
  "customSectionNeeds": ["any special content types detected, e.g. 'source analysis framework', 'experiment methodology', 'legal case citations'"],
  "recommendedDepth": "shallow|standard|deep",
  "notes": "1-2 sentences on what makes this document unique and how the guide should be tailored"
}`;

    let docAnalysis: Record<string, unknown> = {};
    try {
      const analysisContent = await callGroqChat(
        {
          messages: [
            { role: "system", content: "You are an expert educational analyst. Return only valid JSON." },
            { role: "user", content: analysisPrompt },
          ],
          max_tokens: 600,
          temperature: 0.2,
        },
        "lightweight"
      );
      const cleanAnalysis = analysisContent.replace(/```json|```/g, "").trim();
      docAnalysis = JSON.parse(cleanAnalysis);
    } catch {
      // If analysis fails, continue with defaults
      docAnalysis = { documentType: "exam", complexity: "medium", recommendedDepth: "standard" };
    }

    // ── Calculate weeks until exam for study schedule ─────────────────────
    const today = new Date();
    const weeksUntilExam = extractedDate ? (() => {
      if (extractedDate === "TBA" || !extractedDate) return 4; // Default
      const examDate = new Date(extractedDate);
      const diffMs = examDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      // Minimum 1 week, maximum 12 weeks for study schedule
      return Math.max(1, Math.min(12, Math.ceil(diffDays / 7)));
    })() : 4; // Default 4 weeks if no date

    const studyScheduleGuidance = `Create exactly ${weeksUntilExam} weeks of study plan. ${
      weeksUntilExam <= 2 
        ? "URGENT: Only ${weeksUntilExam} weeks left! Focus on high-yield topics and practice questions." 
        : weeksUntilExam <= 4
        ? "Moderate timeline: Balance content review with practice."
        : `Extended timeline: ${weeksUntilExam} weeks available. Start with foundations, build to complex topics, end with review.`
    }`;

    // ── STAGE 2: Build a tailored system prompt based on the analysis ──
    const hasFormulas = docAnalysis.hasFormulas === true;
    const hasExperiment = docAnalysis.hasExperiment === true;
    const hasTimeline = docAnalysis.hasTimeline === true;
    const hasSources = docAnalysis.hasSources === true;
    const hasRubric = docAnalysis.hasRubric === true;
    const isTimedExam = docAnalysis.isTimedExam === true;
    const complexity = docAnalysis.complexity || "medium";
    const customNeeds: string[] = Array.isArray(docAnalysis.customSectionNeeds) ? docAnalysis.customSectionNeeds : [];
    const notes = docAnalysis.notes || "";

    const conceptDepth = complexity === "high"
      ? "8-12 sentences each, include ALL formulas, worked examples, and diagrams described in text"
      : complexity === "low"
      ? "3-5 sentences each, keep it simple and accessible"
      : "5-8 sentences each, include formulas and examples where relevant";

    const questionCount = complexity === "high" ? "20-30" : complexity === "low" ? "8-12" : "12-20";

    const optionalSections = [
      hasFormulas ? `"formulaSheet": [{"formula": "actual formula from the document e.g. ΔH = H_products - H_reactants", "description": "what this formula means in plain English", "variables": "each variable defined with units", "example": "a worked numerical example using values from the document"}]` : null,
      hasExperiment ? `"experimentGuide": {"aim": "the actual stated aim from the document", "hypothesis": "a specific, testable hypothesis relevant to this experiment", "variables": {"independent": "the variable being changed", "dependent": "the variable being measured", "controlled": ["specific controlled variable 1", "specific controlled variable 2"]}, "method": ["step 1 with specific detail", "step 2 with specific detail"], "safetyNotes": ["specific safety concern from this experiment"]}` : null,
      hasTimeline ? `"timeline": [{"year": "actual year from document", "event": "specific event name", "significance": "why this event matters for the assessment"}]` : null,
      hasSources ? `"sourceAnalysisFramework": {"steps": ["specific step tailored to this type of source", "another step"], "keyQuestions": ["specific question relevant to this assessment's sources"]}` : null,
      hasRubric ? `"rubricBreakdown": [{"criterion": "actual criterion name from document", "marks": 10, "excellent": "specific description of what earns full marks", "satisfactory": "specific description of passing standard", "developing": "specific description of below standard"}]` : null,
      customNeeds.length > 0 ? `"customSections": [{"title": "specific descriptive title", "type": "list", "content": ["actual content item 1", "actual content item 2"]}]` : null,
    ].filter(Boolean).join(",\n      ");

    const systemPrompt = `You are Analogix AI, an expert study coach for Australian high school students.

DOCUMENT ANALYSIS RESULT: ${notes}
Subject detected: ${docAnalysis.subjectArea || subject || "General"}
Document type: ${docAnalysis.documentType || "assessment"}
Complexity: ${complexity}
Timed exam: ${isTimedExam ? `YES — include examDuration field (detected: ${docAnalysis.examDuration || "check document"})` : "NO — do NOT include examDuration field"}
${extractedMeta ? `EXTRACTED DETAILS (use exactly if present): ${extractedMeta}` : ""}

CRITICAL RULES — READ THESE FIRST:
1. NEVER use "..." or placeholder text anywhere in your response. Every field must contain real, specific content derived from the actual document.
2. NEVER copy the example values from this prompt. They are format examples only — replace everything with content specific to this document.
3. If a section doesn't apply to this document (e.g. taskStructure for a written exam), OMIT it entirely — do not include it with empty arrays or placeholder text.
4. customSections: Only include if there is genuinely unique content that doesn't fit any other section. Each item MUST have a non-empty content array with real items.
5. All content must be SPECIFIC to this assessment — not generic study advice.

Your job: Create the BEST POSSIBLE, fully tailored study guide for THIS specific document.
The student is in Year ${grade}${subject ? ` studying ${subject}` : ""}.

STYLE (TurboLearn-style notes):
- Write like clean, structured study notes: scannable, concise, and editable.
- Prefer short paragraphs and bullet-like sentences over dense blocks of text.
- Use concrete definitions, formulas, and worked examples wherever the document provides them.
- Keep wording exam-focused and specific to THIS assessment.

CONTENT RULES:
- keyConcepts: Cover ALL essential concepts. ${conceptDepth}
- practiceQuestions: ${questionCount} questions mixed across recall, application, and analysis. Write DETAILED model answers.
- If the doc has formulas, work ALL of them into keyConcepts with examples — don't skip any.
- gradeExpectations: Extract EXACTLY from the document if a rubric exists. Otherwise infer from content.
- keyTable: Must be DIRECTLY useful for this subject (formula sheet for sciences, event table for history, case table for legal studies, etc.). OMIT if it wouldn't add value.
- studySchedule: ${studyScheduleGuidance} Each week must have 3-5 specific, actionable tasks derived from the document content.
- Use Australian English spelling and terminology throughout.
- glossary: Include ALL subject-specific terms found in the document.
- tips: Make these SPECIFIC to this exact assessment, not generic advice.
- commonMistakes: Based on what students commonly get wrong for THIS type of assessment.

Generate a study guide matching this JSON structure. Return ONLY valid JSON — no markdown, no preamble, no trailing text.
REMINDER: Replace ALL example values with real content from the document. Omit any section that doesn't apply.

{
  "studyGuide": {
    "title": "specific title reflecting this exact assessment",
    "overview": "2-3 sentences describing what THIS assessment covers and what the guide includes",
    "assessmentDate": "YYYY-MM-DD extracted from document, or TBA",
    "assessmentType": "Exam | Practical | Assignment | etc.",
    "weighting": "percentage/weighting extracted from document",
    "totalMarks": "mark total extracted from document",
    "examDuration": "e.g. '3 hours' — ONLY include for timed in-class exams, omit for assignments/take-home tasks",
    "keyPoints": ["specific key point about this assessment", "another specific key point"],
    "topics": ["specific topic from this document", "another specific topic"],
    "requiredMaterials": ["specific material needed for this assessment"],
    "taskStructure": {
      "practical": ["specific practical component from document"],
      "written": ["specific written component from document"]
    },
    "studySchedule": [
      { "week": 1, "label": "descriptive label for this week", "tasks": ["specific task 1", "specific task 2", "specific task 3"] }
      // Generate exactly ${weeksUntilExam} weeks total, with week numbers 1 through ${weeksUntilExam}
    ],
    "keyConcepts": [
      { "title": "actual concept name from document", "content": "thorough explanation with specifics, formulas, worked examples from this document" }
    ],
    "keyTable": {
      "headers": ["meaningful column header 1", "meaningful column header 2"],
      "rows": [["specific data", "specific data"]]
    },
    "practiceQuestions": [
      { "question": "specific question about this assessment's content", "answer": "detailed model answer referencing this document's content" }
    ],
    "gradeExpectations": [
      { "grade": "A", "criteria": ["specific criterion for this subject/assessment"] },
      { "grade": "B", "criteria": ["specific criterion"] },
      { "grade": "C", "criteria": ["specific criterion"] },
      { "grade": "D", "criteria": ["specific criterion"] }
    ],
    "resources": ["specific resource relevant to this subject and topic"],
    "tips": ["specific tip for this exact assessment type and subject"],
    "commonMistakes": ["specific mistake students make in this subject/assessment type and how to avoid it"],
    "glossary": [{"term": "subject-specific term from document", "definition": "clear definition"}]${optionalSections ? `,\n    ${optionalSections}` : ""}
  }
}`;


    const content = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Assessment details from "${fileName}":\n\n${assessmentDetails.slice(0, 8000)}\n\nGenerate the complete, fully tailored study guide JSON now. Do not skip any sections. Be thorough.` },
        ],
        max_tokens: 6000,
        temperature: 0.3,
      },
      "reasoning"
    );

    // Ensure content is a string
    const contentStr = typeof content === "string" ? content : String(content);

    const parseStudyGuide = (raw: string): StudyGuideRecord | null => {
      try {
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return (parsed.studyGuide || parsed || null) as StudyGuideRecord | null;
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            return (parsed.studyGuide || parsed || null) as StudyGuideRecord | null;
          } catch {
            return null;
          }
        }
      }
      return null;
    };

    let studyGuide = parseStudyGuide(contentStr);
    if (!studyGuide) {
      const repairContent = await callGroqChat(
        {
          messages: [
            {
              role: "system",
              content: "Fix invalid JSON. Return ONLY valid JSON with the same structure. Do not add commentary.",
            },
            { role: "user", content: contentStr },
          ],
          max_tokens: 2500,
          temperature: 0,
        },
        "lightweight"
      );
      const repairStr = typeof repairContent === "string" ? repairContent : String(repairContent);
      studyGuide = parseStudyGuide(repairStr);
    }

    if (!studyGuide) {
      return NextResponse.json({ error: "Failed to generate study guide" }, { status: 500 });
    }

    const isEmptyOrTba = (v: unknown) => {
      if (v === null || v === undefined) return true;
      const s = String(v).trim().toLowerCase();
      return s === "" || s === "tba" || s === "tbd" || s === "unknown";
    };

    if (extractedDate && isEmptyOrTba(studyGuide.assessmentDate)) {
      studyGuide.assessmentDate = extractedDate;
    }
    if (extractedWeighting && isEmptyOrTba(studyGuide.weighting)) {
      studyGuide.weighting = extractedWeighting;
    }
    if (extractedMarks && isEmptyOrTba(studyGuide.totalMarks)) {
      studyGuide.totalMarks = extractedMarks;
    }
    if (extractedDuration && isEmptyOrTba(studyGuide.examDuration)) {
      studyGuide.examDuration = extractedDuration;
    }

    // Ensure required arrays exist
    studyGuide.keyPoints = studyGuide.keyPoints || [];
    studyGuide.overview = studyGuide.overview || "";
    studyGuide.topics = studyGuide.topics || [];
    studyGuide.studySchedule = studyGuide.studySchedule || [];
    studyGuide.keyConcepts = studyGuide.keyConcepts || [];
    studyGuide.practiceQuestions = studyGuide.practiceQuestions || [];
    studyGuide.resources = studyGuide.resources || [];
    studyGuide.tips = studyGuide.tips || [];

    // ── Strip empty sections so the view never renders blank cards ──
    const isBlank = (v: unknown): boolean => {
      if (v === null || v === undefined || v === "") return true;
      if (Array.isArray(v)) return v.length === 0 || v.every(item => isBlank(item));
      return false;
    };
    const optionalArrayFields = ["requiredMaterials", "commonMistakes", "glossary", "formulaSheet", "timeline", "rubricBreakdown"] as const;
    for (const field of optionalArrayFields) {
      if (isBlank(studyGuide[field])) delete studyGuide[field];
    }
    // Strip customSections items that have empty/placeholder content, then delete if nothing left
    if (Array.isArray(studyGuide.customSections)) {
      const filteredSections = studyGuide.customSections.filter(
        (
          section,
        ): section is NonNullable<GeneratedStudyGuide["customSections"]>[number] =>
          Boolean(section.title) && !isBlank(section.content),
      );
      if (filteredSections.length > 0) {
        studyGuide.customSections = filteredSections;
      } else {
        delete studyGuide.customSections;
      }
    }
    // Strip empty taskStructure
    if (studyGuide.taskStructure && typeof studyGuide.taskStructure === "object") {
      const ts = studyGuide.taskStructure as Record<string, unknown>;
      if (isBlank(ts.practical)) delete ts.practical;
      if (isBlank(ts.written)) delete ts.written;
      if (!ts.practical && !ts.written) delete studyGuide.taskStructure;
    }
    // Strip empty keyTable
    if (studyGuide.keyTable && typeof studyGuide.keyTable === "object") {
      const kt = studyGuide.keyTable as { headers?: unknown[]; rows?: unknown[] };
      if (!kt.headers?.length || !kt.rows?.length) delete studyGuide.keyTable;
    }
    // Strip sourceAnalysisFramework if empty
    if (studyGuide.sourceAnalysisFramework && typeof studyGuide.sourceAnalysisFramework === "object") {
      const saf = studyGuide.sourceAnalysisFramework as { steps?: unknown[]; keyQuestions?: unknown[] };
      if (!saf.steps?.length && !saf.keyQuestions?.length) delete studyGuide.sourceAnalysisFramework;
    }
    // Strip examDuration if not a timed exam or empty
    if (!isTimedExam || isBlank(studyGuide.examDuration)) delete studyGuide.examDuration;

    // ── Recursively sanitise placeholder text the AI may still sneak through ──
    const sanitisePlaceholders = (obj: unknown): unknown => {
      if (typeof obj === "string") {
        const trimmed = obj.trim();
        // Strip classic placeholder patterns
        if (/^\.{2,}$/.test(trimmed) || trimmed === "..." || /^(step \d+|task \d+|item \d+|criterion \d+|key point \d+|topic \d+|resource \d+|tip \d+|mistake \d+)$/i.test(trimmed)) return null;
        return obj;
      }
      if (Array.isArray(obj)) return obj.map(sanitisePlaceholders).filter(Boolean);
      if (obj && typeof obj === "object") {
        return Object.fromEntries(
          Object.entries(obj as Record<string, unknown>)
            .map(([k, v]) => [k, sanitisePlaceholders(v)])
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
        );
      }
      return obj;
    };
    studyGuide = sanitisePlaceholders(studyGuide) as StudyGuideRecord;
    studyGuide._docAnalysis = docAnalysis;

    const markdown = studyGuideToMarkdown(studyGuide);

    return NextResponse.json({
      studyGuide: {
        ...studyGuide,
        markdown,
      },
    });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/study-guide] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
