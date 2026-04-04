/**
 * POST /api/shares/create
 *
 * Create a new document share (user-based or link-based)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      documentId,
      subjectId,
      permission,
      userId,
      createLink,
      expiresAt,
    } = body as {
      documentId: string;
      subjectId: string;
      permission: "view" | "edit";
      userId?: string;
      createLink?: boolean;
      expiresAt?: string;
    };

    if (!documentId || !subjectId || !permission) {
      return NextResponse.json(
        { error: "documentId, subjectId, and permission are required" },
        { status: 400 }
      );
    }

    // Verify user owns the document
    const { data: subjectData, error: subjectError } = await supabase
      .from("subject_data")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .single();

    if (subjectError || !subjectData) {
      return NextResponse.json(
        { error: "Subject not found or you don't have access" },
        { status: 404 }
      );
    }

    // Check if document exists in subject_data
    const { data: fullSubjectData } = await supabase
      .from("subject_data")
      .select("notes")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .single();

    const documents = fullSubjectData?.notes?.documents || [];
    const docExists = documents.some((d: any) => d.id === documentId);

    if (!docExists) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (createLink) {
      // Create a shareable link
      const { data: share, error: shareError } = await supabase
        .from("document_shares")
        .insert({
          document_id: documentId,
          subject_id: subjectId,
          owner_user_id: subjectData.user_id,
          permission,
          expires_at: expiresAt || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (shareError) {
        console.error("[shares/create] createLink failed:", shareError);
        return NextResponse.json(
          { error: "Failed to create share link" },
          { status: 500 }
        );
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        req.headers.get("origin") ||
        "https://analogix.app";
      const shareUrl = `${baseUrl}/shared/${share.id}`;

      return NextResponse.json({
        shareId: share.id,
        url: shareUrl,
        permission: share.permission,
        expiresAt: share.expires_at,
      });
    } else if (userId) {
      // Share with specific user
      // First, verify the user exists
      const { data: targetUser } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", userId)
        .single();

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      const { data: share, error: shareError } = await supabase
        .from("document_shares")
        .insert({
          document_id: documentId,
          subject_id: subjectId,
          owner_user_id: subjectData.user_id,
          shared_with_user_id: userId,
          permission,
          expires_at: expiresAt || null,
          created_by: user.id,
        })
        .select("*, owner_name:profiles(name)")
        .single();

      if (shareError) {
        console.error("[shares/create] shareWithUser failed:", shareError);
        // Check if it's a unique constraint violation (duplicate share)
        if (shareError.code === "23505") {
          return NextResponse.json(
            { error: "This document is already shared with this user" },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Failed to create share" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: share.id,
        sharedWith: {
          id: targetUser.id,
          name: targetUser.name,
        },
        permission: share.permission,
        expiresAt: share.expires_at,
      });
    } else {
      return NextResponse.json(
        { error: "Either userId or createLink must be provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[shares/create] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
