export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  analogy?: string; // Sometimes we store the analogy topic here
}

export interface UserContext {
  subjects: string[];
  hobbies: string[];
  grade?: string;
  state?: string;
  learningStyle: string;
  analogyIntensity?: number;
  responseLength?: number;
  pageContext?: string; // Injected page/document context — appended to the system prompt
  memoryManagement?: boolean;
  researchMode?: boolean;
  researchQuery?: string;
  researchSources?: Array<{
    id: string;
    title: string;
    url?: string;
    pdfUrl?: string;
    authors?: string[];
    year?: number;
    venue?: string;
    abstract?: string;
    doi?: string;
    openAccess?: boolean;
    source: string;
  }>;
}
