/**
 * GET /api/shares/user-search
 *
 * Search for users by email or name for sharing
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search profiles by name
    // Note: Email search requires admin privileges, so we search by name only
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name")
      .ilike("name", `%${query}%`)
      .neq("id", user.id) // Exclude current user
      .limit(10);

    if (error) {
      console.error("[shares/user-search] failed:", error);
      return NextResponse.json(
        { error: "Failed to search users" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: (data || []).map((profile: any) => ({
        id: profile.id,
        name: profile.name,
      })),
    });
  } catch (error) {
    console.error("[shares/user-search] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
