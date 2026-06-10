export const subjectTypeDefs = /* GraphQL */ `
  type SubjectMark {
    id: ID!
    title: String!
    score: Float!
    total: Float!
    date: String!
  }

  type SubjectHomework {
    id: ID!
    title: String!
    dueDate: String
    notes: String
    link: String
    completed: Boolean
    createdAt: String!
  }

  type SubjectLink {
    id: ID!
    title: String!
    url: String!
    createdAt: String!
  }

  type AssessmentNotification {
    id: ID!
    title: String!
    subject: String!
    dueDate: String!
    createdAt: String!
    studyGuide: [StudyGuideWeek!]!
    rawText: String!
  }

  type StudyGuideWeek {
    week: Int!
    label: String!
    tasks: [String!]!
  }

  type SubjectNotes {
    content: String!
    lastUpdated: String!
    title: String
    homework: [SubjectHomework!]!
    links: [SubjectLink!]!
    assessments: [AssessmentNotification!]!
  }

  type Subject {
    id: ID!
    marks: [SubjectMark!]!
    notes: SubjectNotes!

    """
    Catalog metadata (shared across all users). Mirrors the shared curriculum
    in @analogix/shared, hydrated by the BFF.
    """
    name: String
    icon: String
    color: String
    chapters: [SubjectChapter!]!
  }

  type SubjectChapter {
    id: ID!
    name: String!
    order: Int!
    topics: [SubjectTopic!]!
  }

  type SubjectTopic {
    id: ID!
    name: String!
    order: Int!
  }

  type SubjectMapEntry {
    subjectId: String!
    progressPercent: Int!
    masteredTopics: Int!
    totalTopics: Int!
  }

  type CustomSubject {
    id: ID!
    subjectId: String!
    customIcon: String
    customColor: String
    customCover: String
    customTitle: String
  }

  extend type Query {
    subjects: [Subject!]!
    subject(id: String!): Subject
    customSubjects: [CustomSubject!]!
    studyMap: [SubjectMapEntry!]!
  }

  extend type Mutation {
    saveCustomSubject(subjectId: String!, input: JSON!): CustomSubject!
    addMark(subjectId: String!, input: JSON!): Subject!
    updateNotes(subjectId: String!, content: String!, title: String): Subject!
    addAssessment(subjectId: String!, input: JSON!): Subject!
    removeAssessment(subjectId: String!, assessmentId: ID!): Subject!
    saveSubjectNotes(subjectId: String!, notes: JSON!): Subject!
  }
`;
