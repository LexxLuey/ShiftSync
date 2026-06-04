import bcrypt from 'bcryptjs';
import type { Prisma, Role } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from '../../lib/errors/customErrors.js';
import {
    ensureManagerCanUseLocations,
    getManagerLocationIds,
    type RequestActor,
} from '../auth/scope.js';

const SALT_ROUNDS = 10;

const userPublicSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    phone: true,
    isActive: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true,
} as const;

const listUserSelect = {
    ...userPublicSelect,
    certifications: {
        where: {
            revokedAt: null,
            location: {
                isActive: true,
                deletedAt: null,
            },
        },
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
    managerLocations: {
        where: {
            location: {
                isActive: true,
                deletedAt: null,
            },
        },
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
} as const;

type ManagedUserPayload = {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    phone?: string | undefined;
    locationIds?: string[] | undefined;
};

type UpdateManagedUserPayload = {
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | null | undefined;
    role?: Role | undefined;
    locationIds?: string[] | undefined;
};

type ListUserRecord = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    phone: string | null;
    isActive: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    certifications: Array<{
        id: string;
        locationId: string;
        revokedAt: Date | null;
        location: { id: string; name: string; timezone: string } | null;
    }>;
    managerLocations: Array<{
        location: { id: string; name: string; timezone: string } | null;
    }>;
    skills: Array<{
        skill: { id: string; name: string } | null;
    }>;
};

const normalizeListUser = (user: ListUserRecord): Record<string, unknown> => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    deletedAt: user.deletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    certifications: user.certifications,
    managerLocations: user.managerLocations,
    skills: user.skills
        .map((entry) => entry.skill)
        .filter((skill): skill is { id: string; name: string } => Boolean(skill)),
});

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
    await ensureManagerCanUseLocations({ id: actorId, role: 'MANAGER' }, [locationId]);
};

const getActiveUserForScopedMutation = async (actor: RequestActor, userId: string) => {
    const user = await prismaClient.user.findFirst({
        where: {
            id: userId,
            isActive: true,
            deletedAt: null,
        },
        select: {
            ...userPublicSelect,
            certifications: {
                where: { revokedAt: null },
                select: { locationId: true },
            },
            managerLocations: {
                select: { locationId: true },
            },
        },
    });

    if (!user) {
        throw new NotFoundError('User not found', { userId });
    }

    if (actor.role === 'ADMIN' || actor.id === userId) {
        return user;
    }

    if (actor.role !== 'MANAGER') {
        throw new ForbiddenError('You can only update your own profile');
    }

    if (user.role === 'ADMIN') {
        throw new ForbiddenError('Managers cannot modify admin users');
    }

    const managedLocationIds = await getManagerLocationIds(actor.id);
    const userLocationIds = [
        ...user.certifications.map((entry) => entry.locationId),
        ...user.managerLocations.map((entry) => entry.locationId),
    ];
    const hasSharedLocation = userLocationIds.some((locationId) => managedLocationIds.includes(locationId));

    if (!hasSharedLocation) {
        throw new ForbiddenError('Manager does not have access to this user');
    }

    return user;
};

const validateUserManagementPayload = async (
    actor: RequestActor,
    role: Role,
    locationIds: string[],
): Promise<void> => {
    if (actor.role !== 'ADMIN' && actor.role !== 'MANAGER') {
        throw new ForbiddenError('This action requires admin or manager privileges');
    }

    if (actor.role === 'MANAGER' && role === 'ADMIN') {
        throw new ForbiddenError('Managers cannot create or promote admin users');
    }

    if (role !== 'ADMIN' && locationIds.length === 0) {
        throw new ValidationError('At least one center is required for manager and staff users', {
            role,
        }, ['Select a center and try again.']);
    }

    await ensureManagerCanUseLocations(actor, locationIds);
};

const syncUserLocations = async (
    tx: Prisma.TransactionClient,
    actor: RequestActor,
    userId: string,
    role: Role,
    locationIds: string[],
): Promise<void> => {
    if (role === 'ADMIN') {
        await tx.certification.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        await tx.locationManager.deleteMany({ where: { userId } });
        return;
    }

    const uniqueLocationIds = Array.from(new Set(locationIds));
    const managedScope = actor.role === 'MANAGER' ? await getManagerLocationIds(actor.id) : undefined;
    const scopedFilter = managedScope ? { in: managedScope } : undefined;

    if (role === 'MANAGER') {
        await tx.certification.updateMany({
            where: {
                userId,
                revokedAt: null,
                ...(scopedFilter ? { locationId: scopedFilter } : {}),
            },
            data: { revokedAt: new Date() },
        });
        await tx.locationManager.deleteMany({
            where: {
                userId,
                ...(scopedFilter ? { locationId: scopedFilter } : {}),
            },
        });
        await Promise.all(
            uniqueLocationIds.map((locationId) =>
                tx.locationManager.upsert({
                    where: { locationId_userId: { locationId, userId } },
                    update: {},
                    create: { locationId, userId },
                }),
            ),
        );
        return;
    }

    await tx.locationManager.deleteMany({
        where: {
            userId,
            ...(scopedFilter ? { locationId: scopedFilter } : {}),
        },
    });
    const revokedCertificationLocationFilter = scopedFilter
        ? { in: managedScope as string[], notIn: uniqueLocationIds }
        : { notIn: uniqueLocationIds };
    await tx.certification.updateMany({
        where: {
            userId,
            revokedAt: null,
            locationId: revokedCertificationLocationFilter,
        },
        data: { revokedAt: new Date() },
    });
    await Promise.all(
        uniqueLocationIds.map(async (locationId) => {
            const existingCertification = await tx.certification.findUnique({
                where: { userId_locationId: { userId, locationId } },
                select: { id: true, revokedAt: true },
            });

            if (existingCertification) {
                await tx.certification.update({
                    where: { id: existingCertification.id },
                    data: { revokedAt: null },
                });
                return;
            }

            await tx.certification.create({ data: { userId, locationId } });
        }),
    );
};

export const listUsers = async (
    actor: RequestActor,
    query: {
        page: number;
        limit: number;
        role?: Role | undefined;
        locationId?: string | undefined;
    },
): Promise<{
    data: Record<string, unknown>[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
    if (actor.role === 'MANAGER') {
        const managedLocationIds = await getManagerLocationIds(actor.id);

        if (managedLocationIds.length === 0) {
            return {
                data: [],
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    total: 0,
                    totalPages: 1,
                },
            };
        }

        if (query.locationId && !managedLocationIds.includes(query.locationId)) {
            throw new ForbiddenError('Manager is not assigned to this center', {
                locationId: query.locationId,
            });
        }

        const scopedLocationIds = query.locationId ? [query.locationId] : managedLocationIds;
        const whereClause: Prisma.UserWhereInput = {
            isActive: true,
            deletedAt: null,
            ...(query.role ? { role: query.role } : {}),
            OR: [
                {
                    certifications: {
                        some: {
                            locationId: { in: scopedLocationIds },
                            revokedAt: null,
                        },
                    },
                },
                {
                    managerLocations: {
                        some: {
                            locationId: { in: scopedLocationIds },
                        },
                    },
                },
            ],
        };

        const [total, users] = await prismaClient.$transaction([
            prismaClient.user.count({ where: whereClause }),
            prismaClient.user.findMany({
                where: whereClause,
                select: listUserSelect,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return {
            data: users.map((user) => normalizeListUser(user as unknown as ListUserRecord)),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / query.limit)),
            },
        };
    }

    const whereClause: Prisma.UserWhereInput = {
        isActive: true,
        deletedAt: null,
        ...(query.role ? { role: query.role } : {}),
        ...(query.locationId
            ? {
                  OR: [
                      {
                          certifications: {
                              some: {
                                  locationId: query.locationId,
                                  revokedAt: null,
                              },
                          },
                      },
                      {
                          managerLocations: {
                              some: {
                                  locationId: query.locationId,
                              },
                          },
                      },
                  ],
              }
            : {}),
    };

    const [total, users] = await prismaClient.$transaction([
        prismaClient.user.count({ where: whereClause }),
        prismaClient.user.findMany({
            where: whereClause,
            select: listUserSelect,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return {
        data: users.map((user) => normalizeListUser(user as unknown as ListUserRecord)),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
};

export const createUser = async (
    actor: RequestActor,
    payload: ManagedUserPayload,
): Promise<Record<string, unknown>> => {
    const locationIds = Array.from(new Set(payload.locationIds ?? []));
    await validateUserManagementPayload(actor, payload.role, locationIds);

    const existingUser = await prismaClient.user.findUnique({
        where: { email: payload.email },
        select: { id: true },
    });

    if (existingUser) {
        throw new ConflictError('Email is already registered', { email: payload.email }, [
            'Use a different email address.',
        ]);
    }

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const createdUser = await prismaClient.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: payload.email,
                password: passwordHash,
                firstName: payload.firstName,
                lastName: payload.lastName,
                role: payload.role,
                phone: payload.phone ?? null,
                isActive: true,
                deletedAt: null,
            },
            select: userPublicSelect,
        });

        await syncUserLocations(tx, actor, user.id, payload.role, locationIds);

        await tx.auditLog.create({
            data: {
                userId: actor.id,
                action: 'CREATE',
                entityType: 'USER',
                entityId: user.id,
                afterState: {
                    ...user,
                    locationIds,
                } as Prisma.InputJsonValue,
            },
        });

        return user;
    });

    return createdUser as unknown as Record<string, unknown>;
};

export const getUserById = async (
    actor: RequestActor,
    userId: string,
): Promise<Record<string, unknown>> => {
    if (actor.role !== 'ADMIN' && actor.id !== userId) {
        if (actor.role !== 'MANAGER') {
            throw new ForbiddenError('You can only view your own profile');
        }

        const managedLocationIds = await getManagerLocationIds(actor.id);
        if (managedLocationIds.length === 0) {
            throw new ForbiddenError('Manager does not have access to this user');
        }

        const hasScopedAccess = await prismaClient.user.findFirst({
            where: {
                id: userId,
                isActive: true,
                deletedAt: null,
                OR: [
                    {
                        certifications: {
                            some: {
                                locationId: { in: managedLocationIds },
                                revokedAt: null,
                            },
                        },
                    },
                    {
                        managerLocations: {
                            some: {
                                locationId: { in: managedLocationIds },
                            },
                        },
                    },
                ],
            },
            select: { id: true },
        });

        if (!hasScopedAccess) {
            throw new ForbiddenError('Manager does not have access to this user');
        }
    }

    const user = await prismaClient.user.findFirst({
        where: {
            id: userId,
            isActive: true,
            deletedAt: null,
        },
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
    payload: UpdateManagedUserPayload,
): Promise<Record<string, unknown>> => {
    const existingUser = await getActiveUserForScopedMutation(actor, userId);

    if (actor.role !== 'ADMIN' && actor.id === userId && (payload.role || payload.locationIds)) {
        throw new ForbiddenError('Managers and staff cannot change their own role or centers');
    }

    const nextRole = payload.role ?? existingUser.role;
    const nextLocationIds = payload.locationIds
        ? Array.from(new Set(payload.locationIds))
        : [
              ...existingUser.certifications.map((entry) => entry.locationId),
              ...existingUser.managerLocations.map((entry) => entry.locationId),
          ];

    if (payload.role || payload.locationIds) {
        await validateUserManagementPayload(actor, nextRole, nextLocationIds);
    }

    const updatedUser = await prismaClient.$transaction(async (tx) => {
        const user = await tx.user.update({
            where: { id: userId },
            data: {
                ...(payload.firstName !== undefined ? { firstName: payload.firstName } : {}),
                ...(payload.lastName !== undefined ? { lastName: payload.lastName } : {}),
                ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
                ...(payload.role !== undefined ? { role: payload.role } : {}),
            },
            select: userPublicSelect,
        });

        if (payload.role || payload.locationIds) {
            await syncUserLocations(tx, actor, userId, nextRole, nextLocationIds);
        }

        await tx.auditLog.create({
            data: {
                userId: actor.id,
                action: existingUser.role !== nextRole ? 'ROLE_CHANGE' : 'UPDATE',
                entityType: 'USER',
                entityId: userId,
                beforeState: existingUser as Prisma.InputJsonValue,
                afterState: {
                    ...user,
                    locationIds: nextLocationIds,
                } as Prisma.InputJsonValue,
            },
        });

        return user;
    });

    return updatedUser as unknown as Record<string, unknown>;
};

export const deactivateUser = async (
    actor: RequestActor,
    userId: string,
): Promise<Record<string, unknown>> => {
    if (actor.id === userId) {
        throw new ValidationError('You cannot deactivate your own account', { userId }, [
            'Ask another admin to deactivate this account.',
        ]);
    }

    const existingUser = await getActiveUserForScopedMutation(actor, userId);
    const deactivatedAt = new Date();

    const deactivatedUser = await prismaClient.$transaction(async (tx) => {
        const user = await tx.user.update({
            where: { id: userId },
            data: {
                isActive: false,
                deletedAt: deactivatedAt,
            },
            select: userPublicSelect,
        });

        await tx.auditLog.create({
            data: {
                userId: actor.id,
                action: 'DELETE',
                entityType: 'USER',
                entityId: userId,
                beforeState: existingUser as Prisma.InputJsonValue,
                afterState: user as Prisma.InputJsonValue,
            },
        });

        return user;
    });

    return deactivatedUser as unknown as Record<string, unknown>;
};

export const addCertification = async (
    actor: RequestActor,
    userId: string,
    locationId: string,
): Promise<Record<string, unknown>> => {
    await ensureUserExists(userId);

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
        throw new ConflictError('User is already certified for this center', {
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
