import { z } from "zod";

export const CreateEventInput = z.object({
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T|$)/, "Date must be ISO 8601 format (YYYY-MM-DD...)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T|$)/, "End date must be ISO 8601 format").optional(),
  type: z.string().min(1).max(50),
  subject: z.string().optional(),
  description: z.string().max(5_000).optional(),
  location: z.string().optional(),
  color: z.string().optional(),
});

export const UpdateEventInput = CreateEventInput.partial().extend({
  id: z.string().uuid(),
});

export const AddDeadlineInput = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T|$)/, "Due date must be ISO 8601 format"),
  subject: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const UpdateDeadlineInput = AddDeadlineInput.partial().extend({
  id: z.string().uuid(),
});

export type CreateEventInputT = z.infer<typeof CreateEventInput>;
export type UpdateEventInputT = z.infer<typeof UpdateEventInput>;
export type AddDeadlineInputT = z.infer<typeof AddDeadlineInput>;
export type UpdateDeadlineInputT = z.infer<typeof UpdateDeadlineInput>;
