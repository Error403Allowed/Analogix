import { gql } from "@apollo/client";

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
          category
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
      subjectId
      subjectName
      category
    }
  }
`;

export const ACHIEVEMENTS = gql`
  query Achievements {
    achievements {
      id
      title
      description
      icon
      category
    }
    unlockedAchievements {
      id
      achievementId
      unlockedAt
    }
  }
`;

export const UNLOCK_ACHIEVEMENT = gql`
  mutation UnlockAchievement($achievementId: String!) {
    unlockAchievement(achievementId: $achievementId) {
      id
      achievementId
      unlockedAt
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
          category
        }
      }
    }
  }
`;
