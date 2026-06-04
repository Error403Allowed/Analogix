// Shared scalar + interface types. Defines the root types so other files
// can `extend type Query/Mutation/Subscription`.
export const commonTypeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON

  type Query {
    _empty: Boolean
  }

  type Mutation {
    _empty: Boolean
  }

  type Subscription {
    _empty: Boolean
  }

  type DeleteResult {
    success: Boolean!
  }

  interface Node {
    id: ID!
  }
`;
