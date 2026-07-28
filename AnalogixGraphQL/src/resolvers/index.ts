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
import { mergeResolvers } from "@graphql-tools/merge";
import { scalarResolvers } from "./scalars.js";

export const resolvers = mergeResolvers([
  scalarResolvers,
  userResolvers,
  statsResolvers,
  subjectResolvers,
  documentResolvers,
  flashcardResolvers,
  quizResolvers,
  chatResolvers,
  aiResolvers,
  calendarResolvers,
  roomResolvers,
  formulaResolvers,
  achievementResolvers,
  resourceResolvers,
  curatedResourceResolvers,
  curriculumResolvers,
]);

export type RootResolvers = typeof resolvers;
