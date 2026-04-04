/**
 * GET /api/shares/access/[shareId]
 *
 * Access a document via share link
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    
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

    // Get the share record (public access allowed for valid links)
    const { data: share, error: shareError } = await supabase
      .from("document_shares")
      .select("*")
      .eq("id", shareId)
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { error: "Invalid share link" },
        { status: 404 }
      );
    }

    // Check if revoked
    if (share.revoked) {
      return NextResponse.json(
        { error: "This share link has been revoked" },
        { status: 403 }
      );
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 403 }
      );
    }

    // Get the document data
    const { data: subjectData, error: docError } = await supabase
      .from("subject_data")
      .select("notes")
      .eq("user_id", share.owner_user_id)
      .eq("subject_id", share.subject_id)
      .single();

    if (docError || !subjectData) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Find the specific document
    const documents = subjectData.notes?.documents || [];
    const document = documents.find((d: any) => d.id === share.document_id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get owner profile info
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", share.owner_user_id)
      .single();

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        permission: share.permission,
        expires_at: share.expires_at,
      },
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
        contentJson: document.contentJson,
        contentText: document.contentText,
        contentFormat: document.contentFormat,
        role: document.role,
        studyGuideData: document.studyGuideData,
        icon: document.icon,
        cover: document.cover,
        createdAt: document.createdAt,
        lastUpdated: document.lastUpdated,
      },
      owner: {
        id: share.owner_user_id,
        name: ownerProfile?.name,
      },
      subject: {
        id: share.subject_id,
      },
      isAuthenticated: !!user,
    });
  } catch (error) {
    console.error("[shares/access] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
