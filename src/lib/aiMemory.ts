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
 * @param personality - The AI personality settings
 * @param analogyIntensity - Optional override for analogy frequency (0-100)
 */
export function buildPersonalityInstructions(personality: AIPersonality, analogyIntensity?: number): string {
  const instructions: string[] = [];
  const useAnalogy = analogyIntensity !== undefined ? analogyIntensity > 50 : personality.use_analogies;
  const analogyFreq = analogyIntensity ?? (personality.analogy_frequency ?? 3) * 20;

  instructions.push(
    [
      "HIGH PRIORITY: PERSONALITY SETTINGS ARE PRIMARY.",
      "These settings ALWAYS override other instructions. Follow them exactly.",
    ].join(" ")
  );

  // Tone and style
  const toneDesc: string[] = [];
  if (personality.friendliness >= 70) toneDesc.push("very warm and friendly");
  else if (personality.friendliness <= 30) toneDesc.push("reserved and professional");
  
  if (personality.formality >= 70) toneDesc.push("formal");
  else if (personality.formality <= 30) toneDesc.push("casual and conversational");
  
  if (personality.humor >= 70) toneDesc.push("witty with light humor");
  else if (personality.humor <= 30) toneDesc.push("serious and straightforward");
  else toneDesc.push("occasionally warm");

  if (toneDesc.length > 0) {
    instructions.push(`Tone: ${toneDesc.join(", ")}.`);
  }

  // Detail level - word count limits
  let wordLimit = 200;
  if (personality.detail_level >= 80) {
    wordLimit = 500;
    instructions.push("Responses: detailed and thorough. Show all angles. Word limit: 500.");
  } else if (personality.detail_level >= 70) {
    wordLimit = 400;
    instructions.push("Responses: comprehensive. Word limit: 400.");
  } else if (personality.detail_level >= 60) {
    wordLimit = 300;
    instructions.push("Responses: moderate detail. Word limit: 300.");
  } else if (personality.detail_level >= 40) {
    wordLimit = 200;
    instructions.push("Responses: balanced. Word limit: 200.");
  } else if (personality.detail_level >= 30) {
    wordLimit = 150;
    instructions.push("Responses: brief. Word limit: 150.");
  } else {
    wordLimit = 100;
    instructions.push("Responses: concise. Get to the point fast. Word limit: 100.");
  }

  // Patience
  if (personality.patience >= 80) {
    instructions.push("VERY patient. Re-explain as many times as needed without frustration.");
  } else if (personality.patience >= 60) {
    instructions.push("Patient. Re-explain if they don't understand.");
  } else if (personality.patience <= 30) {
    instructions.push("Direct. Assume they grasp quickly after one explanation.");
  }
  
  // Encouragement
  if (personality.encouragement >= 80) {
    instructions.push("Very encouraging. Celebrate progress, use enthusiastic language.");
  } else if (personality.encouragement >= 60) {
    instructions.push("Encouraging. Positive reinforcement.");
  } else if (personality.encouragement <= 30) {
    instructions.push("Direct feedback. Minimal praise - just help them improve.");
  }

  // Teaching methods
  if (personality.socratic_method) {
    instructions.push("Method: Guide with questions. Don't give direct answers - help them discover.");
  } else {
    instructions.push("Method: Direct answers. Explain clearly without questions.");
  }

  if (personality.step_by_step === false) {
    instructions.push("Working: Skip unnecessary steps. Show key steps only.");
  } else {
    instructions.push("Working: Show all steps. Never skip.");
  }

  if (personality.real_world_examples === false) {
    instructions.push("Examples: Abstract/theoretical only. No real-world references.");
  }

  // Response formatting
  if (personality.use_emojis === false) {
    instructions.push("Formatting: No emojis.");
  }

  // Analogies - CRITICAL: This overrides the analogyIntensity setting
  if (personality.use_analogies === false) {
    instructions.push("Analogy: NEVER use analogies. Direct explanation only.");
  } else if (personality.analogy_frequency >= 4) {
    instructions.push("Analogy: Use often - every concept needs one.");
  } else if (personality.analogy_frequency >= 2) {
    instructions.push("Analogy: Use for tricky concepts.");
  } else {
    instructions.push("Analogy: Rarely. Only when essential.");
  }

  if (personality.use_section_dividers === false) {
    instructions.push("Formatting: No ⸻ dividers. Just natural paragraphs.");
  }

  // Custom instructions
  if (personality.custom_instructions?.trim()) {
    instructions.push(`Custom: ${personality.custom_instructions.trim()}`);
  }

  if (personality.persona_description?.trim()) {
    instructions.push(`Persona: ${personality.persona_description.trim()}`);
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
