import type { GraphQLContext } from "../context.js";
import { ACARA_CURRICULUM } from "@analogix/shared/curriculum/acara";

export const curriculumResolvers = {
  Query: {
    curriculumSubjects: async (_: unknown, __: unknown, _ctx: GraphQLContext) => {
      return Object.values(ACARA_CURRICULUM);
    },
    curriculumSubject: async (_: unknown, args: { subject: string }, _ctx: GraphQLContext) => {
      return ACARA_CURRICULUM[args.subject] ?? null;
    },
  },
};
