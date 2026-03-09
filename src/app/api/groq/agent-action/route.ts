import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export const runtime = "nodejs";

const STUDY_GUIDE_PREFIX = "__STUDY_GUIDE_V2__";

function findDoc(documents: Record<string, unknown>[], docTitle: string) {
  const search = docTitle.toLowerCase().trim();

  // 1. Exact match (case-insensitive)
  const exact = documents.find(d => typeof d.title === "string" && d.title.toLowerCase() === search);
  if (exact) return exact;

  // 2. Substring match either way
  const sub = documents.find(d => typeof d.title === "string" && (
    d.title.toLowerCase().includes(search) || search.includes(d.title.toLowerCase())
  ));
  if (sub) return sub;

  // 3. Word-overlap score — find the doc whose title shares the most words with the search
  const searchWords = new Set(search.split(/\W+/).filter(w => w.length > 3));
  let bestDoc: Record<string, unknown> | undefined;
  let bestScore = 0;
  for (const d of documents) {
    if (typeof d.title !== "string") continue;
    const titleWords = d.title.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);
    const overlap = titleWords.filter((w: string) => searchWords.has(w)).length;
    const score = overlap / Math.max(searchWords.size, titleWords.length, 1);
    if (score > bestScore) { bestScore = score; bestDoc = d; }
  }
  // Require at least 40% word overlap to avoid false positives
  return bestScore >= 0.4 ? bestDoc : undefined;
}

async function getRow(supabase: AnySupabase, userId: string, subjectId: string) {
  const { data, error } = await supabase
    .from("subject_data")
    .select("notes, marks")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .single();
  if (error) console.warn("[agent-action] getRow error:", error.message);
  return data;
}

async function saveRow(supabase: AnySupabase, userId: string, subjectId: string, marks: unknown, notes: Record<string, unknown>) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("subject_data")
    .update({ marks, notes: { ...notes, lastUpdated: now }, updated_at: now })
    .eq("user_id", userId)
    .eq("subject_id", subjectId);
  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actions: any[] = body.actions || [];
    console.log("[agent-action] received", actions.length, "action(s):", actions.map((a: any) => `${a.type}/${a.docTitle || a.title}`).join(", "));

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("[agent-action] auth:", user?.id ?? "null", authError?.message ?? "ok");
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const results: Record<string, unknown>[] = [];

    for (const action of actions) {
      try {
        const row = await getRow(supabase, user.id, action.subjectId);
        if (!row) throw new Error(`No subject_data row found for subjectId="${action.subjectId}"`);

        const notes = (row.notes || {}) as Record<string, unknown>;
        const marks = row.marks ?? [];
        const documents = Array.isArray(notes.documents) ? (notes.documents as Record<string, unknown>[]) : [];
        const now = new Date().toISOString();

        // ── CREATE DOCUMENT ──────────────────────────────────────────────
        if (action.type === "create_document") {
          const newDoc = { id: crypto.randomUUID(), title: action.title, content: action.content || "", createdAt: now, lastUpdated: now };
          await saveRow(supabase, user.id, action.subjectId, marks, { ...notes, documents: [newDoc, ...documents] });
          results.push({ type: "create_document", success: true, detail: `Created "${action.title}" in ${action.subjectId}` });

        // ── UPDATE DOCUMENT (HTML) ───────────────────────────────────────
        } else if (action.type === "update_document") {
          const target = findDoc(documents, action.docTitle);
          if (!target) throw new Error(`"${action.docTitle}" not found. Available: ${documents.map(d => d.title).join(", ")}`);

          const existingContent = typeof target.content === "string" ? target.content : "";
          if (existingContent.startsWith(STUDY_GUIDE_PREFIX)) throw new Error(`"${target.title}" is a Study Guide — use replace_study_guide instead`);

          const newContent = action.mode === "replace" ? (action.content ?? "") : `${existingContent}\n${action.content ?? ""}`;
          const updatedDocs = documents.map(d => d === target ? { ...d, content: newContent, lastUpdated: now } : d);
          await saveRow(supabase, user.id, action.subjectId, marks, { ...notes, documents: updatedDocs });

          const matchedTitle = target.title as string;
          console.log("[agent-action] update_document OK:", matchedTitle, "mode:", action.mode, "new length:", newContent.length);
          results.push({ type: "update_document", success: true, detail: `Updated "${matchedTitle}"`, subjectId: action.subjectId, docId: target.id, docTitle: matchedTitle, newContent });

        // ── REPLACE STUDY GUIDE (full replacement) ───────────────────────
        } else if (action.type === "replace_study_guide") {
          const target = findDoc(documents, action.docTitle);
          if (!target) throw new Error(`"${action.docTitle}" not found. Available: ${documents.map(d => d.title).join(", ")}`);

          const existingContent = typeof target.content === "string" ? target.content : "";
          if (!existingContent.startsWith(STUDY_GUIDE_PREFIX)) throw new Error(`"${target.title}" is not a Study Guide — use update_document instead`);

          // action.guide is the complete new guide object
          let guideObj = action.guide;
          if (typeof guideObj === "string") {
            try { guideObj = JSON.parse(guideObj); } catch { throw new Error("guide field is not valid JSON"); }
          }
          if (!guideObj || typeof guideObj !== "object") throw new Error("guide field is required and must be an object");

          const newContent = STUDY_GUIDE_PREFIX + JSON.stringify(guideObj);
          const updatedDocs = documents.map(d => d === target ? { ...d, content: newContent, lastUpdated: now } : d);
          await saveRow(supabase, user.id, action.subjectId, marks, { ...notes, documents: updatedDocs });

          const matchedTitle = target.title as string;
          console.log("[agent-action] replace_study_guide OK:", matchedTitle, "new content length:", newContent.length);
          results.push({ type: "replace_study_guide", success: true, detail: `Updated study guide "${matchedTitle}"`, subjectId: action.subjectId, docId: target.id, docTitle: matchedTitle, newContent });

        // ── ADD FLASHCARDS ───────────────────────────────────────────────
        } else if (action.type === "add_flashcards") {
          const nextReview = new Date(); nextReview.setDate(nextReview.getDate() + 1);
          const rows = action.cards.map((card: any) => ({
            user_id: user.id, subject_id: action.subjectId,
            front: card.front, back: card.back,
            next_review: nextReview.toISOString(), interval_days: 1, ease_factor: 2.5, repetitions: 0,
            created_at: now, updated_at: now,
          }));
          const { error } = await supabase.from("flashcards").insert(rows);
          if (error) throw error;
          results.push({ type: "add_flashcards", success: true, detail: `Added ${action.cards.length} flashcard(s) to ${action.subjectId}` });

        } else {
          results.push({ type: action.type, success: false, detail: `Unknown action type: ${action.type}` });
        }

      } catch (err: any) {
        console.error("[agent-action] action failed:", action.type, err.message);
        results.push({ type: action.type, success: false, detail: err.message });
      }
    }

    console.log("[agent-action] results:", JSON.stringify(results.map(r => ({ type: r.type, success: r.success, detail: r.detail }))));
    return NextResponse.json({ results });

  } catch (error: any) {
    console.error("[/api/groq/agent-action] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
