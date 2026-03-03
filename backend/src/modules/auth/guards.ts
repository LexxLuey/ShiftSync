import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import prismaClient from '../../lib/db/prisma.js';

/**
 * Middleware to verify manager has access to a specific location
 * Admins bypass this check, managers must be assigned to the location
 */
export const verifyLocationAccess = (locationIdParamKey: string = 'locationId') =>
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const locationId = request.params[locationIdParamKey] as string | undefined;

            if (!locationId || typeof locationId !== 'string') {
                next(new ForbiddenError('Location ID not provided'));
                return;
            }

            // Admins can access any location
            if (request.user?.role === 'ADMIN') {
                next();
                return;
            }

            // Managers must be assigned to the location
            if (request.user?.role === 'MANAGER') {
                const isAssigned = await prismaClient.locationManager.findUnique({
                    where: {
                        locationId_userId: {
                            locationId,
                            userId: request.user.id,
                        },
                    },
                });

                if (!isAssigned) {
                    next(new ForbiddenError('You do not have access to this location'));
                    return;
                }
            }

            // STAFF cannot access manager endpoints
            if (request.user?.role === 'STAFF') {
                next(new ForbiddenError('This action requires manager privileges'));
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
