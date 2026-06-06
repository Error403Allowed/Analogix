export class GuardValidator {
    operations = new Map();
    validate(operation) {
        const errors = [];
        const warnings = [];
        errors.push(...this.validateStructure(operation));
        errors.push(...this.validatePayload(operation));
        warnings.push(...this.validateSafety(operation));
        const requiresConfirmation = this.determineConfirmation(operation, errors);
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            requires_confirmation: requiresConfirmation,
        };
    }
    validateStructure(operation) {
        const errors = [];
        if (!operation.type) {
            errors.push({ code: 'MISSING_TYPE', message: 'Operation type is required' });
        }
        if (!operation.user_id) {
            errors.push({ code: 'MISSING_USER', message: 'User ID is required' });
        }
        if (!operation.entity_type) {
            errors.push({ code: 'MISSING_ENTITY_TYPE', message: 'Entity type is required' });
        }
        return errors;
    }
    validatePayload(operation) {
        const errors = [];
        const payload = operation.payload || {};
        const p = payload;
        switch (operation.type) {
            case 'create_document':
                if (!p.title && !p.content) {
                    errors.push({ code: 'EMPTY_DOCUMENT', message: 'Document must have title or content' });
                }
                if (p.title && typeof p.title !== 'string') {
                    errors.push({ code: 'INVALID_TITLE', message: 'Title must be a string' });
                }
                break;
            case 'create_flashcards':
                if (!p.cards || !Array.isArray(p.cards)) {
                    errors.push({ code: 'NO_CARDS', message: 'Flashcards must include cards array' });
                }
                else if (p.cards.length === 0) {
                    errors.push({ code: 'EMPTY_CARDS', message: 'Flashcards must have at least one card' });
                }
                else {
                    for (let i = 0; i < p.cards.length; i++) {
                        const card = p.cards[i];
                        if (!card?.front || !card?.back) {
                            errors.push({ code: 'INVALID_CARD', message: `Card ${i + 1} missing front or back` });
                        }
                    }
                }
                if (!p.subjectId) {
                    errors.push({ code: 'NO_SUBJECT', message: 'Subject ID is required for flashcards' });
                }
                break;
            case 'create_quiz':
                if (!p.subjectId) {
                    errors.push({ code: 'NO_SUBJECT', message: 'Quiz must have a subject' });
                }
                if (p.numberOfQuestions && (Number(p.numberOfQuestions) < 1 || Number(p.numberOfQuestions) > 50)) {
                    errors.push({ code: 'INVALID_QUESTION_COUNT', message: 'Questions must be between 1 and 50' });
                }
                break;
            case 'store_memory':
                if (!p.content) {
                    errors.push({ code: 'NO_MEMORY_CONTENT', message: 'Memory content is required' });
                }
                else if (String(p.content).length > 2000) {
                    errors.push({ code: 'MEMORY_TOO_LONG', message: 'Memory content must be under 2000 characters' });
                }
                break;
            case 'delete_document':
            case 'delete_flashcard':
            case 'delete_quiz':
                if (!operation.entity_id) {
                    errors.push({ code: 'NO_ENTITY_ID', message: 'Cannot delete without entity ID' });
                }
                break;
        }
        return errors;
    }
    validateSafety(operation) {
        const warnings = [];
        const payload = operation.payload || {};
        if (operation.type === 'create_document' && payload.content) {
            if (typeof payload.content === 'string' && payload.content.length > 50000) {
                warnings.push({ code: 'LARGE_CONTENT', message: 'Large document may take time to process' });
            }
        }
        if (operation.type === 'create_flashcards' && payload.cards) {
            if (Array.isArray(payload.cards) && payload.cards.length > 50) {
                warnings.push({ code: 'MANY_CARDS', message: 'Large flashcard set may take time to create' });
            }
        }
        return warnings;
    }
    determineConfirmation(operation, errors) {
        if (errors.length > 0)
            return false;
        const destructiveTypes = [
            'delete_document',
            'delete_flashcard',
            'delete_quiz',
            'delete_calendar_event',
            'delete_room',
        ];
        if (destructiveTypes.includes(operation.type)) {
            return true;
        }
        return false;
    }
    async checkConflicts(operation, concurrent) {
        const conflicts = [];
        for (const other of concurrent) {
            if (other.id === operation.id)
                continue;
            if (operation.entity_id && other.entity_id === operation.entity_id) {
                if (operation.type.includes('delete') && !other.type.includes('delete')) {
                    conflicts.push(`Entity ${operation.entity_id} will be modified by another operation`);
                }
                if (operation.type.includes('create') && other.type.includes('delete')) {
                    conflicts.push(`Entity ${operation.entity_id} will be deleted by another operation`);
                }
            }
        }
        return { hasConflicts: conflicts.length > 0, conflicts };
    }
}
export function createGuardValidator() {
    return new GuardValidator();
}
//# sourceMappingURL=validator.js.map