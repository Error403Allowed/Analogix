import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMutationEngine } from '@/lib/mutations/engine';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    const engine = createMutationEngine(user.id);
    const operations = await engine.listOperations(status, limit);

    return NextResponse.json({ operations });
  } catch (error) {
    console.error('[/api/ai/operations] GET Error:', error);
    return NextResponse.json({ error: 'Failed to list operations' }, { status: 500 });
  }
}

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
      type,
      user_id: user.id,
      entity_type: entityType || 'unknown',
      entity_id: entityId,
      payload: payload || {},
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Validation failed',
        validation,
      }, { status: 400 });
    }

    if (validation.requires_confirmation) {
      return NextResponse.json({
        requires_confirmation: true,
        validation,
        message: 'This operation requires user confirmation',
      });
    }

    const operation = await engine.createOperation(type, entityType || 'unknown', payload, entityId);
    const result = await engine.applyOperation(operation.id);

    return NextResponse.json({
      operation,
      result,
    });
  } catch (error) {
    console.error('[/api/ai/operations] POST Error:', error);
    return NextResponse.json({ error: 'Failed to create operation' }, { status: 500 });
  }
}