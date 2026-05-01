import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, action } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "revert") {
      const { data: doc } = await supabase
        .from("documents")
        .select("id, content, content_backup")
        .eq("id", documentId)
        .eq("owner_user_id", user.id)
        .single();

      if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      if (!doc.content_backup) {
        return NextResponse.json({ error: "No backup found - cannot revert" }, { status: 400 });
      }

      const { error } = await supabase
        .from("documents")
        .update({
          content: doc.content_backup,
          content_backup: null,
          last_reverted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("owner_user_id", user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: "Document reverted to previous version" });
    }

    if (action === "status") {
      const { data: doc } = await supabase
        .from("documents")
        .select("id, content_backup, last_reverted_at")
        .eq("id", documentId)
        .eq("owner_user_id", user.id)
        .single();

      if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      return NextResponse.json({
        canRevert: !!doc.content_backup,
        lastRevertedAt: doc.last_reverted_at,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[documents/revert] Error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}