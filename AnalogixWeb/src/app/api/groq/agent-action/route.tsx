import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createFlashcardSet, createFlashcards } from "@analogix/shared/tools/handlers";
import { SUBJECT_CATALOG } from "@/constants/subjects";

export const runtime = "nodejs";

const VALID_SUBJECT_IDS = new Set(SUBJECT_CATALOG.map(s => s.id));

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const { actions = [], defaultSubjectId = "math" } = body;
        if (!Array.isArray(actions) || actions.length === 0) {
            return NextResponse.json({ results: [] });
        }
        const { data: profile } = await supabase
            .from("profiles")
            .select("subjects")
            .eq("id", user.id)
            .single();
        const userSubjects = profile?.subjects || [];
        const userSubjectSet = new Set(userSubjects);
        const resolvedDefault = VALID_SUBJECT_IDS.has(defaultSubjectId) && userSubjectSet.has(defaultSubjectId)
            ? defaultSubjectId
            : userSubjects[0] || "math";
        const results: any[] = [];
        for (const action of actions) {
            if (action.type === "add_flashcards") {
                const result = await handleAddFlashcards(supabase, user.id, action, resolvedDefault, userSubjectSet);
                results.push(result);
            }
        }
        return NextResponse.json({ results });
    }
    catch (error) {
        console.error("[/api/groq/agent-action] Error:", error);
        return NextResponse.json({ error: "Failed to process actions" }, { status: 500 });
    }
}

async function handleAddFlashcards(supabase, userId, action, defaultSubjectId, userSubjectSet) {
    try {
        let subjectId = action.subjectId;
        if (!subjectId || !userSubjectSet.has(subjectId)) {
            subjectId = defaultSubjectId;
        }
        if (!subjectId || !userSubjectSet.has(subjectId)) {
            subjectId = userSubjectSet.values().next().value || "math";
        }
        const setName = (action.setName || `Study Notes – ${new Date().toLocaleDateString()}`).trim();
        const cards = (action.cards || []).filter((c) => c.front?.trim() && c.back?.trim());
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
        try {
            const setData = await createFlashcardSet(userId, supabase, { subjectId, name: setName, cards });
            return {
                type: "add_flashcards",
                status: "success",
                setId: setData.id,
                setName,
                cardCount: setData.cardCount,
            };
        } catch (setError) {
            if (setError?.code === "23505" || setError?.message?.includes("duplicate")) {
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
                    const result = await createFlashcards(userId, supabase, { setId: existingSet.id, cards }, 50);
                    return {
                        type: "add_flashcards",
                        status: "success",
                        setId: existingSet.id,
                        setName,
                        cardCount: result.inserted,
                    };
                }
            }
            return {
                type: "add_flashcards",
                status: "failed",
                message: `Failed to create set: ${setError instanceof Error ? setError.message : "Unknown error"}`,
            };
        }
    }
    catch (error) {
        console.error("[handleAddFlashcards] Error:", error);
        return {
            type: "add_flashcards",
            status: "failed",
            message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}
