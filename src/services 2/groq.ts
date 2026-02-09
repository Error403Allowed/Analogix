/**
 * BRAIN OF THE APP: This file connects our app to a powerful AI called Groq.
 * It's like a telephone line that sends your study topics to the AI and gets back fun analogies.
 */

import Groq from "groq-sdk";

// STEP 1: Get our secret keys from the .env file.
const apiKey1 = import.meta.env.VITE_GROQ_API_KEY;
const apiKey2 = import.meta.env.VITE_GROQ_API_KEY_2;

// Initialize clients
const groq1 = apiKey1 ? new Groq({ apiKey: apiKey1, dangerouslyAllowBrowser: true }) : null;
const groq2 = apiKey2 ? new Groq({ apiKey: apiKey2, dangerouslyAllowBrowser: true }) : null;

const clients = [groq1, groq2].filter((c): c is Groq => c !== null);

/**
 * HELPER: Rotates keys per request and steps to the next key on retries.
 */
let rotationCursor = 0;

const getRotationBase = () => {
  if (clients.length === 0) return 0;
  const base = rotationCursor % clients.length;
  rotationCursor = (rotationCursor + 1) % clients.length;
  return base;
};

const getRotatedClient = (baseIndex: number, offset = 0) => {
  if (clients.length === 0) return null;
  const index = (baseIndex + offset) % clients.length;
  return clients[index];
};

// SAFETY CHECK: If the password (API Key) is missing, we warn the user in the background.
if (clients.length === 0) {
  console.error("Missing AI Passwords (VITE_GROQ_API_KEY). The chatbot won't be able to talk yet!");
} else if (clients.length === 1) {
  console.warn("Only one AI key found. Add VITE_GROQ_API_KEY_2 for automatic rotation/reliability.");
}

import { ChatMessage, UserContext } from "@/types/chat";
import { QuizData } from "@/types/quiz";
import { getMoodProfile } from "@/utils/mood";

/**
 * THE MAIN FUNCTION: This is what we call when we want the AI to think.
 * It takes the chat history and some info about the user (hobbies, etc.)
 */
export const getGroqCompletion = async (
  messages: ChatMessage[],
  userContext?: Partial<UserContext>
) => {
  if (clients.length === 0) {
    return {
      role: "assistant",
      content: "I'm sorry! I don't have my AI 'brain' connected yet. Please add your VITE_GROQ_API_KEY to the .env file so we can start learning together."
    };
  }

  const moodProfile = getMoodProfile(userContext?.mood);
  const systemPrompt = `You are "Quizzy", an enthusiastic and helpful AI tutor.
  
  Your Goal: Explain concepts using analogies based on the user's interests.

  Mood: ${moodProfile.label} (${moodProfile.aiTone})
  Mood Guidance: ${moodProfile.aiStyle}
  
  User Profile:
  - Year Level: Year ${userContext?.grade || "7-12"}
  - Interests/Hobbies: ${userContext?.hobbies?.join(", ") || "General"}
  - Learning Style: ${userContext?.learningStyle || "General"}
  - Target Subjects: ${userContext?.subjects?.join(", ") || "General"}
  
  Instructions:
  1. Always keep your tone encouraging, fun, and supportive.
  2. Use analogies related to their specific hobbies whenever possible.
  3. Adjust the complexity of your language and scientific detail to be appropriate for a Year ${userContext?.grade || "7-12"} student.
  4. Keep explanations clear and concise, matching the mood guidance.
  5. If the user asks about a topic outside their subjects, still help them but try to relate it back if possible.
  6. Explain the raw facts (derived from ACARA curriculum) of the topic before explaining with an analogy.
  7. Don't use emojis too much, apart from just titles.  
  8. Use seperation techniques between raw facts and analogies.
  9. Use LaTeX for all math notation. Wrap inline math in '$...$' and display math in '$$...$$'.
      - Examples: $x^2$, $\\int_a^b f(x)\\,dx$, $f(x)$, $\\frac{dy}{dx}$.
      - If a response contains math symbols, powers, integrals, functions, or equations, it MUST be in LaTeX.
  10. Make sure to keep responses concise and avoid overwhelming the student with too much information at once. If a topic is complex, break it down into smaller parts and explain each part clearly before moving on. 
  11. Unless a student asks for concepts or definitions, focus more on the analogy and intuitive understanding rather than just stating facts. The goal is to make the concept relatable and memorable through their interests.
  12. Read over your response before sending to ensure it matches the mood and style guidance, and that the analogies are relevant to the user's hobbies, as well as ensuring the grammar and formatting is clear and correct. 
  `;

  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

  const rotationBase = getRotationBase();
  const callWithRetry = async (retryCount = 0): Promise<any> => {
    const activeGroq = getRotatedClient(rotationBase, retryCount);
    if (!activeGroq) return { role: "assistant", content: "No AI service available." };

    try {
      const completion = await activeGroq.chat.completions.create({
        messages: fullMessages as any[],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1024,
      });
      return completion.choices[0]?.message;
    } catch (error) {
      console.error(`Groq Attempt ${retryCount + 1} Failed:`, error);
      if (retryCount < clients.length - 1) {
        return callWithRetry(retryCount + 1);
      }
      return { role: "assistant", content: "Oops! I couldn't reach my brain even after switching keys. Please check your connection." };
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

  if (clients.length === 0) return `Welcome back, ${userName}.`;

  const rotationBase = getRotationBase();
  const moodProfile = getMoodProfile(mood);
  const callWithRetry = async (retryCount = 0): Promise<string> => {
    const activeGroq = getRotatedClient(rotationBase, retryCount);
    if (!activeGroq) return `Welcome back, ${userName}!`;

    try {
      const completion = await activeGroq.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: `You are Quizzy, a concise tutor. Generate a short, one-sentence greeting for a student. Keep it under 8 words. Do not use emojis. Avoid generic "Welcome back". Mood: ${moodProfile.label}. Tone: ${moodProfile.greetingStyle}.` 
          },
          { 
            role: "user", 
            content: `Student name: ${userName}, Streak: ${streak} days.` 
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.9,
        max_tokens: 30,
      });
      const raw = completion.choices[0]?.message?.content?.replace(/"/g, '') || `Welcome back, ${userName}.`;
      return stripEmojis(raw);
    } catch {
      if (retryCount < clients.length - 1) return callWithRetry(retryCount + 1);
      return `Welcome back, ${userName}.`;
    }
  };

  return await callWithRetry();
};

export const getAIBannerPhrase = async (userName: string, subjects: string[], mood?: string) => {
  const FALLBACK_LINES = [
    "Let’s make light progress today.",
    "Pick one idea and explore it.",
    "Small steps still build skill."
  ];  
  const ensurePunctuation = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return trimmed;
      // Add period if no punctuation at end
      if (!/[.!?]$/.test(trimmed)) {
        return trimmed + '.';
      }
      return trimmed;
    }).join('\n');
  };
  const normaliseText = (text: string) =>
    text.replace(/\s+/g, " ").replace(/["“”]/g, "").trim();

  const forceThreeLines = (text: string) => {
    const words = text.split(" ").filter(Boolean);
    if (words.length <= 3) return words.join("\n");
    const target = Math.ceil(words.length / 3);
    const lines = [
      words.slice(0, target).join(" "),
      words.slice(target, target * 2).join(" "),
      words.slice(target * 2).join(" ")
    ];
    return lines.map((line) => line.trim()).join("\n");
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

  if (clients.length === 0) return FALLBACK_LINES.join("\n");

  const rotationBase = getRotationBase();
  const moodProfile = getMoodProfile(mood);
  const callWithRetry = async (retryCount = 0): Promise<string> => {
    const activeGroq = getRotatedClient(rotationBase, retryCount);
    if (!activeGroq) return "What's the plan for today?";

    try {
      const completion = await activeGroq.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: `Generate a short, punchy 3-line call to action for a student dashboard. Each line should be 4-7 words and END WITH A PERIOD. Focus on curiosity and growth. Use the student's name. Be unique. No emojis. Mood: ${moodProfile.label}. Style: ${moodProfile.bannerStyle}.` 
          },
          { 
            role: "user", 
            content: `Student: ${userName}, Studying: ${subjects.join(", ")}.` 
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 1.0,
        max_tokens: 50,
      });
      const raw = completion.choices[0]?.message?.content || "";
      const cleaned = normaliseText(raw);
      const threeLines = forceThreeLines(cleaned);
      const withPunctuation = ensurePunctuation(threeLines);
      const recent = getRecentBanners();
      if (recent.includes(withPunctuation) && retryCount < 1) {
        return callWithRetry(retryCount + 1);
      }
      const finalText = withPunctuation || FALLBACK_LINES.join("\n");
      storeBanner(finalText);
      return finalText;
    } catch {
      if (retryCount < clients.length - 1) return callWithRetry(retryCount + 1);
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
  if (clients.length === 0) return null;

  const subject = userContext.subject || "General";
  const diversitySeed = options?.diversitySeed || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const avoidList = (options?.avoidQuestions || []).slice(0, 20);
  const moodProfile = getMoodProfile(userContext.mood);
  const systemPrompt = `You are Quizzy, an AI tutor. Generate a ${numberOfQuestions}-question mixed quiz for a Year ${userContext.grade || "7-12"} student.
  
  CRITICAL INSTRUCTIONS: 
  0. Mood: ${moodProfile.label}. Quiz style: ${moodProfile.quizStyle}.
  1. Each question MUST include an "analogy" field that explains the concept using the user's hobbies (${userContext.hobbies.join(", ")}).
  2. The quiz should be a mix of "multiple_choice" and "short_answer" types.
  3. Return ONLY a JSON array of questions under a "questions" key.
  4. CRITICAL: Ensure questions are UNIQUE and different from typical textbook questions. Use different concepts and angles every run.
  5. Do NOT repeat any question from the "Avoid" list. Do not paraphrase them. Also avoid the exact equation "2x + 5 = 11" and similarly trivial linear equations.
  6. Use Markdown and LaTeX for formatting where appropriate.
    - Use '$' for inline math equations (e.g., $E=mc^2$).
    - Use '$$' for display math when an equation is the focus.
    - Use '**' for bold text (e.g., **Key Concept**).
    - CRITICAL: Double-escape all backslashes in the JSON string (e.g., use "\\frac" for "\frac").
    - If the content includes powers, integrals, derivatives, functions, or equations, render them in LaTeX (e.g., $x^n$, $\\int f(x)\\,dx$, $f(x)$).
  7. Use "⸻" to seperate paragraphs and parts of text that are not related to each other.
  
  8. MATH/SCIENCE VERIFICATION (CRITICAL):
    - If the question involves ANY calculation (Math, Physics, Chemistry, etc.), you MUST generate a Python script to solve it.
    - Include this script in a "python_solution" field.
    - The "correctAnswer" and options MUST be derived strictly from this Python script's output.
    - Do NOT rely on your internal training data for calculations. Trust the code.
  
  9. Format:
  {
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "text",
        "analogy": "analogy text",
        "python_solution": "print(2+2) # Optional but REQUIRED for math",
        "options": [
          {"id": "a", "text": "text", "isCorrect": true},
          {"id": "b", "text": "text", "isCorrect": false},
          {"id": "c", "text": "text", "isCorrect": false},
          {"id": "d", "text": "text", "isCorrect": false}
        ],
        "hint": "hint text"
      },
      {
        "id": 2,
        "type": "short_answer",
        "question": "text",
        "analogy": "analogy text",
        "python_solution": "print(2+2) # Optional but REQUIRED for math",
        "correctAnswer": "detailed correct answer from python",
        "hint": "hint text"
      }
    ]
  }
  Ensure exactly 4 options for multiple_choice. For short_answer, provide a clear 'correctAnswer' that the grading AI can use as a reference.`;

  const userPrompt = `Topic/Source: ${input}
Subject: ${subject}
Grade: Year ${userContext.grade || "7-12"}
Interests: ${userContext.hobbies.join(", ") || "General"}
Diversity Seed: ${diversitySeed}
Avoid (do not repeat or paraphrase):
${avoidList.length > 0 ? avoidList.map((q, i) => `${i + 1}. ${q}`).join("\n") : "None"}
`;

  const rotationBase = getRotationBase();
  const callWithRetry = async (retryCount = 0): Promise<QuizData | null> => {
    const activeGroq = getRotatedClient(rotationBase, retryCount);
    if (!activeGroq) return null;

    try {
      const completion = await activeGroq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.95,
        response_format: { type: "json_object" }
      });
      
      let content = completion.choices[0]?.message?.content || "{}";
      
      try {
        return JSON.parse(content);
      } catch (e) {
        console.warn("JSON Parse failed, attempting to sanitize LaTeX backslashes...", e);
        const sanitized = content.replace(/\\([a-zA-Z])/g, "\\\\$1");
        return JSON.parse(sanitized);
      }
    } catch (error) {
      console.error(`Quiz Generation Attempt ${retryCount + 1} Failed:`, error);
      if (retryCount < clients.length - 1) return callWithRetry(retryCount + 1);
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
  if (clients.length === 0) return { isCorrect: false, feedback: "AI grading unavailable." };

  const rotationBase = getRotationBase();
  const callWithRetry = async (retryCount = 0): Promise<any> => {
    const activeGroq = getRotatedClient(rotationBase, retryCount);
    if (!activeGroq) return { isCorrect: false, feedback: "AI grading unavailable." };

    try {
      const completion = await activeGroq.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are a fair teacher. Evaluate the student's answer against the target answer. Be lenient with spelling and phrasing, focus on conceptual understanding. Return a JSON object with 'isCorrect' (boolean) and 'feedback' (short encouraging sentence)." 
          },
          { 
            role: "user", 
            content: `Question: ${question}\nTarget Answer: ${targetAnswer}\nStudent's Answer: ${userAnswer}` 
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(completion.choices[0]?.message?.content || '{"isCorrect": false, "feedback": "Something went wrong."}');
    } catch (error) {
      console.error(`Grading Attempt ${retryCount + 1} Failed:`, error);
      if (retryCount < clients.length - 1) return callWithRetry(retryCount + 1);
      return { isCorrect: false, feedback: "Could not grade this answer." };
    }
  };

  return await callWithRetry();
};
