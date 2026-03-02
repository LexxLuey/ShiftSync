import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors/customErrors.js';

const errorHandler = (
    error: Error,
    request: Request,
    response: Response,
    next: NextFunction,
): void => {
    if (error instanceof AppError) {
        response.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
                severity: error.severity,
                suggestions: error.suggestions,
            },
        });
        return;
    }

    if (error instanceof ZodError) {
        response.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request payload',
                details: error.flatten(),
                severity: 'error',
                suggestions: ['Fix the invalid fields and try again.'],
            },
        });
        return;
    }

    response.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal Server Error',
            details: null,
            severity: 'critical',
            suggestions: ['Retry the request.', 'Contact support if the problem persists.'],
        },
    });
};

export default errorHandler;
