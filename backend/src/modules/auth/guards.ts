import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, NotFoundError } from '../../lib/errors/customErrors.js';
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
                    include: {
                        location: {
                            select: { isActive: true, deletedAt: true },
                        },
                    },
                });

                if (!isAssigned || !isAssigned.location.isActive || isAssigned.location.deletedAt) {
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

const enforceManagerLocation = async (
    managerId: string,
    locationId: string,
): Promise<void> => {
    const isAssigned = await prismaClient.locationManager.findUnique({
        where: {
            locationId_userId: {
                locationId,
                userId: managerId,
            },
        },
        include: {
            location: {
                select: { isActive: true, deletedAt: true },
            },
        },
    });

    if (!isAssigned || !isAssigned.location.isActive || isAssigned.location.deletedAt) {
        throw new ForbiddenError('You do not have access to this location', { locationId });
    }
};

const enforceStaffCertification = async (
    staffId: string,
    locationId: string,
): Promise<void> => {
    const certification = await prismaClient.certification.findUnique({
        where: {
            userId_locationId: {
                userId: staffId,
                locationId,
            },
        },
        include: {
            location: {
                select: { isActive: true, deletedAt: true },
            },
        },
    });

    if (!certification || certification.revokedAt || !certification.location.isActive || certification.location.deletedAt) {
        throw new ForbiddenError('You do not have access to this location', { locationId });
    }
};

export const verifyLocationVisibility = (locationIdParamKey: string = 'locationId') =>
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const locationId = request.params[locationIdParamKey] as string | undefined;

            if (!locationId || typeof locationId !== 'string') {
                next(new ForbiddenError('Location ID not provided'));
                return;
            }

            if (request.user?.role === 'ADMIN') {
                next();
                return;
            }

            if (request.user?.role === 'MANAGER') {
                await enforceManagerLocation(request.user.id, locationId);
                next();
                return;
            }

            if (request.user?.role === 'STAFF') {
                await enforceStaffCertification(request.user.id, locationId);
                next();
                return;
            }

            next(new ForbiddenError('Not authorized to access this location'));
        } catch (error) {
            next(error);
        }
    };

export const verifyShiftAccess = (shiftIdParamKey: string = 'shiftId') =>
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const shiftId = request.params[shiftIdParamKey] as string | undefined;

            if (!shiftId || typeof shiftId !== 'string') {
                next(new ForbiddenError('Shift ID not provided'));
                return;
            }

            const shift = await prismaClient.shift.findUnique({
                where: { id: shiftId },
                select: { id: true, locationId: true },
            });

            if (!shift) {
                next(new NotFoundError('Shift not found', { shiftId }));
                return;
            }

            if (request.user?.role === 'ADMIN') {
                next();
                return;
            }

            if (request.user?.role === 'MANAGER') {
                await enforceManagerLocation(request.user.id, shift.locationId);
                next();
                return;
            }

            next(new ForbiddenError('This action requires manager privileges'));
        } catch (error) {
            next(error);
        }
    };

export const verifyShiftVisibility = (shiftIdParamKey: string = 'shiftId') =>
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const shiftId = request.params[shiftIdParamKey] as string | undefined;

            if (!shiftId || typeof shiftId !== 'string') {
                next(new ForbiddenError('Shift ID not provided'));
                return;
            }

            const shift = await prismaClient.shift.findUnique({
                where: { id: shiftId },
                select: { id: true, locationId: true },
            });

            if (!shift) {
                next(new NotFoundError('Shift not found', { shiftId }));
                return;
            }

            if (request.user?.role === 'ADMIN') {
                next();
                return;
            }

            if (request.user?.role === 'MANAGER') {
                await enforceManagerLocation(request.user.id, shift.locationId);
                next();
                return;
            }

            if (request.user?.role === 'STAFF') {
                await enforceStaffCertification(request.user.id, shift.locationId);
                next();
                return;
            }

            next(new ForbiddenError('Not authorized to access this shift'));
        } catch (error) {
            next(error);
        }
    };

export const verifyAssignmentAccess = (assignmentIdParamKey: string = 'assignmentId') =>
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const assignmentId = request.params[assignmentIdParamKey] as string | undefined;

            if (!assignmentId || typeof assignmentId !== 'string') {
                next(new ForbiddenError('Assignment ID not provided'));
                return;
            }

            const assignment = await prismaClient.shiftAssignment.findUnique({
                where: { id: assignmentId },
                select: {
                    id: true,
                    shift: {
                        select: {
                            locationId: true,
                        },
                    },
                },
            });

            if (!assignment) {
                next(new NotFoundError('Assignment not found', { assignmentId }));
                return;
            }

            if (request.user?.role === 'ADMIN') {
                next();
                return;
            }

            if (request.user?.role === 'MANAGER') {
                await enforceManagerLocation(request.user.id, assignment.shift.locationId);
                next();
                return;
            }

            next(new ForbiddenError('This action requires manager privileges'));
        } catch (error) {
            next(error);
        }
    };
