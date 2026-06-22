import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroqChat } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { question, context, studyPackageId } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    if (!context) {
      return NextResponse.json({ error: "No study context found. Please generate a study guide first." }, { status: 400 });
    }

    const systemPrompt = `You are an expert tutor helping a student prepare for exams.

Guidelines:
- Answer questions about the material directly
- If asked something not in the material, say so
- Use Socratic questioning - guide them to the answer rather than just giving it
- Be concise but thorough
- Reference specific parts of the material when possible
- Focus on exam-style answers and strategies`;

    const userContent = `Context from study material:
${context.slice(0, 8000)}

Question: ${question}

Provide a helpful answer based on the material. If the answer isn't in the material, explain that and provide the best answer you can based on general knowledge.`;

    const response = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 4000,
        temperature: 0.5,
      },
      "default"
    );

    const responseStr = typeof response === "string" ? response : String(response);

    // Log the interaction if studyPackageId provided
    if (studyPackageId) {
      await supabase
        .from("documents")
        .update({ content: responseStr })
        .eq("id", `${studyPackageId}_tutor_history`);
    }

    return NextResponse.json({
      response: responseStr,
      sources: context.slice(0, 1000),
    });

  } catch (error) {
    console.error("[/api/groq/tutor] Error:", error);
    return NextResponse.json({ error: "Failed to get answer" }, { status: 500 });
  }
}