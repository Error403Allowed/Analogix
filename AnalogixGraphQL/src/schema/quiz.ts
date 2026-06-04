export const quizTypeDefs = /* GraphQL */ `
  type QuizOption {
    id: ID!
    text: String!
    isCorrect: Boolean!
  }

  type QuizQuestion {
    id: ID!
    type: String!
    question: String!
    analogy: String
    options: [QuizOption!]
    correctAnswer: String
    explanation: String
    hint: String
    pythonSolution: String
    reasoning: String
    desmos: JSON
  }

  type Quiz {
    id: ID!
    subjectId: String!
    title: String!
    difficulty: String!
    questions: [QuizQuestion!]!
    createdAt: DateTime!
  }

  type QuizAttempt {
    id: ID!
    quizId: ID!
    userId: ID!
    score: Int!
    total: Int!
    accuracy: Int!
    answers: JSON!
    createdAt: DateTime!
  }

  type QuizReview {
    summary: String!
    questions: [QuizReviewItem!]!
  }

  type QuizReviewItem {
    id: ID!
    feedback: String!
  }

  type GradedShortAnswer {
    score: Int!
    feedback: String!
    isCorrect: Boolean!
  }

  extend type Query {
    quizzes(subjectId: String): [Quiz!]!
    quiz(id: ID!): Quiz
    attempts(quizId: ID): [QuizAttempt!]!
  }

  extend type Mutation {
    generateQuiz(input: JSON!): Quiz!
    gradeShortAnswer(input: JSON!): GradedShortAnswer!
    quizReview(input: JSON!): QuizReview!
    submitQuizAttempt(quizId: ID!, answers: JSON!, durationSeconds: Int): QuizAttempt!
  }
`;
