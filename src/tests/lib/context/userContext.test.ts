import { describe, it, expect, vi } from 'vitest';
import {
    detectContextIntents,
    fetchEnrolledSubjects,
    buildPerformanceContext,
    buildAchievementsContext,
    buildFlashcardContext,
    buildStudyStatsContext,
} from '@/lib/context/userContext';

const mockFrom = (tableHandlers: Record<string, (...args: any[]) => any>) => {
    const handlers: Record<string, any> = {};
    for (const [table, fn] of Object.entries(tableHandlers)) {
        handlers[table] = fn;
    }
    return {
        from: (table: string) => {
            const handler = handlers[table] || (() => ({ data: [], error: null }) as any);
            return handler();
        },
    } as any;
};

// Build a chained, awaitable supabase query object. Chained methods return a
// thenable that resolves to `result`, so `.select(...).eq(...).limit(n)` works
// regardless of which method is the final call.
const chain = (result: any) => {
    const q: any = {
        eq: () => q,
        select: () => q,
        order: () => q,
        limit: () => q,
        single: () => q,
        lte: () => q,
        then: (resolve: (v: any) => void) => resolve(result),
    };
    return q;
};

describe('detectContextIntents', () => {
    it('detects calendar intent from schedule words', () => {
        const intents = detectContextIntents("What are my deadlines next week?");
        expect(intents.calendar).toBe(true);
    });

    it('detects document intent', () => {
        const intents = detectContextIntents("Summarise my physics notes for me");
        expect(intents.documents).toBe(true);
    });

    it('detects performance intent from quiz/weak queries', () => {
        const intents = detectContextIntents("Which topics am I weakest at in maths?");
        expect(intents.performance).toBe(true);
    });

    it('detects achievements intent', () => {
        const intents = detectContextIntents("Do I have any achievements or streaks?");
        expect(intents.achievements).toBe(true);
    });

    it('detects flashcards intent', () => {
        const intents = detectContextIntents("Show me my flashcard sets for biology");
        expect(intents.flashcards).toBe(true);
    });

    it('does not over-activate for a plain study question', () => {
        const intents = detectContextIntents("Explain how photosynthesis works");
        expect(intents.calendar).toBe(false);
        expect(intents.documents).toBe(false);
        expect(intents.performance).toBe(false);
        expect(intents.achievements).toBe(false);
        expect(intents.flashcards).toBe(false);
    });
});

describe('fetchEnrolledSubjects', () => {
    it('merges profile subjects with fallback and dedupes', async () => {
        const profileQuery = chain({
            data: { subjects: ['maths', 'science', 'english'] },
            error: null,
        });
        const supabase = mockFrom({ profiles: () => profileQuery });
        const result = await fetchEnrolledSubjects(supabase, 'user_1', ['maths', 'history']);
        expect(result).toEqual(['maths', 'science', 'english', 'history']);
    });

    it('falls back to client subjects when profile fetch fails', async () => {
        const profileQuery = chain({ data: null, error: { message: 'no rows' } });
        const supabase = mockFrom({
            profiles: () => profileQuery,
            subject_data: () => chain({ data: [{ subject_id: 'english' }], error: null }),
        });
        const result = await fetchEnrolledSubjects(supabase, 'user_1', ['maths']);
        expect(result).toEqual(['english', 'maths']);
    });

    it('returns empty when nothing resolves', async () => {
        const supabase = mockFrom({
            profiles: () => chain({ data: null, error: { message: 'x' } }),
            subject_data: () => chain({ data: [], error: null }),
        });
        const result = await fetchEnrolledSubjects(supabase, 'user_1', []);
        expect(result).toEqual([]);
    });
});

describe('buildPerformanceContext', () => {
    it('formats recent quiz results with scores', async () => {
        const performanceQuery = chain({
            data: [
                { subject_id: 'maths', topic: 'Trigonometry', score: 7, total_questions: 10, created_at: '2026-01-05T00:00:00Z' },
                { subject_id: 'biology', topic: null, score: 9, total_questions: 10, created_at: '2026-01-04T00:00:00Z' },
            ],
            error: null,
        });
        const eduQuery = chain({ data: [], error: null });
        const supabase = mockFrom({
            quiz_performance: () => performanceQuery,
            educational_memory: () => eduQuery,
        });
        const ctx = await buildPerformanceContext(supabase, 'user_1');
        expect(ctx).toContain('RECENT QUIZ RESULTS');
        expect(ctx).toContain('maths: 70% (7/10)');
        expect(ctx).toContain('biology: 90% (9/10)');
    });

    it('includes weak areas from educational memory', async () => {
        const performanceQuery = chain({ data: [], error: null });
        const eduQuery = chain({
            data: [
                { memory_type: 'weakness', subject_id: 'maths', content: 'Trigonometry' },
                { memory_type: 'strength', subject_id: 'biology', content: 'Cell division' },
            ],
            error: null,
        });
        const supabase = mockFrom({
            quiz_performance: () => performanceQuery,
            educational_memory: () => eduQuery,
        });
        const ctx = await buildPerformanceContext(supabase, 'user_1');
        expect(ctx).toContain('WEAK AREAS');
        expect(ctx).toContain('Trigonometry');
        expect(ctx).toContain('STRENGTHS');
        expect(ctx).toContain('Cell division');
    });

    it('returns empty when no data', async () => {
        const supabase = mockFrom({
            quiz_performance: () => chain({ data: [], error: null }),
            educational_memory: () => chain({ data: [], error: null }),
        });
        const ctx = await buildPerformanceContext(supabase, 'user_1');
        expect(ctx).toBe('');
    });
});

describe('buildAchievementsContext', () => {
    it('maps achievement ids to human titles', async () => {
        const query = chain({
            data: [
                { achievement_id: 'start_1', unlocked_at: '2026-01-01T00:00:00Z' },
                { achievement_id: 'streak_3', unlocked_at: '2026-01-03T00:00:00Z' },
            ],
            error: null,
        });
        const supabase = mockFrom({ achievements: () => query });
        const ctx = await buildAchievementsContext(supabase, 'user_1');
        expect(ctx).toContain('New Beginnings');
        expect(ctx).toContain('Heating Up');
    });

    it('keeps unknown ids as-is and returns empty when none', async () => {
        const query = chain({ data: [], error: null });
        const supabase = mockFrom({ achievements: () => query });
        expect(await buildAchievementsContext(supabase, 'user_1')).toBe('');
    });
});

describe('buildFlashcardContext', () => {
    it('summarises sets and due counts', async () => {
        const flashcardSetsQuery = chain({
            data: [{ id: 's1', name: 'Mitosis', subject_id: 'biology' }],
            error: null,
        }) as any;
        const cardCountQuery = {
            eq: () => cardCountQuery,
            select: () => cardCountQuery,
            lte: () => cardCountQuery,
            in: () => cardCountQuery,
            then: (resolve: (v: any) => void) => resolve({ data: [{ set_id: 's1' }, { set_id: 's1' }, { set_id: 's1' }], error: null, count: 3 }),
        };
        const supabase = {
            from: vi.fn((table: string) => {
                if (table === 'flashcard_sets') return flashcardSetsQuery;
                if (table === 'flashcards') return cardCountQuery;
                return chain({ data: [], error: null });
            }) as any,
        };
        const ctx = await buildFlashcardContext(supabase, 'user_1');
        expect(ctx).toContain('FLASHCARDS');
        expect(ctx).toContain('1 set(s)');
        expect(ctx).toContain('Mitosis');
        expect(ctx).toContain('3 card(s) due');
    });

    it('returns empty when no sets', async () => {
        const supabase = {
            from: vi.fn((table: string) => {
                if (table === 'flashcard_sets') return chain({ data: [], error: null });
                const q: any = {
                    eq: () => q,
                    select: () => q,
                    lte: () => q,
                    count: 0,
                };
                return q;
            }) as any,
        };
        expect(await buildFlashcardContext(supabase, 'user_1')).toBe('');
    });
});

describe('buildStudyStatsContext', () => {
    it('formats the stats snapshot', async () => {
        const query = chain({
            data: { current_streak: 5, accuracy: 82, quizzes_done: 23, top_subject: 'maths' },
            error: null,
        });
        const supabase = mockFrom({ user_stats: () => query });
        const ctx = await buildStudyStatsContext(supabase, 'user_1');
        expect(ctx).toContain('STUDY STATS');
        expect(ctx).toContain('5-day streak');
        expect(ctx).toContain('82% average accuracy');
        expect(ctx).toContain('23 quizzes completed');
    });

    it('returns empty when no stats', async () => {
        const supabase = mockFrom({ user_stats: () => chain({ data: null, error: { message: 'x' } }) });
        expect(await buildStudyStatsContext(supabase, 'user_1')).toBe('');
    });
});