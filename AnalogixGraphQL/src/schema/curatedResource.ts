export const curatedResourceTypeDefs = /* GraphQL */ `
  type CuratedResourceLink {
    title: String!
    url: String!
    description: String
    free: Boolean
    states: [String!]
  }

  type CuratedSubjectResources {
    subjectId: String!
    pastPapers: [CuratedResourceLink!]!
    textbooks: [CuratedResourceLink!]!
  }

  extend type Query {
    curatedResources: [CuratedSubjectResources!]!
  }
`;
