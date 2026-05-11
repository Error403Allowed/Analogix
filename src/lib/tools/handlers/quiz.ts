import { createToolsClient } from '@/lib/supabase/tools-client';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface StartQuizParams {
  subjectId: string;
  topic?: string;
  difficulty: 'foundational' | 'intermediate' | 'advanced';
  numberOfQuestions: number;
  timeLimitMinutes: number;
}

export interface QuizPerformance {
  id: string;
  quiz_id: string;
  subject_id: string;
  topic?: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
}

export async function getQuizPerformance(
  userId: string,
  subjectId?: string,
  limit = 10
): Promise<QuizPerformance[]> {
  const supabase = createToolsClient();

  let query = supabase
    .from('quiz_performance')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('[getQuizPerformance] Error:', error);
    return [];
  }

  return data;
}

export async function getWeakAreas(
  userId: string,
  subjectId?: string
): Promise<{ subjectId: string; topic: string; averageScore: number; quizCount: number }[]> {
  const supabase = createToolsClient();

  let query = supabase
    .from('quiz_performance')
    .select('subject_id, topic, score')
    .eq('user_id', userId);

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query as { data: Array<{ subject_id: string; topic: string | null; score: number }> | null; error: unknown };

  if (error || !data) {
    return [];
  }

  const topicScores = new Map<string, { total: number; count: number }>();

  for (const result of data) {
    const key = result.topic || result.subject_id;
    const existing = topicScores.get(key) || { total: 0, count: 0 };
    existing.total += result.score;
    existing.count += 1;
    topicScores.set(key, existing);
  }

  const weakAreas: { subjectId: string; topic: string; averageScore: number; quizCount: number }[] = [];

  for (const [key, value] of topicScores) {
    const averageScore = value.total / value.count;
    if (averageScore < 70 && value.count >= 2) {
      const [subj, ...topicParts] = key.split(':');
      weakAreas.push({
        subjectId: subj || key,
        topic: topicParts.join(':') || key,
        averageScore: Math.round(averageScore),
        quizCount: value.count,
      });
    }
  }

  return weakAreas.sort((a, b) => a.averageScore - b.averageScore);
}