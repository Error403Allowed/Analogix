import { convertToModelMessages, streamText, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import {
  buildSystemPrompt,
  compressToSummary,
  classifyTaskType,
  computeChatOutputBudget,
  getAIModel,
  getProviderOptionsForModel,
  getToolApprovalSecret,
  isSimpleGreetingMessage,
  isVercelGatewayEnabled,
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

const FULL_MESSAGE_WINDOW = 4;

// Bounds how many internal LLM steps a single turn may take (tool call ->
// tool result -> next LLM step -> ...) before streamText stops and returns
// control to the client. Without a stopWhen condition, streamText defaults to
// stepCountIs(1): the model runs exactly one step, so after a tool call it
// never gets to read the tool's result and synthesize a reply - the client
// then has to resubmit the whole conversation itself (via
// sendAutomaticallyWhen) just to get the *next* step. For a multi-tool turn
// that resubmit-per-step pattern is a request storm that also churns React
// state fast enough to trip "Maximum update depth exceeded" on the client.
// Letting the server run up to MAX_AGENT_STEPS steps internally means a
// normal multi-step tool turn completes in ONE client request instead of N.
const MAX_AGENT_STEPS = 4;

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
    const OUTPUT_HARD_CAP = isQwen ? 1500 : 1100;
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

    // ── Budget architecture: tiered section dropping, not blind slicing ──
    // 1) Tool budget: Groq counts serialized tools against TPM. If tools alone
    //    already push us near cap, drop low-value reads first rather than
    //    starving output. This is the correct layer to shed, not the system
    //    prompt tail.
    let effectiveTools = tools;
    let toolTokens = estimateToolTokens(effectiveTools);
    const TOOL_BUDGET_CAP = 700;
    if (toolTokens > TOOL_BUDGET_CAP && !isSimpleGreeting) {
      // Rebuild with only write tools relevant to intent + minimal reads
      const minimalTools = buildToolSet(ctx, getToolsForRequest(latestUserMsg, taskType).filter(t => !["searchWorkspace","searchDocuments","getDocument","listFlashcards","listQuizzes","searchCurriculum"].includes(t) || toolTokens < TOOL_BUDGET_CAP));
      const minimalTokens = estimateToolTokens(minimalTools);
      if (minimalTokens < toolTokens) {
        console.warn(`[ai/chat] Tool budget ${toolTokens}t -> ${minimalTokens}t by pruning low-value reads`);
        effectiveTools = minimalTools;
        toolTokens = minimalTokens;
      }
      if (toolTokens > TOOL_BUDGET_CAP) {
        // Still over: drop all read tools, keep only essential writes + storeMemory
        const emergencyTools = buildToolSet(ctx, (getToolsForRequest(latestUserMsg, taskType).filter(t => t === "storeMemory") as any));
        const emergencyTokens = estimateToolTokens(emergencyTools);
        console.warn(`[ai/chat] Emergency tool prune ${toolTokens}t -> ${emergencyTokens}t`);
        effectiveTools = emergencyTools;
        toolTokens = emergencyTokens;
      }
    }

    const budgetInput = {
      isSimpleGreeting,
      wantsLongResponse,
      reasons,
      outputHardCap: OUTPUT_HARD_CAP,
      outputBudget: TOTAL_BUDGET,
    };
    const { requested } = computeChatOutputBudget(budgetInput);
    const reserveForOutput = wantsLongResponse ? requested : Math.min(requested, 1400);

    // 2) Message window: keep at least 2 turns, drop oldest outside budget.
    let recent = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ ...m, parts: sanitizeParts(m.parts) }))
      .slice(-FULL_MESSAGE_WINDOW);

    // Helper: tiered system-prompt fitting. Instead of slicing mid-string
    // (which leaves dangling JSON/markdown and can corrupt the prompt),
    // drop whole low-priority sections first.
    const fitSystemPrompt = (prompt: string, maxTokens: number): string => {
      if (estimateRequestTokens(prompt) <= maxTokens) return prompt;
      // Low -> high priority for dropping. Each entry is a regex that removes
      // a whole block. Order matters: visualisation, research, extraData,
      // workspace/calendar, tool capabilities, curriculum, memory. Personality
      // and core voice are never dropped here.
      const dropPatterns: Array<{ re: RegExp; label: string }> = [
        // Visualisation guide is huge and only needed when user asks for graph
        { re: /Visualisations -[\s\S]*?Don't just describe it - SHOW it\./, label: "visualisationGuide" },
        { re: /RESEARCH MODE[\s\S]*?ACADEMIC SOURCES:[\s\S]*?(?=\n\n---|\n\nCRITICAL|\n\n━━━|$)/, label: "researchBlock" },
        { re: /━━━ YOUR DATA[\s\S]*?━━━ END YOUR DATA ━━━/, label: "extraData" },
        { re: /━━━ CALENDAR & DEADLINES ━━━[\s\S]*?━━━ END CALENDAR ━━━/, label: "calendar" },
        { re: /━━━ YOUR WORKSPACE ━━━[\s\S]*?━━━ END WORKSPACE ━━━/, label: "workspace" },
        { re: /━━━ CURRICULUM CONTENT ━━━[\s\S]*?━━━ END CURRICULUM ━━━/, label: "curriculum" },
        { re: /YOUR CAPABILITIES \(TOOLS\)[\s\S]*?━━━+/, label: "toolCapabilities" },
        // Memory/summary/personality at top are last resort
        { re: /--- PERSONALITY SETTINGS[\s\S]*?--- END PERSONALITY ---\n\n/, label: "personality" },
        { re: /^\[Memory\][\s\S]*?\n\n/, label: "memory" },
        { re: /^\[Earlier\][\s\S]*?\n\n/, label: "summary" },
      ];
      let out = prompt;
      for (const { re, label } of dropPatterns) {
        if (estimateRequestTokens(out) <= maxTokens) break;
        if (re.test(out)) {
          const before = out.length;
          out = out.replace(re, "").replace(/\n{3,}/g, "\n\n").trim();
          console.warn(`[ai/chat] Dropped ${label} (${before} -> ${out.length} chars) to fit ${maxTokens}t system budget`);
        }
      }
      // Final safety: if still over, hard-truncate tail (core prompt tail is least harmful)
      if (estimateRequestTokens(out) > maxTokens) {
        const maxChars = Math.max(600, Math.floor(maxTokens * ESTIMATE_CHARS_PER_TOKEN));
        console.warn(`[ai/chat] Hard truncating system prompt ${out.length} -> ${maxChars} chars for ${maxTokens}t`);
        out = out.slice(0, maxChars) + "\n…[context truncated - low priority sections removed]";
      }
      return out;
    };

    const fitsBudgetWithPrompt = (msgs: typeof recent, prompt: string) =>
      estimateRequestTokens(prompt) + toolTokens + estimateUIMessagesTokens(msgs) + reserveForOutput <= TOTAL_BUDGET;

    // First, reduce message window until even a minimal prompt would fit
    while (recent.length > 2 && !fitsBudgetWithPrompt(recent, systemPrompt)) {
      // Remove oldest non-user? Keep latest ask.
      recent = recent.slice(1);
    }

    // Then fit system prompt to remaining budget (tiered dropping)
    const inputTokensForFit = estimateUIMessagesTokens(recent);
    const maxSystemTokens = TOTAL_BUDGET - toolTokens - inputTokensForFit - reserveForOutput;
    const fittedPrompt = fitSystemPrompt(systemPrompt, Math.max(600, maxSystemTokens));
    systemPrompt = fittedPrompt;

    const systemTokens = estimateRequestTokens(systemPrompt);
    const inputTokens = estimateUIMessagesTokens(recent);
    const outputBudget = TOTAL_BUDGET - systemTokens - toolTokens - inputTokens;
    if (outputBudget < 256) {
      console.error(`[ai/chat] Output budget critically low: ${outputBudget}t (system ${systemTokens}t + tools ${toolTokens}t + input ${inputTokens}t + reserve ${reserveForOutput}t)`);
    }
    const { maxOutputTokens } = computeChatOutputBudget({ ...budgetInput, outputBudget });
    // Use the fitted tools (may be pruned) for the stream
    const finalTools = effectiveTools;

    // ── Model + stream ──
    // Seamless Vercel infra: prefers AI Gateway (higher TPM, unified retries)
    // with automatic fallback to direct Groq pool.
    const { model, via } = getAIModel(resolvedModel);
    if (isVercelGatewayEnabled()) {
      console.log(`[ai/chat] via=${via} budget=${TOTAL_BUDGET}t window=${FULL_MESSAGE_WINDOW} tools=${toolTokens}t`);
    }
    const modelMessages = await convertToModelMessages(
      recent as unknown as Array<UIMessage>,
      { tools: finalTools },
    );

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools: finalTools,
      temperature: userContext.researchMode ? 0.3 : 0.55,
      maxOutputTokens,
      providerOptions: getProviderOptionsForModel(resolvedModel),
      experimental_toolApprovalSecret: getToolApprovalSecret(),
      // Do not hammer Groq on TPM 429: we budget conservatively, so a 429
      // means the sliding window is full. Retrying instantly just burns the
      // window and triggers the SDK's 3-attempt retry storm (Used+Requested >
      // 8000) which surfaces as "Maximum update depth" on the client via
      // rapid status churn. Let the client see a single 429 with Retry-After.
      maxRetries: 0,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      onStepFinish: (() => {
        // Local counter, not derived from the event: streamText doesn't hand
        // onStepFinish a step index, and we need one to tell "the agent
        // naturally finished" apart from "we hit MAX_AGENT_STEPS mid-tool-use
        // and stopWhen cut it off". The latter would surface to the user as a
        // response that just stops with no final text - if this ever fires,
        // MAX_AGENT_STEPS is too low for real usage and should go up.
        let stepIndex = 0;
        return ({ finishReason, toolCalls }: { finishReason: string; toolCalls?: Array<{ toolName: string }> }) => {
          stepIndex += 1;
          if (toolCalls?.length) {
            console.log(
              `[ai/chat] step ${stepIndex}/${MAX_AGENT_STEPS} finished: reason=${finishReason} tools=${toolCalls
                .map((t) => t.toolName)
                .join(",")}`,
            );
          }
          if (stepIndex >= MAX_AGENT_STEPS && finishReason === "tool-calls") {
            console.warn(
              `[ai/chat] MAX_AGENT_STEPS (${MAX_AGENT_STEPS}) exhausted while still calling tools - ` +
                `the turn was cut off before generating a final answer. Consider raising MAX_AGENT_STEPS.`,
            );
          }
        };
      })(),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages as unknown as Array<UIMessage>,
      onError: (error) =>
        error instanceof Error ? error.message : "Chat failed",
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