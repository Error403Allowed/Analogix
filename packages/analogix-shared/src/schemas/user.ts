import { z } from "zod";
import { AUSTRALIAN_STATES, GRADES, LEARNING_STYLES } from "../types/enums.js";

export const UpdateProfileInput = z.object({
  name: z.string().min(1).max(120).optional(),
  grade: z.enum(GRADES).optional(),
  state: z.enum(AUSTRALIAN_STATES).nullable().optional(),
  subjects: z.array(z.string()).optional(),
  hobbies: z.array(z.string()).optional(),
  hobbyIds: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  onboardingComplete: z.boolean().optional(),
});

export const UpdatePreferencesInput = z.object({
  mood: z.string().optional(),
  theme: z.string().optional(),
});

export type UpdateProfileInputT = z.infer<typeof UpdateProfileInput>;
export type UpdatePreferencesInputT = z.infer<typeof UpdatePreferencesInput>;
