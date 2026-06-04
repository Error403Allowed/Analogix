export const achievementTypeDefs = /* GraphQL */ `
  type Achievement {
    id: ID!
    title: String!
    description: String!
    icon: String!
    category: String!
  }

  type UnlockedAchievement {
    id: ID!
    achievementId: String!
    unlockedAt: DateTime!
  }

  extend type Query {
    achievements: [Achievement!]!
    unlockedAchievements: [UnlockedAchievement!]!
  }

  extend type Mutation {
    unlockAchievement(achievementId: String!): UnlockedAchievement!
  }
`;
