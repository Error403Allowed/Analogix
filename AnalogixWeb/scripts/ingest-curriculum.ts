import { createToolsClient } from '@/lib/supabase/tools-client';
import { CURRICULUM_DATA } from '@analogix/shared/curriculum';
import { chunkCurriculum } from '@analogix/shared/curriculum';
import { generateEmbeddings } from '@/lib/rag/embedder';
import type { ChunkedCurriculumEntry } from '@analogix/shared/curriculum';

async function ingestCurriculum() {
  console.log('Starting curriculum ingestion...');

  const chunks = chunkCurriculum(CURRICULUM_DATA);
  console.log(`Generated ${chunks.length} curriculum chunks`);

  const supabase = createToolsClient();

  const BATCH_SIZE = 10;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

    try {
      const texts = batch.map((c: ChunkedCurriculumEntry) => c.content);
      const embeddings = await generateEmbeddings(texts);

      const rows = batch.map((chunk: ChunkedCurriculumEntry, idx: number) => {
        const embeddingStr = embeddings[idx] ? `[${embeddings[idx].join(',')}]` : null;
        return {
          content: chunk.content,
          embedding: embeddingStr,
          subject: chunk.subject,
          grade: chunk.grade,
          strand: chunk.strand,
          topic: chunk.topic,
          acara_code: chunk.acaraCode,
          state: chunk.state,
          key_terms: chunk.keyTerms,
          chunk_type: chunk.chunkType,
        };
      });

      for (const row of rows) {
        const { error } = await (supabase.from('curriculum_chunks') as any).insert(row);

        if (error) {
          console.error(`  Error inserting chunk:`, error.message);
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

  console.log(`\nIngestion complete!`);
  console.log(`  Total chunks: ${chunks.length}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);
}

ingestCurriculum()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
