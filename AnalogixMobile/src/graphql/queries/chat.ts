import { gql } from "@apollo/client";

export const CHAT_SESSIONS = gql`
  query ChatSessions($subjectId: String) {
    chatSessions(subjectId: $subjectId) {
      id
      subjectId
      title
      createdAt
      updatedAt
      messageCount
      lastMessage
    }
  }
`;

export const CHAT_MESSAGES = gql`
  query ChatMessages($sessionId: ID!, $limit: Int) {
    chatMessages(sessionId: $sessionId, limit: $limit) {
      id
      sessionId
      role
      content
      createdAt
    }
  }
`;

export const CREATE_CHAT_SESSION = gql`
  mutation CreateChatSession($subjectId: String!, $title: String) {
    createChatSession(subjectId: $subjectId, title: $title) {
      id
      subjectId
      title
      createdAt
    }
  }
`;

export const APPEND_CHAT_MESSAGE = gql`
  mutation AppendChatMessage($sessionId: ID!, $role: String!, $content: String!) {
    appendChatMessage(sessionId: $sessionId, role: $role, content: $content) {
      id
      sessionId
      role
      content
      createdAt
    }
  }
`;

export const STREAM_CHAT_MESSAGE = gql`
  mutation StreamChatMessage($sessionId: ID!, $content: String!, $model: String) {
    streamChatMessage(sessionId: $sessionId, content: $content, model: $model) {
      id
      sessionId
      role
      content
      createdAt
    }
  }
`;

export const CHAT_STREAM = gql`
  subscription ChatStream($sessionId: ID!) {
    chatStream(sessionId: $sessionId) {
      token
      done
      fullText
    }
  }
`;

export const UPDATE_CHAT_SESSION = gql`
  mutation UpdateChatSession($id: ID!, $title: String!) {
    updateChatSession(id: $id, title: $title) {
      id
      subjectId
      title
      updatedAt
    }
  }
`;

export const DELETE_CHAT_SESSION = gql`
  mutation DeleteChatSession($id: ID!) {
    deleteChatSession(id: $id) {
      success
    }
  }
`;
