export const documentTypeDefs = /* GraphQL */ `
  type Document {
    id: ID!
    subjectId: String!
    title: String!
    content: String!
    contentJson: String
    contentText: String
    contentFormat: String
    role: String!
    icon: String
    cover: String
    createdAt: String!
    lastUpdated: String!
    lastEditedBy: String
  }

  type DocumentVersion {
    id: ID!
    documentId: ID!
    content: String!
    contentJson: String
    contentText: String
    createdAt: String!
    createdBy: String!
  }

  extend type Query {
    documents(subjectId: String): [Document!]!
    document(id: ID!): Document
    documentVersions(documentId: ID!): [DocumentVersion!]!
  }

  extend type Mutation {
    createDocument(input: JSON!): Document!
    updateDocument(input: JSON!): Document!
    duplicateDocument(documentId: ID!, subjectId: String!): Document!
    deleteDocument(documentId: ID!, subjectId: String!): DeleteResult!
    revertDocument(documentId: ID!, versionId: ID!): Document!
  }
`;
