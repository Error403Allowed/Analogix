import { createToolsClient } from '@/lib/supabase/tools-client';
import type { FlashcardSetContext, QuizContext, CalendarEventContext, DocumentContext } from '@/types/workspace';

export interface MetadataFilterOptions {
  subjectId?: string;
  topic?: string;
  tags?: string[];
  entityTypes: string[];
  limit?: number;
  offset?: number;
}

export interface MetadataFilterResult {
  documents: DocumentContext[];
  flashcards: FlashcardSetContext[];
  quizzes: QuizContext[];
  calendarEvents: CalendarEventContext[];
  formulas: DocumentContext[];
  resources: DocumentContext[];
}

export async function filterByMetadata(
  userId: string,
  options: MetadataFilterOptions
): Promise<MetadataFilterResult> {
  const { subjectId, topic, tags, entityTypes, limit = 20, offset = 0 } = options;

  const results: MetadataFilterResult = {
    documents: [],
    flashcards: [],
    quizzes: [],
    calendarEvents: [],
    formulas: [],
    resources: [],
  };

  const supabase = createToolsClient();

  interface DocumentRow {
    id: string;
    subject_id: string;
    title: string;
    content?: string;
    role?: string;
    created_at: string;
    updated_at?: string;
  }

  interface EventRow {
    id: string;
    title: string;
    date: string;
    end_date?: string;
    type?: string;
    subject?: string;
  }

  const promises: Promise<void>[] = [];

  if (entityTypes.includes('document') || entityTypes.includes('study_guide')) {
    promises.push(
      (async () => {
        const { data } = await supabase
          .from('documents')
          .select('id, subject_id, title, content, role, created_at, updated_at')
          .eq('owner_user_id', userId) as { data: DocumentRow[] | null };
        let filtered = data || [];
        if (subjectId) filtered = filtered.filter((d) => d.subject_id === subjectId);
        if (topic) filtered = filtered.filter((d) => d.content?.includes(topic));
        results.documents = filtered.map(d => ({
          id: d.id,
          subject_id: d.subject_id,
          title: d.title || 'Untitled',
          type: d.role || 'document',
          preview: d.content?.substring(0, 200) || '',
          updated_at: d.updated_at || new Date().toISOString(),
        })).slice(offset, offset + limit);
      })()
    );
  }

  if (entityTypes.includes('flashcard_set')) {
    promises.push(
      (async () => {
        const { data } = await supabase
          .from('documents')
          .select('id, subject_id, title, created_at')
          .eq('owner_user_id', userId)
          .eq('role', 'flashcard') as { data: DocumentRow[] | null };
        let filtered = data || [];
        if (subjectId) filtered = filtered.filter((d) => d.subject_id === subjectId);
        results.flashcards = filtered.map((d) => ({
          id: d.id,
          subject_id: d.subject_id,
          title: d.title || 'Flashcard Set',
          card_count: 0,
          due_count: 0,
        }));
      })()
    );
  }

  if (entityTypes.includes('quiz')) {
    promises.push(
      (async () => {
        const { data } = await supabase
          .from('documents')
          .select('id, subject_id, title, created_at')
          .eq('owner_user_id', userId)
          .eq('role', 'quiz') as { data: DocumentRow[] | null };
        let filtered = data || [];
        if (subjectId) filtered = filtered.filter((d) => d.subject_id === subjectId);
        results.quizzes = filtered.map((d) => ({
          id: d.id,
          subject_id: d.subject_id,
          title: d.title || 'Quiz',
          question_count: 0,
          difficulty: 'intermediate' as const,
        }));
      })()
    );
  }

  if (entityTypes.includes('calendar_event')) {
    promises.push(
      (async () => {
        const { data } = await supabase
          .from('events')
          .select('id, title, date, end_date, type, subject')
          .eq('user_id', userId) as { data: EventRow[] | null };
        let filtered = data || [];
        if (subjectId) filtered = filtered.filter((e) => e.subject === subjectId);
        results.calendarEvents = filtered.map((e) => ({
          id: e.id,
          title: e.title,
          start_date: e.date,
          end_date: e.end_date,
          type: e.type || 'event',
          subject: e.subject,
        }));
      })()
    );
  }

  if (entityTypes.includes('formula')) {
    promises.push(
      (async () => {
        const { data } = await supabase
          .from('documents')
          .select('id, subject_id, title, content, role, created_at, updated_at')
          .eq('owner_user_id', userId)
          .eq('role', 'formula') as { data: DocumentRow[] | null };
        let filtered = data || [];
        if (subjectId) filtered = filtered.filter((d) => d.subject_id === subjectId);
        results.formulas = filtered.map(d => ({
          id: d.id,
          subject_id: d.subject_id,
          title: d.title || 'Formula',
          type: 'formula',
          preview: d.content?.substring(0, 200) || '',
          updated_at: d.updated_at || new Date().toISOString(),
        }));
      })()
    );
  }

  await Promise.all(promises);

  return results;
}

export async function getSubjects(userId: string): Promise<{ id: string; name: string }[]> {
  const supabase = createToolsClient();

  const { data: subjectData, error } = await supabase
    .from('subject_data')
    .select('subject_id')
    .eq('user_id', userId);

  if (error || !subjectData) {
    const defaultSubjects = [
      { id: 'maths', name: 'Mathematics' },
      { id: 'english', name: 'English' },
      { id: 'science', name: 'Science' },
      { id: 'history', name: 'History' },
      { id: 'geography', name: 'Geography' },
    ];
    return defaultSubjects;
  }

  interface SubjectDataRow {
    subject_id: string;
  }

  return subjectData.map((s: SubjectDataRow) => ({
    id: s.subject_id,
    name: s.subject_id.charAt(0).toUpperCase() + s.subject_id.slice(1),
  }));
}