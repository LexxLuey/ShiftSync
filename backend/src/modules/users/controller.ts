import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import {
    addCertificationSchema,
    paginationQuerySchema,
    updateUserSchema,
    uuidParamSchema,
    validateSchema,
} from '../../lib/validation/index.js';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import {
    addCertification,
    getUserById,
    listUsers,
    revokeCertification,
    updateUser,
} from './service.js';

const getRequestActor = (request: Request): { id: string; role: Role } => {
    if (!request.user) {
        throw new ForbiddenError('Not authenticated');
    }

    return request.user as { id: string; role: Role };
};

export const getUsers = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const query = validateSchema(paginationQuerySchema, request.query);
        const result = await listUsers(query);
        response.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getUser = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const actor = getRequestActor(request);
        const params = validateSchema(uuidParamSchema, request.params);

        if (actor.role !== 'ADMIN' && actor.id !== params.id) {
            throw new ForbiddenError('You can only view your own profile');
        }

        const user = await getUserById(params.id);
        response.status(200).json({ data: user });
    } catch (error) {
        next(error);
    }
};

export const updateUserProfile = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const actor = getRequestActor(request);
        const params = validateSchema(uuidParamSchema, request.params);
        const payload = validateSchema(updateUserSchema, request.body);

        const user = await updateUser(actor, params.id, payload);
        response.status(200).json({ data: user });
    } catch (error) {
        next(error);
    }
};

export const createCertification = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const actor = getRequestActor(request);
        const params = validateSchema(uuidParamSchema, request.params);
        const payload = validateSchema(addCertificationSchema, request.body);

        const certification = await addCertification(actor, params.id, payload.locationId);
        response.status(201).json({ data: certification });
    } catch (error) {
        next(error);
    }
};

export const removeCertification = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const actor = getRequestActor(request);
        const userParams = validateSchema(uuidParamSchema, { id: request.params.id });
        const locationParams = validateSchema(uuidParamSchema, { id: request.params.locationId });

        const certification = await revokeCertification(actor, userParams.id, locationParams.id);
        response.status(200).json({ data: certification });
    } catch (error) {
        next(error);
    }
};
