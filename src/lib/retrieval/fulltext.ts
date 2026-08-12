import { createToolsClient } from '@/lib/supabase/tools-client';
import type { DocumentContext } from '@/types/workspace';

export interface FullTextSearchOptions {
  query: string;
  subjectId?: string;
  entityTypes?: string[];
  limit?: number;
  offset?: number;
}

export interface FullTextSearchResult {
  entity_type: string;
  entity_id: string;
  title: string;
  preview: string;
  subject_id?: string;
  relevance_score: number;
}

export async function fullTextSearch(
  userId: string,
  options: FullTextSearchOptions
): Promise<FullTextSearchResult[]> {
  const supabase = createToolsClient();
  const { query, subjectId, entityTypes, limit = 20, offset = 0 } = options;

  let dbQuery = supabase
    .from('documents')
    .select('id, subject_id, title, content, role, created_at, updated_at')
    .eq('owner_user_id', userId)
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english',
    });

  if (subjectId) {
    dbQuery = dbQuery.eq('subject_id', subjectId);
  }

  if (entityTypes && entityTypes.length > 0) {
    dbQuery = dbQuery.in('role', entityTypes);
  }

  const { data, error } = await dbQuery
    .range(offset, offset + limit - 1)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[fullTextSearch] Error:', error);
    return [];
  }

  interface DocRow {
    id: string;
    role?: string;
    title?: string;
    content?: string;
    subject_id?: string;
  }

  return (data || []).map((doc: DocRow) => ({
    entity_type: doc.role || 'document',
    entity_id: doc.id,
    title: doc.title || 'Untitled',
    preview: extractPreview(doc.content || null),
    subject_id: doc.subject_id,
    relevance_score: 1,
  }));
}

function extractPreview(content: string | null): string {
  if (!content) return '';
  const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.length > 200 ? stripped.slice(0, 200) + '...' : stripped;
}

export async function searchDocumentsByTitle(
  userId: string,
  titleQuery: string,
  subjectId?: string
): Promise<DocumentContext[]> {
  const supabase = createToolsClient();

  let dbQuery = supabase
    .from('documents')
    .select('id, subject_id, title, content, role, created_at, updated_at')
    .eq('owner_user_id', userId)
    .ilike('title', `%${titleQuery}%`)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (subjectId) {
    dbQuery = dbQuery.eq('subject_id', subjectId);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('[searchDocumentsByTitle] Error:', error);
    return [];
  }

  interface DocRow {
    id: string;
    subject_id?: string;
    title?: string;
    content?: string | null;
    role?: string;
    updated_at?: string;
  }

  return (data || []).map((doc: DocRow) => ({
    id: doc.id,
    subject_id: doc.subject_id || '',
    title: doc.title || 'Untitled',
    type: doc.role || 'document',
    preview: extractPreview(doc.content || null),
    updated_at: doc.updated_at || new Date().toISOString(),
  }));
}