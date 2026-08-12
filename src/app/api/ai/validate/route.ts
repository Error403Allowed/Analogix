import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMutationEngine } from '@/lib/mutations/engine';
import type { OperationType } from '@/types/operations';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, entityType, payload, entityId } = body;

    if (!type) {
      return NextResponse.json({ error: 'Operation type is required' }, { status: 400 });
    }

    const engine = createMutationEngine(user.id);

    const validation = await engine.validateOperation({
      id: '',
      type: type as OperationType,
      user_id: user.id,
      entity_type: entityType || 'unknown',
      entity_id: entityId,
      payload: payload || {},
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ validation });
  } catch (error) {
    console.error('[/api/ai/validate] Error:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}