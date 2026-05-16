import { createToolsClient } from '@/lib/supabase/tools-client';
import {
  type WorkspaceOperation,
  type OperationType,
  type OperationValidation,
  type ValidationError,
  type ValidationWarning,
} from '@/types/operations';

export class MutationEngine {
  private userId: string;
  private supabase: ReturnType<typeof createToolsClient> | null;

  constructor(userId: string) {
    this.userId = userId;
    this.supabase = null;
  }

  private getClient() {
    if (!this.supabase) {
      this.supabase = createToolsClient();
    }
    return this.supabase;
  }

  async createOperation(
    type: OperationType,
    entityType: string,
    payload: Record<string, unknown>,
    entityId?: string,
    parentOperationId?: string
  ): Promise<WorkspaceOperation> {
    const supabase = this.getClient();

    const operation: WorkspaceOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      user_id: this.userId,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      status: 'pending',
      created_at: new Date().toISOString(),
      parent_operation_id: parentOperationId,
    };

    const { data, error } = await supabase
      .from('operation_logs')
      .insert({
        id: operation.id,
        user_id: this.userId,
        operation_type: type,
        entity_type: entityType,
        entity_id: entityId,
        payload,
        status: 'pending',
        parent_operation_id: parentOperationId,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('[MutationEngine] createOperation error:', error);
      throw new Error(`Failed to create operation: ${error.message}`);
    }

    return operation;
  }

  async validateOperation(operation: WorkspaceOperation): Promise<OperationValidation> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!operation.type) {
      errors.push({ code: 'MISSING_TYPE', message: 'Operation type is required' });
    }

    if (!operation.payload || Object.keys(operation.payload).length === 0) {
      warnings.push({ code: 'EMPTY_PAYLOAD', message: 'Operation payload is empty' });
    }

    const validationResult = await this.validateSpecific(operation);
    errors.push(...validationResult.errors);
    warnings.push(...validationResult.warnings);

    const requiresConfirmation = this.requiresUserConfirmation(operation);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      requires_confirmation: requiresConfirmation,
    };
  }

  private async validateSpecific(operation: WorkspaceOperation): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const payload = operation.payload as Record<string, unknown>;

    switch (operation.type) {
      case 'create_document':
        if (!payload.title && !payload.content) {
          errors.push({ code: 'MISSING_TITLE', message: 'Document must have a title or content', field: 'title' });
        }
        break;

      case 'create_flashcards':
        if (!payload.cards || !Array.isArray(payload.cards) || payload.cards.length === 0) {
          errors.push({ code: 'NO_CARDS', message: 'Flashcard set must have at least one card', field: 'cards' });
        }
        if (!payload.subjectId) {
          errors.push({ code: 'NO_SUBJECT', message: 'Flashcards must have a subject', field: 'subjectId' });
        }
        break;

      case 'delete_document':
      case 'delete_flashcard':
        if (!operation.entity_id) {
          errors.push({ code: 'NO_ENTITY_ID', message: 'Cannot delete without entity ID', field: 'entity_id' });
        }
        break;

case 'create_quiz': {
        const numQuestions = Number(payload.numberOfQuestions);
        if (!payload.subjectId) {
          errors.push({ code: 'NO_SUBJECT', message: 'Quiz must have a subject', field: 'subjectId' });
        }
        if (!isNaN(numQuestions) && numQuestions > 20) {
          warnings.push({ code: 'MANY_QUESTIONS', message: 'Large number of questions may take time to generate', field: 'numberOfQuestions' });
        }
        break;
      }

      case 'store_memory':
        if (!payload.content || (payload.content as string).length > 1000) {
          errors.push({ code: 'INVALID_CONTENT', message: 'Memory content must be between 1-1000 characters', field: 'content' });
        }
        break;
    }

    return { errors, warnings };
  }

  private requiresUserConfirmation(operation: WorkspaceOperation): boolean {
    const highImpactTypes: OperationType[] = [
      'delete_document',
      'delete_flashcard',
      'delete_quiz',
      'delete_calendar_event',
      'delete_room',
    ];

    return highImpactTypes.includes(operation.type);
  }

  async applyOperation(operationId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getClient();

    const { data: operation, error: fetchError } = await supabase
      .from('operation_logs')
      .select('*')
      .eq('id', operationId)
      .single() as { data: any; error: any };

    if (fetchError || !operation) {
      return { success: false, error: 'Operation not found' };
    }

    await supabase
      .from('operation_logs')
        .update({ status: 'applying' } as any as never)
        .eq('id', operationId);

    try {
      await this.executeOperation(operation);

      await supabase
        .from('operation_logs')
        .update({
          status: 'applied',
          completed_at: new Date().toISOString(),
        } as any as never)
        .eq('id', operationId);
      return { success: true };
    } catch (err) {
      await supabase
        .from('operation_logs')
        .update({
          status: 'failed',
          error_message: String(err),
          completed_at: new Date().toISOString(),
        } as never)
        .eq('id', operationId);

      return { success: false, error: String(err) };
    }
  }

  private async executeOperation(operation: WorkspaceOperation): Promise<void> {
    const supabase = this.getClient();
    const payload = operation.payload;

    switch ((operation as any).operation_type) {
      case 'create_document':
        await supabase.from('documents').insert({
          owner_user_id: this.userId,
          title: payload.title || 'Untitled',
          content: payload.content || '',
          subject_id: payload.subjectId || 'general',
          role: payload.role || 'document',
        } as any);
        break;

      case 'create_flashcards': {
        const now = new Date().toISOString();
        const cards = ((payload.cards || []) as Array<{ front: string; back: string }>).map((card, idx) => ({
          id: `card_${Date.now()}_${idx}`,
          owner_user_id: this.userId,
          subject_id: payload.subjectId,
          title: payload.setName || 'Flashcards',
          content: JSON.stringify(card),
          role: 'flashcard',
          created_at: now,
          updated_at: now,
        }));
        await supabase.from('documents').insert(cards as any);
        break;
      }

      case 'store_memory':
        await supabase.from('ai_memory_fragments').insert({
          user_id: this.userId,
          content: payload.content,
          memory_type: payload.memoryType || 'fact',
          importance: payload.importance || 0.5,
        } as any);
        break;

      case 'add_calendar_event':
        await supabase.from('events').insert({
          user_id: this.userId,
          title: payload.title,
          date: payload.date,
          end_date: payload.endDate,
          type: payload.type || 'event',
          subject: payload.subject,
          description: payload.description,
        } as any);
        break;

      default:
        console.log(`[MutationEngine] Executing ${(operation as any).operation_type} - using tool handlers instead`);
    }
  }

  async rollback(operationId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getClient();

    const { data: operation, error: fetchError } = await supabase
      .from('operation_logs')
      .select('*')
      .eq('id', operationId)
      .single();

    if (fetchError || !operation) {
      return { success: false, error: 'Operation not found' };
    }

    if (!(operation as any).rollback_data) {
      return { success: false, error: 'No rollback data available' };
    }

    try {
      const rollbackData = (operation as any).rollback_data;
      
      if (rollbackData.inverse_operation === 'delete_document') {
        const existing = await supabase
          .from('documents')
          .select('id')
          .eq('id', rollbackData.entity_id)
          .single();

        if (!existing.data) {
          await supabase.from('documents').insert(rollbackData.previous_state);
        }
      }

      await supabase
        .from('operation_logs')
        .update({
          status: 'rolled_back',
          completed_at: new Date().toISOString(),
        } as never)
        .eq('id', operationId);

      return { success: true };
    } catch (err) {
      console.error('[MutationEngine] rollback error:', err);
      return { success: false, error: String(err) };
    }
  }

  async getOperation(operationId: string): Promise<WorkspaceOperation | null> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('operation_logs')
      .select('*')
      .eq('id', operationId)
      .single();

    if (error) return null;
    return data;
  }

  async listOperations(status?: string, limit = 20): Promise<WorkspaceOperation[]> {
    const supabase = this.getClient();

    let query = supabase
      .from('operation_logs')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) return [];
    return data || [];
  }
}

export function createMutationEngine(userId: string): MutationEngine {
  return new MutationEngine(userId);
}