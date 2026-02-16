/**
 * BRAIN OF THE APP: This file connects our app to Hugging Face Inference API.
 * It uses open-source models for generating responses and quizzes.
 */

// STEP 1: Get our API keys from the .env file.
const apiKey1 = process.env.NEXT_PUBLIC_HF_API_KEY;
const apiKey2 = process.env.NEXT_PUBLIC_HF_API_KEY_2;

const apiKeys = [apiKey1, apiKey2].filter((key): key is string => key !== undefined && key !== "");

/**
 * HELPER: Rotates keys per request and steps to the next key on retries.
 */
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

// SAFETY CHECK: If the API key is missing, we warn the user in the background.
if (apiKeys.length === 0) {
  console.error("Missing HF API Key (NEXT_PUBLIC_HF_API_KEY). The chatbot won't be able to talk yet!");
} else if (apiKeys.length === 1) {
  console.warn("Only one HF key found. Add NEXT_PUBLIC_HF_API_KEY_2 for automatic rotation/reliability.");
}

import { ChatMessage, UserContext } from "@/types/chat";
import { QuizData } from "@/types/quiz";
import { getMoodProfile } from "@/utils/mood";

// Inference Providers OpenAI-compatible endpoint (chat only)
const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_CHAT_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

const parseErrorMessage = async (response: Response) => {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    return parsed.error || parsed.message || JSON.stringify(parsed);
  } catch {
    return raw || response.statusText;
  }
};

/**
 * THE MAIN FUNCTION: This is what we call when we want the AI to think.
 * It takes the chat history and some info about the user (hobbies, etc.)
 */
export const getHuggingFaceCompletion = async (
  messages: ChatMessage[],
  userContext?: Partial<UserContext> & {
    analogyIntensity?: number;
    responseLength?: number;
    analogyAnchor?: string;
  }
) => {
  if (apiKeys.length === 0) {
    return {
      role: "assistant",
      content: "I'm sorry! I don't have my AI 'brain' connected yet. Please add your NEXT_PUBLIC_HF_API_KEY to the .env file so we can start learning together."
    };
  }

  const moodProfile = getMoodProfile(userContext?.mood);
  const analogyIntensity = userContext?.analogyIntensity ?? 2; // Default to level 2
  const responseLength = userContext?.responseLength ?? 3; // Default to level 3 (medium)
  
  const analogyGuidance = [
    "Use no analogies at all - focus exclusively on raw facts and concepts.",
    "Use minimal analogies - mostly facts with rare hobby-based comparisons.",
    "Use some analogies - balance facts with occasional hobby-based analogies.",
    "Use frequent analogies - explain most concepts using hobby-based analogies.",
    "Use extensive analogies - almost every explanation should use hobby-based analogies.",
    "Use only analogies - explain everything through hobby-based analogies exclusively."
  ][analogyIntensity];

  const lengthGuidance = [
    "Length 1/5: 1-2 sentences, <= 40 words. No extra fluff.",
    "Length 2/5: 2-3 sentences, <= 70 words. Focus on key points only.",
    "Length 3/5: 3-5 sentences, <= 110 words. Balanced explanation.",
    "Length 4/5: 5-7 sentences, <= 160 words. Add depth and one example.",
    "Length 5/5: 7-10 sentences, <= 220 words. Rich detail and multiple angles."
  ][responseLength - 1];

  const allowedInterests = userContext?.hobbies?.length
    ? userContext.hobbies.join(", ")
    : "General";
  const analogyAnchor = userContext?.analogyAnchor?.trim();

  const analogyInstructionBlock = analogyIntensity === 0
    ? `ANALOGY MODE: OFF
Use no analogies. Explain directly, factually, and clearly. Do not reference hobbies or comparisons.`
    : `1. ANALOGY-FIRST: Lead with the analogy rooted in their interests. Make it the foundation, not the afterthought.
   - For TV/Movies: Use specific moments, scenes, character quirks, or plot beats (not vague settings). E.g., "Like when [character] does [specific action] in [episode], here's why..."
   - For Games: Reference mechanics, progression systems, or narrative beats that create the same dynamic as the concept.
   - For Sports/Music: Use specific athletes, plays, songs, or albums as parallels.
   - If interests include specific subgenres or titles, ONLY use those. Do not generalize to broader categories or adjacent activities.
   - Only use interests from the Allowed Interests list. If none apply, ask a brief clarification question instead of guessing.
   - Choose ONE analogy anchor from the Allowed Interests and stick to it for the entire session. Never switch mid-response or mid-session.
   - If an Analogy Anchor is provided, you MUST use ONLY that anchor.
   - Use at most ONE analogy thread per response; keep the rest factual and direct.
   - Never mention other sports, games, or genres outside the anchor. No cross-sport/game references.

2. BUILD THROUGH MAPPING: Explicitly connect the analogy to the concept as you explain:
   - "In [interest], X happens because of Y."
   - "In [concept], the same thing happens: [mechanism]."
   - "That's why they work the same way."`;

  const teachingPhilosophy = analogyIntensity === 0
    ? "Build understanding through clear, direct explanations grounded in facts."
    : "Build understanding THROUGH the analogy, not around it. Start with what they know, layer the concept through that lens, then reveal complexity.";

  const layeringGuidance = analogyIntensity === 0
    ? `3. LAYER COMPLEXITY GRADUALLY:
   - Start: Plain-language summary
   - Deepen: The mechanism (why it works)
   - Clarify: Edge cases or limits
   - Optional: Advanced nuance if they're ready`
    : `3. LAYER COMPLEXITY GRADUALLY:
   - Start: Simple parallel (what's similar)
   - Deepen: The mechanism (why it works)
   - Acknowledge: Where the analogy breaks (shows deeper thinking, not weakness)
   - Optional: Advanced nuance if they're ready`;

  const systemPrompt = `You are "Quizzy", an enthusiastic and helpful AI tutor with a unique teaching style.

Your Goal: Use the student's interests as the LENS for understanding, not just decoration.

Mood: ${moodProfile.label} (${moodProfile.aiTone})
Mood Guidance: ${moodProfile.aiStyle}

User Profile:
- Year Level: Year ${userContext?.grade || "7-12"}
- Interests/Hobbies: ${userContext?.hobbies?.join(", ") || "General"}
- Learning Style: ${userContext?.learningStyle || "General"}
- Target Subjects: ${userContext?.subjects?.join(", ") || "General"}
Allowed Interests (verbatim): ${allowedInterests}
Analogy Anchor (single topic): ${analogyAnchor || "Choose one from Allowed Interests and stick to it."}

Response Style:
- Analogy Intensity: ${analogyIntensity}/5
  ${analogyGuidance}
- Response Length: ${responseLength}/5
  ${lengthGuidance}
  Follow the length strictly unless the user explicitly asks for more detail.

CORE TEACHING PHILOSOPHY:
${teachingPhilosophy}

Instructions:
${analogyInstructionBlock}
${layeringGuidance}

4. ASK GUIDING QUESTIONS: Don't just explain—help them think:
   - "In [interest], what happens when...?"
   - "Notice how that parallels [concept]?"
   - This makes them active learners, not passive listeners.

5. TONE & PERSONALITY:
   - Keep it encouraging and fun, but intellectually honest.
   - Admit when an analogy has limits—this shows rigor, not uncertainty.
   - Always match the mood guidance.

6. TECHNICAL REQUIREMENTS:
   - Adjust language complexity for Year ${userContext?.grade || "7-12"}.
   - Use LaTeX for all math: $x^2$ (inline), $$equation$$ (display).
   - Double-escape in JSON: \\\\ becomes \\\\
   - Verify facts about their interests; never invent false details.
   - If unsure about an interest detail, use the general principle instead.

7. QUALITY CHECKS:
   - Fact-check analogies and explanations before responding.
   - Proofread formatting (especially LaTeX) for errors.
   - If a response feels forced or disconnected, restart it.
   - Keep it concise—avoid overwhelming detail unless asked.

8. EDGE CASES:
   - Outside their subjects? Still help, but try to connect it back to their interests.
   - Don't know the answer? Say so, then suggest how they could figure it out.
   - Don't use many emojis (except in titles).

REMEMBER: You're not ChatGPT with a bonus analogy. You're a tutor who teaches THROUGH their passions.`;

  const rotationBase = getRotationBase();
  const callWithRetry = async (retryCount = 0): Promise<any> => {
    const activeKey = getRotatedKey(rotationBase, retryCount);
    if (!activeKey) return { role: "assistant", content: "No AI service available." };

    try {
      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_CHAT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages
          ],
          max_tokens: 1024,
          temperature: 0.55,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        throw new Error(`HF API Error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      return { role: "assistant", content };
    } catch (error) {
      console.error(`HF Attempt ${retryCount + 1} Failed:`, error);
      if (retryCount < apiKeys.length - 1) {
        return callWithRetry(retryCount + 1);
      }
      return {
        role: "assistant",
        content:
          "I couldn't reach Hugging Face. Check that your HF token has Inference Providers access and the model is available."
      };
    }
  };

  return await callWithRetry();
};

/**
 * GENERATING DYNAMIC GREETINGS: This uses AI to create unique greetings for the user.
 */
export const getAIGreeting = async (userName: string, streak: number, mood?: string) => {
  const stripEmojis = (text: string) =>
    text.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();

  if (apiKeys.length === 0) return `Welcome back, ${userName}.`;

  const rotationBase = getRotationBase();
  const moodProfile = getMoodProfile(mood);
  const callWithRetry = async (retryCount = 0): Promise<string> => {
    const activeKey = getRotatedKey(rotationBase, retryCount);
    if (!activeKey) return `Welcome back, ${userName}!`;

    try {
      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_CHAT_MODEL,
          messages: [
            {
              role: "system",
              content: `You are Quizzy, a concise tutor. Generate a short, one-sentence greeting for a student. Keep it under 8 words. Do not use emojis. Mood: ${moodProfile.label}. Tone: ${moodProfile.greetingStyle}.`
            },
            {
              role: "user",
              content: `Student name: ${userName}, Streak: ${streak} days.`
            }
          ],
          max_tokens: 30,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        throw new Error(`HF API Error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || `Welcome back, ${userName}.`;
      return stripEmojis(raw.replace(/"/g, ''));
    } catch {
      if (retryCount < apiKeys.length - 1) return callWithRetry(retryCount + 1);
      return `Welcome back, ${userName}.`;
    }
  };

  return await callWithRetry();
};

export const getAIBannerPhrase = async (userName: string, subjects: string[], mood?: string) => {
  const FALLBACK_LINES = [
    "Let's make light progress today.",
    "Pick one idea and explore it.",
    "Small steps still build skill."
  ];

  const ensurePunctuation = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return trimmed;
      if (!/[.!?]$/.test(trimmed)) {
        return trimmed + '.';
      }
      return trimmed;
    }).join('\n');
  };

  const normaliseText = (text: string) =>
    text.replace(/\s+/g, " ").replace(/["""]/g, "").trim();

  const forceThreeLines = (text: string) => {
    const words = text.split(" ").filter(Boolean);
    if (words.length <= 3) return words.join("\n");
    const target = Math.ceil(words.length / 3);
    const lines = [
      words.slice(0, target).join(" "),
      words.slice(target, target * 2).join(" "),
      words.slice(target * 2).join(" ")
    ];
    return lines.map((line) => line.trim()).filter(Boolean).join("\n");
  };

  const enforceExactlyThreeLines = (text: string): string => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    if (lines.length === 3) {
      return lines.join('\n');
    }
    
    if (lines.length > 3) {
      return lines.slice(0, 3).join('\n');
    }
    
    // If fewer than 3 lines, force split the content
    return forceThreeLines(text);
  };

  const getRecentBanners = () => {
    try {
      return JSON.parse(localStorage.getItem("recentBannerPhrases") || "[]");
    } catch {
      return [];
    }
  };

  const storeBanner = (text: string) => {
    const recent = getRecentBanners();
    const next = [...recent, text].slice(-6);
    localStorage.setItem("recentBannerPhrases", JSON.stringify(next));
  };

  if (apiKeys.length === 0) return FALLBACK_LINES.join("\n");

  const rotationBase = getRotationBase();
  const moodProfile = getMoodProfile(mood);
  const callWithRetry = async (retryCount = 0): Promise<string> => {
    const activeKey = getRotatedKey(rotationBase, retryCount);
    if (!activeKey) return FALLBACK_LINES.join("\n");

    try {
      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_CHAT_MODEL,
          messages: [
            {
              role: "system",
              content: `You generate EXACTLY 3 lines for a banner. CRITICAL: Output must be exactly 3 lines, no more, no less. Each line 4-7 words, each ending with a period. No extra text, labels, quotes, or preface. Output ONLY the 3 lines separated by newlines. Mood: ${moodProfile.label}. Style: ${moodProfile.bannerStyle}.`
            },
            {
              role: "user",
              content: `Student: ${userName}, Studying: ${subjects.join(", ")}.`
            }
          ],
          max_tokens: 50,
          temperature: 1.0,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        throw new Error(`HF API Error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "";
      const cleaned = raw
        .replace(/^[\s\S]*?(?=(?:[A-Z].*\n){2,}|[^\n]+\n[^\n]+\n[^\n]+)/, "")
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/^.*?:\s*/gm, "")
        .trim();
      
      const withPunctuation = ensurePunctuation(cleaned);
      const enforced = enforceExactlyThreeLines(withPunctuation);
      
      const recent = getRecentBanners();
      if (recent.includes(enforced) && retryCount < 1) {
        return callWithRetry(retryCount + 1);
      }
      
      const finalText = enforced || FALLBACK_LINES.join("\n");
      storeBanner(finalText);
      return finalText;
    } catch {
      if (retryCount < apiKeys.length - 1) return callWithRetry(retryCount + 1);
      const fallback = FALLBACK_LINES.join("\n");
      storeBanner(fallback);
      return fallback;
    }
  };

  return await callWithRetry();
};

/**
 * GENERATING AI QUIZZES: Creates a structured 5-question quiz with analogies.
 */
export const generateQuiz = async (
  input: string,
  userContext: {
    grade?: string;
    hobbies: string[];
    subject?: string;
    mood?: string;
  },
  numberOfQuestions: number = 5,
  options?: {
    diversitySeed?: string;
    avoidQuestions?: string[];
  }
): Promise<QuizData | null> => {
  if (apiKeys.length === 0) return null;

  const subject = userContext.subject || "General";
  const diversitySeed = options?.diversitySeed || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const avoidList = (options?.avoidQuestions || []).slice(0, 20);
  const moodProfile = getMoodProfile(userContext.mood);

  const systemPrompt = `You are Quizzy, an AI tutor. Generate a ${numberOfQuestions}-question mixed quiz for a Year ${userContext.grade || "7-12"} student.

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "text",
      "analogy": "concrete analogy referencing a specific moment, scene, character, or element from the student's interests (not generic settings like 'in X's apartment')",
      "options": [
        {"id": "a", "text": "option", "isCorrect": true},
        {"id": "b", "text": "option", "isCorrect": false},
        {"id": "c", "text": "option", "isCorrect": false},
        {"id": "d", "text": "option", "isCorrect": false}
      ],
      "hint": "hint text"
    },
    {
      "id": 2,
      "type": "short_answer",
      "question": "text",
      "analogy": "analogy tied to the student's interests",
      "correctAnswer": "short correct answer",
      "hint": "hint text"
    }
  ]
}

Quality rules:
- Take a moment to verify each question is coherent, factually correct, and grade-appropriate.
- Every question must be answerable and unambiguous.
- For multiple_choice: exactly 4 options, exactly 1 correct, no trick wording.
- For short_answer: include a clear, concise correctAnswer.
- Provide a helpful hint for every question.
- Keep questions tightly aligned to the Topic and Subject.

CRITICAL: Mood: ${moodProfile.label}. Quiz style: ${moodProfile.quizStyle}.
Each question MUST have an analogy that references a SPECIFIC moment, scene, character, or element from the student's interests (e.g. for a show: a real episode moment or running gag—never generic placeholders like "in Leonard's apartment").
Mix multiple_choice and short_answer types.
Use LaTeX for math: $x^2$ for inline, $$equation$$ for display.
Double-escape backslashes in JSON.
Do NOT repeat questions from: ${avoidList.slice(0, 3).join("; ")}`;

  const userPrompt = `Topic: ${input}
Subject: ${subject}
Grade: Year ${userContext.grade || "7-12"}
Interests: ${userContext.hobbies.join(", ")}
Seed: ${diversitySeed}`;

  const rotationBase = getRotationBase();
  const callWithRetry = async (retryCount = 0): Promise<QuizData | null> => {
    const activeKey = getRotatedKey(rotationBase, retryCount);
    if (!activeKey) return null;

    try {
      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_CHAT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 2400,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        throw new Error(`HF API Error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "{}";

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("No JSON found in quiz response");
        return null;
      }
      content = jsonMatch[0];

      const isValidQuiz = (quiz: QuizData | null) => {
        if (!quiz || !Array.isArray(quiz.questions)) return false;
        if (quiz.questions.length !== numberOfQuestions) return false;
        return quiz.questions.every((question) => {
          if (!question || typeof question.question !== "string" || !question.question.trim()) return false;
          if (!question.analogy || typeof question.analogy !== "string") return false;
          if (question.type === "short_answer") {
            return typeof question.correctAnswer === "string" && question.correctAnswer.trim().length > 0;
          }
          const options = question.options || [];
          if (!Array.isArray(options) || options.length !== 4) return false;
          const ids = new Set(options.map((opt) => opt.id));
          const correctCount = options.filter((opt) => opt.isCorrect).length;
          return ids.size === options.length && correctCount === 1;
        });
      };

      try {
        const parsed = JSON.parse(content);
        if (!isValidQuiz(parsed)) {
          console.warn("Quiz validation failed. Retrying with a new attempt.");
          return null;
        }

        return parsed;
      } catch (e) {
        console.warn("JSON Parse failed, attempting to sanitize...", e);
        const sanitized = content.replace(/\\([a-zA-Z])/g, "\\\\$1");
        const parsed = JSON.parse(sanitized);

        if (!isValidQuiz(parsed)) {
          console.warn("Quiz validation failed after sanitize. Retrying with a new attempt.");
          return null;
        }

        return parsed;
      }
    } catch (error) {
      console.error(`Quiz Generation Attempt ${retryCount + 1} Failed:`, error);
      if (retryCount < apiKeys.length - 1) return callWithRetry(retryCount + 1);
      return null;
    }
  };

  return await callWithRetry();
};

/**
 * AI GRADING: Evaluates a short answer response.
 */
export const gradeShortAnswer = async (
  question: string,
  targetAnswer: string,
  userAnswer: string
) => {
  if (apiKeys.length === 0) return { isCorrect: false, feedback: "AI grading unavailable." };

  const rotationBase = getRotationBase();
  const callWithRetry = async (retryCount = 0): Promise<any> => {
    const activeKey = getRotatedKey(rotationBase, retryCount);
    if (!activeKey) return { isCorrect: false, feedback: "AI grading unavailable." };

    try {
      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_CHAT_MODEL,
          messages: [
            {
              role: "system",
              content: `You are a fair teacher. Evaluate if the student's answer is correct. Return ONLY this JSON: {"isCorrect": true/false, "feedback": "short sentence"}`
            },
            {
              role: "user",
              content: `Question: ${question}\nCorrect Answer: ${targetAnswer}\nStudent Answer: ${userAnswer}`
            }
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        throw new Error(`HF API Error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '{"isCorrect": false, "feedback": "Something went wrong."}';
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error(`Grading Attempt ${retryCount + 1} Failed:`, error);
      if (retryCount < apiKeys.length - 1) return callWithRetry(retryCount + 1);
      return { isCorrect: false, feedback: "Could not grade this answer." };
    }
  };

  return await callWithRetry();
};
