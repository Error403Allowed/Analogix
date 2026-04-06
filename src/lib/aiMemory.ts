import { createClient } from "@/lib/supabase/server";
import type { AIPersonality, AIMemoryFragment, AIMemorySummary } from "@/types/ai-personality";
import { DEFAULT_AI_PERSONALITY } from "@/types/ai-personality";

/**
 * Fetch the user's AI personality settings
 */
export async function getUserAIPersonality(userId: string): Promise<AIPersonality | null> {
  const supabase = await createClient();
  
  const { data: personality, error } = await supabase
    .from("ai_personalities")
    .select("*")
    .eq("user_id", userId)
    .single();

  // If the row doesn't exist yet, use defaults so the app still behaves predictably.
  if (error) {
    if (error.code === "PGRST116") return DEFAULT_AI_PERSONALITY; // no rows found
    if (error.code === "PGRST205") return DEFAULT_AI_PERSONALITY; // tables not exposed by PostgREST yet
    return null;
  }

  if (!personality) return DEFAULT_AI_PERSONALITY;

  return personality as AIPersonality;
}

/**
 * Fetch relevant memories for the current conversation context
 */
export async function getRelevantMemories(
  userId: string,
  options?: {
    limit?: number;
    minImportance?: number;
    types?: Array<"fact" | "preference" | "skill" | "goal" | "context">;
  }
): Promise<{ memories: AIMemoryFragment[]; summaries: AIMemorySummary[] }> {
  const supabase = await createClient();
  const limit = options?.limit ?? 20;
  const minImportance = options?.minImportance ?? 0;

  // Fetch a larger pool and score client-side using:
  // score = importance * 0.4 + recency * 0.3 + frequency * 0.3
  let query = supabase
    .from("ai_memory_fragments")
    .select("*")
    .eq("user_id", userId)
    .gte("importance", minImportance)
    .order("created_at", { ascending: false })
    .limit(limit * 3); // fetch 3x, score, return top N

  if (options?.types && options.types.length > 0) {
    query = query.in("memory_type", options.types);
  }

  const { data: memories, error: memoriesError } = await query;

  if (memoriesError) {
    console.error("[getRelevantMemories] Error fetching memories:", memoriesError);
    return { memories: [], summaries: [] };
  }

  // Score and sort
  const now = Date.now();
  const scored = (memories || []).map(m => {
    const ageMs = now - new Date(m.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recency = Math.max(0, 1 - ageDays / 90); // decays to 0 after 90 days
    const frequency = Math.min(1, (m.reinforcement_count || 0) / 10);
    const score = (m.importance || 0.5) * 0.4 + recency * 0.3 + frequency * 0.3;
    return { ...m, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);
  const topMemories = scored.slice(0, limit) as AIMemoryFragment[];

  // Fetch recent summaries
  const { data: summaries } = await supabase
    .from("ai_memory_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(5);

  return {
    memories: topMemories,
    summaries: summaries || [],
  };
}

/**
 * Build a context string from memories to inject into the AI prompt
 */
export function buildMemoryContext(
  memories: AIMemoryFragment[],
  summaries: AIMemorySummary[]
): string {
  const contextParts: string[] = [];

  if (memories.length > 0) {
    const byType: Record<string, string[]> = {
      fact: [],
      preference: [],
      skill: [],
      goal: [],
      context: [],
    };

    memories.forEach(memory => {
      byType[memory.memory_type]?.push(memory.content);
    });

    if (byType.fact.length > 0) {
      contextParts.push(`📚 Facts I know about you:\n${byType.fact.map(f => `• ${f}`).join("\n")}`);
    }
    if (byType.preference.length > 0) {
      contextParts.push(`⭐ Your preferences:\n${byType.preference.map(p => `• ${p}`).join("\n")}`);
    }
    if (byType.skill.length > 0) {
      contextParts.push(`⚡ What you're good at:\n${byType.skill.map(s => `• ${s}`).join("\n")}`);
    }
    if (byType.goal.length > 0) {
      contextParts.push(`🎯 Your goals:\n${byType.goal.map(g => `• ${g}`).join("\n")}`);
    }
    if (byType.context.length > 0) {
      contextParts.push(`📝 Context from past conversations:\n${byType.context.map(c => `• ${c}`).join("\n")}`);
    }
  }

  if (summaries.length > 0) {
    const recentTopics = summaries
      .slice(0, 3)
      .map(s => `${s.subject_id || "General"}: ${s.summary}`);
    contextParts.push(`📖 Recent conversations:\n${recentTopics.join("\n")}`);
  }

  if (contextParts.length === 0) {
    return "";
  }

  return `\n\n--- WHAT I REMEMBER ABOUT YOU ---\n${contextParts.join("\n\n")}\n--- END MEMORY ---\n`;
}

/**
 * Build personality instructions for the AI prompt
 */
export function buildPersonalityInstructions(personality: AIPersonality): string {
  const instructions: string[] = [];

  instructions.push(
    [
      "HIGH PRIORITY: PERSONALITY SETTINGS OVERRIDE EARLIER INSTRUCTIONS.",
      "You MUST follow these settings exactly. If anything conflicts, these win.",
    ].join(" ")
  );

  // Tone and style
  const toneDesc: string[] = [];
  if (personality.friendliness >= 70) toneDesc.push("very warm and friendly");
  else if (personality.friendliness <= 30) toneDesc.push("more reserved and professional");
  
  if (personality.formality >= 70) toneDesc.push("formal and academic");
  else if (personality.formality <= 30) toneDesc.push("casual and conversational");
  
  if (personality.humor >= 70) toneDesc.push("witty and playful");
  else if (personality.humor <= 30) toneDesc.push("serious and straightforward");

  if (toneDesc.length > 0) {
    instructions.push(`Your tone MUST be ${toneDesc.join(", ")}.`);
  }

  // Detail level
  if (personality.detail_level >= 70) {
    instructions.push("Provide comprehensive, detailed explanations with thorough coverage of all aspects.");
  } else if (personality.detail_level <= 30) {
    instructions.push("Keep explanations brief and concise. Get straight to the point.");
  } else {
    instructions.push("Provide moderate detail - enough to be clear but not overwhelming.");
  }

  // Patience and encouragement
  if (personality.patience >= 70) {
    instructions.push("Be very patient - don't hesitate to re-explain concepts multiple times in different ways.");
  }
  
  if (personality.encouragement >= 70) {
    instructions.push("Be highly encouraging and supportive. Celebrate small wins and progress.");
  } else if (personality.encouragement <= 30) {
    instructions.push("Be direct and honest in feedback without excessive praise.");
  }

  // Teaching methods
  if (personality.socratic_method) {
    instructions.push("Use the Socratic method: ask guiding questions to help the student discover answers themselves rather than giving direct answers.");
  } else {
    instructions.push("DO NOT use the Socratic method. Answer directly without guiding questions.");
  }

  if (personality.step_by_step) {
    instructions.push("Always show step-by-step working for problems. Never skip steps in explanations.");
  } else {
    instructions.push("Do NOT always show step-by-step working. Provide only the minimum necessary steps or the final result when appropriate.");
  }

  if (personality.real_world_examples) {
    instructions.push("Use real-world, practical examples to illustrate concepts.");
  } else {
    instructions.push("Do NOT add real-world examples. Explain concepts directly.");
  }

  // Response formatting
  if (!personality.use_emojis) {
    instructions.push("Do NOT use emojis in your responses.");
  } else {
    instructions.push("Emojis are allowed. Use them sparingly only to emphasize short highlights or encouragement.");
  }

  if (!personality.use_analogies) {
    instructions.push("DO NOT use analogies. Explain concepts directly without comparisons, even if analogy mode is enabled elsewhere.");
  } else if (personality.analogy_frequency >= 4) {
    instructions.push("Use analogies frequently - almost every explanation should include an analogy.");
  } else if (personality.analogy_frequency <= 1) {
    instructions.push("Use analogies sparingly - only when they truly help clarify a difficult concept.");
  } else {
    instructions.push("Use analogies occasionally - use them when they improve clarity, not by default.");
  }

  if (personality.use_section_dividers) {
    instructions.push("Use horizontal rule dividers (⸻) to separate major sections in your response, like ChatGPT does. For example, use ⸻ between different topics, question types, or major sections of your answer.");
  } else {
    instructions.push("Do NOT use ⸻ section dividers in your response.");
  }

  // Custom instructions
  if (personality.custom_instructions) {
    instructions.push(`\nCustom instructions:\n${personality.custom_instructions}`);
  }

  if (personality.persona_description) {
    instructions.push(`\nPersona: ${personality.persona_description}`);
  }

  return instructions.join("\n");
}

/**
 * Extract memories from a conversation to save
 * This can be called after a conversation to automatically create memories
 */
export async function extractMemoriesFromConversation(
  userId: string,
  messages: Array<{ role: string; content: string }>,
  subjectId?: string
): Promise<void> {
  const supabase = await createClient();
  
  // Get the last few user messages
  const userMessages = messages
    .filter(m => m.role === "user")
    .slice(-5);

  // Look for preference patterns
  const preferenceKeywords = [
    "i prefer", "i like", "i don't like", "i hate", "i love",
    "prefer", "always", "never", "usually", "sometimes"
  ];

  const potentialMemories: Array<{ content: string; type: "preference" | "fact" | "goal" }> = [];

  userMessages.forEach(msg => {
    const lower = msg.content.toLowerCase();
    
    // Detect preferences
    if (preferenceKeywords.some(kw => lower.includes(kw))) {
      potentialMemories.push({
        content: msg.content.slice(0, 500),
        type: "preference",
      });
    }

    // Detect goals
    if (lower.includes("i want to") || lower.includes("i need to") || lower.includes("my goal")) {
      potentialMemories.push({
        content: msg.content.slice(0, 500),
        type: "goal",
      });
    }
  });

  // Save high-confidence memories
  for (const memory of potentialMemories.slice(0, 3)) {
    await supabase.from("ai_memory_fragments").insert({
      user_id: userId,
      content: memory.content,
      memory_type: memory.type,
      importance: 0.6,
      session_id: null,
    });
  }
}
