import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRetriever } from '@/lib/retrieval/retriever';
import { createContextAssembler } from '@/lib/context/assembler';
import { buildMemoryContext } from '@/lib/memory/layers';
import { getUserAIPersonality, buildPersonalityInstructions } from '@/lib/aiMemory';
import { getFormulaSheetContext } from '@/data/formulaSheets';

const GROQ_API_URL = process.env.GROQ_CHAT_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2;

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  userContext?: {
    subjects?: string[];
    grade?: string;
    state?: string;
    analogyIntensity?: number;
    analogyAnchor?: string;
    researchMode?: boolean;
    selectedModel?: string;
  };
}

const FULL_MESSAGE_WINDOW = 8;

function buildSystemPrompt(
  userContext: ChatRequest['userContext'],
  workspaceContext: string,
  calendarContext: string,
  memoryContext: string,
  personalityInstructions: string
): string {
  const analogyIntensity = userContext?.analogyIntensity ?? 3;
  const studentGrade = userContext?.grade || '7';
  const studentState = userContext?.state || null;

  const STATE_FULL_NAMES: Record<string, string> = {
    NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland',
    WA: 'Western Australia', SA: 'South Australia', TAS: 'Tasmania',
    ACT: 'Australian Capital Territory', NT: 'Northern Territory',
  };

  const stateFullName = studentState ? (STATE_FULL_NAMES[studentState] || studentState) : null;

  const curriculumContext = stateFullName
    ? `The student is in Year ${studentGrade} in ${stateFullName}, Australia. Always align explanations to the ${stateFullName} syllabus.`
    : `The student is in Year ${studentGrade} in Australia. Use Australian curriculum standards.`;

  const analogyGuidance = [
    'SCHOOL MODE: Formal, precise, curriculum-aligned. No analogies.',
    'Use analogies sparingly — only when they help clarify a point.',
    'Use analogies as the primary teaching tool.',
    'Weave analogies throughout your explanation.',
    'Use analogies throughout but keep them natural.',
    'Maximum analogy integration.',
  ][Math.min(analogyIntensity, 5)];

  const workspaceSection = workspaceContext || calendarContext ? `
${calendarContext ? `━━━ CALENDAR & DEADLINES ━━━\n${calendarContext}\n━━━ END CALENDAR ━━━\n` : ''}
${workspaceContext ? `━━━ YOUR WORKSPACE ━━━\n${workspaceContext}\n━━━ END WORKSPACE ━━━` : ''}
` : '';

  return `You are "Analogix AI", a friendly AI tutor for Australian students.

Context: Year ${studentGrade}${stateFullName ? ` in ${stateFullName}` : ''}, Australia. ${curriculumContext}

${analogyIntensity === 0 ? 'Mode: School/Assessment — formal, precise, no analogies.' : `Learning Mode: ${analogyGuidance}`}

Rules:
- Keep responses concise and conversational
- Use LaTeX for math: inline $x$, display $$\\frac{a}{b}$$
- No emojis
- Help guide learning, don't give direct answers to homework
${workspaceSection}
${memoryContext}
${personalityInstructions}
— Analogix`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // DEV MODE: Allow testing without auth
    const isDevMode = process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_API === 'true';
    const userId = user?.id || (isDevMode ? 'dev-test-user' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ChatRequest = await request.json();
    const { messages, userContext = {} } = body;

    const [personality, memoryContext] = await Promise.all([
      isDevMode ? null : getUserAIPersonality(userId),
      isDevMode ? '' : buildMemoryContext(userId, messages[messages.length - 1]?.content),
    ]);

    const retriever = createRetriever(userId as string);
    const lastMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

    const isSimpleGreeting = /^(hi|hello|hey|hey|thanks?|bye)[\s!?.]*$/i.test(lastMessage.trim()) && 
      messages.filter(m => m.role === 'user').length <= 1;

    let workspaceContext = '';
    let calendarContext = '';

    if (!isSimpleGreeting) {
      const retrievalResult = await retriever.retrieve({
        userId: userId as string,
        query: lastMessage,
        scopes: [
          { type: 'documents', maxResults: 5 },
          { type: 'flashcards', maxResults: 3 },
          { type: 'quizzes', maxResults: 3 },
          { type: 'calendar', maxResults: 5 },
          { type: 'subjects', maxResults: 5 },
        ],
        subjectId: userContext.subjects?.[0],
      });

      const docs = retrievalResult.scopes.documents || [];
      if (docs.length > 0) {
        workspaceContext = docs.map((d) => 
          `[${d.entity.metadata?.subject_id?.toUpperCase()}] "${d.entity.metadata?.title}": ${d.entity.entity_data?.content || ''}`
        ).join('\n\n');
      }

      const events = retrievalResult.scopes.calendar || [];
      if (events.length > 0) {
        calendarContext = events.slice(0, 5).map((e) => {
          const startDate = e.entity.entity_data?.start_date;
          const parsedDate =
            startDate instanceof Date || typeof startDate === 'string' || typeof startDate === 'number'
              ? new Date(startDate)
              : undefined;
          const date = parsedDate?.toLocaleDateString('en-AU') ?? 'Unknown date';
          return `${e.entity.metadata?.title} - ${date}`;
        }).join('\n');
      }
    }

    const personalityInstructions = personality 
      ? buildPersonalityInstructions(personality, userContext.analogyIntensity)
      : '';

    const effectiveAnalogyIntensity = userContext.analogyIntensity !== undefined
      ? userContext.analogyIntensity
      : personality ? Math.max(1, Math.min(5, personality.analogy_frequency ?? 3)) : 3;

    const systemPrompt = buildSystemPrompt(
      { ...userContext, analogyIntensity: effectiveAnalogyIntensity },
      workspaceContext,
      calendarContext,
      memoryContext,
      personalityInstructions
    );

    const recentMsgs = messages.slice(-FULL_MESSAGE_WINDOW).filter(m => m.role !== 'system');
    const olderMsgs = messages.slice(0, -FULL_MESSAGE_WINDOW);

    let conversationSummary = '';
    if (olderMsgs.length > 0) {
      const topics = olderMsgs
        .filter(m => m.role === 'user')
        .map(m => m.content.split('.')[0].slice(0, 50))
        .slice(0, 3);
      if (topics.length > 0) {
        conversationSummary = `[Earlier] Topics: ${topics.join(', ')} (${olderMsgs.length} earlier messages)`;
      }
    }

    let fullSystemPrompt = systemPrompt;
    if (conversationSummary) {
      fullSystemPrompt = fullSystemPrompt.replace('— Analogix', `${conversationSummary}\n\n— Analogix`);
    }

    const model = userContext.selectedModel || 'llama-3.3-70b-versatile';

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: fullSystemPrompt },
          ...recentMsgs,
        ],
        max_tokens: 1024,
        temperature: userContext.researchMode ? 0.3 : 0.55,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `AI error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ message: content });
  } catch (error) {
    console.error('[/api/ai/chat] Error:', error);
    return NextResponse.json(
      { error: 'Chat failed' },
      { status: 500 }
    );
  }
}