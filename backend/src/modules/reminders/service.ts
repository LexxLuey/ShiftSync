import type { Prisma, ReminderChannel, ReminderWindow } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import { NotFoundError } from '../../lib/errors/customErrors.js';

type ReminderDbClient = Prisma.TransactionClient | typeof prismaClient;

const REMINDER_CHANNELS: ReminderChannel[] = ['IN_APP', 'EMAIL'];

export const REMINDER_WINDOW_HOURS: Record<ReminderWindow, number> = {
  H24: 24,
  H2: 2,
};

export const REMINDER_NOTIFICATION_TYPE: Record<ReminderWindow, 'reminder:24h' | 'reminder:2h'> = {
  H24: 'reminder:24h',
  H2: 'reminder:2h',
};

const REMINDER_WINDOWS: ReminderWindow[] = ['H24', 'H2'];

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'P2002';

const getDueAtForWindow = (shiftStartTime: Date, window: ReminderWindow): Date => {
  const dueAtMs = shiftStartTime.getTime() - REMINDER_WINDOW_HOURS[window] * 60 * 60 * 1000;
  return new Date(dueAtMs);
};

export const buildReminderMessage = (params: {
  window: ReminderWindow;
  shiftTitle: string;
  startTime: Date;
  locationName?: string;
}): string => {
  const windowText = params.window === 'H24' ? '24 hours' : '2 hours';
  const locationText = params.locationName ? ` at ${params.locationName}` : '';
  return `Reminder: ${params.shiftTitle}${locationText} starts in ${windowText} (${params.startTime.toISOString()}).`;
};

export const syncReminderJobsForAssignment = async (
  shiftId: string,
  userId: string,
  dbClient: ReminderDbClient = prismaClient,
): Promise<{
  created: number;
  reactivated: number;
  updated: number;
  skippedPastWindow: number;
}> => {
  const shift = await dbClient.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      status: true,
      startTime: true,
    },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found', { shiftId });
  }

  if (shift.status !== 'PUBLISHED') {
    return {
      created: 0,
      reactivated: 0,
      updated: 0,
      skippedPastWindow: REMINDER_WINDOWS.length * REMINDER_CHANNELS.length,
    };
  }

  let created = 0;
  let reactivated = 0;
  let updated = 0;
  let skippedPastWindow = 0;
  const now = new Date();

  for (const window of REMINDER_WINDOWS) {
    const dueAt = getDueAtForWindow(shift.startTime, window);
    if (dueAt <= now) {
      skippedPastWindow += REMINDER_CHANNELS.length;
      continue;
    }

    for (const channel of REMINDER_CHANNELS) {
      let existingJob = await dbClient.reminderJob.findUnique({
        where: {
          userId_shiftId_channel_window: {
            userId,
            shiftId,
            channel,
            window,
          },
        },
      });

      if (!existingJob) {
        try {
          await dbClient.reminderJob.create({
            data: {
              userId,
              shiftId,
              channel,
              window,
              dueAt,
              status: 'PENDING',
              retryCount: 0,
            },
          });
          created += 1;
          continue;
        } catch (error) {
          if (!isUniqueConstraintError(error)) {
            throw error;
          }

          existingJob = await dbClient.reminderJob.findUnique({
            where: {
              userId_shiftId_channel_window: {
                userId,
                shiftId,
                channel,
                window,
              },
            },
          });

          if (!existingJob) {
            throw error;
          }
        }
      }

      if (existingJob.status === 'CANCELLED') {
        await dbClient.reminderJob.update({
          where: { id: existingJob.id },
          data: {
            status: 'PENDING',
            dueAt,
            retryCount: 0,
            lastError: null,
            sentAt: null,
          },
        });
        reactivated += 1;
        continue;
      }

      if (existingJob.status === 'PENDING' && existingJob.dueAt.getTime() !== dueAt.getTime()) {
        await dbClient.reminderJob.update({
          where: { id: existingJob.id },
          data: { dueAt },
        });
        updated += 1;
      }
    }
  }

  return { created, reactivated, updated, skippedPastWindow };
};

export const syncReminderJobsForPublishedShift = async (
  shiftId: string,
  dbClient: ReminderDbClient = prismaClient,
): Promise<{ created: number; reactivated: number; updated: number; skippedPastWindow: number }> => {
  const shift = await dbClient.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      status: true,
      assignments: {
        where: { status: 'ASSIGNED' },
        select: { userId: true },
      },
    },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found', { shiftId });
  }

  if (shift.status !== 'PUBLISHED') {
    return { created: 0, reactivated: 0, updated: 0, skippedPastWindow: 0 };
  }

  let created = 0;
  let reactivated = 0;
  let updated = 0;
  let skippedPastWindow = 0;

  for (const assignment of shift.assignments) {
    const result = await syncReminderJobsForAssignment(shiftId, assignment.userId, dbClient);
    created += result.created;
    reactivated += result.reactivated;
    updated += result.updated;
    skippedPastWindow += result.skippedPastWindow;
  }

  return { created, reactivated, updated, skippedPastWindow };
};

export const cancelReminderJobsForAssignment = async (
  shiftId: string,
  userId: string,
  dbClient: ReminderDbClient = prismaClient,
): Promise<{ cancelledCount: number }> => {
  const result = await dbClient.reminderJob.updateMany({
    where: {
      shiftId,
      userId,
      status: 'PENDING',
    },
    data: {
      status: 'CANCELLED',
      lastError: null,
    },
  });

  return { cancelledCount: result.count };
};
