import type { Role } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors/customErrors.js';

export type RequestActor = {
    id: string;
    role: Role;
};

export const getManagerLocationIds = async (actorId: string): Promise<string[]> => {
    const managerLocations = await prismaClient.locationManager.findMany({
        where: {
            userId: actorId,
            location: {
                isActive: true,
                deletedAt: null,
            },
        },
        select: { locationId: true },
    });

    return managerLocations.map((entry) => entry.locationId);
};

export const getStaffLocationIds = async (actorId: string): Promise<string[]> => {
    const certifications = await prismaClient.certification.findMany({
        where: {
            userId: actorId,
            revokedAt: null,
            location: {
                isActive: true,
                deletedAt: null,
            },
        },
        select: { locationId: true },
    });

    return certifications.map((entry) => entry.locationId);
};

export const getScopedLocationIdsForActor = async (
    actor: RequestActor,
    locationId?: string,
): Promise<string[] | undefined> => {
    if (actor.role === 'ADMIN') {
        if (locationId) {
            const location = await prismaClient.location.findFirst({
                where: {
                    id: locationId,
                    isActive: true,
                    deletedAt: null,
                },
                select: { id: true },
            });

            if (!location) {
                throw new NotFoundError('Center not found', { locationId });
            }

            return [locationId];
        }

        return undefined;
    }

    const visibleLocationIds =
        actor.role === 'MANAGER'
            ? await getManagerLocationIds(actor.id)
            : await getStaffLocationIds(actor.id);

    if (locationId) {
        if (!visibleLocationIds.includes(locationId)) {
            throw new ForbiddenError('You do not have access to this center', { locationId });
        }

        return [locationId];
    }

    return visibleLocationIds;
};

export const ensureManagerCanUseLocations = async (
    actor: RequestActor,
    locationIds: string[],
): Promise<void> => {
    const uniqueLocationIds = Array.from(new Set(locationIds));
    if (uniqueLocationIds.length === 0) {
        return;
    }

    if (actor.role === 'ADMIN') {
        const activeLocationCount = await prismaClient.location.count({
            where: {
                id: { in: uniqueLocationIds },
                isActive: true,
                deletedAt: null,
            },
        });

        if (activeLocationCount !== uniqueLocationIds.length) {
            throw new NotFoundError('One or more centers were not found', {
                locationIds: uniqueLocationIds,
            });
        }

        return;
    }

    if (actor.role !== 'MANAGER') {
        throw new ForbiddenError('This action requires manager privileges');
    }

    const managedLocationIds = await getManagerLocationIds(actor.id);
    const unmanagedLocationIds = uniqueLocationIds.filter(
        (locationId) => !managedLocationIds.includes(locationId),
    );

    if (unmanagedLocationIds.length > 0) {
        throw new ForbiddenError('Manager is not assigned to one or more centers', {
            locationIds: unmanagedLocationIds,
        });
    }
};
