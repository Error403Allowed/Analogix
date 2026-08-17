import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { FORMULA_SHEET_DATA } from '@analogix/shared/formulas';
import { generateEmbeddings } from '@/lib/rag/embedder';

/**
 * Ingests the static formula corpus into `entity_embeddings` as a shared
 * (owner_user_id = NULL) index so hybrid_search can return formulas for any
 * authenticated user. Idempotent via the UNIQUE (entity_type, entity_id,
 * owner_user_id) constraint - rerun freely after formula data changes.
 */
async function ingestFormulas() {
  console.log('Starting formula ingestion...');

  const rows: Array<{
    entity_type: string;
    entity_id: string;
    subject_id: string;
    content: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const sheet of FORMULA_SHEET_DATA) {
    for (const category of sheet.categories) {
      for (const formula of category.formulas) {
        const content = [
          `${sheet.subjectName} - ${category.name}: ${formula.name}`,
          formula.description ? `Description: ${formula.description}` : '',
          formula.latex ? `Formula: ${formula.latex}` : '',
        ].filter(Boolean).join('\n');

        rows.push({
          entity_type: 'formula',
          entity_id: formula.id || `${sheet.subjectId}-${category.name}-${formula.name}`,
          subject_id: sheet.subjectId,
          content,
          metadata: {
            title: formula.name,
            subject_name: sheet.subjectName,
            category: category.name,
          },
        });
      }
    }
  }

  console.log(`Prepared ${rows.length} formula rows`);

  const supabase = createServiceRoleClient();

  // Clear previous shared formula rows (safe: owner NULL = shared corpus only).
  const { error: clearError } = await supabase
    .from('entity_embeddings')
    .delete()
    .eq('entity_type', 'formula')
    .is('owner_user_id', null);
  if (clearError) {
    console.error('Failed to clear existing shared formulas:', clearError.message);
    process.exit(1);
  }
  console.log('Cleared previous shared formula rows');

  const BATCH_SIZE = 10;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    try {
      const texts = batch.map(r => r.content);
      const embeddings = await generateEmbeddings(texts);

      const dbRows = batch.map((r, idx) => {
        const embeddingStr = embeddings[idx] ? `[${embeddings[idx].join(',')}]` : null;
        return {
          owner_user_id: null,
          entity_type: r.entity_type,
          entity_id: r.entity_id,
          subject_id: r.subject_id,
          content: r.content,
          metadata: r.metadata,
          embedding: embeddingStr,
        };
      });

      for (const dbRow of dbRows) {
        const { error } = await (supabase.from('entity_embeddings') as any)
          .upsert(dbRow, { onConflict: 'entity_type,entity_id,owner_user_id' });
        if (error) {
          console.error(`  Error inserting row:`, error.message);
          errors++;
        } else {
          inserted++;
        }
      }
    } catch (err) {
      console.error(`  Batch ${batchNum}/${totalBatches} failed:`, err);
      errors += batch.length;
    }

    if (totalBatches > 1) {
      console.log(`  Batch ${batchNum}/${totalBatches} complete (${inserted} inserted, ${errors} errors)`);
    }
  }

  console.log('\nFormula ingestion complete!');
  console.log(`  Total rows: ${rows.length}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);
}

ingestFormulas()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });