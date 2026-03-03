import { Router } from 'express';
import {
  postAssignment,
  deleteAssignmentHandler,
  getEligibleStaffHandler,
  postBulkAssignment,
  postAssignmentOverride,
} from './controller.js';

const assignmentsRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /api/v1/shifts/{shiftId}/assignments:
 *   post:
 *     tags: [Assignments]
 *     summary: Create a shift assignment
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
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Validation failed with violations array
 *       409:
 *         description: Lock conflict - user is being assigned by another operation
 */
assignmentsRouter.post('/:shiftId/assignments', postAssignment);

/**
 * @openapi
 * /api/v1/assignments/{assignmentId}:
 *   delete:
 *     tags: [Assignments]
 *     summary: Remove an assignment
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment removed successfully
 *       404:
 *         description: Assignment not found
 *       409:
 *         description: Cannot remove within 48 hours of shift
 */
assignmentsRouter.delete('/:assignmentId', deleteAssignmentHandler);

/**
 * @openapi
 * /api/v1/shifts/{shiftId}/eligible-staff:
 *   get:
 *     tags: [Assignments]
 *     summary: Get eligible staff for a shift with validation results
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Max results (default 20, max 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter by name or email
 *     responses:
 *       200:
 *         description: List of eligible staff with availability and warnings
 */
assignmentsRouter.get('/:shiftId/eligible-staff', getEligibleStaffHandler);

/**
 * @openapi
 * /api/v1/shifts/{shiftId}/assignments/bulk:
 *   post:
 *     tags: [Assignments]
 *     summary: Bulk assign multiple users to a shift
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
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Bulk assignment summary with successes and failures
 */
assignmentsRouter.post('/:shiftId/assignments/bulk', postBulkAssignment);

/**
 * @openapi
 * /api/v1/assignments/override:
 *   post:
 *     tags: [Assignments]
 *     summary: Manager override - bypass non-critical validations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shiftId:
 *                 type: string
 *               userId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assignment created with override
 *       403:
 *         description: User does not have manager role
 *       400:
 *         description: Hard constraints cannot be overridden
 */
assignmentsRouter.post('/override', postAssignmentOverride);

export default assignmentsRouter;
