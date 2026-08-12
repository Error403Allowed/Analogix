import type { ResearchSource } from "@/types/research";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  analogy?: string;
  imageUrl?: string;
  attachments?: Array<{ name: string; size: number; type: string; content: string; previewUrl?: string; isImage?: boolean }>;
  isStreaming?: boolean;
  isNew?: boolean;
  isWelcome?: boolean;
  sources?: ResearchSource[];
  researchQuery?: string;
}
