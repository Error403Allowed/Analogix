export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  analogy?: string; // Sometimes we store the analogy topic here
}

export interface UserContext {
  subjects: string[];
  hobbies: string[];
  grade?: string;
  learningStyle: string;
  analogyIntensity?: number;
  responseLength?: number;
  deepDive?: boolean;
}
