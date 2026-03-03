import type { NextFunction, Request, Response } from 'express';
import { AuthError } from '../lib/errors/customErrors.js';

const isTruthy = (value: string | undefined, defaultValue: boolean): boolean => {
    if (value === undefined) {
        return defaultValue;
    }

    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

export const isSwaggerEnabled = (): boolean =>
    isTruthy(process.env.SWAGGER_ENABLED, true);

export const shouldProtectDocs = (): boolean =>
    process.env.NODE_ENV === 'production' && isTruthy(process.env.SWAGGER_PROTECT_IN_PROD, true);

export const enforceDocsAccess = (
    request: Request,
    response: Response,
    next: NextFunction,
): void => {
    if (!shouldProtectDocs()) {
        next();
        return;
    }

    const docsToken = process.env.SWAGGER_DOCS_TOKEN;
    if (!docsToken) {
        next(
            new AuthError('SWAGGER_DOCS_TOKEN is not configured in production', null, [
                'Set SWAGGER_DOCS_TOKEN to protect documentation routes.',
            ]),
        );
        return;
    }

    const providedToken = request.header('x-docs-token');
    if (providedToken !== docsToken) {
        next(new AuthError('Unauthorized to access API docs', null, ['Provide valid x-docs-token header.']));
        return;
    }

    next();
};
