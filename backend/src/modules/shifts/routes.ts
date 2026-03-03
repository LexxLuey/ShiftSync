import { Router } from 'express';
import {
  postShift,
  getShifts,
  getShift,
  putShift,
  deleteShiftHandler,
  postPublishShift,
  getActiveShiftsHandler,
} from './controller.js';

const shiftsRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /api/v1/locations/{locationId}/shifts:
 *   post:
 *     tags: [Shifts]
 *     summary: Create a new shift
 *     parameters:
 *       - in: path
 *         name: locationId
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
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               requiredSkillId:
 *                 type: string
 *               headcountNeeded:
 *                 type: number
 *     responses:
 *       201:
 *         description: Shift created successfully
 */
shiftsRouter.post('/:locationId/shifts', postShift);

/**
 * @openapi
 * /api/v1/locations/{locationId}/shifts:
 *   get:
 *     tags: [Shifts]
 *     summary: Get shifts for a location
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Shifts list
 */
shiftsRouter.get('/:locationId/shifts', getShifts);

/**
 * @openapi
 * /api/v1/shifts/{shiftId}:
 *   get:
 *     tags: [Shifts]
 *     summary: Get shift by ID
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shift details
 */
shiftsRouter.get('/:shiftId', getShift);

/**
 * @openapi
 * /api/v1/shifts/{shiftId}:
 *   put:
 *     tags: [Shifts]
 *     summary: Update shift
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Shift updated
 */
shiftsRouter.put('/:shiftId', putShift);

/**
 * @openapi
 * /api/v1/shifts/{shiftId}:
 *   delete:
 *     tags: [Shifts]
 *     summary: Delete shift
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shift deleted
 */
shiftsRouter.delete('/:shiftId', deleteShiftHandler);

/**
 * @openapi
 * /api/v1/shifts/{shiftId}/publish:
 *   post:
 *     tags: [Shifts]
 *     summary: Publish shift (with 48-hour rule)
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shift published
 */
shiftsRouter.post('/:shiftId/publish', postPublishShift);

/**
 * @openapi
 * /api/v1/locations/{locationId}/active-shifts:
 *   get:
 *     tags: [Shifts]
 *     summary: Get currently active (on-duty) shifts for a location
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active shifts with assigned staff
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       locationName:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       skill:
 *                         type: string
 *                       assignedStaff:
 *                         type: array
 */
shiftsRouter.get('/:locationId/active-shifts', getActiveShiftsHandler);

export default shiftsRouter;
