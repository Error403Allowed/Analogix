import { getAchievement } from "@analogix/shared/achievements";
import { listFlashcardSets } from "@analogix/shared/tools/handlers";

/**
 * Which on-demand user-data scopes a message requires. Loading is intent-gated:
 * a scope is fetched only when the student's latest message actually needs it,
 * so the chat never dumps the whole workspace into the prompt.
 */
export interface ContextIntents {
    calendar: boolean;
    documents: boolean;
    performance: boolean;
    achievements: boolean;
    flashcards: boolean;
}

const INTENT_PATTERNS: Record<keyof ContextIntents, RegExp> = {
    calendar: /\b(schedule|scheduling|calendar|timeslot|timeslots|timetable|event|events|deadline|deadlines|due\b|upcoming|next week|this week|tomorrow|today|weekly|exam\b|exams|test date|assignment|assignments|homework|lesson|lessons|when is|what'?s (on|next|coming up)|plan|plans? for|organi[sz]e)\b/i,
    documents: /\b(document|documents|docs?|notes?|workspace|essay|draft|study guide|saved|writing|paragraph|report|composition)\b/i,
    performance: /\b(quiz\b|quizzes|score|scores|result|results|marks?|weak(est|ness|nesses)?\b|struggle|struggling|improve|improvement|improving|progress|accuracy|percent|percentage|performance|grades?|improve my)\b/i,
    achievements: /\b(achievement|achievements|badge|badges|streak|streaks|troph|trophies|unlock|unlocked|milestone|award|awards)\b/i,
    flashcards: /\b(flashcard|flashcards|flash cards|spaced repetition|revision card|revision cards)\b/i,
};

export function detectContextIntents(message: string): ContextIntents {
    const text = message ?? "";
    return {
        calendar: INTENT_PATTERNS.calendar.test(text),
        documents: INTENT_PATTERNS.documents.test(text),
        performance: INTENT_PATTERNS.performance.test(text),
        achievements: INTENT_PATTERNS.achievements.test(text),
        flashcards: INTENT_PATTERNS.flashcards.test(text),
    };
}

/**
 * Fetch the user's full enrolled subject list. `profiles.subjects` (the
 * onboarding list) is authoritative; `subject_data` and the caller-provided
 * fallback (usually the client's currently-selected chat subject) are merged in
 * so the tutor never under-reports what the student studies.
 */
export async function fetchEnrolledSubjects(
    supabase: { from: (table: string) => any },
    userId: string,
    fallbackSubjects: string[] = [],
): Promise<string[]> {
    let enrolled: string[] = [];
    try {
        const { data: profile } = await supabase
            .from("profiles")
            .select("subjects")
            .eq("id", userId)
            .single();
        if (Array.isArray(profile?.subjects)) {
            enrolled = (profile.subjects as string[]).filter(Boolean);
        }
    }
    catch {
        enrolled = [];
    }
    if (enrolled.length === 0) {
        try {
            const { data: subjectRows } = await supabase
                .from("subject_data")
                .select("subject_id")
                .eq("user_id", userId);
            enrolled = (subjectRows ?? []).map((r: any) => r.subject_id).filter(Boolean);
        }
        catch {
            enrolled = [];
        }
    }
    const merged = [...enrolled, ...fallbackSubjects].filter(Boolean);
    return [...new Set(merged)];
}

const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

/**
 * Compact summary of quiz results + known weak areas / strengths. Built only
 * when the student's message is about their performance or progress.
 */
export async function buildPerformanceContext(
    supabase: { from: (table: string) => any },
    userId: string,
    limit = 10,
): Promise<string> {
    const parts: string[] = [];

    let recent: Array<{ subject_id: string; topic: string; score: number; total_questions: number; created_at: string }>;
    try {
        const { data } = await supabase
            .from("quiz_performance")
            .select("subject_id, topic, score, total_questions, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit);
        recent = data ?? [];
    }
    catch {
        recent = [];
    }

    if (recent.length > 0) {
        const rows = recent.map(r => {
            const topic = r.topic ? ` - "${r.topic}"` : "";
            const score = r.total_questions > 0
                ? `${pct(r.score / r.total_questions)} (${r.score}/${r.total_questions})`
                : `${pct(r.score)}`;
            const when = r.created_at ? new Date(r.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "";
            return `  • ${r.subject_id}: ${score}${topic}${when ? ` (${when})` : ""}`;
        });
        parts.push("RECENT QUIZ RESULTS:\n" + rows.join("\n"));
    }

    let weakAreas: Array<{ subject_id: string; content: string }>;
    let strengths: Array<{ subject_id: string; content: string }>;
    try {
        const { data: edu } = await supabase
            .from("educational_memory")
            .select("memory_type, subject_id, content")
            .eq("user_id", userId);
        weakAreas = (edu ?? []).filter((m: any) => m.memory_type === "weakness");
        strengths = (edu ?? []).filter((m: any) => m.memory_type === "strength");
    }
    catch {
        weakAreas = [];
        strengths = [];
    }

    if (weakAreas.length > 0) {
        parts.push("WEAK AREAS: " + weakAreas
            .slice(0, 5)
            .map(w => w.subject_id ? `${w.content.trim()} (${w.subject_id})` : w.content.trim())
            .join(" | "));
    }
    if (strengths.length > 0) {
        parts.push("STRENGTHS: " + strengths
            .slice(0, 5)
            .map(s => s.subject_id ? `${s.content.trim()} (${s.subject_id})` : s.content.trim())
            .join(" | "));
    }

    return parts.join("\n");
}

/**
 * Compact list of recently unlocked achievements. Built only when the student
 * asks about achievements, badges, streaks, trophies, etc.
 */
export async function buildAchievementsContext(
    supabase: { from: (table: string) => any },
    userId: string,
    limit = 8,
): Promise<string> {
    let rows: Array<{ achievement_id: string; unlocked_at: string }>;
    try {
        const { data } = await supabase
            .from("achievements")
            .select("achievement_id, unlocked_at")
            .eq("user_id", userId)
            .order("unlocked_at", { ascending: false })
            .limit(limit);
        rows = data ?? [];
    }
    catch {
        rows = [];
    }
    if (rows.length === 0) return "";
    const names = rows.map(r => {
        const meta = getAchievement(r.achievement_id);
        return meta?.title || r.achievement_id;
    });
    return "ACHIEVEMENTS UNLOCKED: " + names.join(", ");
}

/**
 * Compact flashcard overview: number of sets and cards due now. Built only when
 * the student asks about flashcards.
 */
export async function buildFlashcardContext(
    supabase: { from: (table: string) => any },
    userId: string,
): Promise<string> {
    let sets: Array<{ id: string; name: string; subject_id: string }>;
    try {
        sets = (await listFlashcardSets(userId, supabase)) ?? [];
    }
    catch {
        sets = [];
    }
    if (sets.length === 0) return "";
    let dueNow: number;
    try {
        const { count } = await supabase
            .from("flashcards")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .lte("next_review", new Date().toISOString());
        dueNow = count ?? 0;
    }
    catch {
        dueNow = 0;
    }
    const setNames = sets.slice(0, 6).map(s => s.name).join(", ");
    const dueLine = dueNow > 0 ? ` · ${dueNow} card(s) due for review` : "";
    return `FLASHCARDS: ${sets.length} set(s)${setNames ? ` (${setNames})` : ""}${dueLine}`;
}

/**
 * Compact study stats snapshot. Built only when the student asks about streaks
 * or overall progress.
 */
export async function buildStudyStatsContext(
    supabase: { from: (table: string) => any },
    userId: string,
): Promise<string> {
    let stats: { current_streak: number; accuracy: number; quizzes_done: number; top_subject?: string } | null;
    try {
        const { data } = await supabase
            .from("user_stats")
            .select("current_streak, accuracy, quizzes_done, top_subject")
            .eq("user_id", userId)
            .single();
        stats = data ?? null;
    }
    catch {
        stats = null;
    }
    if (!stats) return "";
    const pieces: string[] = [];
    if (stats.current_streak > 0) pieces.push(`${stats.current_streak}-day streak`);
    if (stats.accuracy > 0) pieces.push(`${stats.accuracy}% average accuracy`);
    if (stats.quizzes_done > 0) pieces.push(`${stats.quizzes_done} quizzes completed`);
    if (stats.top_subject && stats.top_subject !== "None") pieces.push(`favourite subject: ${stats.top_subject}`);
    if (pieces.length === 0) return "";
    return "STUDY STATS: " + pieces.join(" · ");
}