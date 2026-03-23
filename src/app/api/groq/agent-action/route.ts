import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studyGuideToHtml } from "@/utils/studyGuideHtml";
import { encodeStudyGuide } from "@/utils/studyGuideContent";
import type { GeneratedStudyGuide } from "@/services/groq";
import {
  BOTTOM_RIGHT_AGENT_DOCUMENT_EDIT_MESSAGE,
  isBottomRightAgentActionType,
} from "@/lib/agentActions";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export const runtime = "nodejs";

const STUDY_GUIDE_PREFIX = "__STUDY_GUIDE_V2__";

type AgentAction = {
  type?: string;
  subjectId?: string;
  docTitle?: string;
  title?: string;
  content?: string;
  mode?: string;
  field?: string;
  value?: string;
  guide?: unknown;
  cards?: Array<{ front?: string; back?: string }>;
} & Record<string, unknown>;

// Escape special regex characters for safe pattern matching
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function getRequiredDocTitle(action: AgentAction) {
  if (typeof action.docTitle !== "string" || action.docTitle.trim() === "") {
    throw new Error(`${action.type || "document action"} requires a docTitle`);
  }
  return action.docTitle;
}

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
    .maybeSingle();
  if (error) console.warn("[agent-action] getRow error:", error.message);
  return data;
}

async function findRowByDocTitle(supabase: AnySupabase, userId: string, docTitle: string) {
  const { data, error } = await supabase
    .from("subject_data")
    .select("subject_id, notes, marks")
    .eq("user_id", userId);
  if (error) {
    console.warn("[agent-action] findRowByDocTitle error:", error.message);
    return null;
  }
  const rows = (data || []) as Array<{ subject_id: string; notes: Record<string, unknown>; marks: unknown }>;
  for (const row of rows) {
    const documents = Array.isArray(row.notes?.documents) ? (row.notes.documents as Record<string, unknown>[]) : [];
    const doc = findDoc(documents, docTitle);
    if (doc) {
      return { row, doc };
    }
  }
  return null;
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
    const actions: AgentAction[] = Array.isArray(body.actions) ? body.actions : [];
    const defaultSubjectId = typeof body.defaultSubjectId === "string" ? body.defaultSubjectId : null;
    console.log("[agent-action] received", actions.length, "action(s):", actions.map((a) => `${a.type}/${a.docTitle || a.title}`).join(", "));

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("[agent-action] auth:", user?.id ?? "null", authError?.message ?? "ok");
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const results: Record<string, unknown>[] = [];

    for (const action of actions) {
      try {
        if (!isBottomRightAgentActionType(action.type)) {
          results.push({
            type: action.type,
            success: false,
            detail: BOTTOM_RIGHT_AGENT_DOCUMENT_EDIT_MESSAGE,
          });
          continue;
        }

        if (action.type === "start_quiz") {
          results.push({
            type: "start_quiz",
            success: true,
            detail: "Quiz launch is handled in the browser.",
          });
          continue;
        }

        const actionType = String(action.type || "");

        // Normalize subjectId to lowercase (database stores as lowercase)
        let subjectId = String(action.subjectId || "").toLowerCase();
        let row = await getRow(supabase, user.id, subjectId);
        if (!row) {
          if ((actionType === "update_document" || actionType === "replace_study_guide") && typeof action.docTitle === "string") {
            const fallback = await findRowByDocTitle(supabase, user.id, action.docTitle);
            if (fallback) {
              row = { notes: fallback.row.notes, marks: fallback.row.marks };
              subjectId = fallback.row.subject_id;
            }
          }
        }

        if (!row && defaultSubjectId && defaultSubjectId !== subjectId) {
          const fallbackRow = await getRow(supabase, user.id, defaultSubjectId.toLowerCase());
          if (fallbackRow) {
            row = fallbackRow;
            subjectId = defaultSubjectId.toLowerCase();
          }
        }

        if (!row) {
          if ((actionType === "update_document" || actionType === "replace_study_guide") && typeof action.docTitle === "string") {
            throw new Error(`No subject_data row found for subjectId="${subjectId}" and no document titled "${action.docTitle}" in any subject.`);
          }
          throw new Error(`No subject_data row found for subjectId="${subjectId}"`);
        }

        const notes = (row.notes || {}) as Record<string, unknown>;
        const marks = row.marks ?? [];
        const documents = Array.isArray(notes.documents) ? (notes.documents as Record<string, unknown>[]) : [];
        const now = new Date().toISOString();

        // ── CREATE DOCUMENT ──────────────────────────────────────────────
        if (actionType === "create_document") {
          const newDoc = { id: crypto.randomUUID(), title: action.title, content: action.content || "", createdAt: now, lastUpdated: now };
          await saveRow(supabase, user.id, subjectId, marks, { ...notes, documents: [newDoc, ...documents] });
          results.push({ type: "create_document", success: true, detail: `Created "${action.title}" in ${subjectId}` });

        // ── PATCH DOCUMENT FIELD (simple field update) ───────────────────
        } else if (actionType === "patch_document_field") {
          const docTitle = getRequiredDocTitle(action);
          const target = findDoc(documents, docTitle);
          if (!target) throw new Error(`"${docTitle}" not found. Available: ${documents.map(d => d.title).join(", ")}`);
          
          const existingContent = typeof target.content === "string" ? target.content : "";
          const field = action.field || "";
          const value = action.value || "";
          
          if (!field || !value) throw new Error("patch_document_field requires 'field' and 'value'");
          
          // Try to find and replace the field value in the content
          // Look for patterns like "Duration: 45 Minutes" or "<p><strong>Duration:</strong> 45 Minutes</p>"
          // We need to match both the label AND the value, then replace the whole thing
          const patterns = [
            // Pattern 1: "<strong>Duration:</strong> 45 Minutes" or "<b>Duration:</b> 45 Minutes"
            new RegExp(`(<(?:strong|b)>${escapeRegex(field)}:<\\/(?:strong|b)>\\s*)([^<]+)`, "gi"),
            // Pattern 2: "**Duration:** 45 Minutes" (markdown bold)
            new RegExp(`(\\*\\*${escapeRegex(field)}:\\*\\*\\s*)([^\\n]+)`, "gi"),
            // Pattern 3: "Duration: 45 Minutes" (plain text, no formatting)
            new RegExp(`(${escapeRegex(field)}:\\s*)([^<\\n]+)`, "gi"),
            // Pattern 4: "<p>Duration: 45 Minutes</p>" (in paragraph)
            new RegExp(`(<p[^>]*>\\s*${escapeRegex(field)}:\\s*)([^<]+)(\\s*<\\/p>)`, "gi"),
          ];
          
          let newContent = existingContent;
          let replaced = false;
          
          for (const pattern of patterns) {
            const match = pattern.exec(existingContent);
            if (match) {
              // Replace ONLY the value part (group 2), keep the label (group 1)
              newContent = existingContent.replace(pattern, (m, p1, p2, p3) => {
                replaced = true;
                // p1 = label with formatting, p2 = old value, p3 = closing tag (if any)
                return p1 + value + (p3 || "");
              });
              break;
            }
          }
          
          if (!replaced) {
            // Field not found, append it at the end of existing content
            newContent = existingContent + `<p>${field}: ${value}</p>`;
          }
          
          const updatedDocs = documents.map(d => d === target ? { ...d, content: newContent, lastUpdated: now } : d);
          await saveRow(supabase, user.id, subjectId, marks, { ...notes, documents: updatedDocs });
          
          const matchedTitle = target.title as string;
          console.log("[agent-action] patch_document_field OK:", matchedTitle, "field:", field, "value:", value);
          console.log("[agent-action] patch_document_field replaced:", replaced, "content length:", newContent.length);
          results.push({ type: "patch_document_field", success: true, detail: `Updated ${field} to "${value}" in "${matchedTitle}"`, subjectId, docId: target.id, docTitle: matchedTitle, field, value });
          
        // ── UPDATE DOCUMENT (HTML) ───────────────────────────────────────
        } else if (actionType === "update_document") {
          const docTitle = getRequiredDocTitle(action);
          const target = findDoc(documents, docTitle);
          if (!target) throw new Error(`"${docTitle}" not found. Available: ${documents.map(d => d.title).join(", ")}`);

          let existingContent = typeof target.content === "string" ? target.content : "";
          if (existingContent.startsWith(STUDY_GUIDE_PREFIX)) {
            try {
              const guideObj = JSON.parse(existingContent.slice(STUDY_GUIDE_PREFIX.length));
              existingContent = studyGuideToHtml(guideObj as GeneratedStudyGuide);
            } catch {
              existingContent = "";
            }
          }

          const newContent = action.mode === "replace" ? (action.content ?? "") : `${existingContent}\n${action.content ?? ""}`;
          const updatedDocs = documents.map(d => d === target ? { ...d, content: newContent, lastUpdated: now } : d);
          await saveRow(supabase, user.id, subjectId, marks, { ...notes, documents: updatedDocs });

          const matchedTitle = target.title as string;
          console.log("[agent-action] update_document OK:", matchedTitle, "mode:", action.mode, "new length:", newContent.length);
          results.push({ type: "update_document", success: true, detail: `Updated "${matchedTitle}"`, subjectId, docId: target.id, docTitle: matchedTitle, newContent });

        // ── REPLACE STUDY GUIDE (full replacement) ───────────────────────
        } else if (actionType === "replace_study_guide") {
          const docTitle = getRequiredDocTitle(action);
          const target = findDoc(documents, docTitle);
          if (!target) throw new Error(`"${docTitle}" not found. Available: ${documents.map(d => d.title).join(", ")}`);
          const existingContent = typeof target.content === "string" ? target.content : "";

          // If this isn't a study guide, fall back to update_document
          if (!existingContent.startsWith(STUDY_GUIDE_PREFIX)) {
            console.log("[agent-action] replace_study_guide called on regular doc, falling back to update_document");
            // Use action.content if provided, otherwise keep existing content
            // This handles cases where AI uses wrong action type but provides content
            let newContent = existingContent;
            if (action.content && typeof action.content === "string") {
              newContent = action.content;
            } else if (action.field && action.value) {
              // Handle patch-like operations that came through as replace_study_guide
              const patterns = [
                new RegExp(`(<(?:strong|b)>${escapeRegex(action.field)}:<\\/(?:strong|b)>\\s*)([^<]+)`, "gi"),
                new RegExp(`(\\*\\*${escapeRegex(action.field)}:\\*\\*\\s*)([^\\n]+)`, "gi"),
                new RegExp(`(${escapeRegex(action.field)}:\\s*)([^<\\n]+)`, "gi"),
              ];
              for (const pattern of patterns) {
                const match = pattern.exec(existingContent);
                if (match) {
                  newContent = existingContent.replace(pattern, (m, p1, p2) => p1 + action.value);
                  break;
                }
              }
            }
            const updatedDocs = documents.map(d => d === target ? { ...d, content: newContent, lastUpdated: now } : d);
            await saveRow(supabase, user.id, subjectId, marks, { ...notes, documents: updatedDocs });
            const matchedTitle = target.title as string;
            console.log("[agent-action] fallback update_document OK:", matchedTitle);
            results.push({ type: "update_document", success: true, detail: `Updated "${matchedTitle}" (fallback from replace_study_guide)`, subjectId, docId: target.id, docTitle: matchedTitle, newContent });
          } else {
            // action.guide is the complete new guide object
            let guideObj = action.guide;
            if (typeof guideObj === "string") {
              try { guideObj = JSON.parse(guideObj); } catch { throw new Error("guide field is not valid JSON"); }
            }
            if (!guideObj || typeof guideObj !== "object") throw new Error("guide field is required and must be an object");

            const newContent = encodeStudyGuide(guideObj as GeneratedStudyGuide);
            const updatedDocs = documents.map(d => d === target ? { ...d, content: newContent, lastUpdated: now } : d);
            await saveRow(supabase, user.id, subjectId, marks, { ...notes, documents: updatedDocs });

            const matchedTitle = target.title as string;
            console.log("[agent-action] replace_study_guide OK:", matchedTitle, "new content length:", newContent.length);
            results.push({ type: "replace_study_guide", success: true, detail: `Updated study guide "${matchedTitle}"`, subjectId, docId: target.id, docTitle: matchedTitle, newContent });
          }

        // ── ADD FLASHCARDS ───────────────────────────────────────────────
        } else if (actionType === "add_flashcards") {
          const nextReview = new Date(); nextReview.setDate(nextReview.getDate() + 1);
          const cards = action.cards || [];
          const rows = cards.map((card) => ({
            user_id: user.id, subject_id: action.subjectId,
            front: card.front, back: card.back,
            next_review: nextReview.toISOString(), interval_days: 1, ease_factor: 2.5, repetitions: 0,
            created_at: now, updated_at: now,
          }));
          const { error } = await supabase.from("flashcards").insert(rows);
          if (error) throw error;
          results.push({ type: "add_flashcards", success: true, detail: `Added ${cards.length} flashcard(s) to ${subjectId}` });

        } else {
          results.push({ type: action.type, success: false, detail: `Unknown action type: ${action.type}` });
        }

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown action error";
        console.error("[agent-action] action failed:", action.type, message);
        results.push({ type: action.type, success: false, detail: message });
      }
    }

    console.log("[agent-action] results:", JSON.stringify(results.map(r => ({ type: r.type, success: r.success, detail: r.detail }))));
    return NextResponse.json({ results });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("[/api/groq/agent-action] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
