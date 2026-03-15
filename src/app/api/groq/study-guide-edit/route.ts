import { NextResponse } from "next/server";
import { callHfChat, formatError } from "../_utils";

export const runtime = "nodejs";

// ── RFC-6902 patch applier (replace / add / remove) ───────────────────────────
function applyPatch(
  guide: Record<string, unknown>,
  edits: Array<{ op: string; path: string; value?: unknown }>,
): Record<string, unknown> {
  const result: Record<string, unknown> = JSON.parse(JSON.stringify(guide));

  for (const edit of edits) {
    const parts = edit.path.replace(/^\//, "").split("/");
    const lastKey = parts[parts.length - 1];

    let node: unknown = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (node == null) break;
      const key = parts[i];
      node = Array.isArray(node)
        ? (node as unknown[])[Number(key)]
        : (node as Record<string, unknown>)[key];
    }
    if (node == null) continue;

    if (edit.op === "replace") {
      if (Array.isArray(node)) (node as unknown[])[Number(lastKey)] = edit.value;
      else if (typeof node === "object") (node as Record<string, unknown>)[lastKey] = edit.value;
    } else if (edit.op === "add") {
      if (Array.isArray(node)) {
        lastKey === "-"
          ? (node as unknown[]).push(edit.value)
          : (node as unknown[]).splice(Number(lastKey), 0, edit.value);
      } else if (typeof node === "object") {
        (node as Record<string, unknown>)[lastKey] = edit.value;
      }
    } else if (edit.op === "remove") {
      if (Array.isArray(node)) (node as unknown[]).splice(Number(lastKey), 1);
      else if (typeof node === "object") delete (node as Record<string, unknown>)[lastKey];
    }
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const guide: Record<string, unknown> = body.guide;
    const userRequest: string = (body.request || "").trim();
    const grade: string = body.grade || "10";
    const subject: string = body.subject || "";

    if (!guide || !userRequest) {
      return NextResponse.json({ error: "guide and request are required" }, { status: 400 });
    }

    const guideSnapshot = JSON.stringify(guide, null, 2).slice(0, 8000);

    const systemPrompt = `You are a JSON patch generator for a study guide editor. Output ONLY a JSON object — no prose, no markdown, no explanation.

Study guide fields:
  title(string), overview(string), assessmentDate(string), assessmentType(string),
  weighting(string), totalMarks(string), keyPoints(string[]), topics(string[]),
  keyConcepts([{title,content}]), practiceQuestions([{question,answer}]),
  studySchedule([{week,label,tasks[]}]), tips(string[]), commonMistakes(string[]),
  resources(string[]), glossary([{term,definition}]),
  formulaSheet([{formula,description,variables?,example?}]),
  gradeExpectations([{grade,criteria[]}])

Output shape — nothing else:
{"edits":[{"op":"replace|add|remove","path":"/field/index","value":<new value>}]}

Path rules:
  /title                    replace the title string
  /keyPoints/-              ADD (append) a new string to keyPoints
  /keyPoints/0              replace index 0
  /keyConcepts/-            ADD a new {title,content} object
  /keyConcepts/0/content    replace content of concept at index 0
  /practiceQuestions/-      ADD a new {question,answer} object
  /tips/-                   ADD a new tip string

Rules:
- ADD = op "add", path "/-" (never "replace" to add)
- EDIT = op "replace", exact index number
- DELETE = op "remove", exact index number
- Write full detailed content for all new items
- Student: Year ${grade}${subject ? `, ${subject}` : ""}, Australia
- Output ONLY the JSON. Nothing else whatsoever.`;

    const rawResponse = await callHfChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Current guide:\n${guideSnapshot}\n\nRequest: "${userRequest}"\n\nJSON patch output:`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.05,
      },
      "lightweight",
    );

    const cleaned = rawResponse.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

    let parsed: { edits: Array<{ op: string; path: string; value?: unknown }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw: rawResponse }, { status: 422 });
    }

    if (!Array.isArray(parsed.edits) || parsed.edits.length === 0) {
      return NextResponse.json({ error: "AI returned no edits", raw: rawResponse }, { status: 422 });
    }

    // Safety: reject edits targeting the root
    const safe = parsed.edits.filter(e => e.path && e.path !== "/" && e.path !== "");
    const updated = applyPatch(guide, safe);

    return NextResponse.json({ guide: updated, edits: safe });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/study-guide-edit] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
