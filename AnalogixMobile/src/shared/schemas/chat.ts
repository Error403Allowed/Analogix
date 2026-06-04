import { z } from "zod";

export const ChatMessageInput = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const AppendChatMessageInput = z.object({
  sessionId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const CreateChatSessionInput = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
});

export const UpdateChatSessionInput = z.object({
  sessionId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
});

export type ChatMessageInputT = z.infer<typeof ChatMessageInput>;
export type AppendChatMessageInputT = z.infer<typeof AppendChatMessageInput>;
export type CreateChatSessionInputT = z.infer<typeof CreateChatSessionInput>;
export type UpdateChatSessionInputT = z.infer<typeof UpdateChatSessionInput>;
