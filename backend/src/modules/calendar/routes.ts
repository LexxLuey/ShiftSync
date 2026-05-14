import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { getCalendar } from './controller.js';

const calendarRouter = Router();

calendarRouter.use(authenticate);

/**
 * @openapi
 * /api/v1/calendar:
 *   get:
 *     tags: [Calendar]
 *     summary: Get calendar shifts by date range and filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           example: 2026-05-01
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           example: 2026-05-31
 *       - in: query
 *         name: locationId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: title
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: assignedUserId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: mine
 *         required: false
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PUBLISHED, DRAFT, ALL]
 *     responses:
 *       200:
 *         description: Calendar shifts list
 */
calendarRouter.get('/', getCalendar);

export default calendarRouter;
