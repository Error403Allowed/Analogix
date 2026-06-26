import { NextResponse } from 'next/server';
import { createCurriculumRetriever } from '@/lib/retrieval/curriculum';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'Pythagoras theorem';
  const subject = searchParams.get('subject') || undefined;
  const grade = searchParams.get('grade') || undefined;

  try {
    const retriever = createCurriculumRetriever();
    const results = await retriever.retrieve(query, { subject, grade }, 10);

    return NextResponse.json({
      query,
      filters: { subject, grade },
      resultCount: results.length,
      results: results.map(r => ({
        content: r.content,
        subject: r.subject,
        grade: r.grade,
        topic: r.topic,
        acaraCode: r.acaraCode,
        score: r.score,
      })),
      formattedContext: retriever.formatContext(results),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
