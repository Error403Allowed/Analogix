// Modular SDL — each domain owns a typeDefs file in this directory.
// Imported by `index.ts` which merges them into a single executable schema.

import { userTypeDefs } from "./user.js";
import { statsTypeDefs } from "./stats.js";
import { subjectTypeDefs } from "./subject.js";
import { documentTypeDefs } from "./document.js";
import { flashcardTypeDefs } from "./flashcard.js";
import { quizTypeDefs } from "./quiz.js";
import { chatTypeDefs } from "./chat.js";
import { aiTypeDefs } from "./ai.js";
import { calendarTypeDefs } from "./calendar.js";
import { roomTypeDefs } from "./room.js";
import { formulaTypeDefs } from "./formula.js";
import { achievementTypeDefs } from "./achievement.js";
import { resourceTypeDefs } from "./resource.js";
import { curatedResourceTypeDefs } from "./curatedResource.js";
import { curriculumTypeDefs } from "./curriculum.js";
import { commonTypeDefs } from "./common.js";

export const typeDefs = [
  commonTypeDefs,
  userTypeDefs,
  statsTypeDefs,
  subjectTypeDefs,
  documentTypeDefs,
  flashcardTypeDefs,
  quizTypeDefs,
  chatTypeDefs,
  aiTypeDefs,
  calendarTypeDefs,
  roomTypeDefs,
  formulaTypeDefs,
  achievementTypeDefs,
  resourceTypeDefs,
  curatedResourceTypeDefs,
  curriculumTypeDefs,
];
