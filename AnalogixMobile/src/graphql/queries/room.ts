import { gql } from "@apollo/client";

export const ROOMS = gql`
  query Rooms {
    rooms {
      id
      name
      subject
      title
      topic
      memberCount
      isOwner
      visibility
    }
  }
`;

export const ROOM_DETAIL = gql`
  query RoomDetail($id: ID!) {
    room(id: $id) {
      id
      name
      subject
      title
      topic
      memberCount
      isOwner
      members {
        id
        userId
        role
        isOnline
        user {
          id
          name
          avatarUrl
        }
      }
      messages(limit: 100) {
        id
        content
        text
        messageType
        createdAt
        user {
          id
          name
          avatarUrl
        }
      }
      documents {
        id
        documentId
        title
        role
      }
    }
  }
`;

export const ROOM_MESSAGES_SUB = gql`
  subscription RoomMessages($roomId: ID!) {
    roomMessagesStream(roomId: $roomId) {
      id
      content
      createdAt
      userId
      user {
        id
        name
      }
    }
  }
`;

export const SEND_ROOM_MESSAGE = gql`
  mutation SendRoomMessage($roomId: ID!, $content: String!) {
    sendRoomMessage(roomId: $roomId, content: $content) {
      id
      content
      createdAt
    }
  }
`;

export const PUBLIC_ROOMS = gql`
  query PublicRooms {
    publicRooms {
      id
      title
      topic
      memberCount
      joinCode
    }
  }
`;

export const CREATE_ROOM = gql`
  mutation CreateRoom($input: JSON!) {
    createRoom(input: $input) {
      id
      title
      topic
      visibility
      joinCode
      memberCount
      isOwner
    }
  }
`;

export const JOIN_ROOM = gql`
  mutation JoinRoom($joinCode: String!) {
    joinRoom(joinCode: $joinCode) {
      id
      title
      isOwner
    }
  }
`;

export const LEAVE_ROOM = gql`
  mutation LeaveRoom($roomId: ID!) {
    leaveRoom(roomId: $roomId) {
      success
    }
  }
`;
