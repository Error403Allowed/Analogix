import { gql } from "@apollo/client/core";

export const FORMULA_SHEETS = gql`
  query FormulaSheets {
    formulaSheets {
      subjectId
      subjectName
      categories {
        name
        formulas {
          id
          name
          latex
          description
        }
      }
    }
  }
`;

export const FORMULA_SHEET = gql`
  query FormulaSheet($subjectId: String!) {
    formulaSheet(subjectId: $subjectId) {
      subjectId
      subjectName
      categories {
        name
        formulas {
          id
          name
          latex
          description
        }
      }
    }
  }
`;

export const SEARCH_FORMULAS = gql`
  query SearchFormulas($query: String!) {
    searchFormulas(query: $query) {
      id
      name
      latex
      description
    }
  }
`;
