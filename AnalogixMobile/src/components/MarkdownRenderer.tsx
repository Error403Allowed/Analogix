import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { useTheme } from "react-native-paper";

let WebView: any = () => null;
let WebViewMessageEvent: any = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require("react-native-webview").WebView;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebViewMessageEvent = require("react-native-webview").WebViewMessageEvent;
}

interface Props {
  content: string;
  maxWidth?: number;
  style?: any;
  onRunCode?: (code: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function normaliseLatex(text: string): string {
  return text
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let result = escapeHtml(text);
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/`(.+?)`/g, "<code>$1</code>");
  result = result.replace(/~~(.+?)~~/g, "<del>$1</del>");
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  result = result.replace(/\$\$(.+?)\$\$/g, (_, math) => renderMath(math, true));
  result = result.replace(/\$(.+?)\$/g, (_, math) => renderMath(math, false));
  return result;
}

function renderMath(math: string, display: boolean): string {
  const escaped = escapeHtml(math);
  return display
    ? `<div class="math-block">\\[${escaped}\\]</div>`
    : `<span class="math-inline">\\(${escaped}\\)</span>`;
}

function renderMarkdownToHtml(markdown: string, blockIndex: { current: number }): string {
  const lines = markdown.split("\n");
  let html = "";
  let inCodeBlock = false;
  let codeLang = "";
  let codeContent = "";

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        const lang = codeLang.toLowerCase();
        const isPython = lang === "python" || lang === "py";
        const idx = blockIndex.current++;
        const runBtn = isPython
          ? `<button class="run-btn" data-code-idx="${idx}" onclick="event.stopPropagation(); window.ReactNativeWebView.postMessage(JSON.stringify({type:'run-code', index:${idx}}))">\u25B6 Run</button>`
          : "";
        html += `<div class="code-wrapper" data-code-idx="${idx}">
          <div class="code-header">
            <span class="code-lang">${escapeHtml(codeLang)}</span>
            ${runBtn}
          </div>
          <pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeContent)}</code></pre>
        </div>`;
        codeContent = "";
        codeLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += (codeContent ? "\n" : "") + line;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) { html += "<br/>"; continue; }

    if (trimmed.startsWith("### ")) {
      html += `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
    } else if (trimmed.startsWith("## ")) {
      html += `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
    } else if (trimmed.startsWith("# ")) {
      html += `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      html += `<li>${renderInline(trimmed.slice(2))}</li>`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      html += `<li>${renderInline(trimmed.replace(/^\d+\.\s/, ""))}</li>`;
    } else if (trimmed.startsWith("> ")) {
      html += `<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`;
    } else if (/^\|.*\|$/.test(trimmed)) {
      const cells = trimmed.split("|").filter(c => c.trim()).map(c => c.trim());
      if (cells.some(c => /^-+$/.test(c))) { /* separator row */ }
      else {
        html += `<tr>${cells.map(c => `<td>${renderInline(c)}</td>`).join("")}</tr>`;
      }
    } else if (/^-{3,}$/.test(trimmed)) {
      html += "<hr/>";
    } else {
      html += `<p>${renderInline(trimmed)}</p>`;
    }
  }

  if (inCodeBlock && codeContent) {
    const lang = codeLang.toLowerCase();
    const isPython = lang === "python" || lang === "py";
    const idx = blockIndex.current++;
    const runBtn = isPython
      ? `<button class="run-btn" data-code-idx="${idx}" onclick="event.stopPropagation(); window.ReactNativeWebView.postMessage(JSON.stringify({type:'run-code', index:${idx}}))">\u25B6 Run</button>`
      : "";
    html += `<div class="code-wrapper" data-code-idx="${idx}">
      <div class="code-header">
        <span class="code-lang">${escapeHtml(codeLang)}</span>
        ${runBtn}
      </div>
      <pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeContent)}</code></pre>
    </div>`;
  }

  return html;
}

function buildHtml(markdown: string, isDark: boolean): { html: string } {
  const blockIndex = { current: 0 };

  const body = renderMarkdownToHtml(markdown, blockIndex);

  const scripts = `
    document.addEventListener("DOMContentLoaded", function() {
      document.querySelectorAll("pre code").forEach(function(block) {
        hljs.highlightElement(block);
      });
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\\\[", right: "\\\\]", display: true},
            {left: "\\\\(", right: "\\\\)", display: false},
          ],
          throwOnError: false,
        });
      }
    });
  `;

  const fg = isDark ? "#e0e0e0" : "#1a1a2e";
  const bg = isDark ? "#1c1c1e" : "#ffffff";
  const codeBg = isDark ? "#2a2a3e" : "#f0f0f0";
  const preBg = isDark ? "#1e1e2e" : "#f5f5f5";
  const border = isDark ? "#333" : "#e0e0e0";
  const thBg = isDark ? "#2a2a3e" : "#f5f5f5";
  const tdBorder = isDark ? "#333" : "#ddd";
  const blockquoteColor = isDark ? "#999" : "#666";
  const headerBg = isDark ? "#2a2a3e" : "#f0f0f0";
  const langColor = isDark ? "#aaa" : "#888";
  const hljsTheme = isDark ? "github-dark.min.css" : "github.min.css";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${hljsTheme}">
      <style>
        @font-face{font-family:'KaTeX_AMS';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Caligraphic';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Fraktur';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Main';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Math';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_SansSerif';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Script';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Size1';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Size2';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Size3';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Size4';src:local('serif');font-display:swap}
        @font-face{font-family:'KaTeX_Typewriter';src:local('serif');font-display:swap}
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/contrib/auto-render.min.js"></script>
      <script>${scripts}</script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: ${fg};
          background: ${bg};
          padding: 0;
          overflow: hidden;
          word-wrap: break-word;
        }
        h1 { font-size: 22px; font-weight: 700; margin: 12px 0 6px; }
        h2 { font-size: 18px; font-weight: 700; margin: 10px 0 5px; }
        h3 { font-size: 16px; font-weight: 600; margin: 8px 0 4px; }
        p { margin: 4px 0; }
        ul, ol { padding-left: 20px; margin: 4px 0; }
        li { margin: 2px 0; }
        a { color: #6366f1; text-decoration: none; }
        blockquote {
          border-left: 3px solid #6366f1;
          padding-left: 12px;
          margin: 8px 0;
          color: ${blockquoteColor};
        }
        pre {
          background: ${preBg};
          border-radius: 0 0 8px 8px;
          padding: 12px;
          margin: 0;
          overflow-x: auto;
        }
        code {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 13px;
        }
        p > code, li > code { background: ${codeBg}; padding: 2px 6px; border-radius: 4px; }
        table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        th, td { border: 1px solid ${tdBorder}; padding: 6px 10px; text-align: left; font-size: 13px; }
        th { background: ${thBg}; font-weight: 600; }
        hr { border: none; border-top: 1px solid ${tdBorder}; margin: 12px 0; }
        del { opacity: 0.6; }
        .math-block { text-align: center; margin: 8px 0; overflow-x: auto; }
        .code-wrapper {
          border-radius: 8px;
          overflow: hidden;
          margin: 8px 0;
          border: 1px solid ${border};
        }
        .code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: ${headerBg};
          padding: 4px 12px;
          font-size: 11px;
        }
        .code-lang {
          color: ${langColor};
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .run-btn {
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .run-btn:hover { background: #4f46e5; }
        .run-btn:active { background: #4338ca; }
      </style>
    </head>
    <body>${body}</body>
    </html>
  `;
  return { html };
}

function extractCodes(markdown: string): string[] {
  const codes: string[] = [];
  const regex = /```(?:python|py)\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    codes.push(match[1].trim());
  }
  return codes;
}

export function MarkdownRenderer({ content, maxWidth, style, onRunCode }: Props) {
  const codesRef = useRef<string[]>([]);
  const paperTheme = useTheme();
  const isDark = paperTheme.dark;

  const { html } = useMemo(() => {
    const normalised = normaliseLatex(content);
    codesRef.current = extractCodes(content);
    return buildHtml(normalised, isDark);
  }, [content, isDark]);

  const width = maxWidth ?? Math.min(SCREEN_WIDTH - 80, 400);

  const [webViewError, setWebViewError] = useState(false);

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent?.data ?? event.data);
      if (msg.type === "run-code" && typeof msg.index === "number") {
        const code = codesRef.current[msg.index];
        if (code && onRunCode) {
          onRunCode(code);
        }
      }
    } catch { /* noop */ }
  }, [onRunCode]);

  if (webViewError) {
    return (
      <View style={[styles.container, style, { padding: 8, backgroundColor: "#f9fafb" }]}>
        <Text style={{ fontSize: 12, color: "#6b7280" }}>{content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {Platform.OS === "web" ? (
        <WebMarkdown html={html} width={width} />
      ) : (
        <WebView
          source={{ html }}
          style={{ width, height: 1, backgroundColor: "transparent" }}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled={true}
          domStorageEnabled={false}
          onMessage={handleMessage}
          onError={() => setWebViewError(true)}
          onHttpError={() => setWebViewError(true)}
          originWhitelist={[]}
          allowFileAccess={false}
        />
      )}
    </View>
  );
}

function WebMarkdown({ html, width }: { html: string; width: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = html;
    el.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      if (old.src) {
        s.src = old.src;
      } else {
        s.textContent = old.textContent;
      }
      old.parentNode?.replaceChild(s, old);
    });
  }, [html]);

  return (
    <div ref={ref} style={{ width, overflow: "hidden" }} />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 8,
  },
});
