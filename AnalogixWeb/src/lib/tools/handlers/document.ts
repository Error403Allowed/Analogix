import { createToolsClient } from '@/lib/supabase/tools-client';
import type { DocumentContext } from '@/types/workspace';

export interface GetDocumentsParams {
  subjectId?: string;
  type?: 'document' | 'study_guide' | 'all';
  limit?: number;
}

export async function getDocuments(
  userId: string,
  params: GetDocumentsParams
): Promise<DocumentContext[]> {
  const supabase = createToolsClient();
  const { subjectId, type = 'all', limit = 20 } = params;

  let roles: string[];
  if (type === 'document') roles = ['document'];
  else if (type === 'study_guide') roles = ['study_guide'];
  else roles = ['document', 'study_guide'];

  let query = supabase
    .from('documents')
    .select('id, subject_id, title, content, role, created_at, updated_at')
    .eq('owner_user_id', userId)
    .in('role', roles)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('[getDocuments] Error:', error);
    return [];
  }

  interface DocRow {
    id: string;
    subject_id: string;
    title?: string;
    content?: string;
    role?: string;
    updated_at: string;
  }

  const stripHtml = (html: string) =>
    html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';

  return data.map((doc: DocRow) => ({
    id: doc.id,
    subject_id: doc.subject_id,
    title: doc.title || 'Untitled',
    type: doc.role || 'document',
    preview: stripHtml(doc.content || '').slice(0, 200),
    updated_at: doc.updated_at,
  }));
}

export async function searchWorkspace(
  userId: string,
  query: string,
  options?: { subjectId?: string; type?: string }
): Promise<DocumentContext[]> {
  const supabase = createToolsClient();

  let dbQuery = supabase
    .from('documents')
    .select('id, subject_id, title, content, role, created_at, updated_at')
    .eq('owner_user_id', userId)
    .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
    .order('updated_at', { ascending: false })
    .limit(20);

  if (options?.subjectId) {
    dbQuery = dbQuery.eq('subject_id', options.subjectId);
  }

  const { data, error } = await dbQuery;

  if (error || !data) {
    console.error('[searchWorkspace] Error:', error);
    return [];
  }

  const stripHtml = (html: string) =>
    html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';

  return data.map((doc: any) => ({
    id: doc.id,
    subject_id: doc.subject_id,
    title: doc.title || 'Untitled',
    type: doc.role || 'document',
    preview: stripHtml(doc.content || '').slice(0, 200),
    updated_at: doc.updated_at,
  }));
}