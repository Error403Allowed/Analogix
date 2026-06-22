import katex from "katex";
import { KATEX_CSS } from "./katexCss";

export { KATEX_CSS };

export function renderLatex(latex: string, displayMode = true): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
    });
  } catch {
    return `<pre class="katex-fallback">${escapeHtml(latex)}</pre>`;
  }
}

export function stripDelimiters(s: string): string {
  return s
    .replace(/^\\\(|\\\)$/g, "")
    .replace(/^\\\[|\\\]$/g, "")
    .replace(/^\$\$|\$\$$/g, "")
    .replace(/^\$|\$$/g, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
