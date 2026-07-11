export const userTypeDefs = /* GraphQL */ `
  type Profile {
    id: ID!
    name: String
    email: String
    grade: String
    state: String
    subjects: [String!]!
    hobbies: [String!]!
    hobbyIds: [String!]!
    hobbyDetails: JSON
    timezone: String
    onboardingComplete: Boolean!
    toursCompleted: [String!]!
    avatarUrl: String
    createdAt: DateTime
    updatedAt: DateTime

    """
    AI assistant configuration.
    """
    aiPersonality: AiPersonality
  }

  type AiPersonality {
    tone: String!
    focus: String!
    verbosity: Int!
    creativity: Int!
  }

  type PublicUser {
    id: ID!
    name: String
    avatarUrl: String
  }

  type UserPreferences {
    userId: ID!
    mood: String
    theme: String
  }

  extend type Query {
    me: Profile
    myPreferences: UserPreferences
  }

  extend type Mutation {
    updateProfile(input: JSON!): Profile!
    updatePreferences(input: JSON!): UserPreferences!
    updateAiPersonality(input: JSON!): Profile!
    deleteAccount: DeleteResult!
    markToursCompleted(tourIds: [String!]!): Profile!
  }
`;
