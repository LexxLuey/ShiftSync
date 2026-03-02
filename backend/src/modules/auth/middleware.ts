import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { AuthError, ForbiddenError } from '../../lib/errors/customErrors.js';
import { verifyJwt } from './service.js';

const parseBearerToken = (authorizationHeader?: string): string => {
    if (!authorizationHeader) {
        throw new AuthError('Missing Authorization header', null, [
            'Provide a valid Bearer token.',
        ]);
    }

    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        throw new AuthError('Invalid Authorization format', null, [
            'Use the format: Bearer <token>.',
        ]);
    }

    return token;
};

export const authenticate = (
    request: Request,
    response: Response,
    next: NextFunction,
): void => {
    try {
        const token = parseBearerToken(request.header('authorization'));
        const payload = verifyJwt(token);

        request.user = {
            id: payload.sub,
            role: payload.role,
        };

        next();
    } catch (error) {
        next(error);
    }
};

export const restrictTo = (...roles: Role[]) =>
    (request: Request, response: Response, next: NextFunction): void => {
        if (!request.user) {
            next(new AuthError('Not authenticated', null, ['Login to access this resource.']));
            return;
        }

        if (!roles.includes(request.user.role)) {
            next(new ForbiddenError('You do not have permission to access this resource'));
            return;
        }

        next();
    };
