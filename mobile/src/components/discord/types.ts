import type { ReactNode } from "react";

export type StatusType = "online" | "idle" | "dnd" | "offline";

export interface DiscordHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  channelPrefix?: boolean;
}

export interface DiscordCardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: any;
  padding?: number;
}

export interface DiscordListItemProps {
  icon?: string;
  iconColor?: string;
  avatar?: { uri?: string; fallback: string };
  title: string;
  subtitle?: string;
  right?: ReactNode;
  time?: string;
  onPress?: () => void;
  unread?: boolean;
  selected?: boolean;
}

export interface DiscordMessageProps {
  avatar?: { uri?: string; fallback: string };
  name: string;
  nameColor?: string;
  timestamp: string;
  text: string;
  streaming?: boolean;
}

export interface DiscordInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  disabled?: boolean;
  loading?: boolean;
  left?: ReactNode;
  multiline?: boolean;
  maxLength?: number;
}

export interface DiscordAvatarProps {
  uri?: string;
  fallback: string;
  size?: number;
  status?: StatusType;
}

export interface DiscordSectionProps {
  title: string;
}

export interface DiscordPillProps {
  icon: string;
  color: string;
  active?: boolean;
  onPress?: () => void;
  size?: number;
  label?: string;
}

export interface DiscordStatusDotProps {
  status: StatusType;
  size?: number;
}

export interface DiscordChannelItemProps {
  name: string;
  type?: "text" | "voice";
  unread?: boolean;
  active?: boolean;
  onPress?: () => void;
  mentionCount?: number;
}
