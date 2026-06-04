export const flashcardTypeDefs = /* GraphQL */ `
  type Flashcard {
    id: ID!
    subjectId: String!
    front: String!
    back: String!
    sourceSessionId: String
    nextReview: DateTime!
    intervalDays: Int!
    easeFactor: Float!
    repetitions: Int!
    setId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type FlashcardSet {
    id: ID!
    subjectId: String!
    name: String!
    cardCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type FlashcardReviewResult {
    card: Flashcard!
    nextReview: DateTime!
    intervalDays: Int!
  }

  extend type Query {
    flashcards(subjectId: String, setId: String): [Flashcard!]!
    flashcardsDue(subjectId: String, limit: Int = 20): [Flashcard!]!
    flashcardSets(subjectId: String): [FlashcardSet!]!
  }

  extend type Mutation {
    createFlashcard(input: JSON!): Flashcard!
    updateFlashcard(input: JSON!): Flashcard!
    deleteFlashcard(id: ID!): DeleteResult!
    gradeFlashcard(id: ID!, quality: Int!): FlashcardReviewResult!
    createFlashcardSet(input: JSON!): FlashcardSet!
    generateFlashcards(input: JSON!): [Flashcard!]!
  }
`;
