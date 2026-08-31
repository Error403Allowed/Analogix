import { NextResponse } from "next/server";
import { runObject, z } from "@/lib/ai";
import { requireUser, unauthResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

const enrichmentSchema = z.object({
  explanation: z.string(),
  examples: z.array(z.string()).min(2).max(4),
  misconceptions: z.array(z.string()).min(1).max(3),
  realWorld: z.string(),
});

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireUser();
  } catch {
    return unauthResponse();
  }
  const { supabase } = auth;

  try {
    const body = await request.json();
    const topicId: string = body.topicId || "";
    const subjectName: string = body.subjectName || "";
    const strand: string = body.strand || "";
    const topic: string = body.topic || "";
    const contentDescription: string = body.contentDescription || "";
    const elaborations: string[] = Array.isArray(body.elaborations) ? body.elaborations : [];
    const grade: string = body.grade || "7";

    if (!topicId || !topic || !contentDescription) {
      return NextResponse.json({ error: "Missing topic details" }, { status: 400 });
    }

    // Serve from cache if this topic has already been enriched by anyone.
    const { data: cached } = await supabase
      .from("curriculum_topic_enrichment")
      .select("explanation, examples, misconceptions, real_world")
      .eq("topic_id", topicId)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({
        explanation: cached.explanation,
        examples: cached.examples,
        misconceptions: cached.misconceptions,
        realWorld: cached.real_world,
        cached: true,
      });
    }

    const systemPrompt = `You are an expert Year ${grade} ${subjectName} teacher in Australia, writing study material for the "${strand}" strand.

The official curriculum content description for this topic is terse - your job is to expand it into something a Year ${grade} student can actually learn from.

Write:
- explanation: a clear, plain-language explanation of the topic (3-5 sentences), written directly to the student, in Australian English.
- examples: 2-4 short worked examples or illustrations of the concept in action.
- misconceptions: 1-3 common mistakes or misunderstandings students have with this specific topic.
- realWorld: one short sentence connecting this topic to something outside the classroom.

Stay tightly scoped to this exact topic - don't drift into adjacent topics.`;

    const result = await runObject<{
      explanation: string;
      examples: string[];
      misconceptions: string[];
      realWorld: string;
    }>({
      schema: enrichmentSchema,
      system: systemPrompt,
      prompt: `Topic: ${topic}\nContent description: ${contentDescription}\nElaborations: ${elaborations.join("; ")}`,
      taskType: "default",
      temperature: 0.4,
      maxTokens: 1200,
    });

    if (!result?.explanation) {
      return NextResponse.json({ error: "Enrichment generation failed" }, { status: 500 });
    }

    // Best-effort cache write - a duplicate insert (e.g. a concurrent
    // request for the same topic) just no-ops rather than erroring.
    await supabase
      .from("curriculum_topic_enrichment")
      .upsert(
        {
          topic_id: topicId,
          subject_name: subjectName,
          explanation: result.explanation,
          examples: result.examples,
          misconceptions: result.misconceptions,
          real_world: result.realWorld,
        },
        { onConflict: "topic_id", ignoreDuplicates: true },
      );

    return NextResponse.json({ ...result, cached: false });
  } catch (error) {
    console.error("[/api/ai/curriculum-enrich] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enrichment failed" },
      { status: 500 },
    );
  }
}
