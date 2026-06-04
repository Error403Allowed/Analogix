export const roomTypeDefs = /* GraphQL */ `
  type StudyRoom {
    id: ID!
    title: String!
    topic: String
    visibility: String!
    joinCode: String!
    ownerUserId: ID!
    memberCount: Int!
    timerState: String!
    timerDurationSeconds: Int!
    timerElapsedSeconds: Int!
    timerStartedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    viewerRole: String
    isOwner: Boolean!

    """
    Mobile-facing convenience fields.
    """
    name: String
    subject: String
    members: [StudyRoomMember!]!
    messages: [StudyRoomMessage!]!
    documents: [RoomSharedDocument!]!
  }

  type StudyRoomMember {
    id: ID!
    roomId: ID!
    userId: ID!
    role: String!
    name: String!
    avatarUrl: String
    isOnline: Boolean!
    lastSeen: DateTime!
    user: PublicUser
  }

  type StudyRoomMessage {
    id: ID!
    roomId: ID!
    userId: ID
    messageType: String!
    content: String!
    name: String!
    avatarUrl: String
    createdAt: DateTime!
    text: String
    user: PublicUser
  }

  type StudyRoomCanvas {
    roomId: ID!
    title: String!
    content: String!
    contentJson: String
    updatedAt: DateTime!
    lastEditedBy: ID
  }

  type RoomSharedDocument {
    id: ID!
    roomId: ID!
    documentId: ID!
    subjectId: String!
    title: String!
    role: String!
    icon: String
    cover: String
    sharedBy: ID!
    sharedAt: DateTime!
    ownerUserId: ID!
    updatedAt: DateTime!
  }

  extend type Query {
    rooms: [StudyRoom!]!
    publicRooms: [StudyRoom!]!
    room(id: ID!): StudyRoom
    roomMembers(roomId: ID!): [StudyRoomMember!]!
    roomMessages(roomId: ID!, limit: Int = 100): [StudyRoomMessage!]!
    roomCanvas(roomId: ID!): StudyRoomCanvas
    roomDocuments(roomId: ID!): [RoomSharedDocument!]!
  }

  extend type Mutation {
    createRoom(input: JSON!): StudyRoom!
    joinRoom(joinCode: String!): StudyRoom!
    leaveRoom(roomId: ID!): DeleteResult!
    updateRoomTimer(roomId: ID!, state: String!, durationSeconds: Int, elapsedSeconds: Int): StudyRoom!
    shareDocumentToRoom(roomId: ID!, documentId: ID!, subjectId: String!): RoomSharedDocument!
    sendRoomMessage(roomId: ID!, content: String!, messageType: String = "chat"): StudyRoomMessage!
  }

  extend type Subscription {
    roomMessagesStream(roomId: ID!): StudyRoomMessage!
    roomPresenceStream(roomId: ID!): StudyRoomMember!
    roomTimerStream(roomId: ID!): StudyRoom!
  }
`;
