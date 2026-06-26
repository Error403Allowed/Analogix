import type { ResearchSource } from "./research.js";

export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
  analogy?: string;
}

export interface UserContext {
  subjects: string[];
  hobbies: string[];
  grade?: string;
  state?: string;
  learningStyle: string;
  analogyIntensity?: number;
  responseLength?: number;
  pageContext?: string;
  memoryManagement?: boolean;
  researchMode?: boolean;
  researchQuery?: string;
  researchSources?: ResearchSource[];
  selectedModel?: string;
}
