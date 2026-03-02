export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export class AppError extends Error {
    public readonly statusCode: number;

    public readonly code: string;

    public readonly details: unknown;

    public readonly severity: ErrorSeverity;

    public readonly suggestions: string[];

    constructor(
        message: string,
        options: {
            statusCode: number;
            code: string;
            details?: unknown;
            severity?: ErrorSeverity | undefined;
            suggestions?: string[] | undefined;
        },
    ) {
        super(message);
        this.name = 'AppError';
        this.statusCode = options.statusCode;
        this.code = options.code;
        this.details = options.details ?? null;
        this.severity = options.severity ?? 'error';
        this.suggestions = options.suggestions ?? [];
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: unknown, suggestions?: string[]) {
        super(message, {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            details,
            suggestions,
        });
    }
}

export class AuthError extends AppError {
    constructor(message = 'Authentication failed', details?: unknown, suggestions?: string[]) {
        super(message, {
            statusCode: 401,
            code: 'AUTH_ERROR',
            details,
            suggestions,
        });
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', details?: unknown, suggestions?: string[]) {
        super(message, {
            statusCode: 403,
            code: 'FORBIDDEN',
            details,
            suggestions,
        });
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', details?: unknown, suggestions?: string[]) {
        super(message, {
            statusCode: 404,
            code: 'NOT_FOUND',
            details,
            suggestions,
        });
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: unknown, suggestions?: string[]) {
        super(message, {
            statusCode: 409,
            code: 'CONFLICT',
            details,
            suggestions,
        });
    }
}
