import type { Prisma, Role } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import { getScopedLocationIdsForActor } from '../auth/scope.js';

type RequestActor = {
    id: string;
    role: Role;
};

type DashboardQuery = {
    locationId?: string | undefined;
};

const upcomingWindowEnd = (): Date => {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 14);
    return end;
};

export const getDashboardSummary = async (
    actor: RequestActor,
    query: DashboardQuery,
): Promise<Record<string, unknown>> => {
    const scopedLocationIds = await getScopedLocationIdsForActor(actor, query.locationId);
    const now = new Date();
    const nextTwoWeeks = upcomingWindowEnd();

    if (scopedLocationIds && scopedLocationIds.length === 0) {
        return {
            scope: { role: actor.role, locationIds: [] },
            stats: {
                centers: 0,
                users: 0,
                draftShifts: 0,
                publishedShifts: 0,
                openHeadcount: 0,
                upcomingShifts: 0,
            },
            upcoming: [],
            nextActions: ['Ask an admin to assign you to a center.'],
        };
    }

    const locationFilter: Prisma.LocationWhereInput = {
        isActive: true,
        deletedAt: null,
        ...(scopedLocationIds ? { id: { in: scopedLocationIds } } : {}),
    };
    const shiftLocationFilter: Prisma.ShiftWhereInput = {
        location: locationFilter,
    };
    const userLocationScope: Prisma.UserWhereInput = scopedLocationIds
        ? {
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
          }
        : {};

    const [centers, users, draftShifts, publishedShifts, upcomingShifts, upcoming] = await prismaClient.$transaction([
        prismaClient.location.count({ where: locationFilter }),
        prismaClient.user.count({
            where: {
                isActive: true,
                deletedAt: null,
                ...userLocationScope,
            },
        }),
        prismaClient.shift.count({
            where: {
                ...shiftLocationFilter,
                status: 'DRAFT',
                startTime: { gte: now },
            },
        }),
        prismaClient.shift.count({
            where: {
                ...shiftLocationFilter,
                status: 'PUBLISHED',
                startTime: { gte: now },
            },
        }),
        prismaClient.shift.count({
            where: {
                ...shiftLocationFilter,
                startTime: { gte: now, lte: nextTwoWeeks },
                ...(actor.role === 'STAFF'
                    ? {
                          status: 'PUBLISHED',
                          assignments: {
                              some: {
                                  userId: actor.id,
                                  status: 'ASSIGNED',
                              },
                          },
                      }
                    : {}),
            },
        }),
        prismaClient.shift.findMany({
            where: {
                ...shiftLocationFilter,
                startTime: { gte: now, lte: nextTwoWeeks },
                ...(actor.role === 'STAFF'
                    ? {
                          status: 'PUBLISHED',
                          assignments: {
                              some: {
                                  userId: actor.id,
                                  status: 'ASSIGNED',
                              },
                          },
                      }
                    : {}),
            },
            include: {
                location: {
                    select: { id: true, name: true, timezone: true },
                },
                assignments: {
                    where: { status: 'ASSIGNED' },
                    select: { id: true },
                },
            },
            orderBy: { startTime: 'asc' },
            take: 6,
        }),
    ]);

    const openHeadcount = upcoming.reduce((total, shift) => {
        const remaining = Math.max(0, shift.headcountNeeded - shift.assignments.length);
        return total + remaining;
    }, 0);

    const nextActions: string[] = [];
    if (actor.role === 'ADMIN') {
        if (centers === 0) nextActions.push('Create your first center.');
        if (users === 0) nextActions.push('Create managers and staff.');
        if (draftShifts > 0) nextActions.push('Review and publish draft shifts.');
        if (openHeadcount > 0) nextActions.push('Assign staff to open upcoming slots.');
    } else if (actor.role === 'MANAGER') {
        if (draftShifts > 0) nextActions.push('Publish draft shifts for your centers.');
        if (openHeadcount > 0) nextActions.push('Fill open headcount in your centers.');
        if (users === 0) nextActions.push('Create staff for your center.');
    } else if (upcomingShifts === 0) {
        nextActions.push('No upcoming assigned shifts in the next 14 days.');
    }

    if (nextActions.length === 0) {
        nextActions.push('Operations look steady for the next two weeks.');
    }

    return {
        scope: {
            role: actor.role,
            locationIds: scopedLocationIds ?? 'ALL',
        },
        stats: {
            centers,
            users,
            draftShifts,
            publishedShifts,
            openHeadcount,
            upcomingShifts,
        },
        upcoming: upcoming.map((shift) => ({
            id: shift.id,
            title: shift.title,
            status: shift.status,
            startTime: shift.startTime,
            endTime: shift.endTime,
            headcountNeeded: shift.headcountNeeded,
            assignedCount: shift.assignments.length,
            openHeadcount: Math.max(0, shift.headcountNeeded - shift.assignments.length),
            location: shift.location,
        })),
        nextActions,
    };
};
