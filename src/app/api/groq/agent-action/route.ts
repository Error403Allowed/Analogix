import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listUserDocuments } from "@/lib/server/documents";
import { studyGuideToHtml } from "@/utils/studyGuideHtml";
import { studyGuideToMarkdown } from "@/utils/studyGuideMarkdown";
import type { GeneratedStudyGuide } from "@/services/groq";
import {
  BOTTOM_RIGHT_AGENT_DOCUMENT_EDIT_MESSAGE,
  isBottomRightAgentActionType,
} from "@/lib/agentActions";

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
  setName?: string;
} & Record<string, unknown>;

type EditableDocument = {
  id: string;
  owner_user_id: string;
  subject_id: string;
  title: string;
  content: string;
  role?: string | null;
  study_guide_data?: GeneratedStudyGuide | null;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function getRequiredDocTitle(action: AgentAction) {
  if (typeof action.docTitle !== "string" || !action.docTitle.trim()) {
    throw new Error(`${action.type || "document action"} requires a docTitle`);
  }
  return action.docTitle.trim();
}

function findDoc(documents: EditableDocument[], docTitle: string) {
  const search = docTitle.toLowerCase().trim();

  const exact = documents.find((document) => document.title.toLowerCase() === search);
  if (exact) return exact;

  const substring = documents.find((document) => (
    document.title.toLowerCase().includes(search) ||
    search.includes(document.title.toLowerCase())
  ));
  if (substring) return substring;

  const searchWords = new Set(search.split(/\W+/).filter((word) => word.length > 3));
  let best: EditableDocument | undefined;
  let bestScore = 0;

  for (const document of documents) {
    const titleWords = document.title.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
    const overlap = titleWords.filter((word) => searchWords.has(word)).length;
    const score = overlap / Math.max(searchWords.size, titleWords.length, 1);
    if (score > bestScore) {
      bestScore = score;
      best = document;
    }
  }

  return bestScore >= 0.4 ? best : undefined;
}

async function ensureSubjectRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  subjectId: string,
) {
  await supabase.from("subject_data").upsert(
    {
      user_id: userId,
      subject_id: subjectId,
      notes: { content: "", lastUpdated: new Date().toISOString(), documents: [] },
    },
    { onConflict: "user_id,subject_id" },
  );
}

async function findDocumentForAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  docTitle: string,
  subjectId?: string,
  defaultSubjectId?: string | null,
) {
  const documents = (await listUserDocuments(supabase, userId)).map((document) => ({
    ...document,
    study_guide_data: document.study_guide_data,
  })) as EditableDocument[];

  const subjectCandidates = [
    subjectId?.toLowerCase(),
    defaultSubjectId?.toLowerCase(),
  ].filter(Boolean) as string[];

  for (const candidate of subjectCandidates) {
    const subjectMatch = findDoc(
      documents.filter((document) => document.subject_id === candidate),
      docTitle,
    );
    if (subjectMatch) return subjectMatch;
  }

  return findDoc(documents, docTitle) ?? null;
}

async function updateDocumentRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.from("documents").update(payload).eq("id", documentId);
  if (error) {
    throw new Error(error.message);
  }
}

function patchFieldContent(existingContent: string, field: string, value: string) {
  const patterns = [
    new RegExp(`(<(?:strong|b)>${escapeRegex(field)}:<\\/(?:strong|b)>\\s*)([^<]+)`, "gi"),
    new RegExp(`(\\*\\*${escapeRegex(field)}:\\*\\*\\s*)([^\\n]+)`, "gi"),
    new RegExp(`(${escapeRegex(field)}:\\s*)([^<\\n]+)`, "gi"),
    new RegExp(`(<p[^>]*>\\s*${escapeRegex(field)}:\\s*)([^<]+)(\\s*<\\/p>)`, "gi"),
  ];

  for (const pattern of patterns) {
    if (pattern.test(existingContent)) {
      return {
        content: existingContent.replace(pattern, (_match, prefix, _oldValue, suffix = "") => `${prefix}${value}${suffix}`),
        replaced: true,
      };
    }
  }

  return {
    content: `${existingContent}<p>${field}: ${value}</p>`,
    replaced: false,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actions: AgentAction[] = Array.isArray(body.actions) ? body.actions : [];
    const defaultSubjectId = typeof body.defaultSubjectId === "string" ? body.defaultSubjectId : null;
    const source = typeof body.source === "string" ? body.source : "agent";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const results: Record<string, unknown>[] = [];

    for (const action of actions) {
      try {
        if (source !== "chat" && !isBottomRightAgentActionType(action.type)) {
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
        const subjectId = String(action.subjectId || defaultSubjectId || "").toLowerCase();
        const now = new Date().toISOString();

        if (actionType === "create_document") {
          if (!subjectId) throw new Error("create_document requires a subjectId");
          await ensureSubjectRow(supabase, user.id, subjectId);
          const { data, error } = await supabase
            .from("documents")
            .insert({
              owner_user_id: user.id,
              subject_id: subjectId,
              title: String(action.title || "Untitled"),
              content: String(action.content || ""),
              role: "notes",
              created_at: now,
              updated_at: now,
              last_edited_by: user.id,
            })
            .select("*")
            .single();
          if (error || !data) throw new Error(error?.message || "Failed to create document");

          results.push({
            type: "create_document",
            success: true,
            detail: `Created "${data.title}" in ${subjectId}`,
            subjectId,
            docId: data.id,
            docTitle: data.title,
          });
          continue;
        }

        if (actionType === "add_flashcards") {
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 1);
          const cards = action.cards || [];
          let setName = typeof action.setName === "string" && action.setName.trim()
            ? action.setName.trim()
            : "";
          if (!setName && cards.length > 0) {
            const firstFront = String(cards[0].front || "").trim();
            if (firstFront) {
              setName = firstFront.length > 40 ? `${firstFront.slice(0, 37)}…` : firstFront;
            }
          }
          if (!setName) {
            setName = subjectId
              ? `${subjectId.charAt(0).toUpperCase() + subjectId.slice(1)} Flashcards`
              : "Flashcard Set";
          }

          const { data: flashcardSet, error: setError } = await supabase
            .from("flashcard_sets")
            .insert({ user_id: user.id, subject_id: subjectId || null, name: setName })
            .select("id")
            .single();
          if (setError || !flashcardSet) {
            throw new Error(setError?.message || "Failed to create flashcard set");
          }

          const rows = cards.map((card) => ({
            user_id: user.id,
            subject_id: subjectId || null,
            set_id: flashcardSet.id,
            front: card.front,
            back: card.back,
            next_review: nextReview.toISOString(),
            interval_days: 1,
            ease_factor: 2.5,
            repetitions: 0,
            created_at: now,
            updated_at: now,
          }));

          const { error } = await supabase.from("flashcards").insert(rows);
          if (error) throw new Error(error.message);

          results.push({
            type: "add_flashcards",
            success: true,
            detail: `Added ${cards.length} flashcard(s) to "${setName}"`,
            setId: flashcardSet.id,
          });
          continue;
        }

        const docTitle = getRequiredDocTitle(action);
        const target = await findDocumentForAction(supabase, user.id, docTitle, subjectId, defaultSubjectId);
        if (!target) {
          throw new Error(`"${docTitle}" not found in your documents.`);
        }

        if (actionType === "patch_document_field") {
          const field = String(action.field || "").trim();
          const value = String(action.value || "").trim();
          if (!field || !value) {
            throw new Error("patch_document_field requires 'field' and 'value'");
          }

          const { content: newContent } = patchFieldContent(target.content || "", field, value);
          await updateDocumentRecord(supabase, target.id, {
            content: newContent,
            updated_at: now,
            last_edited_by: user.id,
            study_guide_markdown: null,
            study_guide_data: null,
          });

          results.push({
            type: "patch_document_field",
            success: true,
            detail: `Updated ${field} in "${target.title}"`,
            subjectId: target.subject_id,
            docId: target.id,
            docTitle: target.title,
            field,
            value,
          });
          continue;
        }

        if (actionType === "update_document") {
          let existingContent = target.content || "";
          if (existingContent.startsWith(STUDY_GUIDE_PREFIX)) {
            try {
              const guideObj = JSON.parse(existingContent.slice(STUDY_GUIDE_PREFIX.length));
              existingContent = studyGuideToHtml(guideObj as GeneratedStudyGuide);
            } catch {
              existingContent = "";
            }
          }

          const newContent = action.mode === "replace"
            ? String(action.content || "")
            : `${existingContent}\n${String(action.content || "")}`;

          await updateDocumentRecord(supabase, target.id, {
            content: newContent,
            updated_at: now,
            last_edited_by: user.id,
            study_guide_markdown: null,
            study_guide_data: null,
          });

          results.push({
            type: "update_document",
            success: true,
            detail: `Updated "${target.title}"`,
            subjectId: target.subject_id,
            docId: target.id,
            docTitle: target.title,
            newContent,
          });
          continue;
        }

        if (actionType === "replace_study_guide") {
          const isStudyGuide = target.role === "study-guide" || Boolean(target.study_guide_data);
          if (!isStudyGuide) {
            const fallbackContent = typeof action.content === "string" ? action.content : target.content;
            await updateDocumentRecord(supabase, target.id, {
              content: fallbackContent,
              updated_at: now,
              last_edited_by: user.id,
              study_guide_markdown: null,
              study_guide_data: null,
            });

            results.push({
              type: "update_document",
              success: true,
              detail: `Updated "${target.title}"`,
              subjectId: target.subject_id,
              docId: target.id,
              docTitle: target.title,
              newContent: fallbackContent,
            });
            continue;
          }

          let guideObj = action.guide;
          if (typeof guideObj === "string") {
            guideObj = JSON.parse(guideObj);
          }
          if (!guideObj || typeof guideObj !== "object") {
            throw new Error("guide field is required and must be valid JSON");
          }

          const guide = guideObj as GeneratedStudyGuide;
          const newContent = studyGuideToHtml(guide);
          await updateDocumentRecord(supabase, target.id, {
            content: newContent,
            role: "study-guide",
            study_guide_markdown: studyGuideToMarkdown(guide),
            study_guide_data: guide,
            updated_at: now,
            last_edited_by: user.id,
          });

          results.push({
            type: "replace_study_guide",
            success: true,
            detail: `Updated study guide "${target.title}"`,
            subjectId: target.subject_id,
            docId: target.id,
            docTitle: target.title,
            newContent,
          });
          continue;
        }

        results.push({
          type: action.type,
          success: false,
          detail: `Unknown action type: ${action.type}`,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown action error";
        console.error("[agent-action] action failed:", action.type, message);
        results.push({
          type: action.type,
          success: false,
          detail: message,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("[/api/groq/agent-action] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
