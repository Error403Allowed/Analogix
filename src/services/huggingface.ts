/**
 * BRAIN OF THE APP: This file connects our app to Hugging Face Inference API.
 * It uses open-source models for generating responses and quizzes.
 */

// STEP 1: Get our API keys from the .env file.
const apiKey1 = import.meta.env.VITE_HF_API_KEY;
const apiKey2 = import.meta.env.VITE_HF_API_KEY_2;

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
  console.error("Missing HF API Key (VITE_HF_API_KEY). The chatbot won't be able to talk yet!");
} else if (apiKeys.length === 1) {
  console.warn("Only one HF key found. Add VITE_HF_API_KEY_2 for automatic rotation/reliability.");
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
  userContext?: Partial<UserContext> & { analogyIntensity?: number }
) => {
  if (apiKeys.length === 0) {
    return {
      role: "assistant",
      content: "I'm sorry! I don't have my AI 'brain' connected yet. Please add your VITE_HF_API_KEY to the .env file so we can start learning together."
    };
  }

  const moodProfile = getMoodProfile(userContext?.mood);
  const analogyIntensity = userContext?.analogyIntensity ?? 3; // Default to level 3
  
  const analogyGuidance = [
    "Use minimal analogies - focus on raw facts and concepts.",
    "Use some analogies - mostly facts with occasional hobby-based comparisons.",
    "Balance facts and analogies equally - mix raw facts with hobby-based analogies.",
    "Use frequent analogies - explain most concepts using hobby-based analogies.",
    "Use extensive analogies - every explanation should use hobby-based analogies."
  ][analogyIntensity];

  const systemPrompt = `You are "Quizzy", an enthusiastic and helpful AI tutor.
  
Your Goal: Explain concepts using analogies based on the user's interests.

Mood: ${moodProfile.label} (${moodProfile.aiTone})
Mood Guidance: ${moodProfile.aiStyle}

User Profile:
- Year Level: Year ${userContext?.grade || "7-12"}
- Interests/Hobbies: ${userContext?.hobbies?.join(", ") || "General"}
- Learning Style: ${userContext?.learningStyle || "General"}
- Target Subjects: ${userContext?.subjects?.join(", ") || "General"}

Analogy Intensity: ${analogyIntensity + 1}/5
${analogyGuidance}

Instructions:
1. Always keep your tone encouraging, fun, and supportive.
2. Use analogies rooted in their specific interests—but make them CONCRETE and SPECIFIC, not generic.
   - For TV shows / movies: reference actual moments, scenes, episodes, character quirks, running gags, or plot points (e.g. for The Big Bang Theory: Sheldon's spot, the broken elevator, "Bazinga", a specific experiment or argument between the guys—NOT vague phrases like "in Leonard's apartment" or "like on the show").
   - For games: specific mechanics, levels, characters, or story beats.
   - For sports / music / etc.: specific players, matches, songs, albums, or real events.
   Avoid bland, setting-only references; the analogy should feel like it could only come from that interest.
3. Adjust the complexity of your language and scientific detail to be appropriate for a Year ${userContext?.grade || "7-12"} student.
4. Keep explanations clear and concise, without overwhelming the user with too much content and make sure you are matching the mood guidance.
5. If the user asks about a topic outside their subjects, still help them but try to relate it back if possible.
6. Explain the raw facts (derived from ACARA curriculum) of the topic before explaining with an analogy.
7. Don't use emojis too much, apart from just titles.  
8. Use seperation techniques between raw facts and analogies.
9. Use LaTeX for all math notation. Wrap inline math in '$...$' and display math in '$$...$$'.
    - Examples: $x^2$, $\\int_a^b f(x)\\,dx$, $f(x)$, $\\frac{dy}{dx}$.
    - If a response contains math symbols, powers, integrals, functions, or equations, it MUST be in LaTeX.
10. Make sure to keep responses concise and avoid overwhelming the student with too much information at once.
11. Make sure to always fact-check your responses (especially the analogies) and make sure there are no formatting or grammatical issues (especially with LaTeX).
12. If you don't know the answer, say you don't know but suggest where they might find the answer or how they could think about it.
13. NEVER make up false information or fake analogies. If you don't know, say you don't know.
14. ALWAYS use the student's hobbies and interests in your analogies, but make sure they are specific and concrete references, not generic ones.
15. If there are any issues, terminate the response and start again. Make sure to follow all instructions carefully and check your work before responding.`;

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
          temperature: 0.7,
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
          temperature: 0.9,
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
    }
  ]
}

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
          max_tokens: 2048,
          temperature: 0.95,
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

      try {
        return JSON.parse(content);
      } catch (e) {
        console.warn("JSON Parse failed, attempting to sanitize...", e);
        const sanitized = content.replace(/\\([a-zA-Z])/g, "\\\\$1");
        return JSON.parse(sanitized);
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
