import { createToolsClient } from '@/lib/supabase/tools-client';

interface EventRow {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  type?: string;
  subject?: string;
  description?: string;
}

interface DeadlineRow {
  id: string;
  title: string;
  due_date: string;
  subject?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  type: string;
  subject?: string;
  description?: string;
}

interface EventInsertParams {
  user_id: string;
  title: string;
  date: string;
  end_date?: string;
  type: string;
  subject?: string;
  description?: string;
  source: string;
}

export interface CreateEventParams {
  title: string;
  date: string;
  endDate?: string;
  type: string;
  subject?: string;
  description?: string;
}

export async function getUpcomingEvents(
  userId: string,
  days = 7,
  subjectId?: string
): Promise<CalendarEvent[]> {
  const supabase = createToolsClient();

  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  let query = supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('date', now.toISOString())
    .lte('date', future.toISOString())
    .order('date', { ascending: true });

  if (subjectId) {
    query = query.eq('subject', subjectId);
  }

  const { data: events, error } = await query;

  if (error || !events) {
    console.error('[getUpcomingEvents] Error:', error);
    return [];
  }

  const { data: deadlines } = await supabase
    .from('deadlines')
    .select('*')
    .eq('user_id', userId)
    .gte('due_date', now.toISOString())
    .lte('due_date', future.toISOString())
    .order('due_date', { ascending: true });

  const deadlineEvents: CalendarEvent[] = (deadlines || []).map((d: DeadlineRow) => ({
    id: d.id,
    title: d.title,
    start_date: d.due_date,
    type: 'deadline',
    subject: d.subject,
  }));

  const eventObjects: CalendarEvent[] = (events || []).map((e: EventRow) => ({
    id: e.id,
    title: e.title,
    start_date: e.date,
    end_date: e.end_date,
    type: e.type || 'event',
    subject: e.subject,
    description: e.description,
  }));

  const allEvents = [...eventObjects, ...deadlineEvents].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  return allEvents.slice(0, 20);
}

export async function createCalendarEvent(
  userId: string,
  params: CreateEventParams
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const supabase = createToolsClient();

  try {
    const insertData: EventInsertParams = {
      user_id: userId,
      title: params.title,
      date: params.date,
      end_date: params.endDate,
      type: params.type,
      subject: params.subject,
      description: params.description,
      source: 'ai',
    };

    const { data, error } = await supabase
      .from('events')
      .insert(insertData as any)
      .select('id')
      .single() as { data: { id: string } | null; error: unknown };

    if (error) {
      console.error('[createCalendarEvent] Error:', error);
      return { success: false, error: (error as Error).message };
    }

    return { success: true, eventId: data?.id };
  } catch (err) {
    console.error('[createCalendarEvent] Exception:', err);
    return { success: false, error: 'Failed to create event' };
  }
}

export async function getSubjects(userId: string): Promise<{ id: string; name: string }[]> {
  const supabase = createToolsClient();

  const { data: subjectData, error } = await supabase
    .from('subject_data')
    .select('subject_id')
    .eq('user_id', userId) as { data: Array<{ subject_id: string }> | null; error: unknown };

  if (error || !subjectData || subjectData.length === 0) {
    return [
      { id: 'maths', name: 'Mathematics' },
      { id: 'english', name: 'English' },
      { id: 'science', name: 'Science' },
      { id: 'history', name: 'History' },
      { id: 'geography', name: 'Geography' },
    ];
  }

  return subjectData.map((s) => ({
    id: s.subject_id,
    name: s.subject_id.charAt(0).toUpperCase() + s.subject_id.slice(1),
  }));
}