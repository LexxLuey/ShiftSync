import { randomUUID } from 'crypto';
import { NotFoundError } from '../../lib/errors/customErrors.js';
import { emitNotificationCreated } from '../../lib/events/index.js';

export type NotificationType =
  | 'shift:assigned'
  | 'shift:updated'
  | 'shift:cancelled'
  | 'shift:published'
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

const MAX_NOTIFICATIONS_PER_USER = 200;
const notificationStore = new Map<string, NotificationRecord[]>();

const getUserBucket = (userId: string): NotificationRecord[] =>
  notificationStore.get(userId) ?? [];

const setUserBucket = (userId: string, notifications: NotificationRecord[]): void => {
  notificationStore.set(userId, notifications);
};

const sortNewestFirst = (notifications: NotificationRecord[]): NotificationRecord[] =>
  [...notifications].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

export const createNotification = (payload: {
  userId: string;
  type: NotificationType;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}): NotificationRecord => {
  const notification: NotificationRecord = {
    id: randomUUID(),
    userId: payload.userId,
    type: payload.type,
    message: payload.message,
    ...(payload.relatedEntityId
      ? { relatedEntityId: payload.relatedEntityId }
      : {}),
    ...(payload.relatedEntityType
      ? { relatedEntityType: payload.relatedEntityType }
      : {}),
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  const existing = getUserBucket(payload.userId);
  const updated = sortNewestFirst([notification, ...existing]).slice(
    0,
    MAX_NOTIFICATIONS_PER_USER,
  );

  setUserBucket(payload.userId, updated);

  emitNotificationCreated(payload.userId, notification);

  return notification;
};

export const listNotifications = (params: {
  userId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): { data: NotificationRecord[]; count: number } => {
  const limit = Math.max(1, Math.min(100, params.limit ?? 20));
  const offset = Math.max(0, params.offset ?? 0);

  let records = sortNewestFirst(getUserBucket(params.userId));
  if (params.unreadOnly) {
    records = records.filter((item) => !item.isRead);
  }

  return {
    data: records.slice(offset, offset + limit),
    count: records.length,
  };
};

export const countUnreadNotifications = (userId: string): { count: number } => {
  const count = getUserBucket(userId).filter((item) => !item.isRead).length;
  return { count };
};

export const markNotificationRead = (
  userId: string,
  notificationId: string,
): NotificationRecord => {
  const records = getUserBucket(userId);
  const index = records.findIndex((item) => item.id === notificationId);

  if (index === -1) {
    throw new NotFoundError('Notification not found', { notificationId });
  }

  const updatedRecord: NotificationRecord = {
    ...records[index]!,
    isRead: true,
  };

  const updated = [...records];
  updated[index] = updatedRecord;
  setUserBucket(userId, updated);

  return updatedRecord;
};

export const markAllNotificationsRead = (userId: string): { count: number } => {
  const records = getUserBucket(userId);
  const unreadCount = records.filter((item) => !item.isRead).length;

  if (unreadCount === 0) {
    return { count: 0 };
  }

  const updated = records.map((item) => ({ ...item, isRead: true }));
  setUserBucket(userId, updated);

  return { count: unreadCount };
};

export const deleteNotification = (userId: string, notificationId: string): { id: string } => {
  const records = getUserBucket(userId);
  const exists = records.some((item) => item.id === notificationId);

  if (!exists) {
    throw new NotFoundError('Notification not found', { notificationId });
  }

  setUserBucket(
    userId,
    records.filter((item) => item.id !== notificationId),
  );

  return { id: notificationId };
};
