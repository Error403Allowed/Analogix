import { createGuardValidator, type GuardResult } from './validator';
import type { ValidationError, ValidationWarning } from '@/types/operations';

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

const BLOCKED_CONTENT = [
  '___grecaptcha_loaded',
  'grecaptcha.render',
];

export function validateContentSafety(content: string): GuardResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!content || typeof content !== 'string') {
    return { allowed: true, errors: [], warnings: [] };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      errors.push({
        code: 'DANGEROUS_CONTENT',
        message: 'Content contains potentially dangerous code',
      });
    }
  }

  for (const blocked of BLOCKED_CONTENT) {
    if (content.toLowerCase().includes(blocked.toLowerCase())) {
      errors.push({
        code: 'BLOCKED_CONTENT',
        message: 'Content contains blocked patterns',
      });
    }
  }

  if (content.length > 100000) {
    warnings.push({
      code: 'VERY_LARGE_CONTENT',
      message: 'Content is very large and may cause performance issues',
    });
  }

  return {
    allowed: errors.length === 0,
    errors,
    warnings,
  };
}

export function validatePermissions(
  userId: string,
  operation: string,
  entityOwnerId: string
): GuardResult {
  const errors: ValidationError[] = [];

  if (userId !== entityOwnerId) {
    errors.push({
      code: 'PERMISSION_DENIED',
      message: 'User does not have permission for this operation',
    });
  }

  return {
    allowed: errors.length === 0,
    errors,
    warnings: [],
  };
}

export { createGuardValidator };