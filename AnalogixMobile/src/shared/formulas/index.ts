export interface FormulaSheet {
  subjectId: string;
  subjectName: string;
  categories: FormulaCategory[];
}

export interface FormulaCategory {
  name: string;
  formulas: Formula[];
}

export interface Formula {
  id: string;
  name: string;
  latex: string;
  description?: string;
  variables?: Record<string, string>;
  subjectId: string;
  category: string;
}

export {
  FORMULA_SHEET_DATA,
  findFormulaSheet,
  buildFormulaSheetContext,
  searchAllFormulas,
} from "./data";
