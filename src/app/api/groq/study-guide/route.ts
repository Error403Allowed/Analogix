import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const assessmentDetails: string = body.assessmentDetails || "";
    const fileName: string = body.fileName || "Assessment";
    const subject: string = body.subject || "";
    const grade: string = body.grade || "7-12";

    if (!assessmentDetails.trim()) {
      return NextResponse.json({ error: "Assessment details are required" }, { status: 400 });
    }

    const systemPrompt = `You are Quizzy, an expert study coach for Australian high school students.

Your job: Create a COMPREHENSIVE, DETAILED study guide from the assessment details provided.

The student is in Year ${grade}${subject ? ` studying ${subject}` : ""}.

Generate a study guide matching this EXACT JSON structure. Return ONLY valid JSON — no markdown, no preamble, no trailing text:

{
  "studyGuide": {
    "title": "Full descriptive title",
    "overview": "2-3 sentence summary of what this assessment covers and what the guide includes.",
    "assessmentDate": "YYYY-MM-DD or TBA",
    "assessmentType": "Exam | Practical | Assignment | etc.",
    "weighting": "e.g. 50% Semester 1",
    "totalMarks": "e.g. 40",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
    "topics": ["Topic 1", "Topic 2", "Topic 3"],
    "requiredMaterials": ["Pens and pencils", "Calculator", "Ruler"],
    "taskStructure": {
      "practical": ["Individual experiment execution", "First-hand data collection"],
      "written": ["Questions on procedures", "Experimental design analysis"]
    },
    "studySchedule": [
      { "week": 1, "label": "Foundation Week", "tasks": ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"] }
    ],
    "keyConcepts": [
      { "title": "Concept Name", "content": "Thorough 4-8 sentence explanation with formulas, examples, and analogies." }
    ],
    "keyTable": {
      "headers": ["Column 1", "Column 2", "Column 3"],
      "rows": [["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"]]
    },
    "practiceQuestions": [
      { "question": "Question text?", "answer": "Detailed model answer with full explanation." }
    ],
    "gradeExpectations": [
      { "grade": "A", "criteria": ["Criterion 1", "Criterion 2", "Criterion 3"] },
      { "grade": "B", "criteria": ["Criterion 1", "Criterion 2"] },
      { "grade": "C", "criteria": ["Criterion 1"] },
      { "grade": "D", "criteria": ["Criterion 1"] }
    ],
    "resources": ["Resource 1", "Resource 2"],
    "tips": ["Tip 1", "Tip 2", "Tip 3"],
    "commonMistakes": ["Mistake 1 and how to avoid it"],
    "glossary": [{"term": "Term", "definition": "Clear definition"}]
  }
}

CONTENT RULES:
- keyConcepts: Cover ALL essential concepts in depth (4-8 sentences each, include formulas and examples).
- practiceQuestions: 15-25 questions mixed across recall, application, and analysis. Detailed model answers.
- gradeExpectations: Extract or infer A/B/C/D criteria from the document.
- keyTable: Make this relevant to the subject (e.g. formulas table for physics, events timeline for history).
- Use Australian English spelling and terminology throughout.`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Assessment details from "${fileName}":\n\n${assessmentDetails}\n\nGenerate the complete study guide JSON now.` },
        ],
        max_tokens: 8192,
        temperature: 0.4,
      },
      "reasoning"
    );

    let studyGuide: Record<string, unknown> | null = null;
    try {
      const clean = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      studyGuide = parsed.studyGuide || parsed || null;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          studyGuide = parsed.studyGuide || parsed || null;
        } catch {}
      }
    }

    if (!studyGuide) {
      return NextResponse.json({ error: "Failed to generate study guide" }, { status: 500 });
    }

    studyGuide.keyPoints = studyGuide.keyPoints || [];
    studyGuide.overview = studyGuide.overview || "";
    studyGuide.topics = studyGuide.topics || [];
    studyGuide.studySchedule = studyGuide.studySchedule || [];
    studyGuide.keyConcepts = studyGuide.keyConcepts || [];
    studyGuide.practiceQuestions = studyGuide.practiceQuestions || [];
    studyGuide.resources = studyGuide.resources || [];
    studyGuide.tips = studyGuide.tips || [];

    return NextResponse.json({ studyGuide });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/study-guide] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
