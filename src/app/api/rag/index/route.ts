import { createClient } from "@/lib/supabase/server";
import { indexEntity, unindexEntity } from "@/lib/rag/indexer";
import { NextResponse } from "next/server";

/**
 * POST /api/rag/index - Index an entity synchronously on save.
 * Body: { entityType, entityId, subjectId?, content, metadata? }
 * Owner is always the authenticated user; never accepted from the body.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, entityId, subjectId = null, content = "", metadata = {} } = body;

    if (!entityType || !entityId || typeof entityId !== "string") {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }
    if (typeof content !== "string") {
      return NextResponse.json({ error: "content must be a string" }, { status: 400 });
    }
    if (typeof entityType !== "string") {
      return NextResponse.json({ error: "entityType must be a string" }, { status: 400 });
    }

    const ok = await indexEntity({
      ownerUserId: user.id,
      entityType: entityType as never,
      entityId,
      subjectId: subjectId || null,
      content,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    });

    if (!ok) {
      return NextResponse.json({ error: "Indexing failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/rag/index]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/rag/index?entityType=flashcard&entityId=xyz
 * Remove an entity embedding when the source is deleted.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId query params are required" }, { status: 400 });
    }

    const ok = await unindexEntity(entityType as never, entityId, user.id);
    if (!ok) {
      return NextResponse.json({ error: "Unindexing failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/rag/index]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}