export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  analogy?: string; // Sometimes we store the analogy topic here
  imageUrl?: string; // Optional image shown inline in the chat (e.g. from Unsplash)
}

export interface UserContext {
  subjects: string[];
  hobbies: string[];
  grade?: string;
  learningStyle: string;
  mood?: string;
}
