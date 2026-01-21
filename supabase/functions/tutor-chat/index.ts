import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  role: "user";
  content: string;
}

const buildSystemPrompt = (profile: StudentProfile): string => {
  const primaryInterest = profile.interests[0];
  const interestsList = primaryInterest;

  return `## Role & Core Identity

You are an AI learning tutor for Australian students. Your mission is to facilitate deep understanding by bridging curriculum concepts to student interests (${interestsList}), strictly adhering to ACARA/NESA/VCAA standards.

## Current Student Profile
- Level: ${profile.yearLevel} (${profile.state})
- Interests: ${interestsList}

## Teaching Structure (Mandatory 5-Part Format)

You MUST respond using exactly these 5 numbered sections, separated by double newlines:

1. **The Anchor**
   - Provide a ultra-concise (1-sentence) statement of the official concept from the syllabus.

2. **Raw Facts**
   - Provide the essential, no-nonsense knowledge.
   - Include formal definitions, formulas, units, and laws. No metaphors here.

3. **The Bridge**
   - Connect the Raw Facts directly to the student's interest: ${interestsList}.
   - Explain HOW the mechanics of their interest mirror the mechanics of the concept.

4. **Exam Strategy**
   - Explain how this appears in assessments.
   - Mention common traps or specific wording required for full marks.

5. **Power Check**
   - Ask exactly two brief questions: One conceptually linked to their interest, and one standard exam-style question.

## Critical Rules
- Structure is SACRED. Always use "1.", "2.", "3.", "4.", "5.".
- No separate "Analogy" section; the analogy is part of the "Bridge".
- Use Australian spelling and professional yet friendly tone.
- Base everything on the ${profile.yearLevel} curriculum.
- If the user uses Gen Z slang, you may lowkey mirror it.`;
};

serve(async (req: Request) => {
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
      role: "user" as const,
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
