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
    // Final fallback if default subject is also not in user's subjects
    if (!subjectId || !userSubjectSet.has(subjectId)) {
      subjectId = userSubjectSet.values().next().value || "math";
    }

    const setName = (action.setName || `Study Notes – ${new Date().toLocaleDateString()}`).trim();
    const cards = (action.cards || []).filter(
      (c) => c.front?.trim() && c.back?.trim()
    );

    if (cards.length === 0) {
      return {
        type: "add_flashcards",
        status: "failed",
        message: "No valid cards provided (each card needs non-empty front and back)",
      };
    }

    if (cards.length < 5) {
      return {
        type: "add_flashcards",
        status: "failed",
        message: `Only ${cards.length} card(s) provided — flashcard sets must have at least 5 cards. No cards were saved.`,
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
      // If the set already exists (duplicate key), try to use existing set
      if (setError.code === "23505" || setError.message?.includes("duplicate")) {
        // Fetch the existing set
        const { data: existingSet } = await supabase
          .from("flashcard_sets")
          .select("id")
          .eq("user_id", userId)
          .eq("name", setName)
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (existingSet) {
          // Use existing set ID and still insert cards
          return await insertFlashcards(supabase, userId, existingSet.id, setName, subjectId as string, cards, now);
        }
      }
      return {
        type: "add_flashcards",
        status: "failed",
        message: `Failed to create set: ${setError.message}`,
      };
    }

    return await insertFlashcards(supabase, userId, setId, setName, subjectId as string, cards, now);
  } catch (error) {
    console.error("[handleAddFlashcards] Error:", error);
    return {
      type: "add_flashcards",
      status: "failed",
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function insertFlashcards(
  supabase: any,
  userId: string,
  setId: string,
  setName: string,
  subjectId: string,
  cards: Array<{ front: string; back: string }>,
  now: string
): Promise<any> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextReview = tomorrow.toISOString();

  const cardDocs = cards.map((card) => ({
    id: randomUUID(),
    user_id: userId,
    set_id: setId,
    subject_id: subjectId,
    front: card.front.trim(),
    back: card.back.trim(),
    next_review: nextReview,
    interval_days: 1,
    ease_factor: 2.5,
    repetitions: 0,
    created_at: now,
    updated_at: now,
  }));

  // Insert in batches to avoid hitting row limits
  const BATCH_SIZE = 50;
  let insertedCount = 0;
  let lastError: string | null = null;

  for (let i = 0; i < cardDocs.length; i += BATCH_SIZE) {
    const batch = cardDocs.slice(i, i + BATCH_SIZE);
    const { error: cardsError } = await supabase
      .from("flashcards")
      .insert(batch);

    if (cardsError) {
      console.error("[agent-action] Cards insertion error (batch):", cardsError);
      lastError = cardsError.message;
      // Continue to next batch anyway
    } else {
      insertedCount += batch.length;
    }
  }

  if (insertedCount === 0) {
    return {
      type: "add_flashcards",
      status: "failed",
      message: `All cards failed to insert: ${lastError}`,
      setId,
      setName,
      cardCount: 0,
    };
  }

  return {
    type: "add_flashcards",
    status: insertedCount === cards.length ? "success" : "partial",
    setId,
    setName,
    cardCount: insertedCount,
    message: `Created "${setName}" with ${insertedCount}/${cards.length} cards`,
  };
}
