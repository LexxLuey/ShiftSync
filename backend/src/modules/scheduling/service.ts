import type { EventTemplateScope, Role, ShiftStatus } from '@prisma/client';
import { fromZonedTime } from 'date-fns-tz';
import { acquireLock, releaseLock } from '../../lib/redis/lock.js';
import prismaClient from '../../lib/db/prisma.js';
import {
  ForbiddenError,
  ValidationError,
} from '../../lib/errors/customErrors.js';
import { createShift } from '../shifts/service.js';
import type { GenerateSchedulePayload } from './validation.js';

type RequestActor = {
  id: string;
  role: Role;
};

type LocationRecord = {
  id: string;
  name: string;
  timezone: string;
};

type TemplateRecord = {
  id: string;
  title: string;
  scope: EventTemplateScope;
  locationId: string | null;
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  requirements: Array<{
    id: string;
    requiredSkillId: string;
    headcountNeeded: number;
    isOptional: boolean;
    sortOrder: number;
  }>;
};

type GeneratedShiftSummary = {
  shiftId: string;
  templateId: string;
  templateTitle: string;
  scope: EventTemplateScope;
  locationId: string;
  locationName: string;
  eventDate: string;
  eventInstanceId: string;
  requiredSkillId: string;
  headcountNeeded: number;
  isOptional: boolean;
  startTime: string;
  endTime: string;
};

type SkippedShiftSummary = Omit<GeneratedShiftSummary, 'shiftId'> & {
  reason: 'already_exists';
  existingShiftId: string;
  existingShiftStatus: ShiftStatus;
};

const parseTimeToMinutes = (value: string): number => {
  const [hourPart, minutePart] = value.split(':');
  const hour = parseInt(hourPart ?? '0', 10);
  const minute = parseInt(minutePart ?? '0', 10);
  return hour * 60 + minute;
};

const toUtcFromLocal = (date: string, time: string, timezone: string): Date => {
  return fromZonedTime(`${date}T${time}:00`, timezone);
};

const getNextDateString = (dateString: string): string => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const listMatchingDates = (
  startDate: string,
  endDate: string,
  dayOfWeek: number,
): string[] => {
  const matches: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const finalDate = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= finalDate) {
    if (cursor.getUTCDay() === dayOfWeek) {
      matches.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return matches;
};

const getManagedLocationIds = async (managerId: string): Promise<string[]> => {
  const locationLinks = await prismaClient.locationManager.findMany({
    where: { userId: managerId },
    select: { locationId: true },
  });

  return locationLinks.map((link) => link.locationId);
};

const resolveGenerationLocations = async (
  actor: RequestActor,
  requestedLocationIds: string[] | undefined,
): Promise<LocationRecord[]> => {
  if (actor.role === 'MANAGER') {
    const managedLocationIds = await getManagedLocationIds(actor.id);

    if (managedLocationIds.length === 0) {
      throw new ForbiddenError('Manager has no assigned centers for schedule generation');
    }

    const targetLocationIds = requestedLocationIds ?? managedLocationIds;
    const allWithinScope = targetLocationIds.every((locationId) =>
      managedLocationIds.includes(locationId),
    );

    if (!allWithinScope) {
      throw new ForbiddenError('Managers can only generate schedules for their assigned centers');
    }

    const locations = await prismaClient.location.findMany({
      where: {
        id: {
          in: targetLocationIds,
        },
      },
      select: {
        id: true,
        name: true,
        timezone: true,
      },
      orderBy: { name: 'asc' },
    });

    if (locations.length !== targetLocationIds.length) {
      throw new ValidationError('One or more center IDs are invalid', {
        locationIds: targetLocationIds,
      });
    }

    return locations;
  }

  const whereClause = requestedLocationIds
    ? {
        id: {
          in: requestedLocationIds,
        },
      }
    : {};

  const locations = await prismaClient.location.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      timezone: true,
    },
    orderBy: { name: 'asc' },
  });

  if (locations.length === 0) {
    throw new ValidationError('No centers found for schedule generation');
  }

  if (requestedLocationIds && locations.length !== requestedLocationIds.length) {
    throw new ValidationError('One or more center IDs are invalid', {
      locationIds: requestedLocationIds,
    });
  }

  return locations;
};

const resolveGenerationTemplates = async (
  actor: RequestActor,
  locationIds: string[],
  templateIds: string[] | undefined,
): Promise<TemplateRecord[]> => {
  if (actor.role === 'MANAGER') {
    const templates = await prismaClient.eventTemplate.findMany({
      where: {
        isActive: true,
        scope: 'LOCATION',
        locationId: {
          in: locationIds,
        },
        ...(templateIds ? { id: { in: templateIds } } : {}),
      },
      include: {
        requirements: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }, { title: 'asc' }],
    });

    if (templates.length === 0) {
      throw new ValidationError('No active templates available for selected centers');
    }

    return templates;
  }

  const templates = await prismaClient.eventTemplate.findMany({
    where: {
      isActive: true,
      ...(templateIds ? { id: { in: templateIds } } : {}),
      OR: [
        {
          scope: 'MINISTRY',
        },
        {
          scope: 'LOCATION',
          locationId: {
            in: locationIds,
          },
        },
      ],
    },
    include: {
      requirements: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }, { title: 'asc' }],
  });

  if (templates.length === 0) {
    throw new ValidationError('No active templates available for selected centers');
  }

  return templates;
};

const buildLockKey = (payload: {
  startDate: string;
  endDate: string;
  locationIds: string[];
  templateIds?: string[];
}): string => {
  const locationKey = payload.locationIds.slice().sort().join(',');
  const templateKey = payload.templateIds?.length
    ? payload.templateIds.slice().sort().join(',')
    : 'all';

  return `schedule:generate:${payload.startDate}:${payload.endDate}:loc:${locationKey}:tmpl:${templateKey}`;
};

const getTemplateTargetLocations = (
  template: TemplateRecord,
  availableLocations: LocationRecord[],
): LocationRecord[] => {
  if (template.scope === 'MINISTRY') {
    return availableLocations;
  }

  if (!template.locationId) {
    return [];
  }

  const location = availableLocations.find((item) => item.id === template.locationId);
  return location ? [location] : [];
};

export const generateScheduleFromTemplates = async (
  actor: RequestActor,
  payload: GenerateSchedulePayload,
): Promise<{
  summary: {
    createdCount: number;
    skippedCount: number;
    templatesProcessed: number;
    locationsProcessed: number;
    startDate: string;
    endDate: string;
  };
  created: GeneratedShiftSummary[];
  skipped: SkippedShiftSummary[];
}> => {
  const locations = await resolveGenerationLocations(actor, payload.locationIds);
  const locationIds = locations.map((location) => location.id);
  const templates = await resolveGenerationTemplates(actor, locationIds, payload.templateIds);

  const lockKey = buildLockKey({
    startDate: payload.startDate,
    endDate: payload.endDate,
    locationIds,
    ...(payload.templateIds ? { templateIds: payload.templateIds } : {}),
  });

  const lockTtl = parseInt(process.env.SCHEDULE_GENERATION_LOCK_TTL_SECONDS || '120', 10);
  await acquireLock(lockKey, Number.isNaN(lockTtl) ? 120 : lockTtl);

  try {
    const created: GeneratedShiftSummary[] = [];
    const skipped: SkippedShiftSummary[] = [];

    for (const template of templates) {
      const targetLocations = getTemplateTargetLocations(template, locations);
      const eventDates = listMatchingDates(
        payload.startDate,
        payload.endDate,
        template.dayOfWeek,
      );

      for (const location of targetLocations) {
        for (const eventDate of eventDates) {
          const eventInstanceId = `tmpl:${template.id}:loc:${location.id}:date:${eventDate}`;

          for (const requirement of template.requirements) {
            const endDate = parseTimeToMinutes(template.endTimeLocal) <= parseTimeToMinutes(template.startTimeLocal)
              ? getNextDateString(eventDate)
              : eventDate;

            const shiftStartUtc = toUtcFromLocal(eventDate, template.startTimeLocal, location.timezone);
            const shiftEndUtc = toUtcFromLocal(endDate, template.endTimeLocal, location.timezone);

            const existingShift = await prismaClient.shift.findFirst({
              where: {
                locationId: location.id,
                title: template.title,
                startTime: shiftStartUtc,
                endTime: shiftEndUtc,
                requiredSkillId: requirement.requiredSkillId,
                eventInstanceId,
              },
              select: {
                id: true,
                status: true,
              },
            });

            if (existingShift) {
              skipped.push({
                templateId: template.id,
                templateTitle: template.title,
                scope: template.scope,
                locationId: location.id,
                locationName: location.name,
                eventDate,
                eventInstanceId,
                requiredSkillId: requirement.requiredSkillId,
                headcountNeeded: requirement.headcountNeeded,
                isOptional: requirement.isOptional,
                startTime: shiftStartUtc.toISOString(),
                endTime: shiftEndUtc.toISOString(),
                reason: 'already_exists',
                existingShiftId: existingShift.id,
                existingShiftStatus: existingShift.status,
              });
              continue;
            }

            const createdShift = await createShift(
              location.id,
              {
                title: template.title,
                startTime: shiftStartUtc.toISOString(),
                endTime: shiftEndUtc.toISOString(),
                requiredSkillId: requirement.requiredSkillId,
                headcountNeeded: requirement.headcountNeeded,
                isOptional: requirement.isOptional,
                eventInstanceId,
              },
              actor.id,
            );

            created.push({
              shiftId: createdShift.id,
              templateId: template.id,
              templateTitle: template.title,
              scope: template.scope,
              locationId: location.id,
              locationName: location.name,
              eventDate,
              eventInstanceId,
              requiredSkillId: requirement.requiredSkillId,
              headcountNeeded: requirement.headcountNeeded,
              isOptional: requirement.isOptional,
              startTime: createdShift.startTime.toISOString(),
              endTime: createdShift.endTime.toISOString(),
            });
          }
        }
      }
    }

    return {
      summary: {
        createdCount: created.length,
        skippedCount: skipped.length,
        templatesProcessed: templates.length,
        locationsProcessed: locations.length,
        startDate: payload.startDate,
        endDate: payload.endDate,
      },
      created,
      skipped,
    };
  } finally {
    await releaseLock(lockKey);
  }
};
