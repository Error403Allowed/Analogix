export interface AppEvent {
  id: string;
  title: string;
  date: Date;
  type: 'exam' | 'assignment' | 'event';
  subject?: string;
  description?: string;
  source: 'manual' | 'import';
}

export type EventType = AppEvent['type'];
