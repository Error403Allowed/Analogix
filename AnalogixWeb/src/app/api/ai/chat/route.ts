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

  const levels = [
    'SCHOOL MODE: Formal, precise, curriculum-aligned. No analogies.',
    'Use analogies sparingly — only when they genuinely help clarify a tricky point. When you do, weave the analogy naturally into the explanation.',
    'Use analogies as a teaching tool for abstract or complex concepts. Connect unfamiliar ideas to everyday experiences the student already understands.',
    'Weave analogies throughout your explanation. Compare new concepts to familiar things. Extend the comparison so the student can see how the pieces map across.',
    'Analogies are your primary teaching method. For every concept, find a relatable comparison and weave it into the explanation. Show how the analogy maps to the real concept step by step.',
    'Maximum analogy integration. Every explanation should be anchored in a vivid, extended analogy that the student can visualize and relate to their own life.',
  ];
  const clamped = typeof analogyIntensity === 'number' && !Number.isNaN(analogyIntensity)
    ? Math.max(0, Math.min(5, Math.round(analogyIntensity)))
    : 3;
  const analogyGuidance = levels[clamped];

  const curriculumInstruction = workspaceContext.includes('CURRICULUM CONTENT')
    ? '\n\nThe workspace above includes Australian curriculum content for the student\'s grade and subject. Reference this curriculum content in your answer. Mention the ACARA code (e.g. AC9M8G03) when relevant. Ensure your explanations match the specified grade level and syllabus outcomes.'
    : '';

  const workspaceSection = workspaceContext || calendarContext ? `
${calendarContext ? `━━━ CALENDAR & DEADLINES ━━━\n${calendarContext}\n━━━ END CALENDAR ━━━\n` : ''}
${workspaceContext ? `━━━ YOUR WORKSPACE ━━━\n${workspaceContext}\n━━━ END WORKSPACE ━━━` : ''}
${curriculumInstruction}
` : '';

  return `You are "Analogix AI", a friendly AI tutor for Australian students.

Context: Year ${studentGrade}${stateFullName ? ` in ${stateFullName}` : ''}, Australia. ${curriculumContext}

${analogyIntensity === 0 ? 'Mode: School/Assessment — formal, precise, no analogies.' : `Learning Mode: ${analogyGuidance}`}

Rules:
- Keep responses concise and conversational
- LATEX FOR ALL MATHEMATICAL CONTENT: Use LaTeX ($...$ for inline, $$...$$ for display) for ALL mathematical expressions, equations, formulas, numbers used in calculations, mathematical operations, and symbols. This applies to every subject — maths, physics, chemistry, biology, economics, and any subject with numbers or formulas. Write $25$ not 25 in calculations, $x = 5$ not x = 5, $\\frac{1}{2}$ not 1/2, $\\times$, $\\div$, $\\pm$, $\\approx$, $\\leq$, $\\geq$, $\\degree$C, $\\text{pH} = 7$, $E = mc^2$.
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

    const isDevMode = process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_API === 'true';
    const devUserId = isDevMode ? (process.env.DEV_USER_ID || crypto.randomUUID()) : null;
    const userId = user?.id || devUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isDevMode && !user) {
      console.warn('[chat] Dev mode: using anonymous userId', userId, '— set ALLOW_DEV_API=false in production');
    }

    const body: ChatRequest = await request.json();
    const { messages, userContext = {} } = body;

    const [personality, memoryContext] = await Promise.all([
      user ? getUserAIPersonality(userId) : Promise.resolve(null),
      user ? buildMemoryContext(userId, messages[messages.length - 1]?.content) : Promise.resolve(''),
    ]);

    const retriever = createRetriever(userId as string);
    const lastMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

    const isSimpleGreeting = /^(hi|hello|hey|thanks?|bye)[\s!?.]*$/i.test(lastMessage.trim()) && 
      messages.filter(m => m.role === 'user').length <= 1;

    let workspaceContext = '';
    let calendarContext = '';

    if (!isSimpleGreeting) {
      const retrievalResult = await retriever.retrieve({
        userId: userId as string,
        query: lastMessage,
        scopes: [
          { type: 'documents', maxResults: 5 },
          { type: 'curriculum', maxResults: 5 },
          { type: 'flashcards', maxResults: 3 },
          { type: 'quizzes', maxResults: 3 },
          { type: 'calendar', maxResults: 5 },
          { type: 'subjects', maxResults: 5 },
        ],
        subjectId: userContext.subjects?.[0],
      });

      const docs = retrievalResult.scopes.documents || [];
      const curriculumEntries = retrievalResult.scopes.curriculum || [];

      const docParts: string[] = [];
      if (docs.length > 0) {
        docParts.push('━━━ YOUR DOCUMENTS ━━━');
        docParts.push(docs.map((d) =>
          `[${d.entity.metadata?.subject_id?.toUpperCase()}] "${d.entity.metadata?.title}": ${d.entity.entity_data?.content || ''}`
        ).join('\n\n'));
      }

      if (curriculumEntries.length > 0) {
        docParts.push('━━━ CURRICULUM CONTENT ━━━');
        docParts.push(curriculumEntries.map((c) => {
          const data = c.entity.entity_data as Record<string, unknown>;
          return `[${String(data.state || 'ACARA')}] ${String(data.subject || '')} Year ${String(data.grade || '')}${data.acara_code ? ` (${data.acara_code})` : ''}: ${data.topic ? `${data.strand} > ${data.topic}: ` : ''}${data.content || ''}`;
        }).join('\n\n'));
      }

      workspaceContext = docParts.join('\n\n');

      const events = retrievalResult.scopes.calendar || [];
      if (events.length > 0) {
        const formatDateTime = (value: unknown) => {
          if (!value) return null;
          const parsed = value instanceof Date ? value : new Date(String(value));
          if (isNaN(parsed.getTime())) return null;
          const datePart = parsed.toLocaleDateString('en-AU', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
          });
          const timePart = parsed.toLocaleTimeString('en-AU', {
            hour: '2-digit', minute: '2-digit', hour12: true,
          });
          return `${datePart} at ${timePart}`;
        };

        calendarContext = events.slice(0, 5).map((e) => {
          const title = e.entity.metadata?.title || 'Untitled event';
          const subject = e.entity.metadata?.subject_id ? ` [${e.entity.metadata?.subject_id}]` : '';
          const start = formatDateTime(e.entity.entity_data?.start_date ?? e.entity.entity_data?.date);
          const end = formatDateTime(e.entity.entity_data?.end_date);
          if (start && end) {
            return `${title}${subject} — ${start} to ${end}`;
          }
          if (start) {
            return `${title}${subject} — ${start}`;
          }
          return `${title}${subject} — ${String((e.entity.entity_data?.start_date ?? e.entity.entity_data?.date) || 'Unknown date')}`;
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