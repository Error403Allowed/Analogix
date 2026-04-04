/**
 * GET /api/shares/incoming
 *
 * Get all documents shared with the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
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

    // Use the RPC function to get shared documents
    const { data, error } = await supabase.rpc("get_shared_documents_for_user");

    if (error) {
      console.error("[shares/incoming] failed:", error);
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
  } catch (error) {
    console.error("[shares/incoming] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
