import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/ai/memory - Get user's AI memory fragments and summaries
 */
export async function GET(request: Request) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.debug("[GET /api/ai/memory] Supabase not configured, returning empty");
      return NextResponse.json({ memories: [], summaries: [] });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // Optional filter by memory type
    const limit = parseInt(searchParams.get("limit") || "50");

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("ai_memory_fragments")
      .select("*")
      .eq("user_id", user.id)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq("memory_type", type);
    }

    const { data: memories, error } = await query;

    // PGRST205 = table missing from PostgREST schema cache (often "tables not migrated yet" in this Supabase project)
    if (error) {
      console.error("[GET /api/ai/memory] Database error:", error);
      // If table doesn't exist, return empty
      if (error.code === "42P01" || error.code === "PGRST205") {
        console.warn("[GET /api/ai/memory] ai_memory_fragments table doesn't exist - returning empty");
        return NextResponse.json({ memories: [], summaries: [] });
      }
      return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
    }

    // Also fetch summaries
    const { data: summaries, error: summariesError } = await supabase
      .from("ai_memory_summaries")
      .select("*")
      .eq("user_id", user.id)
      .order("end_date", { ascending: false })
      .limit(10);
    
    if (summariesError && summariesError.code !== "42P01" && summariesError.code !== "PGRST205") {
      console.warn("[GET /api/ai/memory] Failed to fetch summaries:", summariesError);
    }

    return NextResponse.json({
      memories: memories || [],
      summaries: summaries || [],
    });
  } catch (error) {
    console.error("[GET /api/ai/memory] Unexpected error:", error);
    return NextResponse.json({ memories: [], summaries: [] });
  }
}

/**
 * POST /api/ai/memory - Add a new memory fragment
 */
export async function POST(request: Request) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.debug("[POST /api/ai/memory] Supabase not configured, returning unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, memory_type, importance = 0.5, session_id } = body;

    if (!content || !memory_type) {
      return NextResponse.json(
        { error: "Content and memory_type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["fact", "preference", "skill", "goal", "context"];
    if (!validTypes.includes(memory_type)) {
      return NextResponse.json(
        { error: "Invalid memory_type" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_memory_fragments")
      .insert({
        user_id: user.id,
        content: String(content).slice(0, 5000),
        memory_type,
        importance: Math.max(0, Math.min(1, importance)),
        session_id: session_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/ai/memory] Error:", error);
      return NextResponse.json({ error: "Failed to save memory" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[POST /api/ai/memory] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/ai/memory - Delete a memory fragment
 */
export async function DELETE(request: Request) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.debug("[DELETE /api/ai/memory] Supabase not configured, returning unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get("id");

    if (!memoryId) {
      return NextResponse.json({ error: "Memory ID required" }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership before deleting
    const { data: memory } = await supabase
      .from("ai_memory_fragments")
      .select("user_id")
      .eq("id", memoryId)
      .single();

    if (!memory || memory.user_id !== user.id) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("ai_memory_fragments")
      .delete()
      .eq("id", memoryId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/ai/memory] Error:", error);
      return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/ai/memory] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/ai/memory - Update memory importance or reinforce
 */
export async function PUT(request: Request) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.debug("[PUT /api/ai/memory] Supabase not configured, returning unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get("id");
    const body = await request.json();

    if (!memoryId) {
      return NextResponse.json({ error: "Memory ID required" }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.importance === "number") {
      updateData.importance = Math.max(0, Math.min(1, body.importance));
    }
    if (body.reinforce === true) {
      // Get current reinforcement count and increment
      const { data: existing } = await supabase
        .from("ai_memory_fragments")
        .select("reinforcement_count")
        .eq("id", memoryId)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        updateData.reinforcement_count = (existing.reinforcement_count || 0) + 1;
        updateData.last_accessed_at = new Date().toISOString();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid update fields" }, { status: 400 });
    }

    const { error } = await supabase
      .from("ai_memory_fragments")
      .update(updateData)
      .eq("id", memoryId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[PUT /api/ai/memory] Error:", error);
      return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/ai/memory] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
