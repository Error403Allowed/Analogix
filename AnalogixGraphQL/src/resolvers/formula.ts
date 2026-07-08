import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";
import { findFormulaSheet, searchAllFormulas } from "@analogix/shared/formulas";

export const formulaResolvers = {
  Query: {
    formulaSheets: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireUser(ctx);
      const subjectIds = ["math", "physics", "chemistry", "biology", "economics"];
      return subjectIds
        .map((id) => findFormulaSheet(id))
        .filter((sheet): sheet is NonNullable<typeof sheet> => sheet !== null);
    },
    formulaSheet: async (_: unknown, args: { subjectId: string }, ctx: GraphQLContext) => {
      requireUser(ctx);
      return findFormulaSheet(args.subjectId);
    },
    searchFormulas: async (_: unknown, args: { query: string }, ctx: GraphQLContext) => {
      requireUser(ctx);
      const results = searchAllFormulas(args.query);
      return results.map((f) => ({
        id: f.id,
        name: f.name,
        latex: f.latex,
        description: f.description ?? null,
        subjectId: f.subjectId,
        subjectName: f.subjectId
          .split("-")
          .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" "),
        category: f.category,
      }));
    },
  },
};
