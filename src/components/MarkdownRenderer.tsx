import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Desmos is client-only (browser APIs), so load it dynamically with no SSR
const DesmosGraph = dynamic(() => import("@/components/DesmosGraph"), { ssr: false });

interface MarkdownRendererProps {
  content: string;
  className?: string;
  // When true, closes any dangling fences/delimiters so partial markdown
  // doesn't break layout mid-stream. Also defers Desmos graph rendering.
  streaming?: boolean;
}

// Normalise LaTeX delimiters so remark-math always sees $...$ / $$...$$
// Models often output \(...\) for inline and \[...\] for display math.
// Also handles \begin{aligned}...\end{aligned} environments.
const normaliseLatex = (text: string): string => {
  let result = text;
  
  // Handle \begin{...}...\end{...} environments - wrap in $$ for display math
  // These are always display math, never inline
  result = result.replace(
    /(\\begin\{(?:aligned|align|gather|gathered|matrix|pmatrix|bmatrix|vmatrix|cases|equation|eqnarray)\*?\})\s*([\s\S]*?)\s*(\\end\{\1\})/g,
    '$$\n$2\n$$'
  );
  
  // Normalize LaTeX delimiters
  result = result
    .replace(/\\\[\s*/g, "$$\n")      // \[ → $$
    .replace(/\s*\\\]/g, "\n$$")      // \] → $$
    .replace(/\\\(/g, "$")            // \( → $
    .replace(/\\\)/g, "$");           // \) → $
  
  return result;
};

// Close any unclosed markdown fences/delimiters so partial content mid-stream
// doesn't cause KaTeX or ReactMarkdown to throw or render garbage.
// Think of it like auto-saving — we always keep the doc valid even mid-sentence.
const closePartialMarkdown = (text: string): string => {
  // Close unclosed triple-backtick code fences
  const fenceMatches = (text.match(/^```/gm) || []).length;
  if (fenceMatches % 2 !== 0) text += "\n```";

  // Close unclosed $$ display math (count occurrences, add closing if odd)
  const displayMatches = (text.match(/\$\$/g) || []).length;
  if (displayMatches % 2 !== 0) text += "\n$$";

  // Close unclosed \begin{...} environments
  const beginMatches = (text.match(/\\begin\{/g) || []).length;
  const endMatches = (text.match(/\\end\{/g) || []).length;
  if (beginMatches > endMatches) {
    // Find the last unclosed \begin and add matching \end
    const lastBegin = text.match(/\\begin\{([^}]+)\}/g);
    if (lastBegin) {
      const envName = lastBegin[lastBegin.length - 1].match(/\\begin\{([^}]+)\}/)?.[1];
      if (envName) {
        text += `\n\\end{${envName}}`;
      }
    }
  }

  // Close unclosed $ inline math per line
  // Be more careful - only close if we're confident it's unclosed
  const lines = text.split("\n");
  const closedLines = lines.map(line => {
    // Skip lines that are already closed or don't have math
    if (!line.includes("$") || line.includes("$$")) return line;
    
    // Count unescaped $ that are likely math delimiters
    // Ignore $ at end of line (probably currency or incomplete)
    const trimmed = line.trimEnd();
    if (trimmed.endsWith("$")) return line;
    
    // Count $ not preceded by backslash
    let dollarCount = 0;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === "$" && (i === 0 || trimmed[i-1] !== "\\")) {
        dollarCount++;
      }
    }
    
    // If odd number of $, close it
    if (dollarCount % 2 !== 0) return line + "$";
    return line;
  });
  return closedLines.join("\n");
};

// In react-markdown v10, code blocks are rendered as:
//   <pre><code>...</code></pre>
// and inline code as just <code>...</code> without a parent <pre>.
// We override `pre` to apply block styling, and `code` for inline styling.

const MarkdownRenderer = ({ content, className, streaming = false }: MarkdownRendererProps) => {
  // Always apply closePartialMarkdown during streaming to prevent KaTeX errors
  // from incomplete LaTeX delimiters
  const raw = streaming ? closePartialMarkdown(content) : content;
  const normalised = normaliseLatex(raw);
  
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { 
          strict: false,
          throwOnError: false,
          errorColor: "hsl(var(--muted-foreground))",
        }]]}
        components={{
          h1: ({ children }) => <h1 className="text-3xl font-black text-foreground mt-6 mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-2xl font-black text-foreground mt-5 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xl font-bold text-foreground mt-4 mb-2">{children}</h3>,
          // Use div instead of p to prevent <pre>/<code> nested inside <p> hydration errors
          p: ({ children }) => <div className="mb-4 last:mb-0 leading-relaxed">{children}</div>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-4 text-muted-foreground my-4">
              {children}
            </blockquote>
          ),
          // pre wraps block code — intercept desmos blocks, style the rest
          pre: ({ children }) => {
            // Dig out the <code> child to check if it's a desmos block
            const codeEl = (children as React.ReactElement);
            const lang = codeEl?.props?.className as string | undefined;
            if (lang === "language-desmos") {
              const raw = String(codeEl?.props?.children ?? "").replace(/\n$/, "");
              // During streaming, show placeholder instead of rendering Desmos
              if (streaming) {
                return (
                  <div className="my-4 rounded-2xl overflow-hidden border border-border/40 bg-muted/30 p-8 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground italic">Graph will appear after response completes...</p>
                  </div>
                );
              }
              return <DesmosGraph expressions={raw} />;
            }
            return (
              <pre className="bg-muted/40 border border-border/40 rounded-xl p-4 overflow-x-auto text-sm my-4">
                {children}
              </pre>
            );
          },
          // code is inline when NOT wrapped in a pre — the pre override handles block code
          code: ({ children, className: codeClassName }) => {
            // If className has a language- prefix, it's a block code element inside <pre>
            const isBlock = codeClassName?.startsWith("language-");
            return isBlock ? (
              <code className={cn("font-mono", codeClassName)}>{children}</code>
            ) : (
              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-primary">{children}</code>
            );
          },
          hr: () => <hr className="border-border/40 my-6" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border/50 px-3 py-2 text-left bg-muted/30 font-bold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border/50 px-3 py-2 align-top">{children}</td>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        }}
      >
        {normalised}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
