import { gql } from "@apollo/client/core";

export const ROOMS = gql`
  query Rooms {
    rooms {
      id
      title
      topic
      memberCount
      isOwner
      viewerRole
      visibility
      joinCode
      timerState
      timerDurationSeconds
      timerElapsedSeconds
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

export const ROOM_DETAIL = gql`
  query RoomDetail($id: ID!) {
    room(id: $id) {
      id
      title
      topic
      visibility
      joinCode
      ownerUserId
      memberCount
      permissions
      timerState
      timerDurationSeconds
      timerElapsedSeconds
      timerStartedAt
      createdAt
      updatedAt
      viewerRole
      isOwner
      members {
        id
        userId
        role
        isOnline
        lastSeen
        name
        avatarUrl
      }
      messages(limit: 100) {
        id
        content
        messageType
        createdAt
        name
        avatarUrl
        userId
      }
      documents {
        id
        documentId
        subjectId
        title
        role
        icon
        cover
        sharedBy
        sharedAt
        ownerUserId
        updatedAt
      }
      canvas {
        roomId
        title
        content
        contentJson
        updatedAt
        lastEditedBy
      }
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
      viewerRole
    }
  }
`;

export const JOIN_ROOM = gql`
  mutation JoinRoom($joinCode: String, $roomId: ID) {
    joinRoom(joinCode: $joinCode, roomId: $roomId) {
      id
      title
      isOwner
      viewerRole
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

export const DELETE_ROOM = gql`
  mutation DeleteRoom($roomId: ID!) {
    deleteRoom(roomId: $roomId) {
      success
    }
  }
`;

export const TRANSFER_ROOM_OWNERSHIP = gql`
  mutation TransferRoomOwnership($roomId: ID!, $newOwnerUserId: ID!) {
    transferRoomOwnership(roomId: $roomId, newOwnerUserId: $newOwnerUserId) {
      id
      isOwner
      viewerRole
      ownerUserId
      members {
        id
        userId
        role
        name
      }
    }
  }
`;

export const CONFIGURE_ROOM_PERMISSIONS = gql`
  mutation ConfigureRoomPermissions($roomId: ID!, $input: JSON!) {
    configureRoomPermissions(roomId: $roomId, input: $input) {
      id
      permissions
    }
  }
`;

export const UPDATE_ROOM = gql`
  mutation UpdateRoom($roomId: ID!, $input: JSON!) {
    updateRoom(roomId: $roomId, input: $input) {
      id
      title
      topic
      visibility
      permissions
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

export const SEND_ROOM_MESSAGE = gql`
  mutation SendRoomMessage($roomId: ID!, $content: String!, $messageType: String = "chat") {
    sendRoomMessage(roomId: $roomId, content: $content, messageType: $messageType) {
      id
      content
      messageType
      createdAt
      name
      userId
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

export const REMOVE_SHARED_DOCUMENT = gql`
  mutation RemoveSharedDocument($roomId: ID!, $documentId: ID!) {
    removeSharedDocument(roomId: $roomId, documentId: $documentId) {
      id
      documentId
      title
    }
  }
`;

export const UPDATE_ROOM_CANVAS = gql`
  mutation UpdateRoomCanvas($roomId: ID!, $input: JSON!) {
    updateRoomCanvas(roomId: $roomId, input: $input) {
      roomId
      title
      content
      contentJson
      updatedAt
      lastEditedBy
    }
  }
`;

export const UPDATE_PRESENCE = gql`
  mutation UpdatePresence($roomId: ID!, $isOnline: Boolean!) {
    updatePresence(roomId: $roomId, isOnline: $isOnline) {
      success
    }
  }
`;

export const ROOM_MESSAGES_SUB = gql`
  subscription RoomMessages($roomId: ID!) {
    roomMessagesStream(roomId: $roomId) {
      id
      content
      messageType
      createdAt
      userId
      name
      user {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const ROOM_PRESENCE_SUB = gql`
  subscription RoomPresence($roomId: ID!) {
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

export const ROOM_TIMER_SUB = gql`
  subscription RoomTimer($roomId: ID!) {
    roomTimerStream(roomId: $roomId) {
      id
      timerState
      timerDurationSeconds
      timerElapsedSeconds
      timerStartedAt
    }
  }
`;

export const ROOM_DOCUMENT = gql`
  query RoomDocument($roomId: ID!, $documentId: ID!) {
    roomDocument(roomId: $roomId, documentId: $documentId) {
      id
      title
      content
      contentJson
      contentText
      contentFormat
      role
    }
  }
`;
