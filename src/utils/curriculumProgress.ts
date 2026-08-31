import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "./authCache";
import { flashcardStore } from "./flashcardStore";

export type TopicStatus = "not-started" | "in-progress" | "covered";

export interface TopicProgress {
  status: TopicStatus;
  setCount: number;
  quizCount: number;
}

/**
 * Derives per-topic progress from data that already exists (flashcard_sets/
 * quizzes tagged with topic_id, plus the SM-2 spaced-repetition stats already
 * tracked per card) rather than introducing a new tracking system.
 *
 * v1 scope: mastery is computed from tagged flashcard sets only. Quizzes are
 * tagged (topic_id exists on the quizzes table) but not yet factored into the
 * status calculation - once quiz generation is wired to topics, quiz
 * accuracy should be folded in here too.
 */
export async function getSubjectTopicProgress(
  subjectId: string,
): Promise<Record<string, TopicProgress>> {
  const user = await getAuthUser();
  if (!user) return {};

  const supabase = createClient();

  const [{ data: sets }, { data: quizzes }] = await Promise.all([
    supabase
      .from("flashcard_sets")
      .select("id, topic_id")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .not("topic_id", "is", null),
    supabase
      .from("quizzes")
      .select("id, topic_id")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .not("topic_id", "is", null),
  ]);

  const progress: Record<string, TopicProgress> = {};
  const setsByTopic = new Map<string, string[]>();

  for (const row of sets ?? []) {
    if (!row.topic_id) continue;
    const list = setsByTopic.get(row.topic_id) ?? [];
    list.push(row.id);
    setsByTopic.set(row.topic_id, list);
  }

  for (const row of quizzes ?? []) {
    if (!row.topic_id) continue;
    const existing = progress[row.topic_id] ?? { status: "not-started", setCount: 0, quizCount: 0 };
    existing.quizCount += 1;
    progress[row.topic_id] = existing;
  }

  // For each tagged topic, look at the average SM-2 repetitions across its
  // cards to decide in-progress vs covered.
  for (const [topicId, setIds] of setsByTopic.entries()) {
    const cardBatches = await Promise.all(setIds.map((id) => flashcardStore.getBySet(id)));
    const cards = cardBatches.flat();
    const avgRepetitions = cards.length
      ? cards.reduce((sum, c) => sum + (c.repetitions ?? 0), 0) / cards.length
      : 0;

    const existing = progress[topicId] ?? { status: "not-started", setCount: 0, quizCount: 0 };
    existing.setCount = setIds.length;
    existing.status = avgRepetitions >= 2 ? "covered" : "in-progress";
    progress[topicId] = existing;
  }

  return progress;
}
