export type CalendarView = "month" | "week" | "day" | "schedule";
export type TypeMeta = { color: string; label: string; icon: string };
export type BuiltinOverrides = Record<string, Partial<TypeMeta>>;

export interface CustomEventType {
  key: string;
  color: string;
  label: string;
  icon: string;
}

export type CreateInteraction = {
  kind: "create";
  pointerId: number;
  dayIndex: number;
  anchorMin: number;
  startMin: number;
  endMin: number;
  startClientX: number;
  startClientY: number;
  didDrag: boolean;
};

export type MoveInteraction = {
  kind: "move";
  pointerId: number;
  eventId: string;
  previewDayIndex: number;
  previewStartMin: number;
  durationMin: number;
  pointerOffsetMin: number;
  startClientX: number;
  startClientY: number;
  didDrag: boolean;
};

export type ResizeInteraction = {
  kind: "resize";
  pointerId: number;
  eventId: string;
  edge: "start" | "end";
  dayIndex: number;
  previewStartMin: number;
  previewEndMin: number;
  startClientX: number;
  startClientY: number;
  didDrag: boolean;
};

export type GridInteraction = CreateInteraction | MoveInteraction | ResizeInteraction;
