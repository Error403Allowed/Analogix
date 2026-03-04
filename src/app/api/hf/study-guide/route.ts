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

IMPORTANT GUIDELINES:
1. **Cover ALL key concepts** — Don't limit yourself to a specific number. Include every important concept, topic, and skill that could appear on this assessment.
2. **Go deep, not wide** — Explain each concept thoroughly with examples, connections, and context. Quality over quantity.
3. **Match the assessment scope** — If it's a chapter test, cover that chapter comprehensively. If it's a final exam, cover the full course.
4. **Use the document content** — Extract topics, concepts, and learning objectives directly from the provided assessment details.

Generate a comprehensive study guide with the following structure:

1. **Title**: Clear, descriptive title that reflects the assessment topic
2. **Assessment Date**: Extract or estimate the due date
3. **Assessment Type**: e.g., "Exam", "Research Assignment", "Oral Presentation", "Practical Lab"
4. **Topics**: List ALL key topics that will be covered (be exhaustive — include everything important)
5. **Study Schedule**: Week-by-week breakdown (adjust based on time until due date)
   - Include enough weeks to cover everything properly
   - Each week should have 5-8 specific, actionable tasks
   - Progress from foundational to advanced
   - Include review sessions, practice tests, and rest days
6. **Key Concepts**: Cover ALL essential concepts in DEPTH
   - Don't limit the number — include every concept that matters
   - Each concept has a title and 4-8 sentence explanation (or more if needed)
   - Use analogies where helpful
   - Include formulas, key facts, and worked examples
   - Connect concepts to each other where relevant
   - If the document mentions specific theories, laws, or principles, explain them fully
7. **Practice Questions**: 15-30 questions with DETAILED model answers
   - Adjust number based on assessment scope (more for finals, fewer for quizzes)
   - Mix of recall (30%), application (40%), and analysis (30%) questions
   - Answers should be thorough enough to learn from (2-4 sentences each)
   - Include step-by-step solutions for calculation questions
8. **Resources**: 5-8 recommended study resources (textbooks, websites, videos, apps)
9. **Tips**: 8-12 practical study tips specific to this assessment type
   - Include memory techniques, time management, and exam strategies
10. **Common Mistakes**: 5-8 common pitfalls students make and how to avoid them
11. **Glossary**: ALL key terms with definitions (10-30+ terms depending on content)

Rules:
- Use Australian English spelling and terminology
- Be encouraging but realistic
- Make tasks specific and actionable
- Space out study sessions — don't cram
- Include active recall and practice testing strategies
- Reference the specific assessment format
- Go DEEP — explain concepts thoroughly, not superficially
- Include worked examples where relevant
- Connect ideas across topics
- **Cover everything that could reasonably appear on the assessment**

Return ONLY valid JSON — no markdown, no preamble:
{
  "studyGuide": {
    "title": "Study Guide Title",
    "assessmentDate": "YYYY-MM-DD or TBA",
    "assessmentType": "Exam",
    "topics": ["Topic 1", "Topic 2", "Topic 3"],
    "studySchedule": [
      {
        "week": 1,
        "label": "Foundation Week",
        "tasks": ["Task 1", "Task 2", "Task 3"]
      }
    ],
    "keyConcepts": [
      {
        "title": "Concept Name",
        "content": "Detailed explanation with examples, analogies, and connections to other concepts"
      }
    ],
    "practiceQuestions": [
      {
        "question": "Question text?",
        "answer": "Detailed model answer with explanation"
      }
    ],
    "resources": ["Resource 1", "Resource 2"],
    "tips": ["Tip 1", "Tip 2"],
    "commonMistakes": ["Mistake 1 and how to avoid it"],
    "glossary": [{"term": "Term", "definition": "Definition"}]
  }
}`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Assessment details from "${fileName}":\n\n${assessmentDetails}\n\nPlease generate a COMPREHENSIVE, DETAILED study guide for this assessment. Cover ALL key concepts thoroughly — don't hold back. Include everything I need to know to excel.` },
        ],
        max_tokens: 8192,
        temperature: 0.5,
      },
      "reasoning"
    );

    let studyGuide = null;
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

    return NextResponse.json({ studyGuide });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/study-guide] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
