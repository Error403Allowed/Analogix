import type { GeneratedStudyGuide } from "@/services/groq";

const escapeHtml = (text: string) => {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const escapeHtmlAttr = (text: string) => {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, " ");
};

const normaliseLatex = (text: string): string => {
  if (typeof text !== "string") return "";
  let result = text;

  // Handle common \begin{...} environments as display math
  result = result.replace(
    /\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g,
    (_match, _env, body) => `$$\n${body}\n$$`
  );

  // Normalize \[...\] and \(...\)
  result = result
    .replace(/\\\[\s*/g, "$$\n")
    .replace(/\s*\\\]/g, "\n$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");

  return result;
};

const applyInlineFormatting = (text: string) => {
  if (typeof text !== "string") return "";
  let output = text;
  output = output.replace(/~~(.+?)~~/g, "<s>$1</s>");
  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__(.+?)__/g, "<strong>$1</strong>");
  output = output.replace(/\*(.+?)\*/g, "<em>$1</em>");
  output = output.replace(/_(.+?)_/g, "<em>$1</em>");
  return output;
};

type MathSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

const splitDisplayMath = (text: string): MathSegment[] => {
  const segments: MathSegment[] = [];
  const regex = /\$\$([\s\S]+?)\$\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "math", value: match[1], display: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
};

const splitInlineMath = (text: string): MathSegment[] => {
  const segments: MathSegment[] = [];
  let buffer = "";
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === "$" && (i === 0 || text[i - 1] !== "\\")) {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "$" && text[j - 1] !== "\\") break;
        j += 1;
      }
      if (j < text.length) {
        if (buffer) {
          segments.push({ type: "text", value: buffer });
          buffer = "";
        }
        segments.push({ type: "math", value: text.slice(i + 1, j), display: false });
        i = j + 1;
        continue;
      }
    }
    buffer += char;
    i += 1;
  }
  if (buffer) segments.push({ type: "text", value: buffer });
  return segments;
};

const renderInlineMath = (latex: string) =>
  `<span data-type="inline-math" data-latex="${escapeHtmlAttr(latex.trim())}"></span>`;

const renderBlockMath = (latex: string) =>
  `<div data-type="block-math" data-latex="${escapeHtmlAttr(latex.trim())}"></div>`;

const renderRichFragment = (text: string): string => {
  if (typeof text !== "string") return "";
  const normalized = normaliseLatex(text);
  return splitDisplayMath(normalized)
    .map((seg) => {
      if (seg.type === "math") return renderBlockMath(seg.value);
      return renderInlineText(seg.value);
    })
    .join("");
};

const renderInlineText = (text: string): string => {
  if (typeof text !== "string") return "";
  const normalized = normaliseLatex(text).replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => `$${latex}$`);
  const segments = splitInlineMath(normalized);
  const html = segments
    .map((seg) => {
      if (seg.type === "math") return renderInlineMath(seg.value);
      return applyInlineFormatting(escapeHtml(seg.value));
    })
    .join("");
  return html.replace(/\n/g, "<br/>");
};

const toParagraph = (text?: string) => {
  if (typeof text !== "string" || !text) return "";
  const normalized = normaliseLatex(text);
  const segments = splitDisplayMath(normalized);
  const parts: string[] = [];

  segments.forEach((seg) => {
    if (seg.type === "math") {
      const latex = seg.value.trim();
      if (latex) parts.push(renderBlockMath(latex));
      return;
    }

    const paragraphs = seg.value.split(/\n{2,}/);
    paragraphs.forEach((para) => {
      const html = renderInlineText(para);
      if (html.trim()) parts.push(`<p>${html}</p>`);
    });
  });

  return parts.join("");
};

const toList = (items?: string[], ordered = false) => {
  if (!items || !Array.isArray(items) || items.length === 0) return "";
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((item) => `<li>${renderRichFragment(typeof item === "string" ? item : String(item))}</li>`).join("")}</${tag}>`;
};

const toTable = (headers?: string[], rows?: string[][], opts?: { cellIsHtml?: boolean }) => {
  if (!headers?.length || !rows?.length) return "";
  const renderCell = (value: string) => (opts?.cellIsHtml ? value : renderRichFragment(typeof value === "string" ? value : String(value)));
  const thead = `<thead><tr>${headers.map((h) => `<th>${renderRichFragment(typeof h === "string" ? h : String(h))}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${renderCell(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
};

export const studyGuideToHtml = (guide: GeneratedStudyGuide): string => {
  const sections: string[] = [];

  const title = guide.title || "Study Guide";
  sections.push(`<h1>📚 ${renderInlineText(title)}</h1>`);

  const pushSection = (titleText: string, body: string, opts?: { divider?: boolean }) => {
    if (!body) return;
    const divider = opts?.divider !== false;
    if (divider && sections.length > 0) sections.push("<hr/>");
    sections.push(`<h2>${escapeHtml(titleText)}</h2>`);
    sections.push(body);
  };

  // ── Brief overview (front matter, no divider) ─────────────────────────
  if (guide.overview) {
    pushSection("Brief Overview", toParagraph(guide.overview), { divider: false });
  }

  if (guide.keyPoints?.length) {
    pushSection("Key Points", toList(guide.keyPoints), { divider: false });
  }

  // ── Assessment overview block ─────────────────────────────────────────
  const overviewLines: string[] = [];
  if (guide.assessmentType) overviewLines.push(`<p><strong>Assessment Type:</strong> ${renderInlineText(guide.assessmentType)}</p>`);
  if (guide.weighting) overviewLines.push(`<p><strong>Weighting:</strong> ${renderInlineText(guide.weighting)}</p>`);
  if (guide.totalMarks) overviewLines.push(`<p><strong>Total Marks:</strong> ${renderInlineText(guide.totalMarks)}</p>`);
  if (guide.examDuration) overviewLines.push(`<p><strong>Duration:</strong> ${renderInlineText(guide.examDuration)}</p>`);
  if (guide.assessmentDate) overviewLines.push(`<p><strong>Due Date:</strong> ${renderInlineText(guide.assessmentDate)}</p>`);
  if (guide.topics?.length) {
    overviewLines.push(`<p><strong>Key Focus:</strong> ${renderInlineText(guide.topics.join(", "))}</p>`);
  }
  pushSection("Assessment Overview", overviewLines.join(""));
  pushSection("Topics Covered", toList(guide.topics));

  // ── Core sections ─────────────────────────────────────────────────────
  pushSection("Required Materials", toList(guide.requiredMaterials));

  if (guide.taskStructure?.practical?.length || guide.taskStructure?.written?.length) {
    const parts: string[] = [];
    if (guide.taskStructure?.practical?.length) {
      parts.push(`<h3>Practical Component</h3>`);
      parts.push(toList(guide.taskStructure.practical));
    }
    if (guide.taskStructure?.written?.length) {
      parts.push(`<h3>Written Component</h3>`);
      parts.push(toList(guide.taskStructure.written));
    }
    pushSection("Task Structure", parts.join(""));
  }

  if (guide.studySchedule?.length) {
    const scheduleHtml = guide.studySchedule.map((week) => {
      const label = week.label ? `: ${renderInlineText(week.label)}` : "";
      return `<h3>Week ${week.week}${label}</h3>${toList(week.tasks)}`;
    }).join("");
    pushSection("Study Schedule", scheduleHtml);
  }

  if (guide.keyConcepts?.length) {
    const conceptsHtml = guide.keyConcepts.map((c) =>
      `<h3>${renderInlineText(c.title)}</h3>${toParagraph(c.content)}`
    ).join("");
    pushSection("Core Learning Objectives", conceptsHtml);
  }

  if (guide.keyTable) {
    pushSection("Key Study Areas", toTable(guide.keyTable.headers, guide.keyTable.rows));
  }

  if (guide.practiceQuestions?.length) {
    const pqHtml = guide.practiceQuestions.map((q, i) =>
      `<h3>Question ${i + 1}</h3><p><strong>Q:</strong></p>${toParagraph(q.question)}<p><strong>A:</strong></p>${toParagraph(q.answer)}`
    ).join("");
    pushSection("Practice Questions", pqHtml);
  }

  if (guide.gradeExpectations?.length) {
    const gradeRows = guide.gradeExpectations.map((g) => ([
      `<strong>${renderInlineText(g.grade)}</strong>`,
      `<ul>${(g.criteria || []).map(c => `<li>${renderInlineText(c)}</li>`).join("")}</ul>`,
    ]));
    const gradeTable = toTable(["Grade", "Performance Standard"], gradeRows, { cellIsHtml: true });
    pushSection("Assessment Criteria", gradeTable);
  }

  pushSection("Resources", toList(guide.resources));
  pushSection("Study Tips", toList(guide.tips));
  pushSection("Common Mistakes", toList(guide.commonMistakes));

  if (guide.glossary?.length) {
    const glossaryHtml = guide.glossary.map((g) =>
      `<h3>${renderInlineText(g.term)}</h3>${toParagraph(g.definition)}`
    ).join("");
    pushSection("Glossary", glossaryHtml);
  }

  if (guide.formulaSheet?.length) {
    const formulasHtml = guide.formulaSheet.map((f) => {
      const rows: string[] = [];
      rows.push(`<p><strong>Formula:</strong></p>${toParagraph(f.formula)}`);
      rows.push(`<p><strong>Description:</strong></p>${toParagraph(f.description)}`);
      if (f.variables) rows.push(`<p><strong>Variables:</strong></p>${toParagraph(f.variables)}`);
      if (f.example) rows.push(`<p><strong>Example:</strong></p>${toParagraph(f.example)}`);
      return rows.join("");
    }).join("");
    pushSection("Formula Sheet", formulasHtml);
  }

  if (guide.experimentGuide) {
    const eg = guide.experimentGuide;
    const parts: string[] = [];
    if (eg.aim) parts.push(`<p><strong>Aim:</strong></p>${toParagraph(eg.aim)}`);
    if (eg.hypothesis) parts.push(`<p><strong>Hypothesis:</strong></p>${toParagraph(eg.hypothesis)}`);
    if (eg.variables?.independent) parts.push(`<p><strong>Independent:</strong></p>${toParagraph(eg.variables.independent)}`);
    if (eg.variables?.dependent) parts.push(`<p><strong>Dependent:</strong></p>${toParagraph(eg.variables.dependent)}`);
    if (eg.variables?.controlled?.length) parts.push(`<p><strong>Controlled:</strong></p>${toList(eg.variables.controlled)}`);
    if (eg.method?.length) parts.push(`<h3>Method</h3>${toList(eg.method, true)}`);
    if (eg.safetyNotes?.length) parts.push(`<h3>Safety Notes</h3>${toList(eg.safetyNotes)}`);
    pushSection("Experiment Guide", parts.join(""));
  }

  if (guide.timeline?.length) {
    const timelineHtml = guide.timeline.map((t) => {
      const year = renderInlineText(t.year);
      const event = renderInlineText(t.event);
      const significance = t.significance ? renderInlineText(t.significance) : "";
      const parts = [
        `<strong>${year}</strong> — ${event}`,
        significance ? ` (${significance})` : "",
      ].join("");
      return `<li>${parts}</li>`;
    }).join("");
    pushSection("Timeline", `<ul>${timelineHtml}</ul>`);
  }

  if (guide.sourceAnalysisFramework) {
    const saf = guide.sourceAnalysisFramework;
    const parts: string[] = [];
    if (saf.steps?.length) parts.push(`<h3>Steps</h3>${toList(saf.steps, true)}`);
    if (saf.keyQuestions?.length) parts.push(`<h3>Key Questions to Ask</h3>${toList(saf.keyQuestions)}`);
    pushSection("Source Analysis Framework", parts.join(""));
  }

  if (guide.rubricBreakdown?.length) {
    const rows = guide.rubricBreakdown.map((r) => ([
      `<strong>${renderInlineText(r.criterion)}</strong>`,
      r.marks ? renderInlineText(String(r.marks)) : "",
      r.excellent ? renderInlineText(r.excellent) : "",
      r.satisfactory ? renderInlineText(r.satisfactory) : "",
      r.developing ? renderInlineText(r.developing) : "",
    ]));
    const rubricTable = toTable(
      ["Criterion", "Marks", "Excellent", "Satisfactory", "Developing"],
      rows,
      { cellIsHtml: true }
    );
    pushSection("Rubric Breakdown", rubricTable);
  }

  if (guide.customSections?.length) {
    const customHtml = guide.customSections.map((section) => {
      const header = `<h3>${renderInlineText(section.title)}</h3>`;
      if (section.type === "list" && Array.isArray(section.content)) {
        return `${header}${toList(section.content as string[])}`;
      }
      if (section.type === "steps" && Array.isArray(section.content)) {
        return `${header}${toList(section.content as string[], true)}`;
      }
      if (section.type === "table" && Array.isArray(section.content)) {
        const rows = section.content as string[][];
        return `${header}${toTable(rows[0], rows.slice(1))}`;
      }
      if (typeof section.content === "string") {
        return `${header}${toParagraph(section.content)}`;
      }
      return header;
    }).join("");
    pushSection("Additional Sections", customHtml);
  }

  return sections.filter(Boolean).join("\n");
};
