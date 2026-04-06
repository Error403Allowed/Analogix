import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * POST /api/ai/memory/extract
 * Runs a second-pass LLM call over the last few messages to extract
 * structured long-term memory. Called after each assistant response.
 *
 * Body: { messages: [{role, content}][], subjectId?: string }
 */
export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ ok: false });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false });

    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages || [];
    const subjectId: string | undefined = body.subjectId;

    // Only look at the last 6 messages (3 exchanges) — enough context, not too expensive
    const recent = messages.slice(-6);
    if (recent.length < 2) return NextResponse.json({ ok: true, extracted: 0 });

    const transcript = recent
      .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content.slice(0, 400)}`)
      .join("\n");

    const extractionPrompt = `You are a memory extraction system for a student AI tutor.
Read this conversation excerpt and extract ONLY stable, reusable facts worth remembering long-term.

ONLY extract:
- Stated preferences ("I prefer X", "I hate Y", "explain it like I'm 5")
- Stable facts ("I'm in Year 10", "I use Python for computing", "I'm aiming for 85%")
- Repeated struggle patterns ("still confused about quadratics")
- Explicit goals ("I want to ace my HSC")
- Tone/style signals ("the student wants blunt direct answers")

DO NOT extract:
- One-off questions or temporary context
- Things that change per conversation
- Generic filler ("the student asked about maths")

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "memories": [
    { "content": "short factual statement", "type": "fact|preference|goal|skill|context", "importance": 0.0-1.0 }
  ]
}

If nothing is worth remembering, return: { "memories": [] }

Conversation:
${transcript}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: extractionPrompt }],
      max_tokens: 400,
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "{}";
    console.log("[memory/extract] LLM raw output:", raw.slice(0, 300));

    let extracted: { memories: { content: string; type: string; importance: number }[] };
    try {
      extracted = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: true, extracted: 0 });
    }

    if (!Array.isArray(extracted.memories) || extracted.memories.length === 0) {
      return NextResponse.json({ ok: true, extracted: 0 });
    }

    const validTypes = ["fact", "preference", "skill", "goal", "context"];

    // Fetch existing memories to deduplicate
    const { data: existing } = await supabase
      .from("ai_memory_fragments")
      .select("content, memory_type, importance, reinforcement_count, id")
      .eq("user_id", user.id)
      .limit(100);

    const existingContents = (existing || []).map(m => m.content.toLowerCase());

    let savedCount = 0;
    for (const mem of extracted.memories) {
      if (!mem.content || !validTypes.includes(mem.type)) continue;
      const content = String(mem.content).slice(0, 500);
      const importance = Math.max(0.3, Math.min(1.0, Number(mem.importance) || 0.6));

      // Deduplication: skip if similar content already exists
      const isDuplicate = existingContents.some(ec =>
        ec.includes(content.toLowerCase().slice(0, 30))
      );

      if (isDuplicate) {
        // Reinforce existing — bump importance + reinforcement_count
        const match = (existing || []).find(m =>
          m.content.toLowerCase().includes(content.toLowerCase().slice(0, 30))
        );
        if (match) {
          const newCount = (match.reinforcement_count || 0) + 1;
          // Score: frequency * 0.4 + recency * 0.3 + importance * 0.3
          const newImportance = Math.min(1.0, match.importance + 0.05 * newCount * 0.4);
          await supabase
            .from("ai_memory_fragments")
            .update({
              reinforcement_count: newCount,
              importance: newImportance,
              last_accessed_at: new Date().toISOString(),
            })
            .eq("id", match.id)
            .eq("user_id", user.id);
        }
        continue;
      }

      const { error } = await supabase.from("ai_memory_fragments").insert({
        user_id: user.id,
        content,
        memory_type: mem.type,
        importance,
        session_id: null,
      });
      if (error) console.error("[memory/extract] Insert error:", error);

      if (!error) {
        savedCount++;
        existingContents.push(content.toLowerCase());
      }
    }

    // Prune low-score entries if we're over 150 memories
    const { count } = await supabase
      .from("ai_memory_fragments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count || 0) > 150) {
      const { data: lowPriority } = await supabase
        .from("ai_memory_fragments")
        .select("id")
        .eq("user_id", user.id)
        .order("importance", { ascending: true })
        .limit(20);

      if (lowPriority && lowPriority.length > 0) {
        await supabase
          .from("ai_memory_fragments")
          .delete()
          .in("id", lowPriority.map(m => m.id));
      }
    }

    console.log(`[memory/extract] Done — saved ${savedCount} new memories`);
    return NextResponse.json({ ok: true, extracted: savedCount });
  } catch (err) {
    console.error("[memory/extract] Error:", err);
    return NextResponse.json({ ok: false });
  }
}
