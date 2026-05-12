import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../../lib/errors/customErrors.js';
import { authenticate } from '../auth/middleware.js';
import {
  postAvailability,
  postException,
  getAvailabilityHandler,
  checkAvailability,
  deleteAvailabilityHandler,
  deleteExceptionHandler,
} from './controller.js';

const availabilityRouter = Router({ mergeParams: true });
availabilityRouter.use(authenticate);

const ensureUserAvailabilityAccess = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const actor = request.user as { id: string; role: 'ADMIN' | 'MANAGER' | 'STAFF' } | undefined;
  const userId = request.params.userId as string | undefined;

  if (!actor || !userId) {
    next(new ForbiddenError('Not authorized to access this availability resource'));
    return;
  }

  if (actor.role === 'ADMIN' || actor.role === 'MANAGER' || actor.id === userId) {
    next();
    return;
  }

  next(new ForbiddenError('Not authorized to access this availability resource'));
};

/**
 * @openapi
 * /api/v1/users/{userId}/availability:
 *   post:
 *     tags: [Availability]
 *     summary: Add recurring availability block
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dayOfWeek:
 *                 type: number
 *                 example: 1
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "17:00"
 *               locationId:
 *                 type: string
 *                 example: "loc-123"
 *     responses:
 *       201:
 *         description: Availability created
 *       400:
 *         description: Validation error
 */
availabilityRouter.post('/:userId/availability', ensureUserAvailabilityAccess, postAvailability);

/**
 * @openapi
 * /api/v1/users/{userId}/exceptions:
 *   post:
 *     tags: [Availability]
 *     summary: Add availability exception
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *               startTime:
 *                 type: string
 *                 example: "14:00"
 *               endTime:
 *                 type: string
 *                 example: "16:00"
 *     responses:
 *       201:
 *         description: Exception created
 */
availabilityRouter.post('/:userId/exceptions', ensureUserAvailabilityAccess, postException);

/**
 * @openapi
 * /api/v1/users/{userId}/availability:
 *   get:
 *     tags: [Availability]
 *     summary: Get all availability and exceptions for user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User availability
 */
availabilityRouter.get('/:userId/availability', ensureUserAvailabilityAccess, getAvailabilityHandler);

/**
 * @openapi
 * /api/v1/users/{userId}/availability/check:
 *   get:
 *     tags: [Availability]
 *     summary: Check if user is available at specific time
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: startTime
 *         required: true
 *         schema:
 *           type: string
 *           example: "14:00"
 *       - in: query
 *         name: endTime
 *         required: true
 *         schema:
 *           type: string
 *           example: "18:00"
 *       - in: query
 *         name: locationId
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability check result
 */
availabilityRouter.get('/:userId/availability/check', ensureUserAvailabilityAccess, checkAvailability);
availabilityRouter.delete(
  '/:userId/availability/:availabilityId',
  ensureUserAvailabilityAccess,
  deleteAvailabilityHandler,
);
availabilityRouter.delete(
  '/:userId/exceptions/:exceptionId',
  ensureUserAvailabilityAccess,
  deleteExceptionHandler,
);

export default availabilityRouter;
