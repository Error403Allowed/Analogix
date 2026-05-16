export type RoomVisibility = "public" | "private";
export type RoomMemberRole = "host" | "cohost" | "member";
export type RoomMessageType = "chat" | "ai" | "system";
export type RoomTimerState = "idle" | "running" | "paused";

export interface StudyRoom {
  id: string;
  title: string;
  topic: string | null;
  visibility: RoomVisibility;
  joinCode: string;
  ownerUserId: string;
  memberCount: number;
  timerState: RoomTimerState;
  timerDurationSeconds: number;
  timerElapsedSeconds: number;
  timerStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewerRole?: RoomMemberRole | null;
  isOwner?: boolean;
}

export interface StudyRoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: RoomMemberRole;
  joinedAt: string;
  lastSeen: string;
  isOnline: boolean;
  name: string;
  avatarUrl: string | null;
}

export interface StudyRoomMessage {
  id: string;
  roomId: string;
  userId: string | null;
  messageType: RoomMessageType;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  name: string;
  avatarUrl: string | null;
}

export interface StudyRoomCanvas {
  roomId: string;
  title: string;
  content: string;
  contentJson?: string | null;
  updatedAt: string;
  lastEditedBy: string | null;
}

export interface RoomSharedDocument {
  id: string;
  roomId: string;
  documentId: string;
  subjectId: string;
  title: string;
  role: "notes" | "study-guide";
  icon: string | null;
  cover: string | null;
  sharedBy: string;
  sharedAt: string;
  ownerUserId: string;
  updatedAt: string;
}

export interface RoomTimerPayload {
  timerState: RoomTimerState;
  timerDurationSeconds: number;
  timerElapsedSeconds: number;
  timerStartedAt: string | null;
}
