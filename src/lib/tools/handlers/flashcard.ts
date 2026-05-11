import { createToolsClient } from '@/lib/supabase/tools-client';

export interface FlashcardCard {
  front: string;
  back: string;
}

export interface CreateFlashcardsParams {
  subjectId: string;
  setName: string;
  cards: FlashcardCard[];
}

export interface FlashcardSet {
  id: string;
  subject_id: string;
  title: string;
  cards: FlashcardCard[];
  created_at: string;
}

export async function createFlashcardSet(
  userId: string,
  params: CreateFlashcardsParams
): Promise<{ success: boolean; setId?: string; error?: string }> {
  const supabase = createToolsClient();

  try {
    const now = new Date().toISOString();
    const cardDocs = params.cards.map((card, idx) => ({
      id: `card_${Date.now()}_${idx}`,
      owner_user_id: userId,
      subject_id: params.subjectId,
      title: params.setName,
      content: JSON.stringify(card),
      role: 'flashcard',
      created_at: now,
      updated_at: now,
      last_edited_by: userId,
    }));

    const { error } = await supabase.from('documents').insert(cardDocs as any);

    if (error) {
      console.error('[createFlashcardSet] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, setId: cardDocs[0].id };
  } catch (err) {
    console.error('[createFlashcardSet] Exception:', err);
    return { success: false, error: 'Failed to create flashcard set' };
  }
}

export async function getFlashcardSets(
  userId: string,
  subjectId?: string,
  limit = 10
): Promise<FlashcardSet[]> {
  const supabase = createToolsClient();

  let query = supabase
    .from('documents')
    .select('id, subject_id, title, created_at')
    .eq('owner_user_id', userId)
    .eq('role', 'flashcard')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('[getFlashcardSets] Error:', error);
    return [];
  }

  return data.map((doc: any) => ({
    id: doc.id,
    subject_id: doc.subject_id,
    title: doc.title || 'Flashcard Set',
    cards: [],
    created_at: doc.created_at,
  }));
}

export async function getFlashcardContent(
  setId: string,
  userId: string
): Promise<FlashcardCard[]> {
  const supabase = createToolsClient();

  const { data, error } = await supabase
    .from('documents')
    .select('content')
    .eq('id', setId)
    .eq('owner_user_id', userId)
    .single() as { data: { content: string } | null; error: unknown };

  if (error || !data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data.content);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}