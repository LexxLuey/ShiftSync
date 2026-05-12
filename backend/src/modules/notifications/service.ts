import type { Prisma, Notification } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import { NotFoundError } from '../../lib/errors/customErrors.js';
import { emitNotificationCreated } from '../../lib/events/index.js';

export type NotificationType =
  | 'shift:assigned'
  | 'shift:updated'
  | 'shift:cancelled'
  | 'shift:published'
  | 'reminder:24h'
  | 'reminder:2h'
  | 'swap:created'
  | 'swap:approved'
  | 'swap:rejected'
  | 'overtime:warning'
  | 'availability:updated';

export type NotificationRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationDbClient = Prisma.TransactionClient | typeof prismaClient;

const MAX_NOTIFICATIONS_PER_USER = 200;

const normalizeNotification = (notification: Notification): NotificationRecord => ({
  id: notification.id,
  userId: notification.userId,
  type: notification.type as NotificationType,
  message: notification.message,
  ...(notification.relatedEntityId
    ? { relatedEntityId: notification.relatedEntityId }
    : {}),
  ...(notification.relatedEntityType
    ? { relatedEntityType: notification.relatedEntityType }
    : {}),
  isRead: notification.isRead,
  createdAt: notification.createdAt.toISOString(),
});

const trimOldNotifications = async (
  dbClient: NotificationDbClient,
  userId: string,
): Promise<void> => {
  const overflowRecords = await dbClient.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_NOTIFICATIONS_PER_USER,
    select: { id: true },
  });

  if (overflowRecords.length === 0) {
    return;
  }

  await dbClient.notification.deleteMany({
    where: {
      id: {
        in: overflowRecords.map((record) => record.id),
      },
    },
  });
};

export const createNotification = async (
  payload: {
    userId: string;
    type: NotificationType;
    message: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  },
  dbClient: NotificationDbClient = prismaClient,
): Promise<NotificationRecord> => {
  const notification = await dbClient.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      message: payload.message,
      ...(payload.relatedEntityId
        ? { relatedEntityId: payload.relatedEntityId }
        : {}),
      ...(payload.relatedEntityType
        ? { relatedEntityType: payload.relatedEntityType }
        : {}),
    },
  });

  await trimOldNotifications(dbClient, payload.userId);

  const normalized = normalizeNotification(notification);
  emitNotificationCreated(payload.userId, normalized);

  return normalized;
};

export const listNotifications = async (params: {
  userId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<{ data: NotificationRecord[]; count: number }> => {
  const limit = Math.max(1, Math.min(100, params.limit ?? 20));
  const offset = Math.max(0, params.offset ?? 0);

  const whereClause = {
    userId: params.userId,
    ...(params.unreadOnly ? { isRead: false } : {}),
  };

  const [data, count] = await prismaClient.$transaction([
    prismaClient.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prismaClient.notification.count({
      where: whereClause,
    }),
  ]);

  return {
    data: data.map(normalizeNotification),
    count,
  };
};

export const countUnreadNotifications = async (userId: string): Promise<{ count: number }> => {
  const count = await prismaClient.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return { count };
};

export const markNotificationRead = async (
  userId: string,
  notificationId: string,
): Promise<NotificationRecord> => {
  const existing = await prismaClient.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!existing) {
    throw new NotFoundError('Notification not found', { notificationId });
  }

  if (existing.isRead) {
    return normalizeNotification(existing);
  }

  const updated = await prismaClient.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return normalizeNotification(updated);
};

export const markAllNotificationsRead = async (userId: string): Promise<{ count: number }> => {
  const result = await prismaClient.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { count: result.count };
};

export const deleteNotification = async (
  userId: string,
  notificationId: string,
): Promise<{ id: string }> => {
  const existing = await prismaClient.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError('Notification not found', { notificationId });
  }

  await prismaClient.notification.delete({
    where: { id: notificationId },
  });

  return { id: notificationId };
};
