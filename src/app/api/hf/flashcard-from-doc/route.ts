import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const documentContent: string = body.documentContent || "";
    const fileName: string = body.fileName || "Document";
    const subject: string = body.subject || "";
    const grade: string = body.grade || "7-12";
    const count: number = body.count || 15;

    if (!documentContent.trim()) {
      return NextResponse.json({ error: "Document content is required" }, { status: 400 });
    }

    const systemPrompt = `You are Quizzy, an expert teacher creating flashcards for Australian high school students.

Your job: Create effective, educational flashcards based on the provided document content.

The student is in Year ${grade}${subject ? ` studying ${subject}` : ""}.

Generate ${count} high-quality flashcards with the following requirements:

1. **Flashcard Quality**:
   - Front: Clear, specific question or term (concise)
   - Back: Complete answer with context and explanation (2-4 sentences)
   - Focus on understanding, not just memorisation

2. **Content Coverage**:
   - Cover all major topics from the document
   - Include key terms and definitions
   - Include concept explanations
   - Include application questions

3. **Variety**:
   - 40% definition/term cards
   - 40% concept explanation cards
   - 20% application/example cards

4. **Best Practices**:
   - One idea per card
   - Use simple, clear language
   - Include examples where helpful
   - Make connections between related concepts

5. **Australian Context**:
   - Use Australian English spelling
   - Reference Australian curriculum where relevant

Return ONLY valid JSON — no markdown, no preamble:
{
  "flashcards": [
    {
      "front": "What is photosynthesis?",
      "back": "Photosynthesis is the process by which plants convert light energy into chemical energy. Plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. The equation is: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂"
    }
  ]
}`;

    const content = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Document: "${fileName}"\n\nContent:\n${documentContent.slice(0, 15000)}\n\nPlease generate ${count} flashcards based on this document.` },
        ],
        max_tokens: 4096,
        temperature: 0.5,
      },
      "reasoning"
    );

    let flashcards: Array<{ front: string; back: string }> = [];
    try {
      const clean = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      flashcards = parsed.flashcards || parsed || [];
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          flashcards = parsed.flashcards || parsed || [];
        } catch {}
      }
    }

    return NextResponse.json({ flashcards });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/hf/flashcard-from-doc] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
