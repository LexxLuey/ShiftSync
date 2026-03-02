import type { Role } from '@prisma/client';
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
    createdAt: true,
    updatedAt: true,
} as const;

export const listLocationsByActor = async (actor: RequestActor): Promise<Record<string, unknown>[]> => {
    if (actor.role === 'ADMIN') {
        const locations = await prismaClient.location.findMany({
            select: locationSelect,
            orderBy: { createdAt: 'desc' },
        });
        return locations as unknown as Record<string, unknown>[];
    }

    if (actor.role === 'MANAGER') {
        const locationLinks = await prismaClient.locationManager.findMany({
            where: { userId: actor.id },
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

export const createLocation = async (payload: {
    name: string;
    address: string;
    timezone: string;
}): Promise<Record<string, unknown>> => {
    const location = await prismaClient.location.create({
        data: payload,
        select: locationSelect,
    });

    return location as unknown as Record<string, unknown>;
};

export const updateLocation = async (
    locationId: string,
    payload: {
        name?: string | undefined;
        address?: string | undefined;
        timezone?: string | undefined;
    },
): Promise<Record<string, unknown>> => {
    const existing = await prismaClient.location.findUnique({
        where: { id: locationId },
        select: { id: true },
    });

    if (!existing) {
        throw new NotFoundError('Location not found', { locationId });
    }

    const updatedLocation = await prismaClient.location.update({
        where: { id: locationId },
        data: {
            ...(payload.name !== undefined ? { name: payload.name } : {}),
            ...(payload.address !== undefined ? { address: payload.address } : {}),
            ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
        },
        select: locationSelect,
    });

    return updatedLocation as unknown as Record<string, unknown>;
};

export const assignManager = async (
    locationId: string,
    managerUserId: string,
): Promise<Record<string, unknown>> => {
    const [location, user] = await prismaClient.$transaction([
        prismaClient.location.findUnique({
            where: { id: locationId },
            select: { id: true },
        }),
        prismaClient.user.findUnique({
            where: { id: managerUserId },
            select: { id: true, role: true },
        }),
    ]);

    if (!location) {
        throw new NotFoundError('Location not found', { locationId });
    }

    if (!user) {
        throw new NotFoundError('User not found', { managerUserId });
    }

    if (user.role !== 'MANAGER') {
        throw new ValidationError('Only users with MANAGER role can be assigned to a location');
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
        throw new ConflictError('Manager is already assigned to this location', {
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
