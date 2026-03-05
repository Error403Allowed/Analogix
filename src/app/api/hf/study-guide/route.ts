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
    "keyPoints": [
      "Key point 1 students must understand",
      "Key point 2",
      "Key point 3",
      "Key point 4"
    ],
    "topics": ["Topic 1", "Topic 2", "Topic 3"],
    "requiredMaterials": ["Pens and pencils", "Calculator", "Ruler"],
    "taskStructure": {
      "practical": ["Individual experiment execution", "First-hand data collection", "Observation recording"],
      "written": ["Questions on procedures", "Experimental design analysis", "Response to stimuli"]
    },
    "studySchedule": [
      {
        "week": 1,
        "label": "Foundation Week",
        "tasks": ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"]
      }
    ],
    "keyConcepts": [
      {
        "title": "Concept Name",
        "content": "Thorough 4-8 sentence explanation. Include formulas (e.g. F = ma), worked examples, analogies, and connections to other concepts. Go deep."
      }
    ],
    "keyTable": {
      "headers": ["Column 1", "Column 2", "Column 3"],
      "rows": [
        ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
        ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"]
      ]
    },
    "practiceQuestions": [
      {
        "question": "Question text?",
        "answer": "Detailed model answer with full explanation and working where needed."
      }
    ],
    "gradeExpectations": [
      {
        "grade": "A",
        "criteria": ["Criterion 1", "Criterion 2", "Criterion 3", "Criterion 4", "Criterion 5"]
      },
      {
        "grade": "B",
        "criteria": ["Criterion 1", "Criterion 2", "Criterion 3", "Criterion 4"]
      },
      {
        "grade": "C",
        "criteria": ["Criterion 1", "Criterion 2", "Criterion 3"]
      },
      {
        "grade": "D",
        "criteria": ["Criterion 1", "Criterion 2"]
      }
    ],
    "resources": ["Resource 1", "Resource 2", "Resource 3"],
    "tips": ["Tip 1", "Tip 2", "Tip 3"],
    "commonMistakes": ["Mistake 1 and how to avoid it", "Mistake 2"],
    "glossary": [{"term": "Term", "definition": "Clear definition"}]
  }
}

CONTENT RULES:
- overview: 2-3 sentences summarising the whole guide
- keyPoints: 4-6 bullet points of what students MUST know
- keyTable: Make this relevant to the subject — e.g. for chemistry: reaction types vs observations; for physics: formulas table; for history: events timeline. Headers and rows must match the subject matter. Always include this.
- gradeExpectations: Extract or infer A/B/C/D criteria from the document. Each grade should have 4-6 specific, actionable criteria describing what a student at that level can do.
- keyConcepts: Cover ALL essential concepts in depth. Each explanation must be 4-8 sentences with examples, formulas where relevant, and analogies.
- practiceQuestions: 15-25 questions. Mix recall (30%), application (40%), analysis (30%). Detailed model answers.
- taskStructure: If it's a practical/lab assessment include both practical and written. Otherwise, populate whichever is relevant.
- Use Australian English spelling and terminology throughout.
- Go DEEP — explain concepts thoroughly, not superficially.`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Assessment details from "${fileName}":\n\n${assessmentDetails}\n\nGenerate the complete study guide JSON now. Cover ALL key concepts thoroughly.` },
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

    // Ensure required fields exist with safe fallbacks
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
    console.error("[/api/hf/study-guide] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
