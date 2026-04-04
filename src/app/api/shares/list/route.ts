/**
 * GET /api/shares/list
 *
 * List all shares for a document (owner view) or all documents shared with user
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
    const documentId = searchParams.get("documentId");
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type") || "outgoing"; // 'outgoing' or 'incoming'

    if (type === "outgoing") {
      // List shares created by user (for a specific document or all)
      let query = supabase
        .from("document_shares")
        .select("*")
        .eq("owner_user_id", user.id)
        .eq("revoked", false)
        .order("created_at", { ascending: false });

      if (documentId && subjectId) {
        query = query.eq("document_id", documentId).eq("subject_id", subjectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[shares/list] outgoing failed:", error);
        // Check if table doesn't exist (migration not run)
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return NextResponse.json(
            { error: "Sharing feature not set up yet. Please run the database migration in Supabase.", needsMigration: true },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: "Failed to fetch shares" },
          { status: 500 }
        );
      }

      // Fetch profiles separately since we can't do the join easily
      const userIds = [...new Set((data || []).map((s: any) => s.shared_with_user_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
        }
      }

      return NextResponse.json({
        shares: (data || []).map((share: any) => ({
          id: share.id,
          document_id: share.document_id,
          subject_id: share.subject_id,
          permission: share.permission,
          expires_at: share.expires_at,
          created_at: share.created_at,
          shared_with: share.shared_with_user_id
            ? {
                id: share.shared_with_user_id,
                name: profilesMap[share.shared_with_user_id]?.name || null,
              }
            : null,
          is_link: !share.shared_with_user_id,
        })),
      });
    } else {
      // List documents shared with user (incoming)
      const { data, error } = await supabase.rpc("get_shared_documents_for_user");

      if (error) {
        console.error("[shares/list] incoming failed:", error);
        return NextResponse.json(
          { error: "Failed to fetch shared documents" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        documents: (data || []).map((item: any) => ({
          document_id: item.document_id,
          subject_id: item.subject_id,
          owner_user_id: item.owner_user_id,
          owner_name: item.owner_name,
          permission: item.permission,
          shared_at: item.shared_at,
          document_title: item.document_title,
          document_data: item.document_data,
        })),
      });
    }
  } catch (error) {
    console.error("[shares/list] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
