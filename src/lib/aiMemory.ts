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
    currentMessage?: string;
  }
): Promise<{ memories: AIMemoryFragment[]; summaries: AIMemorySummary[] }> {
  const supabase = await createClient();
  const limit = options?.limit ?? 20;
  const minImportance = options?.minImportance ?? 0;
  const currentMessage = options?.currentMessage || "";

  // Fetch a larger pool and score client-side
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

  const currentKeywords = currentMessage.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);

  // Score and sort with semantic relevance to current message
  const now = Date.now();
  const scored = (memories || []).map(m => {
    const ageMs = now - new Date(m.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recency = Math.max(0, 1 - ageDays / 90);
    const frequency = Math.min(1, (m.reinforcement_count || 0) / 10);

    // Semantic relevance: how many keywords match this memory?
    let relevance = 0;
    if (currentKeywords.length > 0) {
      const memoryLower = m.content.toLowerCase();
      relevance = currentKeywords.filter(kw =>
        memoryLower.includes(kw)
      ).length / currentKeywords.length;
    }

    // weighted scoring: relevance 70%, importance 20%, recency 10%
    const score = relevance * 0.7 + (m.importance || 0.5) * 0.2 + recency * 0.1;
    return { ...m, _score: score, _relevance: relevance };
  });

  scored.sort((a, b) => b._score - a._score);

  // Filter: relevance must be > 0 if there are keywords, or keep high-importance memories
  const filtered = scored.filter(m =>
    currentKeywords.length === 0 || m._relevance > 0 || (m.importance || 0.5) >= 0.7
  );

  const topMemories = filtered.slice(0, limit) as AIMemoryFragment[];

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

    // Clear, explicit format so the AI can actually recall and use these
    if (byType.fact.length > 0) {
      contextParts.push(`Student Facts: ${byType.fact.join("; ")}`);
    }
    if (byType.preference.length > 0) {
      contextParts.push(`Student Preferences: ${byType.preference.join("; ")}`);
    }
    if (byType.skill.length > 0) {
      contextParts.push(`Student Skills: ${byType.skill.join("; ")}`);
    }
    if (byType.goal.length > 0) {
      contextParts.push(`Student Goals: ${byType.goal.join("; ")}`);
    }
    if (byType.context.length > 0) {
      contextParts.push(`Student Context: ${byType.context.join("; ")}`);
    }
  }

  if (summaries.length > 0) {
    const recentTopics = summaries
      .slice(0, 2)
      .map(s => s.summary.slice(0, 120));
    contextParts.push(`Recent Study Topics: ${recentTopics.join("; ")}`);
  }

  if (contextParts.length === 0) {
    return "";
  }

  return `STUDENT MEMORY — Use these facts about the student in your responses:\n${contextParts.join("\n")}`;
}

/**
 * Build personality instructions for the AI prompt
 * @param personality - The AI personality settings
 * @param analogyIntensity - Optional override for analogy frequency (0-5 scale)
 */
export function buildPersonalityInstructions(personality: AIPersonality, analogyIntensity?: number): string {
  const instructions: string[] = [];
  
  // Determine if analogies should be used:
  // - If analogyIntensity is explicitly 0, disable analogies (user toggle in chat)
  // - If analogyIntensity > 0, use that level
  // - Otherwise fall back to personality setting
  let effectiveAnalogyIntensity: number;
  if (analogyIntensity !== undefined) {
    effectiveAnalogyIntensity = analogyIntensity;
  } else {
    effectiveAnalogyIntensity = personality.use_analogies ? (personality.analogy_frequency ?? 3) : 0;
  }

  instructions.push(
    [
      "CRITICAL: PERSONALITY SETTINGS BELOW. You MUST follow these in EVERY response.",
      "These override ALL other instructions. Do not ignore them.",
      "Before responding, check these settings and shape your response accordingly.",
    ].join(" ")
  );

  // Tone and style — concrete behavioral instructions, not vague descriptions
  const toneRules: string[] = [];
  
  if (personality.friendliness >= 70) {
    toneRules.push("Start responses warmly — use phrases like 'Great question!' or 'Let's work through this together'. Address the student naturally.");
  } else if (personality.friendliness <= 30) {
    toneRules.push("Keep a professional, measured tone. No casual greetings or warm-up phrases. Get straight to the content.");
  }
  
  if (personality.formality >= 70) {
    toneRules.push("Use formal academic language. Avoid contractions (use 'do not' not 'don't'). Structure responses like a textbook or lecture.");
  } else if (personality.formality <= 30) {
    toneRules.push("Use casual, conversational language. Contractions are fine. Talk like a helpful study buddy, not a textbook. Use phrases like 'Here's the thing' or 'Think of it this way'.");
  }
  
  if (personality.humor >= 70) {
    toneRules.push("Add light humor or witty remarks where appropriate — a clever observation, playful comparison, or dry joke related to the topic.");
  } else if (personality.humor <= 30) {
    toneRules.push("Stay serious and focused. No jokes or playful remarks.");
  }

  if (toneRules.length > 0) {
    instructions.push(`TONE RULES:\n${toneRules.map(r => `- ${r}`).join("\n")}`);
  }

  // Detail level — concrete instructions with examples
  if (personality.detail_level >= 80) {
    instructions.push("DEPTH: Give thorough, comprehensive explanations. Cover the concept from multiple angles. Include background context, edge cases, and connections to related topics. No need to be brief.");
  } else if (personality.detail_level >= 60) {
    instructions.push("DEPTH: Give solid explanations with moderate detail. Cover the main concept and one example. Don't over-explain, but don't skip important context either.");
  } else if (personality.detail_level >= 40) {
    instructions.push("DEPTH: Balanced responses. Give the core explanation plus one clear example. Skip tangential details.");
  } else {
    instructions.push("DEPTH: Keep it short and direct. One or two sentences for the core answer, maybe one example. No elaboration unless asked.");
  }

  // Patience — how to handle follow-ups and confusion
  if (personality.patience >= 80) {
    instructions.push("PATIENCE: If the student seems confused, re-explain from a completely different angle. Offer multiple approaches. Never imply they should already know something.");
  } else if (personality.patience <= 30) {
    instructions.push("PATIENCE: Give one clear explanation. If they ask again, restate it more concisely. Assume they can connect the dots themselves.");
  }

  // Encouragement — how to react to answers and progress
  if (personality.encouragement >= 80) {
    instructions.push("ENCOURAGEMENT: Actively celebrate correct answers and effort. Use phrases like 'Exactly right!', 'You're getting this!', 'Nice work on that one'.");
  } else if (personality.encouragement >= 60) {
    instructions.push("ENCOURAGEMENT: Acknowledge good answers with brief positive feedback like 'Correct' or 'Good thinking'.");
  } else if (personality.encouragement <= 30) {
    instructions.push("ENCOURAGEMENT: No praise or cheerleading. Just give factual feedback — correct or incorrect, and why.");
  }

  // Teaching methods
  if (personality.socratic_method) {
    instructions.push("TEACHING STYLE: Do NOT give the answer directly. Ask guiding questions that lead the student to figure it out themselves. Example: instead of 'The answer is 42', say 'What happens if you substitute x=3 into the equation?'");
  }

  if (personality.step_by_step === false) {
    instructions.push("WORKING: Show only the key steps. Skip obvious algebra or trivial intermediate steps. Jump to the important parts.");
  } else {
    instructions.push("WORKING: Show every single step. Never skip algebra, even simple rearrangements. Write out each transformation explicitly.");
  }

  if (personality.real_world_examples) {
    instructions.push("EXAMPLES: Use real-world, practical examples to illustrate concepts. Connect abstract ideas to everyday situations.");
  } else if (personality.real_world_examples === false) {
    instructions.push("EXAMPLES: Use abstract, theoretical examples only. No real-world references or practical scenarios.");
  }

  // Analogies
  if (effectiveAnalogyIntensity === 0) {
    instructions.push("ANALOGIES: Do NOT use analogies. Give direct, literal explanations only.");
  } else if (effectiveAnalogyIntensity >= 4) {
    instructions.push("ANALOGIES: Lead with an analogy for every concept. Compare abstract ideas to everyday things the student knows. Make the analogy the centerpiece of the explanation.");
  } else if (effectiveAnalogyIntensity >= 3) {
    instructions.push("ANALOGIES: Use analogies regularly. When explaining a concept, include a comparison to something familiar.");
  } else if (effectiveAnalogyIntensity >= 2) {
    instructions.push("ANALOGIES: Use an analogy only when the concept is tricky or abstract. Don't force one for straightforward topics.");
  } else {
    instructions.push("ANALOGIES: Almost never use analogies. Only in rare cases where no direct explanation would work.");
  }

  // Formatting
  if (personality.use_section_dividers) {
    instructions.push("FORMATTING: Use ⸻ horizontal dividers between sections of your response to keep things organized.");
  } else {
    instructions.push("FORMATTING: No horizontal dividers. Use natural paragraph breaks only.");
  }

  if (personality.use_emojis) {
    instructions.push("EMOJIS: Use emojis naturally in your responses to add warmth and visual interest.");
  } else {
    instructions.push("EMOJIS: Do NOT use any emojis.");
  }

  // Custom instructions
  if (personality.custom_instructions?.trim()) {
    instructions.push(`CUSTOM RULES: ${personality.custom_instructions.trim()}`);
  }

  if (personality.persona_description?.trim()) {
    instructions.push(`WHO YOU ARE: ${personality.persona_description.trim()}`);
  }

  return instructions.join("\n\n");
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
