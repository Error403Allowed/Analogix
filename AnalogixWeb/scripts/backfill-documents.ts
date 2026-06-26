import { createToolsClient } from '@/lib/supabase/tools-client';
import { generateEmbedding } from '@/lib/rag/embedder';

async function backfillDocumentEmbeddings() {
  console.log('Starting document embedding backfill...');

  const supabase = createToolsClient();

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, content')
    .is('embedding', null);

  if (error) {
    console.error('Error fetching documents:', error);
    process.exit(1);
  }

  if (!docs || docs.length === 0) {
    console.log('No documents need embedding backfill.');
    process.exit(0);
  }

  console.log(`Found ${docs.length} documents without embeddings`);

  const BATCH_SIZE = 10;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(docs.length / BATCH_SIZE);

    try {
      for (const doc of batch) {
        const text = `${doc.title || ''} ${doc.content || ''}`.trim();
        if (!text) {
          errors++;
          continue;
        }

        const embedding = await generateEmbedding(text);
        const embeddingStr = `[${embedding.join(',')}]`;

        const { error: updateError } = await supabase
          .from('documents')
          .update({ embedding: embeddingStr })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`  Error updating doc ${doc.id}:`, updateError.message);
          errors++;
        } else {
          updated++;
        }
      }
    } catch (err) {
      console.error(`  Batch ${batchNum}/${totalBatches} failed:`, err);
      errors += batch.length;
    }

    console.log(`  Batch ${batchNum}/${totalBatches}: ${updated} updated, ${errors} errors`);
  }

  console.log(`\nBackfill complete!`);
  console.log(`  Total: ${docs.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
}

backfillDocumentEmbeddings()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
