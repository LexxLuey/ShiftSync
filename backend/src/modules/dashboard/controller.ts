import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import { getDashboardSummary } from './service.js';

const getRequestActor = (request: Request): { id: string; role: Role } => {
    if (!request.user) {
        throw new ForbiddenError('Not authenticated');
    }

    return request.user as { id: string; role: Role };
};

export const getSummary = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const actor = getRequestActor(request);
        const locationId = typeof request.query.locationId === 'string' ? request.query.locationId : undefined;
        const summary = await getDashboardSummary(actor, { locationId });
        response.status(200).json({ data: summary });
    } catch (error) {
        next(error);
    }
};
