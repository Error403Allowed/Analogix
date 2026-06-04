export const resourceTypeDefs = /* GraphQL */ `
  type Resource {
    id: ID!
    name: String!
    type: String!
    mimeType: String!
    sizeBytes: Int!
    url: String!
    thumbnailUrl: String
    subjectId: String
    createdAt: DateTime!
  }

  extend type Query {
    resources(subjectId: String): [Resource!]!
  }

  extend type Mutation {
    uploadResource(name: String!, mimeType: String!, base64: String!, subjectId: String): Resource!
    deleteResource(id: ID!): DeleteResult!
  }
`;
