export const formulaTypeDefs = /* GraphQL */ `
  type Formula {
    id: ID!
    name: String!
    latex: String!
    description: String
    variables: JSON
    subjectId: String!
    subjectName: String!
    category: String!
  }

  type FormulaCategory {
    name: String!
    formulas: [Formula!]!
  }

  type FormulaSheet {
    subjectId: String!
    subjectName: String!
    categories: [FormulaCategory!]!
  }

  extend type Query {
    formulaSheets: [FormulaSheet!]!
    formulaSheet(subjectId: String!): FormulaSheet
    searchFormulas(query: String!): [Formula!]!
  }
`;
