export const statsTypeDefs = /* GraphQL */ `
  type UserMemory {
    id: ID!
    key: String!
    value: String!
    createdAt: DateTime!
    lastUsedAt: DateTime!
  }

  type UserStats {
    userId: ID!
    quizzesDone: Int!
    currentStreak: Int!
    accuracy: Int!
    conversationsCount: Int!
    topSubject: String!
    subjectCounts: JSON!
    updatedAt: DateTime

    """
    Mobile-facing extensions.
    """
    xp: Int!
    level: Int!
    quizzesCompleted: Int!
    cardsReviewed: Int!
    minutesStudied: Int!
    memories: [UserMemory!]!
  }

  type ActivityLog {
    id: ID!
    date: String!
    count: Int!
  }

  extend type Query {
    userStats: UserStats
    activityLog(days: Int = 60): [ActivityLog!]!
  }

  extend type Mutation {
    incrementActivity(date: String!): DeleteResult!
    upsertUserStats(input: JSON!): UserStats!
    forgetMemory(id: ID!): DeleteResult!
    rememberMemory(input: JSON!): UserMemory!
  }
`;
