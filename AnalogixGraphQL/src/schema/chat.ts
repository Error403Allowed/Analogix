export const chatTypeDefs = /* GraphQL */ `
  type ChatSession {
    id: ID!
    subjectId: String!
    title: String
    createdAt: DateTime!
    updatedAt: DateTime!
    messageCount: Int!
    lastMessage: String
  }

  type ChatMessage {
    id: ID!
    sessionId: ID!
    role: String!
    content: String!
    createdAt: DateTime!
  }

  """
  Streamed token from the AI tutor. The server emits one event per token;
  the last event for a given stream has done = true and includes the full
  concatenated text in fullText.
  """
  type ChatToken {
    token: String!
    done: Boolean!
    fullText: String
    model: String
  }

  extend type Query {
    chatSessions(subjectId: String): [ChatSession!]!
    chatMessages(sessionId: ID!, limit: Int = 100): [ChatMessage!]!
  }

  extend type Mutation {
    createChatSession(subjectId: String!, title: String): ChatSession!
    updateChatSession(id: ID!, title: String): ChatSession!
    deleteChatSession(id: ID!): DeleteResult!
    appendChatMessage(sessionId: ID!, role: String!, content: String!): ChatMessage!

    """
    Persists the user's message and kicks off a streamed AI response.
    Tokens are published to the chatStream(sessionId) subscription channel.
    Returns immediately; do not wait for completion — subscribe to chatStream
    to receive the response in real time.
    """
    streamChatMessage(sessionId: ID!, content: String!, model: String): ChatMessage!
  }

  extend type Subscription {
    """
    Streams AI tokens for a chat session. The client must supply the sessionId
    as a subscription variable.
    """
    chatStream(sessionId: ID!): ChatToken!
  }
`;
