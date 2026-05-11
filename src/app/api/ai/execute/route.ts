import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRetriever } from '@/lib/retrieval/retriever';
import { createContextAssembler } from '@/lib/context/assembler';
import { createMemorySystem, buildMemoryContext } from '@/lib/memory/layers';
import { createMutationEngine } from '@/lib/mutations/engine';
import { getToolsForCompound } from '@/lib/tools/registry';
import { executeToolCall } from '@/lib/tools/caller';
import { getUserAIPersonality, buildPersonalityInstructions } from '@/lib/aiMemory';
import type { RetrievedEntity, WorkspaceContext } from '@/types/workspace';

const GROQ_API_URL = process.env.GROQ_CHAT_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2;

export const runtime = 'nodejs';

interface ExecuteRequest {
  messages: Array<{ role: string; content: string }>;
  userContext?: {
    subjects?: string[];
    grade?: string;
    state?: string;
    analogyIntensity?: number;
  };
  tools?: string[];
  stream?: boolean;
}

interface ToolCallResult {
  name: string;
  result: unknown;
}

async function callGroqWithTools(
  messages: Array<{ role: string; content: string }>,
  tools: object[],
  userId: string,
  maxTokens = 8000
): Promise<{ content: string; tool_calls?: ToolCallResult[] }> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools,
      max_tokens: maxTokens,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;

  const toolCalls: ToolCallResult[] = [];
  if (message?.tool_calls) {
    for (const call of message.tool_calls) {
      const result = await executeToolCall(userId, {
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments),
      });
      toolCalls.push({ name: call.function.name, result });
    }
  }

  return {
    content: message?.content || '',
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
  };
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

    const body: ExecuteRequest = await request.json();
    const { messages, userContext = {}, stream = false } = body;

    const retriever = createRetriever(userId);
    const memorySystem = createMemorySystem(userId);
    const mutationEngine = createMutationEngine(userId);
    const contextAssembler = createContextAssembler();

    const [personality, memoryContext] = await Promise.all([
      isDevMode ? null : getUserAIPersonality(userId),
      isDevMode ? '' : buildMemoryContext(userId, messages[messages.length - 1]?.content),
    ]);

    const scopes = [
      { type: 'documents' as const, maxResults: 5 },
      { type: 'flashcards' as const, maxResults: 3 },
      { type: 'quizzes' as const, maxResults: 3 },
      { type: 'calendar' as const, maxResults: 3 },
      { type: 'subjects' as const, maxResults: 5 },
      { type: 'memory' as const, maxResults: 3 },
    ];

    const lastMessage = messages[messages.length - 1]?.content || '';
    const retrievalResult = await retriever.retrieve({
      userId: userId,
      query: lastMessage.includes('search') || lastMessage.includes('find') ? lastMessage : undefined,
      scopes,
      subjectId: userContext.subjects?.[0],
    });

    const workspaceContext: WorkspaceContext = {
      user_id: userId,
      subjects: (retrievalResult.scopes.subjects || []).map((e: RetrievedEntity) => ({
        id: e.entity.entity_id,
        name: e.entity.metadata?.title || e.entity.entity_id,
      })),
      documents: (retrievalResult.scopes.documents || []).map((e) => {
        const entityData = e.entity.entity_data as Record<string, unknown>;
        return {
          id: e.entity.entity_id,
          subject_id: (e.entity.metadata?.subject_id ?? '') as string,
          title: String(entityData.title ?? e.entity.metadata?.title ?? ''),
          type: 'document',
          preview: String(entityData.content ?? ''),
          updated_at: e.entity.updated_at,
        };
      }),
      flashcards: (retrievalResult.scopes.flashcards || []).map((e) => {
        const entityData = e.entity.entity_data as Record<string, unknown>;
        return {
          id: e.entity.entity_id,
          subject_id: (e.entity.metadata?.subject_id ?? '') as string,
          title: String(entityData.title ?? e.entity.metadata?.title ?? ''),
          card_count: Number(entityData.card_count ?? 0),
          due_count: 0,
        };
      }),
      quizzes: (retrievalResult.scopes.quizzes || []).map((e) => {
        const entityData = e.entity.entity_data as Record<string, unknown>;
        return {
          id: e.entity.entity_id,
          subject_id: (e.entity.metadata?.subject_id ?? '') as string,
          title: String(entityData.title ?? e.entity.metadata?.title ?? ''),
          question_count: Number(entityData.question_count ?? 0),
          difficulty: String(entityData.difficulty ?? 'foundational') as 'foundational' | 'intermediate' | 'advanced',
        };
      }),
      calendar_events: (retrievalResult.scopes.calendar || []).map((e) => {
        const entityData = e.entity.entity_data as Record<string, unknown>;
        return {
          id: e.entity.entity_id,
          title: String(entityData.title ?? e.entity.metadata?.title ?? ''),
          start_date: String(entityData.start_date ?? ''),
          end_date: String(entityData.end_date ?? ''),
          type: String(entityData.type ?? ''),
          subject: e.entity.metadata?.subject_id,
        };
      }),
      recent_activities: [],
      memory: { facts: [], preferences: [], strengths: [], weak_areas: [], study_patterns: [] },
      preferences: {
        grade: userContext.grade || '7',
        state: userContext.state,
        timezone: 'Australia/Sydney',
        analogy_intensity: userContext.analogyIntensity ?? personality?.analogy_frequency ?? 3,
        response_length: 'moderate',
      },
    };

    const assembled = contextAssembler.assemble(
      retrievalResult.entities,
      workspaceContext,
      { facts: [], preferences: [], strengths: [], weak_areas: [], study_patterns: [] },
      workspaceContext.preferences
    );

    const systemMessage = `You are "Analogix AI", a friendly AI tutor for Australian students.

Context: Year ${workspaceContext.preferences.grade}${workspaceContext.preferences.state ? ` in ${workspaceContext.preferences.state}` : ''}, Australia.

${assembled.workspaceContext}

${memoryContext ? `Memory: ${memoryContext}` : ''}

IMPORTANT: You can use tools to help the student. When you need to create flashcards, start a quiz, search documents, or add calendar events, use the available tools.

Rules:
- Be helpful and educational
- Use the workspace context to provide relevant information
- Use tools when the student asks to create, search, or manage content
- Keep responses conversational`;

    const finalMessages = [
      { role: 'system' as const, content: systemMessage },
      ...messages.filter(m => m.role !== 'system'),
    ];

    const tools = getToolsForCompound();

    if (stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await callGroqWithTools(finalMessages, tools, userId);

            if (response.tool_calls && response.tool_calls.length > 0) {
              for (const toolCall of response.tool_calls) {
                const chunk = `tool_call: ${JSON.stringify(toolCall)}\n\n`;
                controller.enqueue(encoder.encode(chunk));
              }
            }

            if (response.content) {
              const tokens = response.content.split(/(?=\s)/);
              for (const token of tokens) {
                controller.enqueue(encoder.encode(token));
                await new Promise(r => setTimeout(r, 20));
              }
            }

            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const result = await callGroqWithTools(finalMessages, tools, userId);

    const response: { message: string; tools_used: string[]; tool_results?: Array<{ tool: string; result: unknown }> } = {
      message: result.content,
      tools_used: result.tool_calls?.map(t => t.name) || [],
    };

    if (result.tool_calls) {
      response.tool_results = result.tool_calls.map(t => ({
        tool: t.name,
        result: t.result,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[/api/ai/execute] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    );
  }
}