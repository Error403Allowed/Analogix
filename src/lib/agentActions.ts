// Agentic AI utilities for autonomous document editing

import type { ChatMessage } from "@/types/chat";

export interface AgentAction {
  type: "insert" | "replace" | "delete" | "create_section" | "rewrite_all";
  target?: string;
  content: string;
  position?: "before" | "after" | "start" | "end" | "replace";
}

export interface AgentPlan {
  actions: AgentAction[];
  explanation: string;
}

// Parse AI response to extract structured actions
export function parseAgentActions(content: string): AgentPlan | null {
  // Support both <actions>...</actions> and ```actions...``` blocks
  const blockMatch =
    content.match(/<actions>([\s\S]*?)<\/actions>/i) ||
    content.match(/```actions\s*([\s\S]*?)```/i);
  if (!blockMatch) return null;

  try {
    const raw = blockMatch[1].trim();
    const parsed = JSON.parse(raw);
    const actions: AgentAction[] = Array.isArray(parsed) ? parsed : [parsed];
    const explanation = content
      .replace(/<actions>[\s\S]*?<\/actions>/i, "")
      .replace(/```actions[\s\S]*?```/i, "")
      .trim();
    return { actions, explanation };
  } catch {
    return null;
  }
}

// Apply actions to markdown document content
export function applyAgentActions(currentContent: string, plan: AgentPlan): string {
  let content = currentContent;

  for (const action of plan.actions) {
    switch (action.type) {
      case "rewrite_all":
        content = action.content;
        break;

      case "insert":
        if (action.position === "end") {
          content = content.trimEnd() + "\n\n" + action.content;
        } else if (action.position === "start") {
          content = action.content + "\n\n" + content;
        } else if (action.target) {
          const targetRegex = new RegExp(
            `(#{1,6}\\s*${escapeRegex(action.target)}[^\\n]*\\n)`,
            "i"
          );
          const match = content.match(targetRegex);
          if (match && match.index !== undefined) {
            const insertPos =
              action.position === "after"
                ? match.index + match[0].length
                : match.index;
            content =
              content.slice(0, insertPos) +
              action.content + "\n\n" +
              content.slice(insertPos);
          } else {
            // Target not found — append at end
            content = content.trimEnd() + "\n\n" + action.content;
          }
        }
        break;

      case "replace":
      case "create_section":
        if (action.type === "create_section") {
          const heading = `## ${action.target || "New Section"}`;
          content = content.trimEnd() + "\n\n" + heading + "\n\n" + action.content;
        } else if (action.target) {
          // Replace entire section (heading + body up to next same-or-higher heading)
          const targetRegex = new RegExp(
            `(#{1,6})\\s*${escapeRegex(action.target)}[^\\n]*\\n[\\s\\S]*?(?=\\1[^#]|^#{1,6}\\s|$)`,
            "im"
          );
          if (targetRegex.test(content)) {
            content = content.replace(targetRegex, action.content + "\n\n");
          } else {
            content = content.trimEnd() + "\n\n" + action.content;
          }
        }
        break;

      case "delete":
        if (action.target) {
          const targetRegex = new RegExp(
            `#{1,6}\\s*${escapeRegex(action.target)}[^\\n]*\\n[\\s\\S]*?(?=#{1,6}\\s|$)`,
            "im"
          );
          content = content.replace(targetRegex, "");
        }
        break;
    }
  }

  return content.trim();
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Generate system prompt for agentic editing
export function generateAgentSystemPrompt(context: {
  docTitle: string;
  subject: string;
  appContext?: string;
}): string {
  return `You are an AI study assistant embedded in a student's document editor. You have two modes:

## MODE 1 — DOCUMENT EDITING
When the student asks you to ADD, EDIT, REWRITE, CREATE, INSERT, or MODIFY the document, respond with a brief plain-text explanation (1-2 sentences, no markdown) followed by an <actions> block.

## MODE 2 — ANSWERING QUESTIONS
When the student asks a question (explain, what is, how does, etc.), respond with a short, direct answer. Write in plain text only — no markdown, no asterisks, no headings, no bullet points using *, no numbered lists. Just 1-3 plain paragraphs of prose. Do NOT include <actions> blocks.

---

CURRENT DOCUMENT: "${context.docTitle}"
SUBJECT: ${context.subject}

${context.appContext ? "STUDENT WORKSPACE CONTEXT:\n" + context.appContext : ""}

---

## HOW TO USE <actions> BLOCKS

Format (must be valid JSON array):

<actions>
[
  {
    "type": "insert" | "replace" | "delete" | "create_section" | "rewrite_all",
    "target": "Section heading to target (optional)",
    "content": "Content in markdown",
    "position": "start" | "end" | "before" | "after"
  }
]
</actions>

### Action types:
- **insert** — Add content. Use "position": "start"/"end" for doc level. Use "target" + "position": "before"/"after" for near a section.
- **replace** — Replace a named section entirely. Requires "target".
- **create_section** — Append a new ## section. "target" becomes the heading.
- **delete** — Remove a section. Requires "target".
- **rewrite_all** — Replace the entire document with "content".

### Examples:

Add intro at start:
<actions>
[{"type": "insert", "position": "start", "content": "# Introduction\\n\\nThis document covers..."}]
</actions>

Add practice questions:
<actions>
[{"type": "create_section", "target": "Practice Questions", "content": "1. What is...\\n   **Answer:** ..."}]
</actions>

Replace Summary section:
<actions>
[{"type": "replace", "target": "Summary", "content": "## Summary\\n\\nIn conclusion..."}]
</actions>

---

IMPORTANT RULES:
- Your explanation before <actions> must be plain text, max 2 sentences, no markdown.
- The <actions> JSON must be valid — properly escaped strings.
- Use rich markdown inside "content" (headings, bold, lists, etc.).
- For question-answering, write plain prose only. No **, no #, no - bullets.`;
}

// Convert HTML to markdown (basic)
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) =>
      content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    )
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
      let i = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${i++}. $1\n`);
    })
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```")
    .replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Convert markdown to HTML (basic — TipTap handles proper parsing via setContent)
export function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^\- (.*?)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.*?)$/gm, "<li>$1</li>")
    .replace(/^> (.*?)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .split(/\n\n+/)
    .map(block => {
      if (block.startsWith("<h") || block.startsWith("<blockquote") || block.startsWith("<hr") || block.includes("<li>")) return block;
      if (block.trim()) return `<p>${block.trim()}</p>`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
