/**
 * BRAIN OF THE APP: This file connects our app to a powerful AI called Groq.
 * It's like a telephone line that sends your study topics to the AI and gets back fun analogies.
 */

import Groq from "groq-sdk";

// STEP 1: Get our secret key from the .env file. 
// Think of this like a password that allows us to use the AI's "brain".
const apiKey = import.meta.env.VITE_GROQ_API_KEY || "dummy_key_to_prevent_crash";

// SAFETY CHECK: If the password (API Key) is missing, we warn the user in the background.
if (!import.meta.env.VITE_GROQ_API_KEY) {
  console.error("Missing AI Password (VITE_GROQ_API_KEY). The chatbot won't be able to talk yet!");
}

// STEP 2: Initialize the connection to the AI.
const groq = new Groq({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // This lets the browser talk directly to Groq.
});

import { ChatMessage, UserContext } from "@/types/chat";
import { QuizData } from "@/types/quiz";

/**
 * THE MAIN FUNCTION: This is what we call when we want the AI to think.
 * It takes the chat history and some info about the user (hobbies, etc.)
 */
export const getGroqCompletion = async (
  messages: ChatMessage[],
  userContext?: Partial<UserContext>
) => {
  // If there's no password, we politely tell the user why the AI isn't responding.
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    return {
      role: "assistant",
      content: "I'm sorry! I don't have my AI 'brain' connected yet. Please add your VITE_GROQ_API_KEY to the .env file so we can start learning together! 🧠"
    };
  }

  // THE SECRET SAUCE: We tell the AI how to behave. 
  // We basically say: "You are Quizzy, use their hobbies, and be fun!"
  const systemPrompt = `You are "Quizzy", an enthusiastic and helpful AI tutor.
  
  Your Goal: Explain concepts using analogies based on the user's interests.
  
  User Profile:
  - Year Level: Year ${userContext?.grade || "7-12"}
  - Interests/Hobbies: ${userContext?.hobbies?.join(", ") || "General"}
  - Learning Style: ${userContext?.learningStyle || "General"}
  - Target Subjects: ${userContext?.subjects?.join(", ") || "General"}
  
  Instructions:
  1. Always keep your tone encouraging, fun, and supportive.
  2. Use analogies related to their specific hobbies whenever possible.
  3. Adjust the complexity of your language and scientific detail to be appropriate for a Year ${userContext?.grade || "7-12"} student.
  4. Keep explanations clear and concise.
  5. If the user asks about a topic outside their subjects, still help them but try to relate it back if possible.
  6. Explain the raw facts (derived from ACARA curriculum) of the topic before explaining with an analogy.
  7. Don't use emojis too much, apart from just titles. 
  8. Use seperation techniques between raw facts and analogies.
  `;

  // We combine the "Rules" (systemPrompt) with what you've already said (messages).
  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

  try {
    // We send everything to the AI and wait for it to process.
    const completion = await groq.chat.completions.create({
      messages: fullMessages as any[], // Cast to any[] or specific Groq message type if available, but consistent casting is better than 'as any' on the whole object
      model: "llama-3.3-70b-versatile", // This is the specific "model" or "brain version" we use.
      temperature: 0.7, // 0.7 makes it creative but not too crazy.
      max_tokens: 1024,
    });

    // We send the AI's reply back to the chat screen.
    return completion.choices[0]?.message || { role: "assistant", content: "I'm having a little trouble thinking right now. Try again?" };
  } catch (error) {
    // If something goes wrong (like the internet cutting out), we catch the error here.
    console.error("Groq API Error:", error);
    return { role: "assistant", content: "Oops! I couldn't reach my brain. Please check your connection or API key." };
  }
};

/**
 * GENERATING DYNAMIC GREETINGS: This uses AI to create unique greetings for the user.
 */
export const getAIGreeting = async (userName: string, streak: number) => {
  if (!import.meta.env.VITE_GROQ_API_KEY) return `Welcome back, ${userName}! 👋`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: 'You are Quizzy, a fun AI tutor. Generate a short, enthusiastic, one-sentence greeting for a student. Keep it under 8 words. Use emojis. Avoid generic "Welcome back".' 
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
    return completion.choices[0]?.message?.content?.replace(/"/g, '') || `Yo ${userName}! Let's crush it! 🚀`;
  } catch {
    return `Welcome back, ${userName}! 👋`;
  }
};

/**
 * GENERATING BANNER PHRASES: Randomizes the dashboard banner text.
 */
export const getAIBannerPhrase = async (userName: string, subjects: string[]) => {
  if (!import.meta.env.VITE_GROQ_API_KEY) return "What's the plan for today?";

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: 'Generate a short, punchy 10-word call to action for a student dashboard. Focus on curiosity and growth. Use the students name. Be unique.' 
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
    return completion.choices[0]?.message?.content?.replace(/"/g, '') || "Ready to turn concepts into analogies?";
  } catch {
    return "What should we tackle first?";
  }
};

/**
 * GENERATING AI QUIZZES: Creates a structured 5-question quiz with analogies.
 */
export const generateQuiz = async (
  input: string,
  userContext: {
    grade?: string;
    hobbies: string[];
  },
  numberOfQuestions: number = 5
): Promise<QuizData | null> => {
  if (!import.meta.env.VITE_GROQ_API_KEY) return null;

  const systemPrompt = `You are Quizzy, an AI tutor. Generate a ${numberOfQuestions}-question mixed quiz about "${input}" for a Year ${userContext.grade || "7-12"} student. 
  Random Seed: ${Date.now()} (Ensure questions are different from previous runs).
  
  CRITICAL: 
  1. Each question MUST include an "analogy" field that explains the concept using the user's hobbies (${userContext.hobbies.join(", ")}).
  2. The quiz should be a mix of "multiple_choice" and "short_answer" types.
  3. Return ONLY a JSON array of questions under a "questions" key.
  5. CRITICAL: Ensure questions are UNIQUE and different from typical textbook questions. Use startlingly different analogies or angles each time.
  6. Use Markdown and LaTeX for formatting where appropriate.
    - Use '$' for inline math equations (e.g., $E=mc^2$).
    - Use '**' for bold text (e.g., **Key Concept**).
    - CRITICAL: Double-escape all backslashes in the JSON string (e.g., use "\\frac" for "\frac").
  7. Format:
  {
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "text",
        "analogy": "analogy text",
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
        "correctAnswer": "detailed correct answer for AI reference",
        "hint": "hint text"
      }
    ]
  }
  Ensure exactly 4 options for multiple_choice. For short_answer, provide a clear 'correctAnswer' that the grading AI can use as a reference.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      response_format: { type: "json_object" }
    });
    
    let content = completion.choices[0]?.message?.content || "{}";
    
    // Sanitize: If the AI output single backslashes for LaTeX (e.g. \frac), JSON.parse will fail.
    // We try to fix this by replacing unescaped backslashes with double backslashes.
    // This regex looks for \, not followed by another \, and not "or / or n or r or t or u or b or f
    // Actually, simpler approach: use a dedicated dirty-json parser or just try-catch loop.
    // Let's rely on the explicit instruction first, but catch the error and try a simple replace if it fails.
    
    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn("JSON Parse failed, attempting to sanitize LaTeX backslashes...", e);
      // Attempt to double-escape backslashes that look like LaTeX commands
      // Look for \ followed by [a-zA-Z]
      const sanitized = content.replace(/\\([a-zA-Z])/g, "\\\\$1");
      return JSON.parse(sanitized);
    }
  } catch (error) {
    console.error("Quiz Generation Error:", error);
    return null;
  }
};

/**
 * AI GRADING: Evaluates a short answer response.
 */
export const gradeShortAnswer = async (
  question: string,
  targetAnswer: string,
  userAnswer: string
) => {
  if (!import.meta.env.VITE_GROQ_API_KEY) return { isCorrect: false, feedback: "AI grading unavailable." };

  try {
    const completion = await groq.chat.completions.create({
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
    console.error("Grading Error:", error);
    return { isCorrect: false, feedback: "Could not grade this answer." };
  }
};
