import { getMoodProfile } from "@/utils/mood";

const HF_CHAT_URL =
  process.env.HF_CHAT_URL || "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen2.5-72B-Instruct";

const getSafeModelList = () => {
  const rawList = [
    process.env.HF_CHAT_MODEL || DEFAULT_MODEL,
    ...(process.env.HF_CHAT_MODEL_FALLBACKS || "").split(","),
  ];

  return rawList
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((model) => {
      // Fix common configuration error: missing "Meta-" prefix
      if (model === "meta-llama/Llama-3.1-8B-Instruct") {
        return "meta-llama/Meta-Llama-3.1-8B-Instruct";
      }
      return model;
    });
};

const HF_CHAT_MODELS = Array.from(new Set(getSafeModelList()));
console.log("[HF] Loaded models:", HF_CHAT_MODELS);

const apiKeys = [
  process.env.HF_API_KEY,
  process.env.HF_API_KEY_2,
].filter((key): key is string => Boolean(key));

let rotationCursor = 0;

const getRotationBase = () => {
  if (apiKeys.length === 0) return 0;
  const base = rotationCursor % apiKeys.length;
  rotationCursor = (rotationCursor + 1) % apiKeys.length;
  return base;
};

const getRotatedKey = (baseIndex: number, offset = 0) => {
  if (apiKeys.length === 0) return null;
  const index = (baseIndex + offset) % apiKeys.length;
  return apiKeys[index];
};

const parseErrorMessage = async (response: Response) => {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed?.error) {
      return typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
    }
    if (parsed?.message) {
      return typeof parsed.message === "string" ? parsed.message : JSON.stringify(parsed.message);
    }
    return JSON.stringify(parsed);
  } catch {
    return raw || response.statusText;
  }
};

export const assertApiKeys = () => {
  if (apiKeys.length === 0) {
    throw new Error("Missing HF_API_KEY (set HF_API_KEY/HF_API_KEY_2 in .env and restart dev server)");
  }
};

export const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const isModelNotSupported = (message: string) =>
  message.includes("model_not_supported") ||
  message.includes("not supported by any provider");

export const callHfChat = async (payload: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  max_tokens: number;
  temperature: number;
}) => {
  assertApiKeys();
  let lastError: unknown = null;

  const callWithRetry = async (model: string, retryCount = 0): Promise<string> => {
    const rotationBase = getRotationBase();
    const activeKey = getRotatedKey(rotationBase, retryCount);
    if (!activeKey) throw new Error("No HF API keys available");

    try {
      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: payload.messages,
          max_tokens: payload.max_tokens,
          temperature: payload.temperature,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        // Throw with status code to help filtering
        throw new Error(`HF API Error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error) {
      const message = formatError(error);
      lastError = error;
      console.error(`[HF] request failed for model ${model} (retry ${retryCount})`, message);
      if (retryCount < apiKeys.length - 1) {
        return callWithRetry(model, retryCount + 1);
      }
      throw error;
    }
  };

  // Ensure mistral is always tried last if everything else fails
  const safeModels = [...HF_CHAT_MODELS];
  if (!safeModels.includes(DEFAULT_MODEL)) {
     safeModels.push(DEFAULT_MODEL);
  }

  for (const model of safeModels) {
    try {
      console.log(`[HF] Attempting with model: ${model}`);
      return await callWithRetry(model);
    } catch (error) {
      const message = formatError(error);
      lastError = error;
      
      // If unauthorized (401), forbidden (403), not found (404), or bad request (400)
      // We should try the next model. 500s from HF might also be model specific.
      // Basically, if a model fails, we try the next one unless it's a network error unrelated to the model.
      // For now, we'll try next for almost any API error to be safe.
      console.warn(`[HF] Model ${model} failed: ${message}. Trying next...`);
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("HF request failed after trying all models");
};

export { getMoodProfile };
