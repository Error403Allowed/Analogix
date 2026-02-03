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

// This is just a way to tell the code exactly what a "Message" looks like.
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * THE MAIN FUNCTION: This is what we call when we want the AI to think.
 * It takes the chat history and some info about the user (hobbies, etc.)
 */
export const getGroqCompletion = async (
  messages: ChatMessage[],
  userContext?: {
    subjects: string[];
    hobbies: string[];
    learningStyle: string;
  }
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
  - Interests/Hobbies: ${userContext?.hobbies?.join(", ") || "General"}
  - Learning Style: ${userContext?.learningStyle || "General"}
  - Target Subjects: ${userContext?.subjects?.join(", ") || "General"}
  
  Instructions:
  1. Always keep your tone encouraging, fun, and supportive.
  2. Use analogies related to their specific hobbies whenever possible.
  3. Keep explanations clear and concise.
  4. If the user asks about a topic outside their subjects, still help them but try to relate it back if possible.
  5. Explain the raw facts (derived from ACARA curriculum) of the topic before explaining with an analogy.
  6. Don't use emojis too much, apart from just titles. 
  7. Use seperation techniques between raw facts and analogies.
  `;

  // We combine the "Rules" (systemPrompt) with what you've already said (messages).
  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

  try {
    // We send everything to the AI and wait for it to process.
    const completion = await groq.chat.completions.create({
      messages: fullMessages as any,
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
