import prismaClient from '../lib/db/prisma.js';
import { executeWithLock } from '../lib/redis/lock.js';
import { sendSmtpEmail } from '../lib/email/smtp.js';
import { createNotification } from '../modules/notifications/service.js';
import {
  REMINDER_NOTIFICATION_TYPE,
  buildReminderMessage,
} from '../modules/reminders/service.js';

const POLL_INTERVAL_MS = parseInt(process.env.REMINDER_POLL_INTERVAL_MS || '15000', 10);
const RETRY_DELAY_MS = parseInt(process.env.REMINDER_RETRY_DELAY_MS || '300000', 10);
const MAX_RETRIES = parseInt(process.env.REMINDER_MAX_RETRIES || '3', 10);
const WORKER_BATCH_SIZE = parseInt(process.env.REMINDER_WORKER_BATCH_SIZE || '50', 10);
const JOB_LOCK_TTL_SECONDS = parseInt(process.env.REMINDER_JOB_LOCK_TTL_SECONDS || '30', 10);

let shouldRun = true;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const log = (level: 'info' | 'error', message: string, meta?: Record<string, unknown>): void => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  console.log(line);
};

const sendInAppReminder = async (job: {
  id: string;
  userId: string;
  shiftId: string;
  window: 'H24' | 'H2';
  shift: {
    title: string;
    startTime: Date;
    location: { name: string };
  };
}): Promise<void> => {
  const notificationType = REMINDER_NOTIFICATION_TYPE[job.window];
  const dedupeEntityId = `${job.shiftId}:${job.window}`;
  const dedupeEntityType = 'SHIFT_REMINDER';

  const existingNotification = await prismaClient.notification.findFirst({
    where: {
      userId: job.userId,
      type: notificationType,
      relatedEntityId: dedupeEntityId,
      relatedEntityType: dedupeEntityType,
    },
    select: { id: true },
  });

  if (existingNotification) {
    return;
  }

  const message = buildReminderMessage({
    window: job.window,
    shiftTitle: job.shift.title,
    startTime: job.shift.startTime,
    locationName: job.shift.location.name,
  });

  await createNotification({
    userId: job.userId,
    type: notificationType,
    message,
    relatedEntityId: dedupeEntityId,
    relatedEntityType: dedupeEntityType,
  });
};

const sendEmailReminder = async (job: {
  window: 'H24' | 'H2';
  user: { email: string; firstName: string; lastName: string };
  shift: {
    title: string;
    startTime: Date;
    location: { name: string };
  };
}): Promise<void> => {
  const message = buildReminderMessage({
    window: job.window,
    shiftTitle: job.shift.title,
    startTime: job.shift.startTime,
    locationName: job.shift.location.name,
  });
  const recipientName = `${job.user.firstName} ${job.user.lastName}`.trim();
  const windowLabel = job.window === 'H24' ? '24 hours' : '2 hours';

  await sendSmtpEmail({
    to: job.user.email,
    subject: `Shift Reminder (${windowLabel}): ${job.shift.title}`,
    text: `Hello ${recipientName},\n\n${message}\n\nBlessings.`,
    html: `<p>Hello ${recipientName},</p><p>${message}</p><p>Blessings.</p>`,
  });
};

const processReminderJob = async (jobId: string): Promise<void> => {
  await executeWithLock(
    `reminder-job:${jobId}:lock`,
    async () => {
      const job = await prismaClient.reminderJob.findUnique({
        where: { id: jobId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          shift: {
            select: {
              id: true,
              title: true,
              startTime: true,
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!job || job.status !== 'PENDING') {
        return;
      }

      if (job.dueAt > new Date()) {
        return;
      }

      try {
        if (job.channel === 'IN_APP') {
          await sendInAppReminder({
            id: job.id,
            userId: job.userId,
            shiftId: job.shiftId,
            window: job.window,
            shift: job.shift,
          });
        } else {
          if (!job.user.email) {
            throw new Error('User has no email address');
          }

          await sendEmailReminder({
            window: job.window,
            user: job.user,
            shift: job.shift,
          });
        }

        await prismaClient.reminderJob.update({
          where: { id: job.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            lastError: null,
          },
        });

        log('info', 'Reminder job sent', {
          jobId: job.id,
          shiftId: job.shiftId,
          userId: job.userId,
          channel: job.channel,
          window: job.window,
          status: 'SENT',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const nextRetryCount = job.retryCount + 1;

        if (nextRetryCount > MAX_RETRIES) {
          await prismaClient.reminderJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              retryCount: nextRetryCount,
              lastError: errorMessage,
            },
          });

          log('error', 'Reminder job failed permanently', {
            jobId: job.id,
            shiftId: job.shiftId,
            userId: job.userId,
            channel: job.channel,
            window: job.window,
            status: 'FAILED',
            retryCount: nextRetryCount,
            lastError: errorMessage,
          });
          return;
        }

        await prismaClient.reminderJob.update({
          where: { id: job.id },
          data: {
            status: 'PENDING',
            retryCount: nextRetryCount,
            lastError: errorMessage,
            dueAt: new Date(Date.now() + RETRY_DELAY_MS),
          },
        });

        log('error', 'Reminder job send failed, retry scheduled', {
          jobId: job.id,
          shiftId: job.shiftId,
          userId: job.userId,
          channel: job.channel,
          window: job.window,
          status: 'PENDING',
          retryCount: nextRetryCount,
          lastError: errorMessage,
        });
      }
    },
    JOB_LOCK_TTL_SECONDS,
  );
};

const processDueJobs = async (): Promise<number> => {
  const now = new Date();
  const dueJobs = await prismaClient.reminderJob.findMany({
    where: {
      status: 'PENDING',
      dueAt: {
        lte: now,
      },
    },
    orderBy: {
      dueAt: 'asc',
    },
    take: WORKER_BATCH_SIZE,
    select: {
      id: true,
    },
  });

  for (const job of dueJobs) {
    await processReminderJob(job.id);
  }

  return dueJobs.length;
};

const runWorker = async (): Promise<void> => {
  log('info', 'Reminder worker started', {
    pollIntervalMs: POLL_INTERVAL_MS,
    retryDelayMs: RETRY_DELAY_MS,
    maxRetries: MAX_RETRIES,
    batchSize: WORKER_BATCH_SIZE,
  });

  while (shouldRun) {
    try {
      const processedCount = await processDueJobs();
      if (processedCount > 0) {
        log('info', 'Reminder worker batch complete', { processedCount });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', 'Reminder worker loop failed', { error: errorMessage });
    }

    await sleep(POLL_INTERVAL_MS);
  }

  await prismaClient.$disconnect();
  log('info', 'Reminder worker stopped');
};

process.on('SIGINT', () => {
  shouldRun = false;
});

process.on('SIGTERM', () => {
  shouldRun = false;
});

runWorker().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  log('error', 'Reminder worker crashed', { error: errorMessage });
  process.exit(1);
});
