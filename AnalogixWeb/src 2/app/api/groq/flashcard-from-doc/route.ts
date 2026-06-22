import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";

export const runtime = "nodejs";

// Chunk text into smaller pieces for processing
const chunkText = (text: string, maxChunkSize: number): string[] => {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + maxChunkSize, text.length);
    
    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + maxChunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  
  return chunks;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const documentContent: string = body.documentContent || "";
    const fileName: string = body.fileName || "Document";
    const subject: string = body.subject || "";
    const grade: string = body.grade || "7-12";
    const count: number = Math.max(5, body.count || 15);

    if (!documentContent.trim()) {
      return NextResponse.json({ error: "Document content is required" }, { status: 400 });
    }

    const systemPrompt = `You are Analogix AI, an expert teacher creating flashcards for Australian high school students.

Your job: Create effective, educational flashcards based on the provided document content.

The student is in Year ${grade}${subject ? ` studying ${subject}` : ""}.

CRITICAL RULES — READ CAREFULLY:
- ONLY extract flashcards about actual educational topics, concepts, theories, formulas, definitions, and subject matter.
- NEVER create flashcards about administrative details such as: due dates, assessment notifications, task deadlines, assignment instructions, submission guidelines, class schedules, room numbers, teacher names, or any logistical/administrative information.
- If the document contains mixed content (e.g., a notification that also includes topic content), IGNORE the administrative parts and ONLY create flashcards from the educational/subject matter.
- Focus on helping the student LEARN and UNDERSTAND the subject — not memorise dates or administrative details.
- You MUST create at least 5 flashcards. Do NOT create fewer than 5.
- Do NOT default to maths-only flashcards. Cover a diverse range of topics from the document — include definitions, concepts, processes, relationships, and factual knowledge. Only include maths flashcards if the document is specifically about mathematics.

Generate ${count} high-quality flashcards:
- Front: Clear, specific question or term (concise)
- Back: Complete answer with context and explanation (2-4 sentences)
- 40% definition/term cards, 40% concept explanation cards, 20% application/example cards
- One idea per card, simple clear language, include examples where helpful
- Use Australian English spelling
- IMPORTANT: Use LaTeX notation for ALL mathematical expressions. Wrap inline maths in $...$ and display equations in $$...$$. For example: "The quadratic formula is $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$" or "The gradient is $m = \\frac{rise}{run}$". Never write maths as plain text.

Return ONLY valid JSON — no markdown, no preamble:
{
  "flashcards": [
    {
      "front": "What is the quadratic formula?",
      "back": "The quadratic formula solves $ax^2 + bx + c = 0$ for $x$. The formula is $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$ where $a$, $b$, and $c$ are coefficients."
    }
  ]
}`;

    // For large documents, use chunking strategy
    const MAX_CHUNK_SIZE = 12000; // Conservative chunk size
    const allFlashcards: Array<{ front: string; back: string }> = [];

    if (documentContent.length > MAX_CHUNK_SIZE) {
      // Split document into chunks and generate flashcards for each
      const chunks = chunkText(documentContent, MAX_CHUNK_SIZE);
      const cardsPerChunk = Math.ceil(count / chunks.length);
      
      console.log(`[flashcard-from-doc] Chunking: ${chunks.length} chunks for ${documentContent.length} chars`);

      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunkContent = await callGroqChat(
            {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Document: "${fileName}" (Part ${i + 1}/${chunks.length})\n\nContent:\n${chunks[i]}\n\nPlease generate ${cardsPerChunk} flashcards based on this section.` },
              ],
              max_tokens: 2048,
              temperature: 0.5,
            },
            "reasoning"
          );

          let chunkFlashcards: Array<{ front: string; back: string }> = [];
          try {
            const clean = chunkContent.replace(/```(?:json)?\s*|\s*```/g, "").trim();
            const parsed = JSON.parse(clean);
            chunkFlashcards = parsed.flashcards || parsed || [];
          } catch {
            const match = chunkContent.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]);
                chunkFlashcards = parsed.flashcards || parsed || [];
              } catch {
                // Try extracting flashcards array pattern
                const fcMatch = chunkContent.match(/"flashcards"\s*:\s*(\[[\s\S]*\])/);
                if (fcMatch) {
                  try { chunkFlashcards = JSON.parse(fcMatch[1]); } catch { /* skip */ }
                }
              }
            }
          }

          // Validate
          chunkFlashcards = chunkFlashcards.filter(
            (fc) => fc.front?.trim() && fc.back?.trim()
          );

          allFlashcards.push(...chunkFlashcards);
        } catch (chunkError) {
          console.warn(`[flashcard-from-doc] Chunk ${i + 1} failed:`, formatError(chunkError));
          // Continue with next chunk
        }
      }
      
      // Limit to requested number of cards
      const flashcards = allFlashcards.slice(0, count);
      return NextResponse.json({ flashcards });
    }

    // Small document - single pass
    const content = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Document: "${fileName}"\n\nContent:\n${documentContent}\n\nPlease generate ${count} flashcards based on this document.` },
        ],
        max_tokens: 3072,
        temperature: 0.5,
      },
      "reasoning"
    );

    let flashcards: Array<{ front: string; back: string }> = [];
    try {
      const clean = content.replace(/```(?:json)?\s*|\s*```/g, "").trim();
      const parsed = JSON.parse(clean);
      flashcards = parsed.flashcards || parsed || [];
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          flashcards = parsed.flashcards || parsed || [];
        } catch {
          const fcMatch = content.match(/"flashcards"\s*:\s*(\[[\s\S]*\])/);
          if (fcMatch) {
            try { flashcards = JSON.parse(fcMatch[1]); } catch { /* skip */ }
          }
        }
      }
    }

    // Validate
    flashcards = flashcards.filter(
      (fc) => fc.front?.trim() && fc.back?.trim()
    );

    return NextResponse.json({ flashcards });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/flashcard-from-doc] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
