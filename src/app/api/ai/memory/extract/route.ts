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
Read this conversation excerpt and extract ONLY stable facts about the REAL student.

CRITICAL RULES:
1. NEVER extract from hypothetical/pretend scenarios - if student said "pretend", "imagine", "what if", it's NOT a real fact
2. NEVER extract questions the student asked - "solve log x" is a QUESTION, not a fact about the student
3. NEVER extract content the tutor explained - that's knowledge, not student info
4. Only extract ACTUAL facts about the student themselves

EXTRACT ONLY real facts the student explicitly stated about themselves:
- Named subjects: "I do chemistry", "I'm in Year 11"
- Direct preferences: "I prefer videos", "explain simply"
- Clear goals: "I need to pass my trials", "want 90+ in HSC"

Use ONLY the conversation below. If nothing clear was stated, return { "memories": [] }.

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

    // Verify memories are accurate - filter out hypothetical/pretend scenarios
    const verifyPrompt = `You are a memory verification system. Given a list of extracted memories from a conversation, determine which ones are accurate facts about the real student vs hypothetical scenarios, roleplay, or inaccurate information.

For each memory, respond with ONLY a JSON array of booleans (true = accurate fact, false = not accurate):
- Return true ONLY if it's a confirmed fact about the actual student
- Return false if it's from: hypothetical/pretend scenarios, roleplay, "what if" questions, unconfirmed assumptions, or clearly wrong information

Conversation excerpt:
${transcript}

Extracted memories:
${extracted.memories.map((m: { content: string }) => `- ${m.content}`).join("\n")}

Return JSON array like: [true, false, true, ...]`;

    const verifyResponse = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: verifyPrompt }],
      max_tokens: 200,
      temperature: 0.1,
    });

    const verifyRaw = verifyResponse.choices[0]?.message?.content?.trim() || "[]";
    let verifiedFlags: boolean[] = [];
    try {
      verifiedFlags = JSON.parse(verifyRaw);
    } catch {
      // If parsing fails, be conservative - don't save anything
      verifiedFlags = [];
    }

    // Filter to only accurate memories
    const accurateMemories = extracted.memories.filter((_: unknown, idx: number) => {
      // If verification failed or index out of bounds, be conservative and include the memory
      // but with lower importance
      if (idx >= verifiedFlags.length) return true;
      return verifiedFlags[idx] === true;
    });

    if (accurateMemories.length === 0) {
      console.log("[memory/extract] All memories filtered out as inaccurate");
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
    for (const mem of accurateMemories) {
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
