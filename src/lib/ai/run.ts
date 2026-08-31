import { APICallError, generateObject, generateText, streamText, zodSchema } from "ai";
import { z } from "zod";
import {
  classifyTaskType,
  getAIModel,
  getModelsForTaskType,
  getProviderAtIndex,
  getProviderOptionsForModel,
  isKeyDead,
  isVercelGatewayEnabled,
  markKeyDead,
  resolveModelForUser,
  type TaskType,
} from "./models";
import {
  enforceGroqRequestBudget,
  getMinOutputTokens,
  getSafeMaxTokens,
  TOTAL_BUDGET,
  type BudgetMessage,
} from "./budget";

// ============================================================================
// UNIFIED RUN WRAPPERS
// ----------------------------------------------------------------------------
// runText / runStream / runObject: the single entry points every AI feature
// route uses. Each applies the request budget safety net, picks the best model
// for the task, and falls back across API keys and models on 429/401/413/5xx
// just like the legacy raw-fetch client did - but through the AI SDK.
// ============================================================================

export interface RunTextOptions {
  system?: string;
  messages?: BudgetMessage[];
  prompt?: string;
  taskType?: TaskType;
  userModel?: string | null;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: boolean;
}

export interface RunResult {
  text: string;
  model: string;
  keyIndex: number;
  usage?: { inputTokens?: number; outputTokens?: number };
}

const estimateInputTokens = (messages: BudgetMessage[]): number =>
  Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4.5);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryAfterMs = (error: APICallError): number => {
  const retryAfter = error.responseHeaders?.["retry-after"];
  if (!retryAfter) return 0;
  const seconds = Number.parseFloat(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.min(seconds * 1000, 8000);
  }
  const retryAt = Date.parse(retryAfter);
  if (Number.isFinite(retryAt)) {
    return Math.min(Math.max(0, retryAt - Date.now()), 8000);
  }
  return 0;
};

export interface FallbackRunContext {
  model: string;
  keyIndex: number;
  maxTokens: number;
}

/**
 * Core fallback loop: tries each candidate model against each live API key,
 * honouring the dead-key cooldown and the Groq status-code semantics.
 * The `run` callback performs the actual SDK call with the given context.
 */
export const withModelFallback = async <T>(
  options: {
    taskType: TaskType;
    userModel?: string | null;
    estimatedTokens?: number;
    estimatedInputTokens?: number;
    maxTokens: number;
  },
  run: (ctx: FallbackRunContext) => Promise<T>,
): Promise<{ result: T; model: string; keyIndex: number }> => {
  const modelsToTry = getModelsForTaskType(
    options.taskType,
    options.userModel,
    options.estimatedTokens,
  );
  const models = [...new Set([...modelsToTry, resolveModelForUser(options.userModel)])];

  // Seamless Vercel infra: try gateway first (higher TPM, managed retries)
  // before falling back to direct Groq pool. This single attempt per model
  // avoids the hammering that previously caused 429 → retry storm → depth.
  if (isVercelGatewayEnabled()) {
    for (const model of models) {
      try {
        const gw = getAIModel(model);
        if (gw.via === "gateway") {
          const result = await run({
            model,
            keyIndex: -1,
            maxTokens: getSafeMaxTokens(model, options.maxTokens, options.estimatedInputTokens ?? 0),
          });
          return { result, model, keyIndex: -1 };
        }
      } catch (error) {
        const apiError = APICallError.isInstance(error) ? error : undefined;
        // Gateway 429 should fall through to Groq pool; don't retry gateway instantly
        if (apiError?.statusCode === 429) {
          console.warn(`[AI] Gateway rate-limited for ${model}, falling back to Groq`);
          break;
        }
        console.warn(`[AI] Gateway failed for ${model}: ${error instanceof Error ? error.message : String(error)}, trying Groq`);
        break;
      }
    }
  }

  const startingKeyIndex = 0;
  const keyCount = (() => {
    const keys = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2].filter(Boolean);
    return keys.length;
  })();

  let lastError: unknown = null;
  const MAX_RETRY_ROUNDS_PER_MODEL = 2;

  for (const model of models) {
    let tryNextModel = false;
    for (let retryRound = 0; retryRound < MAX_RETRY_ROUNDS_PER_MODEL && !tryNextModel; retryRound++) {
      let keyOffset = 0;
      let waitRetries = 0;
      while (keyOffset < keyCount) {
        const keyIndex = (startingKeyIndex + keyOffset) % keyCount;
        if (isKeyDead(keyIndex)) {
          keyOffset++;
          waitRetries = 0;
          continue;
        }
        const provider = getProviderAtIndex(keyIndex);
        if (!provider) {
          keyOffset++;
          waitRetries = 0;
          continue;
        }
        try {
          const result = await run({
            model,
            keyIndex,
            maxTokens: getSafeMaxTokens(
              model,
              options.maxTokens,
              options.estimatedInputTokens ?? 0,
            ),
          });
          return { result, model, keyIndex };
        } catch (error) {
          lastError = error;
          const apiError = APICallError.isInstance(error) ? error : undefined;
          if (apiError) {
            const status = apiError.statusCode;
            // Authentication failure: cooldown this key and move on.
            if (status === 401 || status === 403) {
              markKeyDead(keyIndex);
              console.warn(`[AI] ${model} auth failed on key #${keyIndex + 1}, marking dead`);
              keyOffset++;
              waitRetries = 0;
              continue;
            }
            // Rate limit: honour retry-after on the SAME key (TPM is per-key),
            // then move to the next key if it's still limited.
            if (status === 429) {
              const waitMs = getRetryAfterMs(apiError);
              if (waitMs > 0 && waitRetries < 2) {
                waitRetries++;
                console.log(`[AI] Rate limited on key #${keyIndex + 1}, waiting ${waitMs}ms`);
                await delay(waitMs);
                continue;
              }
              console.warn(`[AI] ${model} rate limited on key #${keyIndex + 1}, trying next key`);
              keyOffset++;
              waitRetries = 0;
              continue;
            }
            // Request too large: no model/key can fix this; drop the payload.
            if (status === 413) {
              console.warn(`[AI] ${model} request too large, skipping to next model`);
              tryNextModel = true;
              break;
            }
            // 5xx: try the next key.
            if (status !== undefined && status >= 500) {
              console.warn(`[AI] ${model} server error (${status}) on key #${keyIndex + 1}`);
              keyOffset++;
              waitRetries = 0;
              continue;
            }
          }
          // Unknown error: try the next key, then the next model.
          console.warn(
            `[AI] ${model} failed on key #${keyIndex + 1}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          keyOffset++;
          waitRetries = 0;
        }
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("AI service failed after trying all models and API keys");
};

const buildBudgetedPrompt = (
  options: Pick<RunTextOptions, "system" | "messages" | "prompt" | "taskType" | "userModel" | "maxTokens">,
) => {
  const messages: BudgetMessage[] = [
    ...(options.system ? [{ role: "system", content: options.system }] : []),
    ...(options.messages ?? []),
    ...(options.prompt ? [{ role: "user", content: options.prompt }] : []),
  ];
  const taskType = options.taskType ?? classifyTaskType(options.messages ?? []);
  const minOutputTokens = getMinOutputTokens(taskType, options.userModel);
  const budgeted = enforceGroqRequestBudget(
    messages,
    options.maxTokens ?? minOutputTokens,
    TOTAL_BUDGET,
    minOutputTokens,
  );
  return {
    budgeted,
    taskType,
    // Total estimated request size (input + output) for model selection.
    estimatedTokens: estimateInputTokens(budgeted.messages) + budgeted.maxTokens,
    // Input-only estimate for getSafeMaxTokens. Passing the total here would
    // double-subtract the input from the budget and silently shrink every
    // response (requested 4096 -> ~1800). The real cap is already enforced by
    // enforceGroqRequestBudget above.
    estimatedInputTokens: estimateInputTokens(budgeted.messages),
  };
};

export const runText = async (options: RunTextOptions): Promise<RunResult> => {
  const { budgeted, taskType, estimatedTokens, estimatedInputTokens } = buildBudgetedPrompt(options);
  const { result, model, keyIndex } = await withModelFallback(
    { taskType, userModel: options.userModel, estimatedTokens, estimatedInputTokens, maxTokens: budgeted.maxTokens },
    async ({ model, keyIndex, maxTokens }) => {
      const aiModel = keyIndex === -1 ? getAIModel(model).model : getProviderAtIndex(keyIndex)!(model);
      const { text, usage } = await generateText({
        model: aiModel,
        system: budgeted.messages.find((m) => m.role === "system")?.content,
        messages: budgeted.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        temperature: options.temperature,
        maxOutputTokens: maxTokens,
        providerOptions: getProviderOptionsForModel(model),
        maxRetries: 1,
      });
      return { text, usage };
    },
  );
  return {
    text: result.text,
    model,
    keyIndex,
    usage: result.usage
      ? { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens }
      : undefined,
  };
};

export interface RunStreamOptions extends RunTextOptions {
  onError?: (error: unknown) => void;
}

/**
 * Streaming variant of runText. Returns a ReadableStream<Uint8Array> of raw
 * SSE `data:` lines carrying `{ type: "delta", delta: string }` events, plus a
 * terminal `data: [DONE]` event. Callers can pipe this straight into a
 * Response body. Tool-less by design (chat uses the tool-enabled route).
 */
export const runStream = (options: RunStreamOptions): ReadableStream<Uint8Array> => {
  const { budgeted, taskType, estimatedTokens, estimatedInputTokens } = buildBudgetedPrompt(options);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await withModelFallback(
          { taskType, userModel: options.userModel, estimatedTokens, estimatedInputTokens, maxTokens: budgeted.maxTokens },
          async ({ model, keyIndex, maxTokens }) => {
            const aiModel = keyIndex === -1 ? getAIModel(model).model : getProviderAtIndex(keyIndex)!(model);
            const result = streamText({
              model: aiModel,
              system: budgeted.messages.find((m) => m.role === "system")?.content,
              messages: budgeted.messages
                .filter((m) => m.role !== "system")
                .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
              temperature: options.temperature,
              maxOutputTokens: maxTokens,
              providerOptions: getProviderOptionsForModel(model),
              maxRetries: 1,
            });
            for await (const part of result.fullStream) {
              if (part.type === "text-delta" && part.text) {
                const payload = JSON.stringify({ type: "delta", delta: part.text });
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              }
            }
            return true;
          },
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        options.onError?.(error);
        const payload = JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "AI service failed",
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return stream;
};

export interface RunObjectOptions {
  schema: z.ZodSchema;
  prompt?: string;
  messages?: BudgetMessage[];
  system?: string;
  taskType?: TaskType;
  userModel?: string | null;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Structured output generation via generateObject. The schema's Zod schema is
 * passed through the SDK; Groq returns JSON matching it. Falls back across
 * models/keys just like runText.
 */
export const runObject = async <T>(options: RunObjectOptions): Promise<T> => {
  const { budgeted, taskType, estimatedTokens, estimatedInputTokens } = buildBudgetedPrompt(options);
  const { result } = await withModelFallback(
    { taskType, userModel: options.userModel, estimatedTokens, estimatedInputTokens, maxTokens: budgeted.maxTokens },
    async ({ model, keyIndex, maxTokens }) => {
      const aiModel = keyIndex === -1 ? getAIModel(model).model : getProviderAtIndex(keyIndex)!(model);
      return generateObject({
        model: aiModel,
        schema: zodSchema(options.schema),
        system: budgeted.messages.find((m) => m.role === "system")?.content,
        messages: budgeted.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        temperature: options.temperature,
        maxOutputTokens: maxTokens,
        providerOptions: getProviderOptionsForModel(model),
        maxRetries: 1,
      });
    },
  );
  return result.object as T;
};

export { z };