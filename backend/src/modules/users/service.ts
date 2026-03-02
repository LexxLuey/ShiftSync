import type { Role } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from '../../lib/errors/customErrors.js';

type RequestActor = {
    id: string;
    role: Role;
};

const userPublicSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    phone: true,
    createdAt: true,
    updatedAt: true,
} as const;

const ensureUserExists = async (userId: string): Promise<void> => {
    const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { id: true },
    });
    if (!user) {
        throw new NotFoundError('User not found', { userId });
    }
};

const ensureManagerLocationAccess = async (actorId: string, locationId: string): Promise<void> => {
    const locationAccess = await prismaClient.locationManager.findUnique({
        where: {
            locationId_userId: {
                locationId,
                userId: actorId,
            },
        },
        select: { id: true },
    });

    if (!locationAccess) {
        throw new ForbiddenError('Manager is not assigned to this location', { locationId });
    }
};

export const listUsers = async (query: {
    page: number;
    limit: number;
    role?: Role | undefined;
    locationId?: string | undefined;
}): Promise<{
    data: Record<string, unknown>[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
    const whereClause = {
        ...(query.role ? { role: query.role } : {}),
        ...(query.locationId
            ? {
                certifications: {
                    some: {
                        locationId: query.locationId,
                        revokedAt: null,
                    },
                },
            }
            : {}),
    };

    const [total, users] = await prismaClient.$transaction([
        prismaClient.user.count({ where: whereClause }),
        prismaClient.user.findMany({
            where: whereClause,
            select: userPublicSelect,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return {
        data: users as unknown as Record<string, unknown>[],
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
};

export const getUserById = async (userId: string): Promise<Record<string, unknown>> => {
    const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: {
            ...userPublicSelect,
            certifications: {
                select: {
                    id: true,
                    locationId: true,
                    revokedAt: true,
                    location: {
                        select: {
                            id: true,
                            name: true,
                            timezone: true,
                        },
                    },
                },
            },
            skills: {
                select: {
                    skill: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            managerLocations: {
                select: {
                    location: {
                        select: {
                            id: true,
                            name: true,
                            timezone: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) {
        throw new NotFoundError('User not found', { userId });
    }

    return user as unknown as Record<string, unknown>;
};

export const updateUser = async (
    actor: RequestActor,
    userId: string,
    payload: {
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | null | undefined;
        role?: Role | undefined;
    },
): Promise<Record<string, unknown>> => {
    if (actor.role !== 'ADMIN' && actor.id !== userId) {
        throw new ForbiddenError('You can only update your own profile');
    }

    if (actor.role !== 'ADMIN' && payload.role) {
        throw new ForbiddenError('Only admin can change user role');
    }

    await ensureUserExists(userId);

    const updatedUser = await prismaClient.user.update({
        where: { id: userId },
        data: {
            ...(payload.firstName !== undefined ? { firstName: payload.firstName } : {}),
            ...(payload.lastName !== undefined ? { lastName: payload.lastName } : {}),
            ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
            ...(payload.role !== undefined ? { role: payload.role } : {}),
        },
        select: userPublicSelect,
    });

    return updatedUser as unknown as Record<string, unknown>;
};

export const addCertification = async (
    actor: RequestActor,
    userId: string,
    locationId: string,
): Promise<Record<string, unknown>> => {
    await ensureUserExists(userId);

    const location = await prismaClient.location.findUnique({
        where: { id: locationId },
        select: { id: true },
    });
    if (!location) {
        throw new NotFoundError('Location not found', { locationId });
    }

    if (actor.role === 'MANAGER') {
        await ensureManagerLocationAccess(actor.id, locationId);
    }

    const existingCertification = await prismaClient.certification.findUnique({
        where: {
            userId_locationId: {
                userId,
                locationId,
            },
        },
    });

    if (existingCertification && !existingCertification.revokedAt) {
        throw new ConflictError('User is already certified for this location', {
            userId,
            locationId,
        });
    }

    if (existingCertification && existingCertification.revokedAt) {
        const reactivatedCertification = await prismaClient.certification.update({
            where: { id: existingCertification.id },
            data: { revokedAt: null },
            include: {
                location: {
                    select: { id: true, name: true, timezone: true },
                },
            },
        });

        return reactivatedCertification as unknown as Record<string, unknown>;
    }

    const certification = await prismaClient.certification.create({
        data: {
            userId,
            locationId,
        },
        include: {
            location: {
                select: { id: true, name: true, timezone: true },
            },
        },
    });

    return certification as unknown as Record<string, unknown>;
};

export const revokeCertification = async (
    actor: RequestActor,
    userId: string,
    locationId: string,
): Promise<Record<string, unknown>> => {
    await ensureUserExists(userId);

    if (actor.role === 'MANAGER') {
        await ensureManagerLocationAccess(actor.id, locationId);
    }

    const certification = await prismaClient.certification.findUnique({
        where: {
            userId_locationId: {
                userId,
                locationId,
            },
        },
    });

    if (!certification) {
        throw new NotFoundError('Certification not found', { userId, locationId });
    }

    if (certification.revokedAt) {
        throw new ValidationError('Certification is already revoked', { userId, locationId });
    }

    const revoked = await prismaClient.certification.update({
        where: { id: certification.id },
        data: {
            revokedAt: new Date(),
        },
        include: {
            location: {
                select: { id: true, name: true, timezone: true },
            },
        },
    });

    return revoked as unknown as Record<string, unknown>;
};
