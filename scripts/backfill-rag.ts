import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { generateEmbedding } from '@/lib/rag/embedder';

/**
 * Backfills `entity_embeddings` for existing workspace data: flashcards
 * (grouped per set), quizzes, calendar events, subjects (notes), memory
 * fragments, and documents (via their own documents.embedding column).
 *
 * Run after applying the entity-RAG migration:
 *   npm run build --prefix vendor/analogix-shared
 *   npx tsx scripts/backfill-rag.ts
 */
async function backfillRag() {
  const supabase = createServiceRoleClient();
  const BATCH_SIZE = 10;

  // ── Flashcards (per set) ───────────────────────────────────────────
  console.log('Backfilling flashcards...');
  {
    const { data: sets, error } = await supabase
      .from('flashcard_sets')
      .select('id, user_id, subject_id, name');
    if (error) throw new Error(`flashcard_sets: ${error.message}`);

    for (const set of (sets ?? []) as any[]) {
      const { data: cards, error: cardsError } = await supabase
        .from('flashcards')
        .select('front, back')
        .eq('set_id', set.id);
      if (cardsError) throw new Error(`flashcards: ${cardsError.message}`);

      const cardText = (cards ?? [] as any[])
        .map((c: any) => `Q: ${c.front}\nA: ${c.back}`)
        .join('\n\n');
      const content = [set.name, cardText].filter(Boolean).join('\n');
      if (!content) continue;

      try {
        const embedding = await generateEmbedding(content.slice(0, 8000));
        const { error: upError } = await supabase
          .from('entity_embeddings')
          .upsert({
            owner_user_id: set.user_id,
            entity_type: 'flashcard',
            entity_id: set.id,
            subject_id: set.subject_id,
            content: content.slice(0, 8000),
            metadata: { title: set.name || 'Flashcard Set' },
            embedding: `[${embedding.join(',')}]`,
          }, { onConflict: 'entity_type,entity_id,owner_user_id' });
        if (upError) console.error(`  Flashcard set ${set.id}: ${upError.message}`);
      } catch (err) {
        console.error(`  Flashcard set ${set.id} embedding failed:`, err);
      }
    }
    console.log(`  Done (${(sets ?? []).length} sets)`);
  }

  // ── Quizzes ────────────────────────────────────────────────────────
  console.log('Backfilling quizzes...');
  {
    const { data: quizzes, error } = await supabase.from('quizzes').select('*');
    if (error) throw new Error(`quizzes: ${error.message}`);

    for (const quiz of (quizzes ?? []) as any[]) {
      const questions = typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : (quiz.questions ?? []);
      const questionText = (questions as any[])
        .map((q: any) => `Q: ${q.question ?? ''}\nA: ${q.correctAnswer ?? q.correct_answer ?? ''}`)
        .join('\n\n');
      const content = [quiz.title, questionText].filter(Boolean).join('\n');
      if (!content) continue;

      try {
        const embedding = await generateEmbedding(content.slice(0, 8000));
        const { error: upError } = await supabase
          .from('entity_embeddings')
          .upsert({
            owner_user_id: quiz.user_id,
            entity_type: 'quiz',
            entity_id: quiz.id,
            subject_id: quiz.subject_id,
            content: content.slice(0, 8000),
            metadata: { title: quiz.title || 'Quiz', difficulty: quiz.difficulty },
            embedding: `[${embedding.join(',')}]`,
          }, { onConflict: 'entity_type,entity_id,owner_user_id' });
        if (upError) console.error(`  Quiz ${quiz.id}: ${upError.message}`);
      } catch (err) {
        console.error(`  Quiz ${quiz.id} embedding failed:`, err);
      }
    }
    console.log(`  Done (${(quizzes ?? []).length} quizzes)`);
  }

  // ── Calendar events ────────────────────────────────────────────────
  console.log('Backfilling calendar events...');
  {
    const { data: events, error } = await supabase.from('events').select('*');
    if (error) throw new Error(`events: ${error.message}`);

    for (const event of (events ?? []) as any[]) {
      const content = [event.title, event.description].filter(Boolean).join('\n');
      if (!content) continue;

      try {
        const embedding = await generateEmbedding(content.slice(0, 8000));
        const { error: upError } = await supabase
          .from('entity_embeddings')
          .upsert({
            owner_user_id: event.user_id,
            entity_type: 'calendar',
            entity_id: event.id,
            subject_id: event.subject,
            content: content.slice(0, 8000),
            metadata: { title: event.title || 'Event' },
            embedding: `[${embedding.join(',')}]`,
          }, { onConflict: 'entity_type,entity_id,owner_user_id' });
        if (upError) console.error(`  Event ${event.id}: ${upError.message}`);
      } catch (err) {
        console.error(`  Event ${event.id} embedding failed:`, err);
      }
    }
    console.log(`  Done (${(events ?? []).length} events)`);
  }

  // ── Subjects (notes content) ───────────────────────────────────────
  console.log('Backfilling subjects...');
  {
    const { data: subjectData, error } = await supabase.from('subject_data').select('*');
    if (error) throw new Error(`subject_data: ${error.message}`);

    for (const row of (subjectData ?? []) as any[]) {
      let notes: { title?: string; content?: string } | null = null;
      try {
        const parsed = typeof row.notes === 'string' ? JSON.parse(row.notes) : (row.notes ?? null);
        if (parsed && typeof parsed === 'object') notes = parsed;
      } catch { notes = null; }

      const title = notes?.title || row.subject_id;
      const content = [title, notes?.content].filter(Boolean).join('\n').trim();
      if (!content) continue;

      try {
        const embedding = await generateEmbedding(content.slice(0, 8000));
        const { error: upError } = await supabase
          .from('entity_embeddings')
          .upsert({
            owner_user_id: row.user_id,
            entity_type: 'subject',
            entity_id: row.subject_id,
            subject_id: row.subject_id,
            content: content.slice(0, 8000),
            metadata: { title },
            embedding: `[${embedding.join(',')}]`,
          }, { onConflict: 'entity_type,entity_id,owner_user_id' });
        if (upError) console.error(`  Subject ${row.subject_id}: ${upError.message}`);
      } catch (err) {
        console.error(`  Subject ${row.subject_id} embedding failed:`, err);
      }
    }
    console.log(`  Done (${(subjectData ?? []).length} subjects)`);
  }

  // ── Memory fragments ───────────────────────────────────────────────
  console.log('Backfilling memory...');
  {
    const { data: memories, error } = await supabase
      .from('ai_memory_fragments')
      .select('id, user_id, subject_id, content, memory_type');
    if (error) throw new Error(`ai_memory_fragments: ${error.message}`);

    for (const memory of (memories ?? []) as any[]) {
      if (!memory.content) continue;
      try {
        const embedding = await generateEmbedding(memory.content.slice(0, 8000));
        const { error: upError } = await supabase
          .from('entity_embeddings')
          .upsert({
            owner_user_id: memory.user_id,
            entity_type: 'memory',
            entity_id: memory.id,
            subject_id: memory.subject_id,
            content: memory.content.slice(0, 8000),
            metadata: { title: memory.memory_type || 'fact', memory_type: memory.memory_type || 'fact' },
            embedding: `[${embedding.join(',')}]`,
          }, { onConflict: 'entity_type,entity_id,owner_user_id' });
        if (upError) console.error(`  Memory ${memory.id}: ${upError.message}`);
      } catch (err) {
        console.error(`  Memory ${memory.id} embedding failed:`, err);
      }
    }
    console.log(`  Done (${(memories ?? []).length} memories)`);
  }

  // ── Documents (their own embedding column) ─────────────────────────
  console.log('Backfilling documents...');
  {
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, owner_user_id, title, content')
      .is('embedding', null);
    if (error) throw new Error(`documents: ${error.message}`);

    let updated = 0;
    for (let i = 0; i < (docs ?? []).length; i += BATCH_SIZE) {
      const batch = (docs ?? []).slice(i, i + BATCH_SIZE);
      for (const doc of batch as any[]) {
        const content = [doc.title || '', doc.content || ''].filter(Boolean).join('\n').trim();
        if (!content) { updated++; continue; }
        try {
          const embedding = await generateEmbedding(content.slice(0, 8000));
          const { error: upError } = await supabase
            .from('documents')
            .update({ embedding: `[${embedding.join(',')}]`, updated_at: new Date().toISOString() })
            .eq('id', doc.id)
            .eq('owner_user_id', doc.owner_user_id);
          if (upError) console.error(`  Doc ${doc.id}: ${upError.message}`);
          else updated++;
        } catch (err) {
          console.error(`  Doc ${doc.id} embedding failed:`, err);
        }
      }
    }
    console.log(`  Done (${(docs ?? []).length} docs, ${updated} updated)`);
  }

  console.log('\nBackfill complete!');
}

backfillRag()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });