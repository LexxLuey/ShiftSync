import type { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../../lib/errors/customErrors.js';
import {
  countUnreadNotifications,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './service.js';

const getActorId = (request: Request): string => {
  const userId = request.user?.id;

  if (!userId) {
    throw new ValidationError('Authenticated user is required');
  }

  return userId;
};

export const getNotifications = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  try {
    const userId = getActorId(request);
    const parsedLimit = request.query.limit ? Number(request.query.limit) : undefined;
    const parsedOffset = request.query.offset ? Number(request.query.offset) : undefined;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
    const offset = Number.isFinite(parsedOffset) ? parsedOffset : undefined;
    const unreadOnly =
      request.query.unreadOnly === 'true' || request.query.unreadOnly === '1';

    const queryParams = {
      userId,
      unreadOnly,
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    };

    const result = listNotifications(queryParams);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  try {
    const userId = getActorId(request);
    const result = countUnreadNotifications(userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const patchMarkRead = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  try {
    const userId = getActorId(request);
    const notificationId = String(request.params.id || '');

    if (!notificationId) {
      throw new ValidationError('Notification id is required');
    }

    const result = markNotificationRead(userId, notificationId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const patchMarkAllRead = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  try {
    const userId = getActorId(request);
    const result = markAllNotificationsRead(userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteNotificationById = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  try {
    const userId = getActorId(request);
    const notificationId = String(request.params.id || '');

    if (!notificationId) {
      throw new ValidationError('Notification id is required');
    }

    const result = deleteNotification(userId, notificationId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
