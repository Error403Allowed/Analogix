import { MIN_COMPLETION_TOKENS, MODEL_OUTPUT_LIMITS, MODEL_REQUEST_TOKEN_BUDGETS } from "./models";

// ============================================================================
// REQUEST BUDGET SAFETY NET
// ============================================================================
// Groq's on-demand tier rejects any single request whose input + reserved
// max_tokens exceeds the org's TPM cap (8000) with HTTP 413 "Request too
// large". This safety net runs immediately before every request and guarantees
// the outgoing request fits by capping output, dropping the oldest non-system
// turns, and truncating content as a last resort.
//
// 3.5 chars/token is deliberately conservative: real tokenizers run ~4-4.5 for
// prose but ~3 for dense content, so this never underestimates a request.
export const ESTIMATE_CHARS_PER_TOKEN = 3.5;

export const estimateRequestTokens = (text: string): number =>
  Math.ceil(text.length / ESTIMATE_CHARS_PER_TOKEN);

// Vision tokens per attached image/file part. Image content is base64, so a
// char-length estimate would massively under-count what Groq bills (~1k tokens).
export const FILE_PART_TOKEN_ESTIMATE = 900;

// Token estimate for a list of UI messages (text/tool-call/tool-result/file/
// reasoning parts). Unlike a text-only flatten, this accounts for tool history
// and image attachments so the request can never silently exceed the TPM cap.
export const estimateUIMessagesTokens = (messages: Array<{ parts?: unknown[] }>): number => {
  let chars = 0;
  for (const m of messages) {
    const parts = (m.parts ?? []) as Array<Record<string, unknown>>;
    for (const p of parts) {
      const t = typeof p.type === "string" ? p.type : "";
      if (t === "text") {
        chars += typeof p.text === "string" ? p.text.length : 0;
      } else if (t === "file") {
        chars += FILE_PART_TOKEN_ESTIMATE * ESTIMATE_CHARS_PER_TOKEN;
      } else if (
        t === "tool-call" ||
        t === "tool-result" ||
        t === "dynamic-tool" ||
        t.startsWith("tool-") ||
        t.startsWith("data-")
      ) {
        const value = p.input ?? p.output ?? p.data ?? (typeof p.text === "string" ? p.text : "");
        if (typeof value === "string") {
          chars += value.length;
        } else if (value !== undefined && value !== null && value !== "") {
          chars += JSON.stringify(value).length;
        } else if (t.startsWith("tool-") || t === "dynamic-tool") {
          // v6 tool parts carry input/output even when values above are empty
          const fallback = (p as Record<string, unknown>).input ?? (p as Record<string, unknown>).output ?? "";
          chars += typeof fallback === "string" ? fallback.length : JSON.stringify(fallback).length;
        }
      } else if (t === "reasoning" || t === "step-start") {
        const txt = typeof p.text === "string" ? p.text : typeof (p as Record<string, unknown>).reasoning === "string" ? (p as unknown as { reasoning: string }).reasoning : "";
        chars += txt.length;
      }
    }
  }
  return Math.ceil(chars / ESTIMATE_CHARS_PER_TOKEN);
};

// ~1 token per 4 chars for English text (used for the looser client-side and
// system-prompt estimates).
export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);

export interface BudgetMessage {
  role: string;
  content: string;
}

export interface BudgetResult {
  messages: BudgetMessage[];
  maxTokens: number;
}

// Reasoning models (Qwen - and GPT-OSS, which reasons by default) spend part of
// their output budget on the hidden chain-of-thought before the visible answer.
// Reserve extra output room so the thinking pass AND the visible answer both fit.
export const REASONING_TOKEN_RESERVE = 1024;
export const MIN_ANSWER_TOKENS = 400;
export const REASONING_OUTPUT_FLOOR = REASONING_TOKEN_RESERVE + MIN_ANSWER_TOKENS;

// Target visible answer size for ordinary chat turns (before the reasoning
// reserve is added for CoT-heavy models). Keep this modest on On-Demand tier
// so input+output together leave TPM headroom (Used + Requested < 8000).
export const DEFAULT_OUTPUT_TOKENS = 1100;
export const MIN_SAFE_OUTPUT = 256;
const GREETING_OUTPUT_TOKENS = 300;
const GREETING_OUTPUT_TOKENS_WITH_REASONING = 600;

export interface ChatOutputBudgetInput {
  isSimpleGreeting: boolean;
  wantsLongResponse: boolean;
  /** Model produces hidden chain-of-thought (gpt-oss / qwen / reasoning task). */
  reasons: boolean;
  /** Hard cap for long-form output for the selected model. */
  outputHardCap: number;
  /** Tokens left for output once system + tools + history are budgeted. */
  outputBudget: number;
}

export interface ChatOutputBudget {
  requested: number;
  maxOutputTokens: number;
}

/**
 * Compute the chat stream's output allowance. `requested` is the target (with a
 * reasoning reserve for CoT models so the visible answer still gets the full
 * default); `maxOutputTokens` is the intersection of `requested` and the
 * request-level `outputBudget` ceiling, never below the safe floor. The target
 * must never act as a *ceiling* on tight budgets - that truncates the answer.
 */
export const computeChatOutputBudget = (input: ChatOutputBudgetInput): ChatOutputBudget => {
  const { isSimpleGreeting, wantsLongResponse, reasons, outputHardCap, outputBudget } = input;
  const requested = isSimpleGreeting
    ? reasons
      ? GREETING_OUTPUT_TOKENS_WITH_REASONING
      : GREETING_OUTPUT_TOKENS
    : wantsLongResponse
      ? outputHardCap
      : reasons
        ? DEFAULT_OUTPUT_TOKENS + REASONING_TOKEN_RESERVE
        : DEFAULT_OUTPUT_TOKENS;
  const maxOutputTokens = Math.max(MIN_SAFE_OUTPUT, Math.min(requested, outputBudget));
  return { requested, maxOutputTokens };
};

export const getMinOutputTokens = (
  taskType: string,
  userSelectedModel?: string | null,
): number => {
  if (taskType === "reasoning") return REASONING_OUTPUT_FLOOR;
  if (
    userSelectedModel &&
    typeof userSelectedModel === "string" &&
    userSelectedModel.toLowerCase().includes("qwen")
  ) {
    return REASONING_OUTPUT_FLOOR;
  }
  return MIN_COMPLETION_TOKENS;
};

/**
 * Guarantee a message list + output budget fits Groq's per-request token cap.
 * `minOutputTokens` is the smallest output allowance worth keeping - for
 * reasoning models pass REASONING_OUTPUT_FLOOR so the trim reclaims enough
 * input room for the chain-of-thought AND the visible answer to fit.
 * Returns the trimmed message list and a safe max_tokens value.
 */
export const enforceGroqRequestBudget = (
  messages: BudgetMessage[],
  requestedMaxTokens: number,
  totalBudget: number = 7600,
  minOutputTokens: number = MIN_COMPLETION_TOKENS,
): BudgetResult => {
  const msgs = messages.map((m) => ({ ...m }));
  const estimateInput = (list: BudgetMessage[]) =>
    list.reduce((sum, m) => sum + estimateRequestTokens(m.content), 0);
  let inputTokens = estimateInput(msgs);
  // 1) Drop the oldest non-system turns while the request (even at the minimum
  //    output allowance) is still over budget. The latest user ask is always kept.
  let dropped = 0;
  const nonSystemCount = () => msgs.filter((m) => m.role !== "system").length;
  while (msgs.length > 1 && nonSystemCount() > 1 && inputTokens + minOutputTokens > totalBudget) {
    const dropIdx = msgs.findIndex((m) => m.role !== "system");
    if (dropIdx === -1) break;
    inputTokens -= estimateRequestTokens(msgs[dropIdx].content);
    msgs.splice(dropIdx, 1);
    dropped++;
  }
  // 2) If a single oversized message still blows the budget, truncate its
  //    content (oldest non-system first; the system prompt tail only as an
  //    absolute last resort). A truncated prompt is far better than a 413.
  let guard = 0;
  while (inputTokens + minOutputTokens > totalBudget && guard < 10) {
    const idx = msgs.findIndex((m) => m.role !== "system" && m.content.length > 200);
    const targetIdx = idx === -1 && msgs[0]?.role === "system" && msgs[0].content.length > 200 ? 0 : idx;
    if (targetIdx === -1) break;
    const over = inputTokens + minOutputTokens - totalBudget;
    const cutChars = Math.ceil(over * ESTIMATE_CHARS_PER_TOKEN) + 64;
    const kept = Math.max(120, msgs[targetIdx].content.length - cutChars);
    msgs[targetIdx].content = msgs[targetIdx].content.slice(0, kept) + "\n…[truncated]";
    inputTokens = estimateInput(msgs);
    guard++;
  }
  const maxTokens = Math.max(minOutputTokens, Math.min(requestedMaxTokens, totalBudget - inputTokens));
  if (dropped > 0 || guard > 0) {
    console.warn(
      `[AI] Budget safety net: dropped ${dropped} message(s), truncated ${guard} content(s) to fit ${totalBudget}t request cap`,
    );
  }
  return { messages: msgs, maxTokens };
};

const getSafeMaxTokens = (model: string, requested: number, estimatedInputTokens = 0): number => {
  const limit = MODEL_OUTPUT_LIMITS[model] || 4096;
  const requestBudget = MODEL_REQUEST_TOKEN_BUDGETS[model];
  const maxByRequestBudget = requestBudget
    ? Math.max(MIN_COMPLETION_TOKENS, requestBudget - estimatedInputTokens)
    : requested;
  return Math.min(requested, limit, maxByRequestBudget);
};

// On-Demand TPM is 8000. We must leave ~3500-4000 headroom for the sliding
// window (Used + Requested < 8000). A per-request cap of 7600 only protects
// against 413, not 429 TPM bursts. 4200 is conservative enough that even
// with ~3800 already used, a new request stays under the TPM limit.
// When Vercel AI Gateway (paid) is enabled or AI_BUDGET_TOKENS is set, we
// raise the cap for seamless higher-throughput infra.
const envBudget = Number(process.env.AI_BUDGET_TOKENS || process.env.AI_GATEWAY_BUDGET);
export const TOTAL_BUDGET = (() => {
  if (Number.isFinite(envBudget) && envBudget > 1000 && envBudget <= 12000) return envBudget;
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_KEY) return 7000;
  return 4200;
})();
export const TOTAL_BUDGET_LEGACY = 7600;

export { getSafeMaxTokens };