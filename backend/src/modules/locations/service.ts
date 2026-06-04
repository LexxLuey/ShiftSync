import type { Prisma, Role } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from '../../lib/errors/customErrors.js';

type RequestActor = {
    id: string;
    role: Role;
};

const locationSelect = {
    id: true,
    name: true,
    address: true,
    timezone: true,
    isActive: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true,
} as const;

export const listLocationsByActor = async (actor: RequestActor): Promise<Record<string, unknown>[]> => {
    if (actor.role === 'ADMIN') {
        const locations = await prismaClient.location.findMany({
            where: {
                isActive: true,
                deletedAt: null,
            },
            select: locationSelect,
            orderBy: { createdAt: 'desc' },
        });
        return locations as unknown as Record<string, unknown>[];
    }

    if (actor.role === 'MANAGER') {
        const locationLinks = await prismaClient.locationManager.findMany({
            where: {
                userId: actor.id,
                location: {
                    isActive: true,
                    deletedAt: null,
                },
            },
            select: {
                location: {
                    select: locationSelect,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return locationLinks.map((item) => item.location) as unknown as Record<string, unknown>[];
    }

    const certifications = await prismaClient.certification.findMany({
        where: {
            userId: actor.id,
            revokedAt: null,
            location: {
                isActive: true,
                deletedAt: null,
            },
        },
        select: {
            location: {
                select: locationSelect,
            },
        },
        orderBy: { id: 'desc' },
    });

    return certifications.map((item) => item.location) as unknown as Record<string, unknown>[];
};

export const createLocation = async (
    actor: RequestActor,
    payload: {
        name: string;
        address: string;
        timezone: string;
    },
): Promise<Record<string, unknown>> => {
    const location = await prismaClient.$transaction(async (tx) => {
        const created = await tx.location.create({
            data: {
                ...payload,
                isActive: true,
                deletedAt: null,
            },
            select: locationSelect,
        });

        await tx.auditLog.create({
            data: {
                userId: actor.id,
                action: 'CREATE',
                entityType: 'LOCATION',
                entityId: created.id,
                afterState: created as Prisma.InputJsonValue,
            },
        });

        return created;
    });

    return location as unknown as Record<string, unknown>;
};

export const updateLocation = async (
    actor: RequestActor,
    locationId: string,
    payload: {
        name?: string | undefined;
        address?: string | undefined;
        timezone?: string | undefined;
    },
): Promise<Record<string, unknown>> => {
    const existing = await prismaClient.location.findFirst({
        where: {
            id: locationId,
            isActive: true,
            deletedAt: null,
        },
        select: locationSelect,
    });

    if (!existing) {
        throw new NotFoundError('Center not found', { locationId });
    }

    const updatedLocation = await prismaClient.$transaction(async (tx) => {
        const updated = await tx.location.update({
            where: { id: locationId },
            data: {
                ...(payload.name !== undefined ? { name: payload.name } : {}),
                ...(payload.address !== undefined ? { address: payload.address } : {}),
                ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
            },
            select: locationSelect,
        });

        await tx.auditLog.create({
            data: {
                userId: actor.id,
                action: 'UPDATE',
                entityType: 'LOCATION',
                entityId: locationId,
                beforeState: existing as Prisma.InputJsonValue,
                afterState: updated as Prisma.InputJsonValue,
            },
        });

        return updated;
    });

    return updatedLocation as unknown as Record<string, unknown>;
};

export const deactivateLocation = async (
    actor: RequestActor,
    locationId: string,
): Promise<Record<string, unknown>> => {
    const existing = await prismaClient.location.findFirst({
        where: {
            id: locationId,
            isActive: true,
            deletedAt: null,
        },
        select: locationSelect,
    });

    if (!existing) {
        throw new NotFoundError('Center not found', { locationId });
    }

    const deletedAt = new Date();
    const deactivated = await prismaClient.$transaction(async (tx) => {
        const updated = await tx.location.update({
            where: { id: locationId },
            data: {
                isActive: false,
                deletedAt,
            },
            select: locationSelect,
        });

        await tx.auditLog.create({
            data: {
                userId: actor.id,
                action: 'DELETE',
                entityType: 'LOCATION',
                entityId: locationId,
                beforeState: existing as Prisma.InputJsonValue,
                afterState: updated as Prisma.InputJsonValue,
            },
        });

        return updated;
    });

    return deactivated as unknown as Record<string, unknown>;
};

export const assignManager = async (
    locationId: string,
    managerUserId: string,
): Promise<Record<string, unknown>> => {
    const [location, user] = await prismaClient.$transaction([
        prismaClient.location.findFirst({
            where: {
                id: locationId,
                isActive: true,
                deletedAt: null,
            },
            select: { id: true },
        }),
        prismaClient.user.findFirst({
            where: {
                id: managerUserId,
                isActive: true,
                deletedAt: null,
            },
            select: { id: true, role: true },
        }),
    ]);

    if (!location) {
        throw new NotFoundError('Center not found', { locationId });
    }

    if (!user) {
        throw new NotFoundError('User not found', { managerUserId });
    }

    if (user.role !== 'MANAGER') {
        throw new ValidationError('Only users with MANAGER role can be assigned to a center');
    }

    const existingLink = await prismaClient.locationManager.findUnique({
        where: {
            locationId_userId: {
                locationId,
                userId: managerUserId,
            },
        },
        select: { id: true },
    });

    if (existingLink) {
        throw new ConflictError('Manager is already assigned to this center', {
            locationId,
            managerUserId,
        });
    }

    const managerAssignment = await prismaClient.locationManager.create({
        data: {
            locationId,
            userId: managerUserId,
        },
        include: {
            location: {
                select: locationSelect,
            },
            user: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                },
            },
        },
    });

    return managerAssignment as unknown as Record<string, unknown>;
};

export const removeManager = async (
    locationId: string,
    managerUserId: string,
): Promise<Record<string, unknown>> => {
    const existingLink = await prismaClient.locationManager.findUnique({
        where: {
            locationId_userId: {
                locationId,
                userId: managerUserId,
            },
        },
        include: {
            location: {
                select: locationSelect,
            },
            user: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                },
            },
        },
    });

    if (!existingLink) {
        throw new NotFoundError('Manager assignment not found', {
            locationId,
            managerUserId,
        });
    }

    await prismaClient.locationManager.delete({
        where: {
            id: existingLink.id,
        },
    });

    return existingLink as unknown as Record<string, unknown>;
};
