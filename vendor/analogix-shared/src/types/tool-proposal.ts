export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolPreview {
  type: "flashcards" | "quiz" | "event" | "document" | "subject" | "deadline";
  action: "create" | "update" | "delete" | "read";
  before?: Record<string, unknown>;
  after: Record<string, unknown>;
  summary: string;
}

export interface ToolProposal {
  id: string;
  summary: string;
  description: string;
  tools: ToolCall[];
  previews: ToolPreview[];
}

export interface ToolResult {
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolExecutionResult {
  results: ToolResult[];
}
