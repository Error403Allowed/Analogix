/**
 * Extract the first well-formed JSON value (object or array) from a model's raw
 * text output.
 *
 * LLMs don't always honour "return ONLY valid JSON" even when instructed to, and
 * some models cannot be safely placed in strict JSON mode (e.g. gpt-oss on Groq
 * hard-fails with `json_validate_failed`). This helper tolerates prose before and
 * after the JSON, markdown fences, and trailing commas are left to JSON.parse.
 */
export function extractStructuredJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;

  // Fast path: the whole output is already valid JSON.
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      // fall through to scanning for a balanced value
    }
  }

  // Scan for a balanced JSON value, tolerating prose around it. Try each
  // candidate start position until one closes correctly AND parses.
  for (let start = 0; start < text.length; start++) {
    const ch = text[start];
    if (ch !== "{" && ch !== "[") continue;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const c = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (c === "\\") {
          escaped = true;
        } else if (c === '"') {
          inString = false;
        }
        continue;
      }

      if (c === '"') {
        inString = true;
      } else if (c === "{" || c === "[") {
        stack.push(c);
      } else if (c === "}" || c === "]") {
        const open = stack.pop();
        if (!open || (open === "{" && c !== "}") || (open === "[" && c !== "]")) {
          // Mismatched close - this candidate can't be a valid JSON value.
          stack.length = 0;
          break;
        }
        if (stack.length === 0) {
          const candidate = text.slice(start, i + 1);
          try {
            return JSON.parse(candidate) as T;
          } catch {
            // Balanced but not valid JSON - keep scanning for the next candidate.
          }
          break;
        }
      }
    }
  }

  return null;
}