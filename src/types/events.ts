export type RepeatRule = 'none' | 'daily' | 'weekly' | 'fortnightly' | 'monthly';

export interface AppEvent {
  id: string;
  title: string;
  date: Date;
  type: 'exam' | 'assignment' | 'event';
  subject?: string;
  description?: string;
  source: 'manual' | 'import';
  repeat?: RepeatRule;
  repeatEnd?: string; // ISO date string — last date to generate occurrences
}

export type EventType = AppEvent['type'];
