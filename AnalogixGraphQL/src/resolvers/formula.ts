import type { GraphQLContext } from "../context.js";
import { findFormulaSheet, searchAllFormulas } from "@analogix/shared/formulas";

export const formulaResolvers = {
  Query: {
    formulaSheets: async () => {
      const subjectIds = ["math", "physics", "chemistry", "biology", "economics"];
      return subjectIds
        .map((id) => findFormulaSheet(id))
        .filter((sheet): sheet is NonNullable<typeof sheet> => sheet !== null);
    },
    formulaSheet: async (_: unknown, args: { subjectId: string }) => {
      return findFormulaSheet(args.subjectId);
    },
    searchFormulas: async (_: unknown, args: { query: string }) => {
      const results = searchAllFormulas(args.query);
      return results.map((f) => ({
        id: f.id,
        name: f.name,
        latex: f.latex,
        description: f.description ?? null,
        subjectId: f.subjectId,
        category: f.category,
      }));
    },
  },
};
