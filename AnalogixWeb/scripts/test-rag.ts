import { createToolsClient } from '@/lib/supabase/tools-client';
import { generateEmbedding } from '@/lib/rag/embedder';
import { createCurriculumRetriever } from '@/lib/retrieval/curriculum';

async function testRAG() {
  console.log('=== RAG Test: Curriculum Retrieval ===\n');

  const queries = [
    { q: 'Explain Pythagoras theorem', subject: 'Mathematics', grade: '9', label: 'Year 9 Maths - Pythagoras' },
    { q: 'How does photosynthesis work?', subject: 'Science', grade: '8', label: 'Year 8 Science - Photosynthesis' },
    { q: 'What are the causes of World War 2?', subject: 'History', grade: '11', label: 'Year 11 History - WW2' },
    { q: 'Solve linear equations with fractions', subject: 'Mathematics', grade: '10', label: 'Year 10 Maths - Linear Equations' },
    { q: 'What is a redox reaction?', subject: 'Chemistry', grade: '12', label: 'Year 12 Chemistry - Redox' },
  ];

  const retriever = createCurriculumRetriever();

  for (const test of queries) {
    console.log(`\n━━━ ${test.label} ━━━`);
    console.log(`Query: "${test.q}"`);
    console.log(`Filters: subject=${test.subject}, grade=${test.grade}\n`);

    const start = Date.now();
    const results = await retriever.retrieve(test.q, { subject: test.subject, grade: test.grade }, 5);
    const elapsed = Date.now() - start;

    console.log(`Retrieved ${results.length} results in ${elapsed}ms`);

    if (results.length === 0) {
      console.log('  (no results)');
      continue;
    }

    for (const r of results) {
      console.log(`  [${r.score.toFixed(3)}] ${r.subject} Yr ${r.grade} ${r.topic || r.strand} (${r.acaraCode || 'N/A'})`);
      console.log(`       ${r.content.slice(0, 120)}...`);
    }
  }

  console.log('\n━━━ Full Context Format Test ━━━\n');
  const results = await retriever.retrieve('Explain the water cycle and evaporation', { subject: 'Science', grade: '7' }, 3);
  if (results.length > 0) {
    console.log(retriever.formatContext(results));
  }

  console.log('\n=== RAG Test Complete ===');
}

testRAG()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
