import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getDefaultPersonality() {
  return {
    id: null,
    friendliness: 70,
    formality: 30,
    humor: 50,
    detail_level: 50,
    patience: 70,
    encouragement: 70,
    socratic_method: false,
    step_by_step: true,
    real_world_examples: true,
    custom_instructions: "",
    persona_description: "",
    use_emojis: true,
    use_analogies: true,
    analogy_frequency: 3,
    use_section_dividers: true,
  };
}

/**
 * GET /api/ai/personality - Get current user's AI personality settings
 */
export async function GET() {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.debug("[GET /api/ai/personality] Supabase not configured, returning defaults");
      return NextResponse.json(getDefaultPersonality());
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: personality, error } = await supabase
      .from("ai_personalities")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // PGRST116 = no rows found
    // PGRST205 = table missing from PostgREST schema cache (often "tables not migrated yet" in this Supabase project)
    if (error && error.code !== "PGRST116") {
      console.error("[GET /api/ai/personality] Database error:", error);
      // If table doesn't exist, return defaults
      if (error.code === "42P01" || error.code === "PGRST205") {
        console.warn("[GET /api/ai/personality] ai_personalities table doesn't exist - using defaults");
        return NextResponse.json(getDefaultPersonality());
      }
      return NextResponse.json({ error: "Failed to fetch personality" }, { status: 500 });
    }

    // Return default personality if none exists
    if (!personality) {
      return NextResponse.json(getDefaultPersonality());
    }

    return NextResponse.json(personality);
  } catch (error) {
    console.error("[GET /api/ai/personality] Unexpected error:", error);
    return NextResponse.json(getDefaultPersonality());
  }
}

/**
 * PUT /api/ai/personality - Update or create AI personality settings
 */
export async function PUT(request: Request) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.debug("[PUT /api/ai/personality] Supabase not configured, returning unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate and sanitize input
    const updateData: Record<string, unknown> = {
      friendliness: Math.max(0, Math.min(100, body.friendliness ?? 70)),
      formality: Math.max(0, Math.min(100, body.formality ?? 30)),
      humor: Math.max(0, Math.min(100, body.humor ?? 50)),
      detail_level: Math.max(0, Math.min(100, body.detail_level ?? 50)),
      patience: Math.max(0, Math.min(100, body.patience ?? 70)),
      encouragement: Math.max(0, Math.min(100, body.encouragement ?? 70)),
      socratic_method: Boolean(body.socratic_method),
      step_by_step: Boolean(body.step_by_step),
      real_world_examples: Boolean(body.real_world_examples),
      custom_instructions: String(body.custom_instructions || "").slice(0, 2000),
      persona_description: String(body.persona_description || "").slice(0, 1000),
      use_emojis: Boolean(body.use_emojis),
      use_analogies: Boolean(body.use_analogies),
      analogy_frequency: Math.max(0, Math.min(5, body.analogy_frequency ?? 3)),
      use_section_dividers:
        body.use_section_dividers === undefined ? undefined : Boolean(body.use_section_dividers),
    };

    // Check if personality exists
    const { data: existing } = await supabase
      .from("ai_personalities")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const saveWith = async (data: Record<string, unknown>) => {
      if (existing) {
        // Update existing
        const result = await supabase
          .from("ai_personalities")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .select()
          .single();
        return result.error;
      }

      // Insert new
      const result = await supabase
        .from("ai_personalities")
        .insert({ user_id: user.id, ...data })
        .select()
        .single();
      return result.error;
    };

    // First attempt (with whatever fields the client sent)
    let error = await saveWith(updateData);

    // If the DB hasn't been migrated yet to include `use_section_dividers`,
    // retry without that column so other settings still save.
    if (
      error &&
      error.code === "42703" &&
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("use_section_dividers") &&
      updateData.use_section_dividers !== undefined
    ) {
      const { use_section_dividers: _usd, ...rest } = updateData;
      error = await saveWith(rest);
    }

    if (error) {
      console.error("[PUT /api/ai/personality] Error:", error);
      if (error.code === "PGRST205") {
        // Table missing from PostgREST schema cache; likely not migrated/applied to this Supabase project yet.
        return NextResponse.json(
          { error: "Supabase tables not available (ai_personalities missing)" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "Failed to save personality" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/ai/personality] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
