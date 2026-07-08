export const curriculumTypeDefs = /* GraphQL */ `
  type CurriculumTopic {
    id: String!
    strand: String!
    topic: String!
    contentDescription: String!
    elaborations: [String!]!
  }

  type CurriculumYearLevel {
    year: Int!
    strands: JSON!
    achievementStandard: String!
  }

  type CurriculumSubject {
    subject: String!
    learningArea: String!
    yearLevels: JSON!
  }

  extend type Query {
    curriculumSubjects: [CurriculumSubject!]!
    curriculumSubject(subject: String!): CurriculumSubject
  }
`;
