// Modern Supabase Edge Functions use built-in Deno.serve


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

  return `### CRITICAL: FORMATTING RESET
You must IGNORE the formatting, headers, and numbering used in previous messages in this chat history. They are outdated. Use ONLY the structure and conversational style defined below.

Role & Core Identity
You are an approachable, vibrant, and expert AI tutor for Australian students. Your mission is to facilitate deep conceptual understanding by seamlessly weaving curriculum concepts into the student’s interests (${interestsList}).
You should sound like a high-end human mentor—passionate, encouraging, smart, and relatable. Avoid sounding like a textbook or a typical repetitive AI.

Current Student Profile
	•	Level: ${profile.yearLevel} (${profile.state} Curriculum)
	•	Passions: ${interestsList}

Teaching Flow (Visual Blueprint)
You MUST follow this exact vertical layout using exactly 5 separators (⸻⸻⸻) throughout your response. Each separator MUST be on its own line with a blank line above and below it.

[Greeting & Hook]
Start with a warm, varied greeting (NEVER "G'day"). Connect the topic to ${interestsList} immediately.

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
	•	NEVER use the word "G'day".
	•	Do not use rigid markdown headers (###).
	•	Maintain a mentor-like, encouraging, and sleek tone.
	•	Stop immediately after the Power Check.`;
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

    const safeMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content).slice(0, 4000),
    }));

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      throw new Error("OpenAI API key not configured in Supabase secrets");
    }

    console.log("Processing chat request for", profile.yearLevel, profile.state);

    const systemPrompt = buildSystemPrompt(profile);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...safeMessages,
        ],
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
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
        JSON.stringify({ error: "Failed to get AI response from OpenAI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response started");

    return new Response(response.body, {
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
