// Supabase Edge Function using Google Gemini API

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StudentProfile {
  yearLevel: string;
  state: string;
  subjects: string[];
  interests: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const buildSystemPrompt = (profile: StudentProfile): string => {
  const primaryInterest = profile.interests[0];
  const interestsList = primaryInterest;

  return `### Role & Core Identity
You are an approachable, vibrant, and expert AI tutor for Australian students. Your mission is to facilitate deep conceptual understanding by seamlessly weaving curriculum concepts into the student's interests (${interestsList}).
You should sound like a high-end human mentor—passionate, encouraging, smart, and relatable. Avoid sounding like a textbook or a typical repetitive AI.

Current Student Profile
	•	Level: ${profile.yearLevel} (${profile.state} Curriculum)
	•	Passions: ${interestsList}

Teaching Flow (Visual Blueprint)
You MUST follow this exact vertical layout using exactly 5 separators (⸻⸻⸻) throughout your response. Each separator MUST be on its own line with a blank line above and below it.

[Greeting & Hook]
You MUST start your response with one of these EXACT greetings: "Hey!" or "Hi there!" or "What's up!" or "How's it going!"
Then connect the topic to ${interestsList} immediately.

⸻⸻⸻

[The Syllabus Anchor]
Explain what the concept actually means in plain, clever English. Pivot from the interest into the technical facts.

⸻⸻⸻

[The Passion Connection]
Explain how the mechanics of ${interestsList} mirror the academic concept. Make it "click" with an intuitive bridge.

⸻⸻⸻

[The Deep Dive]
Walk them through the essential technical facts or formulas for ${profile.yearLevel}. Use dot points for clarity.

⸻⸻⸻

[Exam Insight]
Share a quick "pro tip"—how this shows up in tests or a common mistake to avoid.

⸻⸻⸻

[Power Check]
End with exactly two casual questions: one linked to ${interestsList} and one standard exam-style question.

Critical Rules (Non-Negotiable)
	•	You MUST use exactly 5 separators: ⸻⸻⸻
	•	Each separator MUST be on its own line.
	•	Your FIRST WORD must be "Hey!" or "Hi" or "What's" or "How's".
  • You CANNOT say G'day at any point in the conversations.
	•	Do not use rigid markdown headers (###).
	•	Maintain a mentor-like, encouraging, and sleek tone.
	•	Stop immediately after the Power Check.
  • When the user is answering a question(s) from the power check, do NOT follow the structure and instead tell them if they are right and/or wrong.`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, profile } = await req.json() as {
      messages: Message[];
      profile: StudentProfile;
    };

    if (!profile || !Array.isArray(profile.interests) || profile.interests.length === 0) {
      throw new Error("Invalid or missing student interests");
    }
    if (!Array.isArray(messages)) {
      throw new Error("Invalid messages payload");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("Gemini API key not configured in Supabase secrets");
    }

    console.log("Processing chat request for", profile.yearLevel, profile.state);

    const systemPrompt = buildSystemPrompt(profile);

    // Convert messages to Gemini format
    // Add system prompt as first user message for stronger adherence
    const geminiContents = [
      {
        role: "user",
        parts: [{ text: `[SYSTEM INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY]\n\n${systemPrompt}\n\n---\n\nNow respond to the student's question below. Remember: Use exactly 5 ⸻⸻⸻ separators and NEVER say "G'day".` }],
      },
      {
        role: "model",
        parts: [{ text: "Understood! I will follow the exact format with 5 separators (⸻⸻⸻), never use 'G'day', and maintain my role as a vibrant Australian tutor. Ready for the student's question!" }],
      },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content).slice(0, 4000) }],
      })),
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Authentication failed. Check your API key." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 400) {
        return new Response(
          JSON.stringify({ error: "Invalid request. Check your input." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get AI response from Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response started");

    // Transform Gemini SSE to OpenAI-compatible format for the frontend
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                // Post-process: Replace any G'day with Hey (both straight and curly apostrophes)
                const cleanedContent = content
                  .replace(/G['']day/gi, "Hey")
                  .replace(/G'day/gi, "Hey");
                
                // Debug log
                if (content !== cleanedContent) {
                  console.log("Replaced G'day in response");
                }
                
                // Convert to OpenAI-compatible format
                const openaiFormat = {
                  choices: [{ delta: { content: cleanedContent } }],
                };
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify(openaiFormat)}\n\n`)
                );
              }
            } catch (e) {
              console.error("Error parsing Gemini response:", e);
            }
          }
        }
      },
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("tutor-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});