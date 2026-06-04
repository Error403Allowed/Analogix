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
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ ok: false, error: "no_api_key" });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages || [];
    const subjectId: string | undefined = body.subjectId;

    // Only look at the last 6 messages (3 exchanges) — enough context, not too expensive
    const recent = messages.slice(-6);
    if (recent.length < 2) return NextResponse.json({ ok: true, extracted: 0, reason: "too_few_messages" });

    // CHEAP PRE-FILTER: Skip extraction if no user messages contain likely personal info
    // This avoids burning 600+ tokens on messages that will definitely extract nothing.
    const userMessagesText = recent
      .filter(m => m.role === "user")
      .map(m => m.content.toLowerCase())
      .join(" ");

    const hasPersonalInfoKeywords = /(i am|i'm|my|i like|i don't|i don't like|i hate|i love|i prefer|always|never|usually|sometimes|my favorite|i use|i use in|i live|i've been|i've been doing|i'm taking|i'm doing|i'm studying|i'll|i need|my goal|my aim|i want|my question|help me understand|explain me|can you explain|find me|show me|tell me|what is|how do|why is)/.test(userMessagesText);

    if (!hasPersonalInfoKeywords) {
      console.log("[memory/extract] SKIPPED — no personal info keywords detected");
      return NextResponse.json({ ok: true, extracted: 0, skipped: "no_personal_info" });
    }

    if (!user) {
      console.log("[memory/extract] SKIPPED — user not authenticated");
      return NextResponse.json({ ok: false, error: "not_authenticated" });
    }

    const transcript = recent
      .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content.slice(0, 400)}`)
      .join("\n");

    const extractionPrompt = `You are a memory extraction system for a student AI tutor.
Read this conversation excerpt and extract facts, preferences, and context about the REAL student.

CRITICAL RULES:
1. NEVER extract from hypothetical/pretend scenarios — if student said "pretend", "imagine", "what if", it's NOT a real fact
2. NEVER extract questions the student asked — "solve log x" is a QUESTION, not a fact about the student
3. NEVER extract content the tutor explained — that's knowledge, not student info
4. Only extract ACTUAL facts about the student themselves
5. Be PROACTIVE — even subtle hints about the student should be captured. If they mention studying late, they might be a night owl. If they reference a specific exam board, note it.

FRAMING RULES — VERY IMPORTANT:
- Frame memories NEUTRALLY or POSITIVELY. NEVER use negative or deficit-based language.
- BAD: "struggles with calculus" — GOOD: "currently learning calculus"
- BAD: "doesn't understand velocity" — GOOD: "studying velocity concepts"
- BAD: "bad at maths" — GOOD: "working on maths skills"
- BAD: "failed last test" — GOOD: "recently completed a maths assessment"
- Frame areas of focus as "learning", "studying", "exploring", or "working on" — never "struggles with", "bad at", "doesn't understand", "can't do"
- Only extract genuinely useful information for personalising future tutoring. Skip trivial details.

EXTRACT these types of information:
- Facts: Year level, location, school type, subjects enrolled, exam boards (HSC, VCE, QCE, etc.)
- Preferences: "Prefers metric units", "Likes short answers", "Prefers simple explanations", "Likes visual diagrams"
- Skills: "Familiar with algebra", "Learning calculus", "Knows Python", "Studying physics"
- Goals: "Preparing for trials", "Aiming for 90+ in HSC", "Wanting to improve writing", "Interested in medicine"
- Context: "Uses a Mac", "Studies at night", "Has an exam next week", "Tutoring sister", "Works part-time"

IMPORTANT: Read between the lines. If a student asks for a simpler explanation, note that they prefer clear, accessible explanations. If they mention a specific teacher or textbook, note it. But always frame positively.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{"memories": [{"content": "extracted fact as a clear statement", "type": "fact|preference|skill|goal|context", "importance": 0.5}]}

Importance guidelines:
- 0.8-1.0: Critical info (goals, year level, exam dates, learning difficulties)
- 0.6-0.7: Strong preferences, subject enrollment, skill levels
- 0.4-0.5: General facts, mild preferences, study habits
- 0.3: Contextual info, minor details

Use ONLY the conversation below. If nothing clear was stated, return {"memories": []}.

Conversation:
${transcript}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: extractionPrompt }],
      max_tokens: 400,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }).catch(async (err: unknown) => {
      const error = err as { response?: { headers?: { get?: (key: string) => string | null }; status?: number }; message?: string };
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers?.get?.("retry-after");
        if (retryAfter) {
          const waitMs = (Number(retryAfter) || 5) * 1000;
          console.log(`[memory/extract] Rate limited, waiting ${waitMs}ms (retry-after: ${retryAfter})`);
          await new Promise(r => setTimeout(r, waitMs));
          return groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: extractionPrompt }],
            max_tokens: 400,
            temperature: 0.1,
            response_format: { type: "json_object" },
          });
        }
        const waitMs = 5000;
        console.log(`[memory/extract] Rate limited, waiting ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        return groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: extractionPrompt }],
          max_tokens: 400,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
      }
      throw err;
    });

    const raw = response.choices[0]?.message?.content?.trim() || "{}";
    console.log("[memory/extract] LLM raw output:", raw.slice(0, 300));

    // Strip markdown code blocks if present (LLMs love wrapping JSON in ```json ... ```)
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    let extracted: { memories: { content: string; type: string; importance: number }[] };
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      console.warn("[memory/extract] JSON parse failed, cleaned output:", cleaned.slice(0, 200));
      return NextResponse.json({ ok: true, extracted: 0, reason: "json_parse_failed" });
    }

    if (!Array.isArray(extracted.memories) || extracted.memories.length === 0) {
      return NextResponse.json({ ok: true, extracted: 0 });
    }

    // Skip the expensive second-pass verification step — our cheap pre-filter catches most noise
    // Use all extracted memories (the LLM already filtered based on the prompt instructions)
    const accurateMemories = extracted.memories;

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

    // Helper: compute word-level Jaccard similarity for deduplication
    const wordOverlap = (a: string, b: string): number => {
      const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
      const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
      if (wordsA.size === 0 || wordsB.size === 0) return 0;
      let intersection = 0;
      for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
      const union = wordsA.size + wordsB.size - intersection;
      return union > 0 ? intersection / union : 0;
    };

    const DEDUP_THRESHOLD = 0.5; // 50% word overlap = duplicate

    let savedCount = 0;
    for (const mem of accurateMemories) {
      if (!mem.content || !validTypes.includes(mem.type)) continue;
      const content = String(mem.content).slice(0, 500);
      const importance = Math.max(0.3, Math.min(1.0, Number(mem.importance) || 0.6));

      // Deduplication: skip if similar content already exists (word-level overlap)
      const matchIndex = existingContents.findIndex(ec =>
        wordOverlap(ec, content.toLowerCase()) >= DEDUP_THRESHOLD
      );
      const isDuplicate = matchIndex >= 0;

      if (isDuplicate) {
        // Reinforce existing — bump importance + reinforcement_count
        const match = (existing || [])[matchIndex];
        if (match) {
          const newCount = (match.reinforcement_count || 0) + 1;
          const newImportance = Math.min(1.0, 0.5 + (newCount - 1) * 0.05);
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
