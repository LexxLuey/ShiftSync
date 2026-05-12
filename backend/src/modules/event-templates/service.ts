import type { EventTemplateScope, Prisma, Role } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/customErrors.js';
import { logAction } from '../audit/service.js';
import type {
  CreateEventTemplatePayload,
  ListEventTemplatesQuery,
  UpdateEventTemplatePayload,
} from './validation.js';

type RequestActor = {
  id: string;
  role: Role;
};

const eventTemplateInclude = {
  location: {
    select: {
      id: true,
      name: true,
      timezone: true,
    },
  },
  requirements: {
    include: {
      requiredSkill: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      sortOrder: 'asc',
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
} as const;

const ensureSkillsExist = async (
  skillIds: string[],
  tx: Prisma.TransactionClient | typeof prismaClient = prismaClient,
): Promise<void> => {
  const uniqueSkillIds = Array.from(new Set(skillIds));
  const count = await tx.skill.count({
    where: {
      id: { in: uniqueSkillIds },
    },
  });

  if (count !== uniqueSkillIds.length) {
    throw new ValidationError(
      'One or more required skills do not exist',
      { skillIds: uniqueSkillIds },
      ['Use valid skills from the skills catalog.'],
    );
  }
};

const getManagedLocationIds = async (managerId: string): Promise<string[]> => {
  const managedLocations = await prismaClient.locationManager.findMany({
    where: { userId: managerId },
    select: { locationId: true },
  });

  return managedLocations.map((location) => location.locationId);
};

const ensureManagerAccessToLocation = async (
  managerId: string,
  locationId: string,
): Promise<void> => {
  const managerLink = await prismaClient.locationManager.findUnique({
    where: {
      locationId_userId: {
        locationId,
        userId: managerId,
      },
    },
    select: { id: true },
  });

  if (!managerLink) {
    throw new ForbiddenError('You do not have access to this location', { locationId });
  }
};

const ensureLocationExists = async (
  locationId: string,
  tx: Prisma.TransactionClient | typeof prismaClient = prismaClient,
) => {
  const location = await tx.location.findUnique({
    where: { id: locationId },
    select: { id: true, timezone: true, name: true },
  });

  if (!location) {
    throw new NotFoundError('Location not found', { locationId });
  }

  return location;
};

const assertScopePermissions = async (
  actor: RequestActor,
  scope: EventTemplateScope,
  locationId?: string | null,
): Promise<void> => {
  if (actor.role === 'ADMIN') {
    return;
  }

  if (actor.role !== 'MANAGER') {
    throw new ForbiddenError('Only managers and admins can manage event templates');
  }

  if (scope !== 'LOCATION') {
    throw new ForbiddenError('Managers can only manage location-scoped templates');
  }

  if (!locationId) {
    throw new ValidationError('Location template requires a location', { scope, locationId });
  }

  await ensureManagerAccessToLocation(actor.id, locationId);
};

const ensureTemplateAccess = async (
  actor: RequestActor,
  templateId: string,
): Promise<{
  id: string;
  scope: EventTemplateScope;
  locationId: string | null;
  title: string;
  description: string | null;
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  timezone: string;
  isActive: boolean;
  requirements: Array<{
    id: string;
    requiredSkillId: string;
    headcountNeeded: number;
    isOptional: boolean;
    sortOrder: number;
  }>;
}> => {
  const template = await prismaClient.eventTemplate.findUnique({
    where: { id: templateId },
    include: {
      requirements: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!template) {
    throw new NotFoundError('Event template not found', { templateId });
  }

  await assertScopePermissions(actor, template.scope, template.locationId);

  return template;
};

const normalizeRequirements = (
  requirements: Array<{
    requiredSkillId: string;
    headcountNeeded: number;
    isOptional?: boolean | undefined;
    sortOrder?: number | undefined;
  }>,
): Array<{
  requiredSkillId: string;
  headcountNeeded: number;
  isOptional: boolean;
  sortOrder: number;
}> =>
  requirements.map((requirement, index) => ({
    requiredSkillId: requirement.requiredSkillId,
    headcountNeeded: requirement.headcountNeeded,
    isOptional: requirement.isOptional ?? false,
    sortOrder: requirement.sortOrder ?? index,
  }));

export const listEventTemplates = async (
  actor: RequestActor,
  query: ListEventTemplatesQuery,
): Promise<Record<string, unknown>[]> => {
  if (actor.role === 'MANAGER' && query.scope === 'MINISTRY') {
    throw new ForbiddenError('Managers cannot access ministry templates');
  }

  if (actor.role === 'MANAGER' && query.locationId) {
    await ensureManagerAccessToLocation(actor.id, query.locationId);
  }

  const managedLocationIds =
    actor.role === 'MANAGER' ? await getManagedLocationIds(actor.id) : [];

  const whereClause: Prisma.EventTemplateWhereInput = {
    ...(query.scope ? { scope: query.scope } : {}),
    ...(query.locationId ? { locationId: query.locationId } : {}),
    ...(!query.includeInactive && query.isActive === undefined ? { isActive: true } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(actor.role === 'MANAGER'
      ? {
          scope: 'LOCATION',
          locationId: {
            in: managedLocationIds,
          },
        }
      : {}),
  };

  const templates = await prismaClient.eventTemplate.findMany({
    where: whereClause,
    include: eventTemplateInclude,
    orderBy: [{ dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }, { title: 'asc' }],
  });

  return templates as unknown as Record<string, unknown>[];
};

export const getEventTemplateById = async (
  actor: RequestActor,
  templateId: string,
): Promise<Record<string, unknown>> => {
  await ensureTemplateAccess(actor, templateId);

  const template = await prismaClient.eventTemplate.findUnique({
    where: { id: templateId },
    include: eventTemplateInclude,
  });

  if (!template) {
    throw new NotFoundError('Event template not found', { templateId });
  }

  return template as unknown as Record<string, unknown>;
};

export const createEventTemplate = async (
  actor: RequestActor,
  payload: CreateEventTemplatePayload,
): Promise<Record<string, unknown>> => {
  await assertScopePermissions(actor, payload.scope, payload.locationId);

  const normalizedRequirements = normalizeRequirements(payload.requirements);

  return prismaClient.$transaction(async (tx) => {
    const locationId = payload.scope === 'LOCATION' ? (payload.locationId as string) : null;
    const location =
      payload.scope === 'LOCATION' ? await ensureLocationExists(locationId as string, tx) : null;

    await ensureSkillsExist(normalizedRequirements.map((requirement) => requirement.requiredSkillId), tx);

    const template = await tx.eventTemplate.create({
      data: {
        title: payload.title,
        ...(payload.description ? { description: payload.description } : {}),
        scope: payload.scope,
        locationId,
        dayOfWeek: payload.dayOfWeek,
        startTimeLocal: payload.startTimeLocal,
        endTimeLocal: payload.endTimeLocal,
        timezone: location?.timezone ?? 'UTC',
        isActive: true,
        createdById: actor.id,
        requirements: {
          create: normalizedRequirements.map((requirement) => ({
            requiredSkillId: requirement.requiredSkillId,
            headcountNeeded: requirement.headcountNeeded,
            isOptional: requirement.isOptional,
            sortOrder: requirement.sortOrder,
          })),
        },
      },
      include: eventTemplateInclude,
    });

    await logAction(
      actor.id,
      'CREATE',
      'EVENT_TEMPLATE',
      template.id,
      null,
      {
        title: template.title,
        scope: template.scope,
        locationId: template.locationId,
        dayOfWeek: template.dayOfWeek,
        startTimeLocal: template.startTimeLocal,
        endTimeLocal: template.endTimeLocal,
        timezone: template.timezone,
        isActive: template.isActive,
      },
    );

    return template as unknown as Record<string, unknown>;
  });
};

export const updateEventTemplate = async (
  actor: RequestActor,
  templateId: string,
  payload: UpdateEventTemplatePayload,
): Promise<Record<string, unknown>> => {
  const existingTemplate = await ensureTemplateAccess(actor, templateId);

  const nextScope = payload.scope ?? existingTemplate.scope;
  const nextLocationId =
    payload.locationId !== undefined ? payload.locationId : existingTemplate.locationId;

  await assertScopePermissions(actor, nextScope, nextLocationId);

  return prismaClient.$transaction(async (tx) => {
    const normalizedRequirements = payload.requirements
      ? normalizeRequirements(payload.requirements)
      : null;

    if (normalizedRequirements) {
      await ensureSkillsExist(
        normalizedRequirements.map((requirement) => requirement.requiredSkillId),
        tx,
      );
    }

    const location =
      nextScope === 'LOCATION' && nextLocationId
        ? await ensureLocationExists(nextLocationId, tx)
        : null;

    const updatedTemplate = await tx.eventTemplate.update({
      where: { id: templateId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.scope !== undefined ? { scope: payload.scope } : {}),
        ...(payload.locationId !== undefined || payload.scope === 'MINISTRY'
          ? { locationId: nextScope === 'LOCATION' ? nextLocationId : null }
          : {}),
        ...(payload.dayOfWeek !== undefined ? { dayOfWeek: payload.dayOfWeek } : {}),
        ...(payload.startTimeLocal !== undefined
          ? { startTimeLocal: payload.startTimeLocal }
          : {}),
        ...(payload.endTimeLocal !== undefined ? { endTimeLocal: payload.endTimeLocal } : {}),
        ...(nextScope === 'LOCATION' && location ? { timezone: location.timezone } : {}),
        ...(normalizedRequirements
          ? {
              requirements: {
                deleteMany: {},
                create: normalizedRequirements.map((requirement) => ({
                  requiredSkillId: requirement.requiredSkillId,
                  headcountNeeded: requirement.headcountNeeded,
                  isOptional: requirement.isOptional,
                  sortOrder: requirement.sortOrder,
                })),
              },
            }
          : {}),
      },
      include: eventTemplateInclude,
    });

    await logAction(
      actor.id,
      'UPDATE',
      'EVENT_TEMPLATE',
      templateId,
      {
        title: existingTemplate.title,
        description: existingTemplate.description,
        scope: existingTemplate.scope,
        locationId: existingTemplate.locationId,
        dayOfWeek: existingTemplate.dayOfWeek,
        startTimeLocal: existingTemplate.startTimeLocal,
        endTimeLocal: existingTemplate.endTimeLocal,
        timezone: existingTemplate.timezone,
        isActive: existingTemplate.isActive,
        requirements: existingTemplate.requirements,
      },
      {
        title: updatedTemplate.title,
        description: updatedTemplate.description,
        scope: updatedTemplate.scope,
        locationId: updatedTemplate.locationId,
        dayOfWeek: updatedTemplate.dayOfWeek,
        startTimeLocal: updatedTemplate.startTimeLocal,
        endTimeLocal: updatedTemplate.endTimeLocal,
        timezone: updatedTemplate.timezone,
        isActive: updatedTemplate.isActive,
        requirements: updatedTemplate.requirements,
      },
    );

    return updatedTemplate as unknown as Record<string, unknown>;
  });
};

export const archiveEventTemplate = async (
  actor: RequestActor,
  templateId: string,
): Promise<Record<string, unknown>> => {
  const existingTemplate = await ensureTemplateAccess(actor, templateId);

  if (!existingTemplate.isActive) {
    const template = await prismaClient.eventTemplate.findUnique({
      where: { id: templateId },
      include: eventTemplateInclude,
    });

    if (!template) {
      throw new NotFoundError('Event template not found', { templateId });
    }

    return template as unknown as Record<string, unknown>;
  }

  return prismaClient.$transaction(async (tx) => {
    const archived = await tx.eventTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
      include: eventTemplateInclude,
    });

    await logAction(
      actor.id,
      'UPDATE',
      'EVENT_TEMPLATE',
      templateId,
      {
        isActive: existingTemplate.isActive,
      },
      {
        isActive: false,
      },
    );

    return archived as unknown as Record<string, unknown>;
  });
};
