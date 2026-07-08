// Resolvers organized by domain. Each module exports Query/Mutation/Subscription
// resolvers for its slice. The maps are merged in `index.ts` to produce the
// full resolvers object for Apollo.

import { userResolvers } from "./user.js";
import { statsResolvers } from "./stats.js";
import { subjectResolvers } from "./subject.js";
import { documentResolvers } from "./document.js";
import { flashcardResolvers } from "./flashcard.js";
import { quizResolvers } from "./quiz.js";
import { chatResolvers } from "./chat.js";
import { aiResolvers } from "./ai.js";
import { calendarResolvers } from "./calendar.js";
import { roomResolvers } from "./room.js";
import { formulaResolvers } from "./formula.js";
import { achievementResolvers } from "./achievement.js";
import { resourceResolvers } from "./resource.js";
import { curatedResourceResolvers } from "./curatedResource.js";
import { curriculumResolvers } from "./curriculum.js";
import { scalarResolvers } from "./scalars.js";

function merge(...maps: Record<string, Record<string, unknown>>[]): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      out[key] = { ...(out[key] ?? {}), ...value };
    }
  }
  return out;
}

export const resolvers = merge(
  scalarResolvers as unknown as Record<string, Record<string, unknown>>,
  userResolvers as unknown as Record<string, Record<string, unknown>>,
  statsResolvers as unknown as Record<string, Record<string, unknown>>,
  subjectResolvers as unknown as Record<string, Record<string, unknown>>,
  documentResolvers as unknown as Record<string, Record<string, unknown>>,
  flashcardResolvers as unknown as Record<string, Record<string, unknown>>,
  quizResolvers as unknown as Record<string, Record<string, unknown>>,
  chatResolvers as unknown as Record<string, Record<string, unknown>>,
  aiResolvers as unknown as Record<string, Record<string, unknown>>,
  calendarResolvers as unknown as Record<string, Record<string, unknown>>,
  roomResolvers as unknown as Record<string, Record<string, unknown>>,
  formulaResolvers as unknown as Record<string, Record<string, unknown>>,
  achievementResolvers as unknown as Record<string, Record<string, unknown>>,
  resourceResolvers as unknown as Record<string, Record<string, unknown>>,
  curatedResourceResolvers as unknown as Record<string, Record<string, unknown>>,
  curriculumResolvers as unknown as Record<string, Record<string, unknown>>
);

export type RootResolvers = typeof resolvers;
