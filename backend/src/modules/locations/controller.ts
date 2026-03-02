import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import {
    assignManagerSchema,
    createLocationSchema,
    updateLocationSchema,
    uuidParamSchema,
    validateSchema,
} from '../../lib/validation/index.js';
import {
    assignManager,
    createLocation,
    listLocationsByActor,
    removeManager,
    updateLocation,
} from './service.js';

const getRequestActor = (request: Request): { id: string; role: Role } => {
    if (!request.user) {
        throw new ForbiddenError('Not authenticated');
    }

    return request.user as { id: string; role: Role };
};

export const getLocations = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const actor = getRequestActor(request);
        const locations = await listLocationsByActor(actor);
        response.status(200).json({ data: locations });
    } catch (error) {
        next(error);
    }
};

export const createLocationRecord = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const payload = validateSchema(createLocationSchema, request.body);
        const location = await createLocation(payload);
        response.status(201).json({ data: location });
    } catch (error) {
        next(error);
    }
};

export const updateLocationRecord = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const params = validateSchema(uuidParamSchema, request.params);
        const payload = validateSchema(updateLocationSchema, request.body);
        const location = await updateLocation(params.id, payload);
        response.status(200).json({ data: location });
    } catch (error) {
        next(error);
    }
};

export const assignLocationManager = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const params = validateSchema(uuidParamSchema, request.params);
        const payload = validateSchema(assignManagerSchema, request.body);
        const assignment = await assignManager(params.id, payload.userId);

        response.status(201).json({ data: assignment });
    } catch (error) {
        next(error);
    }
};

export const removeLocationManager = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const locationParams = validateSchema(uuidParamSchema, { id: request.params.id });
        const userParams = validateSchema(uuidParamSchema, { id: request.params.userId });
        const assignment = await removeManager(locationParams.id, userParams.id);

        response.status(200).json({ data: assignment });
    } catch (error) {
        next(error);
    }
};
