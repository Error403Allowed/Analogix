import { createGuardValidator } from './validator';
const DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
];
const BLOCKED_CONTENT = [
    '___grecaptcha_loaded',
    'grecaptcha.render',
];
export function validateContentSafety(content) {
    const errors: { code: string; message: string }[] = [];
    const warnings: { code: string; message: string }[] = [];
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
export function validatePermissions(userId, operation, entityOwnerId) {
    const errors: { code: string; message: string }[] = [];
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
//# sourceMappingURL=content-safety.js.map