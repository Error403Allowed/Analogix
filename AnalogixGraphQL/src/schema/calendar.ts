export const calendarTypeDefs = /* GraphQL */ `
  type CalendarEvent {
    id: ID!
    title: String!
    date: DateTime!
    endDate: DateTime
    type: String!
    subject: String
    location: String
    description: String
    color: String
    source: String!
  }

  type Deadline {
    id: ID!
    title: String!
    dueDate: DateTime!
    subject: String
    priority: String!
    createdAt: DateTime!
  }

  extend type Query {
    events(from: DateTime, to: DateTime): [CalendarEvent!]!
    deadlines: [Deadline!]!
  }

  extend type Mutation {
    createEvent(input: JSON!): CalendarEvent!
    updateEvent(id: ID!, input: JSON!): CalendarEvent!
    deleteEvent(id: ID!): DeleteResult!
    importIcs(ics: String!): Int!

    addDeadline(input: JSON!): Deadline!
    updateDeadline(id: ID!, input: JSON!): Deadline!
    deleteDeadline(id: ID!): DeleteResult!
  }
`;
