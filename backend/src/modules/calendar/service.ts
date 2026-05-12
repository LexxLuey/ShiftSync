import type { Role } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import type { CalendarQuery } from './validation.js';

type CalendarActor = {
  id: string;
  role: Role;
};

const parseUtcDateStart = (dateOnly: string): Date => new Date(`${dateOnly}T00:00:00.000Z`);

const parseUtcDateEndExclusive = (dateOnly: string): Date => {
  const endDate = parseUtcDateStart(dateOnly);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return endDate;
};

const getScopedLocationIds = async (
  actor: CalendarActor,
  locationId?: string,
): Promise<string[] | undefined> => {
  if (actor.role === 'ADMIN') {
    return locationId ? [locationId] : undefined;
  }

  if (actor.role === 'MANAGER') {
    const managerLocations = await prismaClient.locationManager.findMany({
      where: { userId: actor.id },
      select: { locationId: true },
    });
    const managedLocationIds = managerLocations.map((entry) => entry.locationId);

    if (locationId) {
      if (!managedLocationIds.includes(locationId)) {
        throw new ForbiddenError('You do not have access to this center', { locationId });
      }
      return [locationId];
    }

    return managedLocationIds;
  }

  const staffCertifications = await prismaClient.certification.findMany({
    where: {
      userId: actor.id,
      revokedAt: null,
    },
    select: { locationId: true },
  });
  const staffLocationIds = staffCertifications.map((entry) => entry.locationId);

  if (locationId) {
    if (!staffLocationIds.includes(locationId)) {
      throw new ForbiddenError('You do not have access to this center', { locationId });
    }
    return [locationId];
  }

  return staffLocationIds;
};

export const listCalendarShifts = async (
  actor: CalendarActor,
  query: CalendarQuery,
): Promise<{ data: unknown[]; count: number }> => {
  const rangeStart = parseUtcDateStart(query.startDate);
  const rangeEndExclusive = parseUtcDateEndExclusive(query.endDate);
  const scopedLocationIds = await getScopedLocationIds(actor, query.locationId);

  if (scopedLocationIds && scopedLocationIds.length === 0) {
    return { data: [], count: 0 };
  }

  const effectiveMine = actor.role === 'STAFF' ? true : query.mine;
  const assignedUserId = effectiveMine ? actor.id : query.assignedUserId;

  const whereClause = {
    status: 'PUBLISHED' as const,
    startTime: { lt: rangeEndExclusive },
    endTime: { gte: rangeStart },
    ...(scopedLocationIds ? { locationId: { in: scopedLocationIds } } : {}),
    ...(query.title ? { title: { contains: query.title, mode: 'insensitive' as const } } : {}),
    ...(assignedUserId
      ? {
          assignments: {
            some: {
              userId: assignedUserId,
              status: 'ASSIGNED' as const,
            },
          },
        }
      : {}),
  };

  const shifts = await prismaClient.shift.findMany({
    where: whereClause,
    include: {
      location: {
        select: {
          id: true,
          name: true,
          timezone: true,
        },
      },
      requiredSkill: {
        select: {
          id: true,
          name: true,
        },
      },
      assignments: {
        where: {
          status: 'ASSIGNED',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
  });

  return {
    data: shifts as unknown[],
    count: shifts.length,
  };
};

