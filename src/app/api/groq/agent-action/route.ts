import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import { SUBJECT_CATALOG } from "@/constants/subjects";

export const runtime = "nodejs";

interface ActionPayload {
  type: string;
  subjectId?: string;
  setName?: string;
  cards?: Array<{ front: string; back: string }>;
}

const VALID_SUBJECT_IDS = new Set(SUBJECT_CATALOG.map(s => s.id));

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { actions = [], defaultSubjectId = "math", source = "chat" } = body;

    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Fetch user's actual subjects from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("subjects")
      .eq("id", user.id)
      .single();

    const userSubjects: string[] = profile?.subjects || [];
    const userSubjectSet = new Set(userSubjects);

    // Resolve the default subject: must be one the user actually picked
    const resolvedDefault = VALID_SUBJECT_IDS.has(defaultSubjectId) && userSubjectSet.has(defaultSubjectId)
      ? defaultSubjectId
      : userSubjects[0] || "math";

    const results: any[] = [];

    for (const action of actions) {
      if (action.type === "add_flashcards") {
        const result = await handleAddFlashcards(
          supabase,
          user.id,
          action as ActionPayload,
          resolvedDefault,
          userSubjectSet
        );
        results.push(result);
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[/api/groq/agent-action] Error:", error);
    return NextResponse.json(
      { error: "Failed to process actions" },
      { status: 500 }
    );
  }
}

export async function handleAddFlashcards(
  supabase: any,
  userId: string,
  action: ActionPayload,
  defaultSubjectId: string,
  userSubjectSet: Set<string>
): Promise<any> {
  try {
    // Only accept subjectIds the user actually has
    let subjectId = action.subjectId;
    if (!subjectId || !userSubjectSet.has(subjectId)) {
      subjectId = defaultSubjectId;
    }

    const setName = action.setName || `Study Notes – ${new Date().toLocaleDateString()}`;
    const cards = action.cards || [];

    if (cards.length === 0) {
      return {
        type: "add_flashcards",
        status: "failed",
        message: "No cards provided",
      };
    }

    const setId = randomUUID();
    const now = new Date().toISOString();

    const { data: setData, error: setError } = await supabase
      .from("flashcard_sets")
      .insert({
        id: setId,
        user_id: userId,
        subject_id: subjectId,
        name: setName,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (setError) {
      console.error("[agent-action] Set creation error:", setError);
      return {
        type: "add_flashcards",
        status: "failed",
        message: `Failed to create set: ${setError.message}`,
      };
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextReview = tomorrow.toISOString();

    const cardDocs = cards.map((card) => ({
      id: randomUUID(),
      user_id: userId,
      set_id: setId,
      subject_id: subjectId,
      front: card.front,
      back: card.back,
      next_review: nextReview,
      interval_days: 1,
      ease_factor: 2.5,
      repetitions: 0,
      created_at: now,
      updated_at: now,
    }));

    if (cardDocs.length > 0) {
      const { error: cardsError } = await supabase
        .from("flashcards")
        .insert(cardDocs);

      if (cardsError) {
        console.error("[agent-action] Cards insertion error:", cardsError);
        return {
          type: "add_flashcards",
          status: "partial",
          message: `Set created but some cards failed: ${cardsError.message}`,
          setId: setId,
          cardCount: 0,
        };
      }
    }

    return {
      type: "add_flashcards",
      status: "success",
      setId: setId,
      setName: setName,
      cardCount: cards.length,
      message: `Created "${setName}" with ${cards.length} cards`,
    };
  } catch (error) {
    console.error("[handleAddFlashcards] Error:", error);
    return {
      type: "add_flashcards",
      status: "failed",
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
