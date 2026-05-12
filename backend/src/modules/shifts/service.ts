import prismaClient from '../../lib/db/prisma.js';
import { ValidationError, NotFoundError, ConflictError } from '../../lib/errors/customErrors.js';
import { logAction } from '../audit/service.js';
import {
  emitShiftCreated,
  emitShiftPublished,
  emitShiftUpdated,
} from '../../lib/events/index.js';
import { createNotification } from '../notifications/service.js';
import { syncReminderJobsForPublishedShift } from '../reminders/service.js';
import type { CreateShiftPayload, UpdateShiftPayload } from './validation.js';

export const createShift = async (
  locationId: string,
  payload: CreateShiftPayload,
  userId?: string
) => {
  return await prismaClient.$transaction(async (tx) => {
    // Validate location exists
    const location = await tx.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundError('Location not found', { locationId });
    }

    // Validate skill exists
    const skill = await tx.skill.findUnique({
      where: { id: payload.requiredSkillId },
    });

    if (!skill) {
      throw new NotFoundError('Skill not found', { skillId: payload.requiredSkillId });
    }

    // Validate time range
    const startTime = new Date(payload.startTime);
    const endTime = new Date(payload.endTime);

    if (endTime <= startTime) {
      throw new ValidationError(
        'Shift end time must be after start time',
        { startTime, endTime },
        ['Ensure end time is later than start time.']
      );
    }

    if (payload.headcountNeeded < 1) {
      throw new ValidationError(
        'Headcount must be at least 1',
        { headcountNeeded: payload.headcountNeeded },
        []
      );
    }

    const shift = await tx.shift.create({
      data: {
        locationId,
        title: payload.title,
        startTime,
        endTime,
        requiredSkillId: payload.requiredSkillId,
        headcountNeeded: payload.headcountNeeded,
        isOptional: payload.isOptional ?? false,
        ...(payload.eventInstanceId ? { eventInstanceId: payload.eventInstanceId } : {}),
        status: 'DRAFT',
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        location: true,
        requiredSkill: true,
      },
    });

    // Log audit entry
    if (userId) {
      await logAction(
        userId,
        'CREATE',
        'SHIFT',
        shift.id,
        null,
        {
          id: shift.id,
          locationId,
          title: payload.title,
          startTime,
          endTime,
          requiredSkillId: payload.requiredSkillId,
          headcountNeeded: payload.headcountNeeded,
          isOptional: payload.isOptional ?? false,
          eventInstanceId: payload.eventInstanceId ?? null,
        }
      );
    }

    emitShiftCreated(shift);

    return shift;
  });
};

export const getShiftsByLocation = async (
  locationId: string,
  startDate: Date,
  endDate: Date
) => {
  const shifts = await prismaClient.shift.findMany({
    where: {
      locationId,
      startTime: { gte: startDate },
      endTime: { lte: endDate },
    },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      location: true,
      requiredSkill: true,
    },
    orderBy: { startTime: 'asc' },
  });

  return shifts;
};

export const getShiftById = async (shiftId: string) => {
  const shift = await prismaClient.shift.findUnique({
    where: { id: shiftId },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      location: true,
      requiredSkill: true,
    },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found', { shiftId });
  }

  return shift;
};

export const updateShift = async (
  shiftId: string,
  payload: UpdateShiftPayload,
  userId?: string
) => {
  return await prismaClient.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundError('Shift not found', { shiftId });
    }

    // Block updates to published shifts
    if (shift.status === 'PUBLISHED') {
      throw new ConflictError(
        'Cannot modify published shift',
        { shiftId, status: shift.status },
        ['Unpublish the shift first or delete it.']
      );
    }

    // Validate skill if provided
    if (payload.requiredSkillId) {
      const skill = await tx.skill.findUnique({
        where: { id: payload.requiredSkillId },
      });

      if (!skill) {
        throw new NotFoundError('Skill not found', { skillId: payload.requiredSkillId });
      }
    }

    // Validate time range if both provided
    if (payload.startTime && payload.endTime) {
      const startTime = new Date(payload.startTime);
      const endTime = new Date(payload.endTime);

      if (endTime <= startTime) {
        throw new ValidationError(
          'Shift end time must be after start time',
          { startTime, endTime },
          []
        );
      }
    }

    if (payload.headcountNeeded !== undefined && payload.headcountNeeded < 1) {
      throw new ValidationError(
        'Headcount must be at least 1',
        { headcountNeeded: payload.headcountNeeded },
        ['Increase headcount to at least 1.']
      );
    }

    // Auto-cancel pending swaps when shift is edited
    const pendingSwaps = await tx.swapRequest.findMany({
      where: { shiftId, status: 'PENDING' }
    });

    if (pendingSwaps.length > 0) {
      await tx.swapRequest.updateMany({
        where: { shiftId, status: 'PENDING' },
        data: { status: 'CANCELLED' }
      });
      // Phase 5: Emit socket events and send notifications to affected users
    }

    const updated = await tx.shift.update({
      where: { id: shiftId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.startTime && { startTime: new Date(payload.startTime) }),
        ...(payload.endTime && { endTime: new Date(payload.endTime) }),
        ...(payload.requiredSkillId && { requiredSkillId: payload.requiredSkillId }),
        ...(payload.headcountNeeded !== undefined ? { headcountNeeded: payload.headcountNeeded } : {}),
        ...(payload.isOptional !== undefined ? { isOptional: payload.isOptional } : {}),
        ...(payload.eventInstanceId !== undefined ? { eventInstanceId: payload.eventInstanceId } : {}),
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        location: true,
        requiredSkill: true,
      },
    });

    // Log audit entry
    if (userId) {
      await logAction(
        userId,
        'UPDATE',
        'SHIFT',
        shiftId,
        {
          title: shift.title,
          startTime: shift.startTime,
          endTime: shift.endTime,
          requiredSkillId: shift.requiredSkillId,
          headcountNeeded: shift.headcountNeeded,
          isOptional: shift.isOptional,
          eventInstanceId: shift.eventInstanceId,
        },
        {
          title: updated.title,
          startTime: updated.startTime,
          endTime: updated.endTime,
          requiredSkillId: updated.requiredSkillId,
          headcountNeeded: updated.headcountNeeded,
          isOptional: updated.isOptional,
          eventInstanceId: updated.eventInstanceId,
        }
      );
    }

    const affectedUserIds = updated.assignments.map((assignment) => assignment.user.id);
    emitShiftUpdated(updated, affectedUserIds);

    return updated;
  });
};

export const deleteShift = async (shiftId: string, userId?: string) => {
  return await prismaClient.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundError('Shift not found', { shiftId });
    }

    // Block deletion of published shifts within 48 hours
    if (shift.status === 'PUBLISHED') {
      const hoursUntilShift = (shift.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      if (hoursUntilShift < 48) {
        throw new ConflictError(
          'Cannot delete shift within 48 hours of start time',
          { shiftId, hoursUntilShift },
          ['Shifts must be deleted at least 48 hours before start.']
        );
      }
    }

    await tx.shift.delete({
      where: { id: shiftId },
    });

    // Log audit entry
    if (userId) {
      await logAction(
        userId,
        'DELETE',
        'SHIFT',
        shiftId,
        {
          id: shift.id,
          locationId: shift.locationId,
          title: shift.title,
          startTime: shift.startTime,
          endTime: shift.endTime,
          isOptional: shift.isOptional,
          eventInstanceId: shift.eventInstanceId,
          status: shift.status,
        },
        null
      );
    }

    return { message: 'Shift deleted successfully' };
  });
};

export const publishShift = async (shiftId: string, userId?: string) => {
  return await prismaClient.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundError('Shift not found', { shiftId });
    }

    // Check 48-hour rule
    const now = new Date();
    const hoursUntilShift = (shift.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilShift < 48) {
      throw new ValidationError(
        'Shift must be published at least 48 hours before start time',
        { shiftId, hoursUntilShift },
        [`Current hours until shift: ${Math.round(hoursUntilShift)}. You need at least 48 hours.`]
      );
    }

    const assignedHeadcount = shift._count.assignments;
    const missingHeadcount = Math.max(0, shift.headcountNeeded - assignedHeadcount);
    const warnings =
      !shift.isOptional && missingHeadcount > 0
        ? [
            {
              code: 'UNDERFILLED_REQUIRED_SLOT',
              message: `Publishing with unfilled required headcount (${assignedHeadcount}/${shift.headcountNeeded})`,
              details: {
                assignedHeadcount,
                requiredHeadcount: shift.headcountNeeded,
                missingHeadcount,
              },
            },
          ]
        : [];

    const published = await tx.shift.update({
      where: { id: shiftId },
      data: {
        status: 'PUBLISHED',
        publishedAt: now,
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        location: true,
        requiredSkill: true,
      },
    });

    // Log audit entry
    if (userId) {
      await logAction(
        userId,
        'PUBLISH',
        'SHIFT',
        shiftId,
        { status: shift.status, publishedAt: shift.publishedAt },
        { status: published.status, publishedAt: published.publishedAt }
      );
    }

    emitShiftPublished(published);

    const notificationMessage = `${published.title} was published`;
    await Promise.all(
      published.assignments.map(async (assignment) =>
        createNotification(
          {
            userId: assignment.user.id,
            type: 'shift:published',
            message: notificationMessage,
            relatedEntityId: published.id,
            relatedEntityType: 'SHIFT',
          },
          tx,
        ),
      ),
    );

    await syncReminderJobsForPublishedShift(shiftId, tx);

    return {
      ...published,
      hoursUntilDeadline: Math.round(hoursUntilShift),
      warnings,
    };
  });
};

/**
 * Get all active (currently-running) shifts for a location
 * Returns shifts with assigned staff details
 */
export const getActiveShifts = async (locationId: string, now: Date = new Date()) => {
  const shifts = await prismaClient.shift.findMany({
    where: {
      locationId,
      startTime: {
        lte: now,
      },
      endTime: {
        gt: now,
      },
      status: 'PUBLISHED',
    },
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
    orderBy: {
      startTime: 'asc',
    },
  });

  return shifts.map((shift) => ({
    id: shift.id,
    locationId: shift.locationId,
    locationName: shift.location.name,
    locationTimezone: shift.location.timezone,
    startTime: shift.startTime,
    endTime: shift.endTime,
    skill: shift.requiredSkill.name,
    title: shift.title,
    isOptional: shift.isOptional,
    eventInstanceId: shift.eventInstanceId,
    headcountNeeded: shift.headcountNeeded,
    assignedStaff: shift.assignments.map((a) => ({
      id: a.user.id,
      name: `${a.user.firstName} ${a.user.lastName}`,
      email: a.user.email,
      role: a.user.role,
    })),
  }));
};
