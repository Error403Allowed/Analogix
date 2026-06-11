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

export const UPDATE_ROOM_TIMER = gql`
  mutation UpdateRoomTimer($roomId: ID!, $state: String!, $durationSeconds: Int, $elapsedSeconds: Int) {
    updateRoomTimer(roomId: $roomId, state: $state, durationSeconds: $durationSeconds, elapsedSeconds: $elapsedSeconds) {
      id
      timerState
      timerDurationSeconds
      timerElapsedSeconds
      timerStartedAt
    }
  }
`;

export const SHARE_DOCUMENT_TO_ROOM = gql`
  mutation ShareDocumentToRoom($roomId: ID!, $documentId: ID!, $subjectId: String!) {
    shareDocumentToRoom(roomId: $roomId, documentId: $documentId, subjectId: $subjectId) {
      id
      roomId
      documentId
      title
      role
      sharedBy
    }
  }
`;

export const ROOM_PRESENCE_STREAM = gql`
  subscription RoomPresenceStream($roomId: ID!) {
    roomPresenceStream(roomId: $roomId) {
      id
      userId
      role
      isOnline
      lastSeen
      user {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const ROOM_TIMER_STREAM = gql`
  subscription RoomTimerStream($roomId: ID!) {
    roomTimerStream(roomId: $roomId) {
      id
      timerState
      timerDurationSeconds
      timerElapsedSeconds
      timerStartedAt
    }
  }
`;

export const UPDATE_ROOM_MEMBER_ROLE = gql`
  mutation UpdateRoomMemberRole($roomId: ID!, $userId: ID!, $role: String!) {
    updateRoomMemberRole(roomId: $roomId, userId: $userId, role: $role) {
      id
      role
      isOnline
    }
  }
`;

export const DELETE_ROOM = gql`
  mutation DeleteRoom($roomId: ID!) {
    deleteRoom(roomId: $roomId) {
      success
    }
  }
`;
