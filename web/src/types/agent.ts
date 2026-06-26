export type AgentMode = "sidebar" | "floating" | "off";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  actions?: AgentAction[];
}

export interface AgentAction {
  type: string;
  payload: Record<string, unknown>;
  requiresConfirm?: boolean;
  summary?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}