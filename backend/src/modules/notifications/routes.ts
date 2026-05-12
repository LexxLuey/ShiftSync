import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import {
  deleteNotificationById,
  getNotifications,
  getUnreadCount,
  patchMarkAllRead,
  patchMarkRead,
} from './controller.js';

const notificationsRouter = Router();

notificationsRouter.use(authenticate);

/**
 * @openapi
 * /api/v1/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get current user notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Notifications list
 */
notificationsRouter.get('/', getNotifications);

/**
 * @openapi
 * /api/v1/notifications/count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notifications count
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
notificationsRouter.get('/count', getUnreadCount);

/**
 * @openapi
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark one notification as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated notification
 */
notificationsRouter.patch('/:id/read', patchMarkRead);

/**
 * @openapi
 * /api/v1/notifications/mark-all-read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Number of notifications marked read
 */
notificationsRouter.patch('/mark-all-read', patchMarkAllRead);

/**
 * @openapi
 * /api/v1/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted notification id
 */
notificationsRouter.delete('/:id', deleteNotificationById);

export default notificationsRouter;
