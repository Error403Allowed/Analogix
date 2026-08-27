import { convertToModelMessages, streamText } from "ai";
import type { UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import {
  buildSystemPrompt,
  compressToSummary,
  classifyTaskType,
  computeChatOutputBudget,
  getGroqModel,
  getProviderOptionsForModel,
  getToolApprovalSecret,
  isSimpleGreetingMessage,
  loadAIContext,
  resolveModelForUser,
  TOTAL_BUDGET,
  estimateRequestTokens,
  estimateUIMessagesTokens,
  ESTIMATE_CHARS_PER_TOKEN,
  buildToolSet,
  estimateToolTokens,
  getToolsForRequest,
  type ToolBindings,
} from "@/lib/ai";
import {
  getUserAIPersonality,
  getRelevantMemories,
  buildMemoryContext,
  buildPersonalityInstructions,
} from "@/lib/aiMemory";
import type { AIPersonality } from "@/types/ai-personality";
import { sanitizeParts } from "@/lib/ai/parts";

export const runtime = "nodejs";

interface ChatUserContext {
  subjects?: string[];
  grade?: string;
  state?: string;
  name?: string;
  hobbies?: string[];
  interests?: unknown;
  analogyIntensity?: number;
  analogyAnchor?: string;
  researchMode?: boolean;
  researchSources?: Array<Record<string, unknown>>;
  selectedModel?: string;
}

interface ChatRequestBody {
  messages: Array<{ id?: string; role: string; parts: unknown[] }>;
  userContext?: ChatUserContext;
}

const FULL_MESSAGE_WINDOW = 8;

// convertToModelMessages throws "Unsupported part" for any UI part type it does
// not recognise (legacy `tool-invocation`/`thinking`/`sources` parts from older
// sessions, or `source-url`/`source-document` citations). Drop those, but KEEP
// the real v6 tool parts - `tool-*` / `dynamic-tool` - because the client's
// Allow/Deny response lives on one of them; sanitizing them away was the root
// cause of the "it keeps asking to use the tool" approval loop.

const flattenText = (messages: Array<{ role: string; parts: unknown[] }>): string =>
  messages
    .map((m) => {
      const parts = (m.parts ?? []) as Array<{ type?: string; text?: string }>;
      return parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join(" ");
    })
    .join("\n");

const flattenMessages = (messages: Array<{ role: string; parts: unknown[] }>) =>
  messages.map((m) => ({
    role: m.role === "tool" ? "user" : m.role,
    content: flattenText([m]),
  }));

const isFormalRequest = (latestUserMsg: string): boolean =>
  /^(write|essay|assignment|report|piece|article|paragraph|analysis|critique|review|composition)/.test(latestUserMsg.toLowerCase()) ||
  latestUserMsg.toLowerCase().includes("essay on") ||
  latestUserMsg.toLowerCase().includes("write an") ||
  latestUserMsg.toLowerCase().includes("assign") ||
  latestUserMsg.toLowerCase().includes("composition");

const ALLOWED_PERSONALITY_OVERRIDES = new Set([
  "analogy_frequency", "detail_level", "verbosity", "creativity", "tone", "focus",
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: ChatRequestBody = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userContext = body.userContext ?? {};

    // ── Client-side personality/memory overrides (localStorage, anonymous) ──
    let clientPersonality: Partial<AIPersonality> | null = null;
    let clientMemories: unknown[] | null = null;
    const clientData = request.headers.get("x-client-data");
    if (clientData) {
      try {
        const parsed = JSON.parse(clientData);
        const safePersonality: Record<string, unknown> = {};
        if (parsed.personality && typeof parsed.personality === "object") {
          for (const key of Object.keys(parsed.personality)) {
            if (ALLOWED_PERSONALITY_OVERRIDES.has(key)) {
              safePersonality[key] = (parsed.personality as Record<string, unknown>)[key];
            }
          }
          clientPersonality = safePersonality;
        }
        clientMemories = parsed.memories ?? null;
      } catch (e) {
        console.warn("[ai/chat] Failed to parse x-client-data:", e instanceof Error ? e.message : e);
      }
    }

    // ── Personality + memory ──
    let aiPersonality: AIPersonality | null = null;
    let memoryContext = "";
    let studentName: string | null = null;

    const flat = flattenMessages(messages);
    const latestUserMsg = flat.filter((m) => m.role === "user").pop()?.content || "";

    aiPersonality = await getUserAIPersonality(userId);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .single();
      studentName = profile?.name || null;
    } catch (e) {
      console.warn("[ai/chat] Failed to fetch profile name:", e instanceof Error ? e.message : e);
    }
    if (clientPersonality) {
      aiPersonality = { ...(aiPersonality ?? {}), ...clientPersonality } as AIPersonality;
    }
    const { memories, summaries } = await getRelevantMemories(userId, {
      limit: 15,
      minImportance: 0.3,
      currentMessage: latestUserMsg,
    });
    memoryContext = buildMemoryContext(memories, summaries);

    if (clientMemories && Array.isArray(clientMemories)) {
      const clientParts = (clientMemories as Array<unknown>)
        .map((m) => {
          if (typeof m === "string") return m;
          const content = (m as { content?: unknown })?.content;
          return typeof content === "string" ? content : null;
        })
        .filter((c): c is string => Boolean(c && c.trim()));
      if (clientParts.length > 0) {
        const clientBlock = `Client Memory (local): ${clientParts.join("; ")}`;
        memoryContext = memoryContext ? `${memoryContext}\n\n${clientBlock}` : clientBlock;
      }
    }

    // ── On-demand workspace context ──
    const { workspaceContext, calendarContext, extraDataContext, enrolledSubjects } =
      await loadAIContext(flat, { subjects: userContext.subjects });

    const isSimpleGreeting = isSimpleGreetingMessage(flat);
    const isFormal = isFormalRequest(latestUserMsg);
    const effectiveUserContext = aiPersonality
      ? {
          ...userContext,
          analogyIntensity:
            userContext.analogyIntensity !== undefined
              ? userContext.analogyIntensity
              : isFormal
                ? 0
                : Math.max(1, Math.min(5, aiPersonality.analogy_frequency ?? 3)),
        }
      : { ...userContext, analogyIntensity: isFormal ? 0 : userContext.analogyIntensity };

    let systemPrompt = buildSystemPrompt({
      userContext: {
        ...effectiveUserContext,
        subjects: userContext.subjects,
      },
      messages: flat,
      workspaceContext,
      calendarContext,
      extraDataContext,
      studentName: studentName ?? undefined,
      enrolledSubjects,
    });

    // Inject memory + summary context at the top, personality at the very top.
    const contextBlocks: string[] = [];
    if (memoryContext) contextBlocks.push(memoryContext);
    const recentForSummary = flat.slice(0, -FULL_MESSAGE_WINDOW);
    const conversationSummary = recentForSummary.length > 0
      ? compressToSummary(recentForSummary)
      : "";
    if (conversationSummary) contextBlocks.push(conversationSummary);
    if (contextBlocks.length > 0) {
      systemPrompt = contextBlocks.join("\n\n") + "\n\n" + systemPrompt;
    }
    if (aiPersonality) {
      const personalityInstructions = buildPersonalityInstructions(
        aiPersonality,
        effectiveUserContext.analogyIntensity ?? 3,
      );
      systemPrompt = `--- PERSONALITY SETTINGS (HIGHEST PRIORITY) ---\n${personalityInstructions}\n--- END PERSONALITY ---\n\n${systemPrompt}`;
    }

    // ── Task classification + model selection ──
    const primarySubject = userContext.subjects?.[0];
    const taskType = isSimpleGreeting
      ? "lightweight"
      : classifyTaskType(flat, primarySubject);
    const resolvedModel = resolveModelForUser(userContext.selectedModel || null);
    const isQwen = taskType === "reasoning" || resolvedModel.toLowerCase().includes("qwen");
    const OUTPUT_HARD_CAP = isQwen ? 8192 : 4096;
    const wantsLongResponse =
      Boolean(userContext.researchMode) || isFormal ||
      /\b(detailed|comprehensive|essay|report|study guide|lesson plan|long answer|timetable|study plan|revision plan|syllabus|walk me through|step-by-step guide)\b/i.test(latestUserMsg);

    // gpt-oss and qwen spend part of their output budget on the hidden
    // chain-of-thought even for ordinary questions. Reserve headroom so the
    // thinking pass AND the visible answer both fit (the answer alone gets
    // ~DEFAULT_OUTPUT tokens).
    const reasons =
      isQwen || resolvedModel.toLowerCase().includes("gpt-oss");

    // ── Tool set + budget ──
    const ctx: ToolBindings = { userId, supabase };
    const tools = buildToolSet(ctx, getToolsForRequest(latestUserMsg, taskType));

    // ── Trim to window + budget ──
    let recent = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ ...m, parts: sanitizeParts(m.parts) }))
      .slice(-FULL_MESSAGE_WINDOW);
    // Groq counts the serialized tool definitions against the request/TPM limit.
    const toolTokens = estimateToolTokens(tools);
    const budgetInput = {
      isSimpleGreeting,
      wantsLongResponse,
      reasons,
      outputHardCap: OUTPUT_HARD_CAP,
      outputBudget: TOTAL_BUDGET,
    };
    const { requested } = computeChatOutputBudget(budgetInput);

    // Reserve the output target BEFORE context is spent, so a long answer (plus
    // the hidden chain-of-thought for gpt-oss/qwen) is never starved - the root
    // cause of "responses getting cut off". Long-form reserves the full hard cap;
    // ordinary turns reserve a solid floor and grow with leftover budget.
    const reserveForOutput = wantsLongResponse ? requested : Math.min(requested, 3072);
    const originalSystemTokens = estimateRequestTokens(systemPrompt);
    const fitsBudget = (msgs: typeof messages) =>
      originalSystemTokens + toolTokens + estimateUIMessagesTokens(msgs) + reserveForOutput <=
      TOTAL_BUDGET;

    // Keep the latest user ask plus at least one preceding turn.
    while (recent.length > 2 && !fitsBudget(recent)) {
      recent = recent.slice(1);
    }
    const inputTokens = estimateUIMessagesTokens(recent);

    // The system prompt (personality + memory + summary + workspace context)
    // counts against the same request cap. Truncate it as a last resort so the
    // outgoing request can NEVER exceed TOTAL_BUDGET and the reserved output
    // target stays achievable (memory/summary sits at the top, so cutting the
    // tail drops workspace/calendar detail - far better than a cut-off answer).
    const maxSystemTokens = TOTAL_BUDGET - toolTokens - inputTokens - reserveForOutput;
    if (systemPrompt.length > Math.floor(maxSystemTokens * ESTIMATE_CHARS_PER_TOKEN)) {
      const newLen = Math.max(600, Math.floor(maxSystemTokens * ESTIMATE_CHARS_PER_TOKEN));
      console.warn(
        `[ai/chat] Truncating system prompt (${systemPrompt.length} -> ${newLen} chars) to keep ${reserveForOutput}t output reserve`,
      );
      systemPrompt = systemPrompt.slice(0, newLen) + "\n…[context truncated]";
    }
    const systemTokens = estimateRequestTokens(systemPrompt);
    const outputBudget = TOTAL_BUDGET - systemTokens - toolTokens - inputTokens;
    // `requested` is the target; `outputBudget` is the hard ceiling the request
    // can survive. maxOutputTokens is the intersection, never below the safe
    // floor so the stream can at least start.
    const { maxOutputTokens } = computeChatOutputBudget({ ...budgetInput, outputBudget });

    // ── Model + stream ──
    const { model } = getGroqModel(resolvedModel);
    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(
        recent as unknown as Array<UIMessage>,
        { tools },
      );
    } catch (convertError) {
      console.error("[/api/ai/chat] convertToModelMessages error:", convertError);
      const detail = convertError instanceof Error ? convertError.message : JSON.stringify(convertError);
      return new Response(JSON.stringify({ error: `Chat failed: ${detail}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let result;
    try {
      result = streamText({
        model,
        system: systemPrompt,
        messages: modelMessages,
        tools,
        temperature: userContext.researchMode ? 0.3 : 0.55,
        maxOutputTokens,
        // providerOptions: getProviderOptionsForModel(resolvedModel),
        // experimental_toolApprovalSecret: getToolApprovalSecret(),
        maxRetries: 2,
      });
    } catch (streamError) {
      console.error("[/api/ai/chat] streamText init error:", streamError);
      const detail = streamError instanceof Error ? streamError.message : JSON.stringify(streamError);
      return new Response(JSON.stringify({ error: `Chat failed: ${detail}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return result.toUIMessageStreamResponse({
      originalMessages: messages as unknown as Array<UIMessage>,
      onError: (error) => {
        console.error("[/api/ai/chat] Stream error:", JSON.stringify(error, null, 2));
        console.error("[/api/ai/chat] Stream error type:", typeof error);
        console.error("[/api/ai/chat] Stream error constructor:", error?.constructor?.name);
        console.error("[/api/ai/chat] Stream error keys:", error ? Object.keys(error) : "none");
        const detail = error instanceof Error ? error.message : JSON.stringify(error);
        return detail || "Chat failed";
      },
    });
  } catch (error) {
    console.error("[/api/ai/chat] Error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: `Chat failed: ${detail}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}