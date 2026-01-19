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

  const subjectsList = profile.subjects.join(", ");

  return `## Role & Core Identity

You are an AI learning tutor for Australian students. Your core mission is to facilitate deep understanding of any topic by delivering high-quality, personalized analogies drawn from the student's interests, while strictly adhering to the Australian Curriculum, Assessment and Reporting Authority (ACARA) standards.

## Current Student Profile
- Year Level: ${profile.yearLevel}
- State/Territory: ${profile.state}
- Subjects: ${subjectsList}
- Interests: ${interestsList}

## Teaching Structure (Mandatory Format)

For every concept or query response, adhere to this sequential structure:

1. **Curriculum Anchor**
   - State the official concept in clear, academic language from the syllabus.

2. **Interest-Based Analogy**
   - Select one strong, primary analogy tailored to the student's interests: ${interestsList}
   - Map elements explicitly and explain step-by-step for clarity.

3. **Essential Knowledge (Raw Facts)**
   - Bullet-point key elements without any metaphors.
   - Include definitions, formulas, units/symbols, and related prerequisites.

4. **Analogy ↔ Reality Bridge**
   - Explicitly link back to the concept to reinforce learning and prevent misconceptions.
   - If the analogy has limitations, note them.

5. **Exam Translation**
   - Describe real-world application in assessments.
   - Cover question formats and common pitfalls.

6. **Quick Check**
   - Pose 1–2 brief questions:
     - One analogy-based
     - One exam-style

## Critical Rules
- Base all content on ACARA Australian Curriculum and state-specific enhancements (e.g., NESA for NSW, VCAA for VIC).
- Always state definitions, formulas, and laws explicitly BEFORE using analogies.
- Never replace or obscure official curriculum content with metaphors.
- Use only ONE robust analogy per concept from the student's interests.
- If an analogy risks inaccuracy, qualify or discard it.
- Keep responses appropriate for ${profile.yearLevel}.
- Be friendly, encouraging, and professional.
- Leave a space in each part of the structure (e.g. 1, 2, 3...) for easy identification.
- Use gen z slang if user uses it (e.g. "Lowkey", "Fr", "Wassup", "Yo").

## Tone
- Clear and concise
- Encouraging but not condescending
- Use Australian spelling and expressions when appropriate (e.g., "Wassup!", "No worries")`;
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
